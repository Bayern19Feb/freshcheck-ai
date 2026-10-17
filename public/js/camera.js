// Live camera preview using getUserMedia. If this is not available the app
// falls back to the phone's own camera app through <input capture>.

export const CAMERA_ERRORS = {
  'insecure': 'The camera only works on a secure (https://) web address or on localhost. You can still upload a photo.',
  'unsupported': 'This browser does not support a live camera preview. Use "Take photo" or "Upload" instead.',
  'denied': 'Camera permission was blocked. To allow it: tap the lock or info icon next to the web address → Permissions → Camera → Allow, then reload. You can still upload a photo.',
  'no-camera': 'No camera was found on this device. You can still upload a photo.',
  'busy': 'The camera is being used by another app. Close the other app and try again.',
  'unknown': 'The camera could not be started. You can still upload a photo.',
};

export function cameraAvailability() {
  if (!window.isSecureContext) return 'insecure';
  if (!navigator.mediaDevices?.getUserMedia) return 'unsupported';
  return 'ok';
}

function mapError(err) {
  switch (err?.name) {
    case 'NotAllowedError': case 'SecurityError': return 'denied';
    case 'NotFoundError': case 'OverconstrainedError': return 'no-camera';
    case 'NotReadableError': case 'AbortError': return 'busy';
    default: return 'unknown';
  }
}

/** Start the back camera in a <video>. Returns a stop() function. Throws { code }. */
export async function startCamera(video) {
  const avail = cameraAvailability();
  if (avail !== 'ok') throw Object.assign(new Error(CAMERA_ERRORS[avail]), { code: avail });
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1280 } },
      audio: false,
    });
  } catch (err) {
    const code = mapError(err);
    throw Object.assign(new Error(CAMERA_ERRORS[code]), { code });
  }
  video.srcObject = stream;
  video.setAttribute('playsinline', '');
  video.muted = true;
  await video.play().catch(() => {});
  return () => {
    for (const track of stream.getTracks()) track.stop();
    video.srcObject = null;
  };
}

/** Copy the current video frame to a canvas. */
export function grabFrame(video) {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  return canvas;
}
