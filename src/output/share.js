// Generates a "share card" — a PNG that overlays the current canvas frame
// with the AI title. The card is downloaded as a single PNG. We also keep the
// existing `share()` for the system share sheet / clipboard fallback.

import { t } from '../core/i18n.js';

async function makeCard() {
  const renderer = window.SM.modules.render3d?.scene?.getRenderer?.();
  if (!renderer) return null;
  const canvas = renderer.domElement;
  const dataUrl = canvas.toDataURL('image/png');
  if (!dataUrl) return null;

  const title = window.SM.aiTitle || 'Spherical Memory';
  const overlay = document.createElement('canvas');
  overlay.width = canvas.width;
  overlay.height = canvas.height;
  const ctx = overlay.getContext('2d');
  const img = new Image();
  img.src = dataUrl;
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });
  ctx.drawImage(img, 0, 0, overlay.width, overlay.height);

  // Bottom panel
  const panelHeight = Math.round(overlay.height * 0.16);
  const gradient = ctx.createLinearGradient(0, overlay.height - panelHeight, 0, overlay.height);
  gradient.addColorStop(0, 'rgba(8,14,28,0)');
  gradient.addColorStop(0.4, 'rgba(8,14,28,0.62)');
  gradient.addColorStop(1, 'rgba(8,14,28,0.92)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, overlay.height - panelHeight, overlay.width, panelHeight);

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `700 ${Math.round(overlay.height * 0.05)}px "Iowan Old Style", "Noto Serif SC", serif`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(title, 48, overlay.height - 56);

  ctx.fillStyle = 'rgba(143,214,255,0.92)';
  ctx.font = `600 ${Math.round(overlay.height * 0.022)}px "Avenir Next", "PingFang SC", sans-serif`;
  ctx.fillText(t('share.card'), 48, overlay.height - 28);

  return overlay.toDataURL('image/png');
}

async function downloadCard() {
  try {
    const dataUrl = await makeCard();
    if (!dataUrl) return null;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `spherical-memory-card-${Date.now()}.png`;
    link.click();
    window.SM.bus.emit('share-card:done', { url: dataUrl });
    return dataUrl;
  } catch (error) {
    window.SM.bus.emit('share-card:error', { error });
    return null;
  }
}

async function share() {
  // Prefer a card PNG + clipboard URL fallback (system share not always available).
  const dataUrl = await downloadCard();
  if (dataUrl) {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `spherical-memory-card-${Date.now()}.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: window.SM.aiTitle || 'Spherical Memory',
          text: t('share.caption', { title: window.SM.aiTitle || 'Spherical Memory' }),
          files: [file],
        });
        window.SM.bus.emit('share:done', { method: 'native' });
        return true;
      }
    } catch {}
  }

  try {
    await navigator.clipboard.writeText(window.location.href);
    window.SM.bus.emit('share:done', { method: 'clipboard' });
    return true;
  } catch (error) {
    window.SM.bus.emit('share:error', { error });
    return false;
  }
}

function init() {}

function destroy() {}

export {
  init,
  destroy,
  share,
  downloadCard,
};
