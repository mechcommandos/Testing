/**
 * Achats intégrés : packs de crédits (Google Play Billing / StoreKit 2) via @capgo/native-purchases.
 *
 * Les packs sont des produits CONSOMMABLES : ils peuvent être rachetés à volonté.
 * Chaque transaction n'est créditée qu'une seule fois (identifiants mémorisés dans le profil).
 *
 * ⚠️ Sans serveur, la validation des reçus se fait côté client. Pour un jeu à fort volume,
 * ajoute une validation serveur (API Google Play Developer / App Store Server).
 */
import { Capacitor } from '@capacitor/core';
import { NativePurchases, PURCHASE_TYPE, type Transaction } from '@capgo/native-purchases';
import { CREDIT_PACKS, SANDBOX, type CreditPack } from '../config';
import { store } from '../state/store';

const native = Capacitor.isNativePlatform();
const android = Capacitor.getPlatform() === 'android';

let supported = false;
const prices = new Map<string, string>();

export type BuyResult = 'ok' | 'cancelled' | 'failed' | 'unavailable';

function receiptId(tx: Transaction): string {
  return tx.purchaseToken ?? tx.transactionId ?? '';
}

/** Crédite une transaction si elle ne l'a pas déjà été. */
function credit(pack: CreditPack, tx: Transaction): void {
  const id = receiptId(tx);
  if (id && store.p.receipts.includes(id)) return;
  if (id) store.p.receipts = [...store.p.receipts, id].slice(-200);
  store.addCredits(pack.credits);
  void store.flush();
}

/** Achats payés mais non livrés (app fermée pendant l'achat, paiement différé…). */
async function recover(): Promise<void> {
  try {
    const { transactions } = await NativePurchases.getUnfinishedTransactions();
    for (const tx of transactions) {
      const pack = CREDIT_PACKS.find((p) => p.id === tx.productIdentifier);
      if (!pack) continue;
      credit(pack, tx);
      if (android && tx.purchaseToken) await NativePurchases.consumePurchase({ purchaseToken: tx.purchaseToken });
      else if (tx.transactionId) await NativePurchases.finishTransaction({ transactionId: tx.transactionId });
    }
  } catch (e) {
    console.warn('[iap] récupération', e);
  }
}

export const iap = {
  async init(): Promise<void> {
    if (!native) return;
    try {
      supported = (await NativePurchases.isBillingSupported()).isBillingSupported;
      if (!supported) return;
      const { products } = await NativePurchases.getProducts({
        productIdentifiers: CREDIT_PACKS.map((p) => p.id),
        productType: PURCHASE_TYPE.INAPP,
      });
      for (const p of products) prices.set(p.identifier, p.priceString);
      await recover();
    } catch (e) {
      console.warn('[iap] initialisation', e);
    }
  },

  /** Les achats sont-ils simulés ? (bac à sable, et aucun produit réel trouvé dans le store) */
  simulated(): boolean {
    return SANDBOX && prices.size === 0;
  },

  price(pack: CreditPack): string {
    return prices.get(pack.id) ?? pack.fallbackPrice;
  },

  async buy(pack: CreditPack): Promise<BuyResult> {
    if (this.simulated()) {
      store.addCredits(pack.credits);
      return 'ok';
    }
    if (!native || !supported || !prices.has(pack.id)) return 'unavailable';
    try {
      const tx = await NativePurchases.purchaseProduct({
        productIdentifier: pack.id,
        productType: PURCHASE_TYPE.INAPP,
        quantity: 1,
        isConsumable: true,
      });
      credit(pack, tx);
      return 'ok';
    } catch (e) {
      const msg = String((e as { message?: string })?.message ?? e).toLowerCase();
      if (msg.includes('cancel')) return 'cancelled';
      console.warn('[iap] achat', e);
      return 'failed';
    }
  },

  async restore(): Promise<void> {
    if (!native || !supported) return;
    await recover();
  },
};
