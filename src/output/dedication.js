// "送给某人" dedication — a thin wrapper that builds a share URL with a
// recipient name and a personal message. The dedicated sphere is then unlocked
// when the recipient opens the URL. Pure client-side: we store the dedication
// in localStorage and look it up on load. No server.

import { t } from '../core/i18n.js';

const STORAGE_KEY = 'sm-dedication';

function setDedication(payload) {
  try {
    const id = `ded-${Date.now()}-${Math.floor(Math.random() * 1e6).toString(36)}`;
    const record = { id, ...payload, createdAt: Date.now() };
    window.localStorage.setItem(`${STORAGE_KEY}-${id}`, JSON.stringify(record));
    const url = new URL(window.location.href);
    url.searchParams.set('dedication', id);
    return url.toString();
  } catch (error) {
    console.warn('[dedication] save failed', error);
    return null;
  }
}

function loadDedication(id) {
  if (!id) return null;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY}-${id}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearDedication(id) {
  try { window.localStorage.removeItem(`${STORAGE_KEY}-${id}`); } catch {}
}

function buildDedicationUrl({ recipient, message, from }) {
  return setDedication({ recipient, message, from, lang: window.SM?.lang || 'en' });
}

function checkIncoming() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const id = params.get('dedication');
  return loadDedication(id);
}

function shareToRecipient({ recipient, message, from }) {
  const url = buildDedicationUrl({ recipient, message, from });
  if (!url) return null;
  const title = window.SM.aiTitle || 'Spherical Memory';
  return { url, title, recipient };
}

function init() {
  // Surface a bus event so the cover or HUD can render a "this sphere is dedicated to..." banner.
  const incoming = checkIncoming();
  if (incoming) {
    window.SM.incomingDedication = incoming;
    window.SM.bus.emit('dedication:incoming', { ...incoming });
  }
}

function destroy() {}

export {
  init,
  destroy,
  buildDedicationUrl,
  shareToRecipient,
  loadDedication,
  checkIncoming,
};
