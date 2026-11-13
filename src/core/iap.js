/* Achats intégrés (Google Play Billing / StoreKit 2) via @capgo/native-purchases. */
import { Capacitor } from '@capacitor/core';
import { CONFIG } from './config.js';
import { S, addCoins, addCredits, grant, emit, save } from './state.js';

const native = Capacitor.isNativePlatform();
let NP = null, INAPP = 'inapp';
const store = {}; // id -> produit du store (prix localisé)

const def = (id) => CONFIG.iap.products.find((p) => p.id === id);

/** Livre le contenu d'un produit. Les non-consommables sont idempotents. */
function deliver(id) {
  const p = def(id); if (!p) return;
  if (p.type === 'nonconsumable') {
    if (S.data.iapOwned.includes(id)) return;
    S.data.iapOwned.push(id);
  }
  if (id === 'remove_ads') S.data.noAds = true;
  if (p.credits) addCredits(p.credits);
  if (p.coins) addCoins(p.coins);
  if (p.skin) grant('skin', p.skin);
  if (p.weapon) grant('weapon', p.weapon);
  emit('iap'); save(true);
}

export const IAP = {
  native, available: !native,

  async init() {
    if (!native) return;
    try {
      const m = await import('@capgo/native-purchases');
      NP = m.NativePurchases; INAPP = m.PURCHASE_TYPE.INAPP;
      const { isBillingSupported } = await NP.isBillingSupported();
      if (!isBillingSupported) { NP = null; return; }
      this.available = true;
      const { products } = await NP.getProducts({ productIdentifiers: CONFIG.iap.products.map((p) => p.id), productType: INAPP });
      for (const p of products || []) if (!store[p.identifier]) store[p.identifier] = p;
      await this.restore(true);
    } catch (err) { console.warn('[iap] init', err); }
  },

  price(id) { return (store[id] && store[id].priceString) || def(id).fallbackPrice; },
  owned(id) { return S.data.iapOwned.includes(id); },

  /** @returns {Promise<{ok:boolean, cancelled?:boolean, error?:string}>} */
  async buy(id) {
    const p = def(id); if (!p) return { ok: false, error: 'unknown' };
    if (p.type === 'nonconsumable' && this.owned(id)) return { ok: true };
    if (!native) { // mode démo navigateur : achat simulé, clairement identifié
      const ok = window.confirm(`[DEMO] ${id} — ${p.fallbackPrice}\nSimuler l'achat ? / Simulate purchase?`);
      if (ok) deliver(id);
      return { ok, cancelled: !ok };
    }
    if (!NP) return { ok: false, error: 'unavailable' };
    try {
      const tx = await NP.purchaseProduct({ productIdentifier: id, productType: INAPP, quantity: 1, isConsumable: p.type === 'consumable' });
      // Android : purchaseState "1" = acheté (un paiement « en attente » ne doit rien livrer)
      if (tx && tx.purchaseState !== undefined && String(tx.purchaseState) !== '1' && String(tx.purchaseState).toUpperCase() !== 'PURCHASED') return { ok: false, error: 'pending' };
      deliver(id);
      return { ok: true };
    } catch (err) {
      const msg = String((err && err.message) || err || '');
      return { ok: false, cancelled: /cancel/i.test(msg), error: msg };
    }
  },

  /** Restaure les achats non consommables (obligatoire sur iOS). */
  async restore(silent = false) {
    if (!NP) return 0;
    let n = 0;
    try {
      if (!silent) await NP.restorePurchases();
      const { purchases } = await NP.getPurchases({ productType: INAPP });
      for (const t of purchases || []) {
        const p = def(t.productIdentifier);
        if (p && p.type === 'nonconsumable' && !this.owned(p.id)) { deliver(p.id); n++; }
      }
    } catch (err) { console.warn('[iap] restore', err); }
    return n;
  },
};
