/**
 * Session de jeu : relie un profil, un jeu et une difficulté, mesure le temps de jeu actif et enregistre
 * les résultats d'activité. Le profil est figé à la création : un changement de profil ne peut pas
 * rattacher les résultats de cette session à un autre enfant.
 *
 * Temps actif : un intervalle ne compte que si la page est visible ET qu'une interaction a eu lieu dans les
 * `idleMs` précédentes. Le temps en arrière-plan ou d'inactivité n'est jamais compté.
 */
import { THRESHOLDS } from './config.js';
import { clock, uuid } from './ids.js';

export class GameSession {
  constructor({ store, profileId, gameId, difficulty, skills = [], contentVersion = 1, idleMs = THRESHOLDS.idleMs, onResult = () => {} }) {
    this.store = store;
    this.profileId = profileId;
    this.gameId = gameId;
    this.difficulty = difficulty;
    this.skills = skills;
    this.contentVersion = contentVersion;
    this.idleMs = idleMs;
    this.onResult = onResult;
    this.id = uuid();
    this.activeMs = 0;
    this.activityStartedAt = 0;
    this.activities = 0;
    this.visible = true;
    this.ended = false;
    const now = clock.now();
    this.startedAt = now;
    this.lastTick = now;
    this.lastInput = now;
    this.cleanup = [];
  }

  /** Branche les écouteurs sur la page (navigateur) ; les tests appellent tick()/input() directement. */
  attach(doc = globalThis.document) {
    if (!doc) return this;
    const onInput = () => this.input();
    const onVisibility = () => this.setVisible(doc.visibilityState === 'visible');
    for (const type of ['pointerdown', 'keydown']) doc.addEventListener(type, onInput, true);
    doc.addEventListener('visibilitychange', onVisibility);
    const timer = setInterval(() => this.tick(), 1000);
    this.cleanup.push(() => {
      for (const type of ['pointerdown', 'keydown']) doc.removeEventListener(type, onInput, true);
      doc.removeEventListener('visibilitychange', onVisibility);
      clearInterval(timer);
    });
    return this;
  }

  async start() {
    await this.store.saveSession(this.record());
    return this;
  }

  input() {
    this.tick();
    this.lastInput = clock.now();
  }

  setVisible(visible) {
    this.tick();
    this.visible = visible;
    if (visible) this.lastInput = clock.now();
  }

  /** Ajoute au temps actif l'intervalle écoulé, s'il était visible et non inactif. */
  tick() {
    const now = clock.now();
    if (this.visible && !this.ended) {
      const activeUntil = Math.min(now, this.lastInput + this.idleMs);
      if (activeUntil > this.lastTick) this.activeMs += activeUntil - this.lastTick;
    }
    this.lastTick = now;
  }

  beginActivity() {
    this.tick();
    this.activityStartedAt = this.activeMs;
  }

  /**
   * Enregistre une activité terminée (manche, commande, niveau).
   * success : objectif atteint ; hints : indices utilisés ; errors : erreurs ; attempts : tentatives comptées
   * par le jeu (une vérification, pas un clic) ; level : identifiant de niveau pour la reprise.
   * aided : aide autre qu'un indice (ex. texte lu à voix haute) : réussite enregistrée, mais pas « en autonomie ».
   */
  async recordActivity({ success, hints = 0, errors = 0, attempts = 1, level = null, data = {}, skills = null, aided = false }) {
    this.tick();
    const result = {
      id: uuid(),
      profileId: this.profileId,
      gameId: this.gameId,
      sessionId: this.id,
      difficulty: this.difficulty,
      level,
      success: !!success,
      autonomous: !!success && hints === 0 && !aided,
      hints,
      errors,
      attempts,
      durationMs: Math.max(0, this.activeMs - this.activityStartedAt),
      // Un jeu peut préciser les compétences d'une activité (ex. mode avec ou sans son) ; sinon celles de la difficulté.
      skills: Array.isArray(skills) && skills.length ? skills : this.skills,
      contentVersion: this.contentVersion,
      data,
      createdAt: clock.now(),
    };
    this.activities += 1;
    await this.store.recordResult(result);
    this.activityStartedAt = this.activeMs;
    this.onResult(result);
    return result;
  }

  /** Termine la session (fin, abandon, changement de profil, fermeture). Une interruption n'est pas un échec. */
  async end(reason = 'quit') {
    if (this.ended) return;
    this.tick();
    this.ended = true;
    this.endReason = reason;
    this.endedAt = clock.now();
    for (const fn of this.cleanup.splice(0)) fn();
    await this.store.saveSession(this.record());
  }

  record() {
    return {
      id: this.id, profileId: this.profileId, gameId: this.gameId, difficulty: this.difficulty,
      startedAt: this.startedAt, endedAt: this.endedAt ?? null, activeMs: Math.round(this.activeMs),
      activities: this.activities, endReason: this.endReason ?? null,
    };
  }
}
