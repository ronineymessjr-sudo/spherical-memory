function init() {
  const container = document.getElementById('sphere-container');
  if (!container || container.querySelector('.fallback-note')) return;

  const note = document.createElement('div');
  note.className = 'fallback-note';
  note.textContent = 'WebGL is unavailable. Demo fallback mode is active.';
  container.appendChild(note);
}

function destroy() {}

export {
  init,
  destroy,
};
