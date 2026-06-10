function render() {
  const container = document.getElementById('upload-container');
  if (!container || container.dataset.ready === '1') return;

  container.dataset.ready = '1';
  container.innerHTML = `
    <div class="upload-hint">
      <strong>Demo assets ready</strong>
      <span>Six preset memory fragments are preloaded for the MVP demo.</span>
    </div>
  `;
}

function init() {
  render();
}

function destroy() {}

export {
  init,
  destroy,
};
