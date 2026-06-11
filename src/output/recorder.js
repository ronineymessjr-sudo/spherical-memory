// 10-second sphere showcase recorder. Captures the WebGL canvas via
// MediaRecorder (when available) and downloads a WebM file. The capture is
// purely client-side — no backend, no encoding server.

let activeRecorder = null;
let activeStream = null;
let activeChunks = [];
let activeUrl = null;
let stopTimer = 0;
let offStop = null;
let offError = null;

function getRenderer() {
  return window.SM?.modules?.render3d?.scene?.getRenderer?.();
}

function setRecordingFlag(recording) {
  if (window.SM) {
    window.SM.__recording = !!recording;
  }
}

function releaseStream() {
  if (!activeStream) return;
  activeStream.getTracks?.().forEach((track) => {
    try { track.stop(); } catch {}
  });
  activeStream = null;
}

async function start(seconds = 10, options = {}) {
  if (activeRecorder) return;
  const renderer = getRenderer();
  const canvas = renderer?.domElement;
  if (!canvas?.captureStream) {
    window.SM?.bus?.emit?.('toast', { message: 'Recording not supported in this browser.' });
    setRecordingFlag(false);
    return;
  }

  // Default: capture only the canvas. Optional `screen: true` switches to
  // getDisplayMedia so the user can pick a window/tab/fullscreen that includes
  // the HUD and toolbar too.
  let stream;
  try {
    if (options.screen && navigator.mediaDevices?.getDisplayMedia) {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false });
    } else {
      stream = canvas.captureStream(60);
    }
    activeStream = stream;
  } catch (error) {
    window.SM?.bus?.emit?.('toast', { message: 'Recording stream failed', error: error?.message || error });
    setRecordingFlag(false);
    return;
  }

  try {
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : (MediaRecorder.isTypeSupported('video/webm;codecs=vp8') ? 'video/webm;codecs=vp8' : 'video/webm');
    activeRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
    activeChunks = [];
    activeRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size) activeChunks.push(event.data);
    };
    activeRecorder.onstop = () => finalize();
    activeRecorder.onerror = (event) => {
      window.SM?.bus?.emit?.('toast', { message: 'Recording error', error: event?.error || event });
      stop();
    };
    activeRecorder.start(250);
    setRecordingFlag(true);
    window.SM?.bus?.emit?.('recorder:start', { source: options.screen ? 'screen' : 'canvas' });
    stopTimer = window.setTimeout(() => stop(), seconds * 1000);
  } catch (error) {
    window.SM?.bus?.emit?.('toast', { message: 'Recording failed to start', error: error?.message || error });
    releaseStream();
    setRecordingFlag(false);
  }
}

function stop() {
  if (stopTimer) {
    window.clearTimeout(stopTimer);
    stopTimer = 0;
  }
  if (activeRecorder && activeRecorder.state !== 'inactive') {
    try { activeRecorder.stop(); } catch {}
  } else {
    releaseStream();
    setRecordingFlag(false);
  }
}

function finalize() {
  try {
    const blob = new Blob(activeChunks, { type: activeChunks[0]?.type || 'video/webm' });
    if (activeUrl) URL.revokeObjectURL(activeUrl);
    activeUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = activeUrl;
    link.download = `spherical-memory-${Date.now()}.webm`;
    link.click();
    window.SM?.bus?.emit?.('recorder:done', { url: activeUrl });
  } catch (error) {
    window.SM?.bus?.emit?.('toast', { message: 'Saving failed', error: error?.message || error });
  } finally {
    releaseStream();
    activeRecorder = null;
    activeChunks = [];
    setRecordingFlag(false);
  }
}

function init() {
  offStop = window.SM?.bus?.on?.('recorder:force-stop', stop);
  offError = window.SM?.bus?.on?.('recorder:error', stop);
  setRecordingFlag(false);
}

function destroy() {
  offStop?.();
  offError?.();
  offStop = null;
  offError = null;
  stop();
}

function isRecording() {
  return !!activeRecorder && activeRecorder.state !== 'inactive';
}

export {
  init,
  destroy,
  start,
  stop,
  isRecording,
};
