const vid = document.getElementById('vid');
const canvas = document.getElementById('view');
const ctx = canvas.getContext('2d');
const msg = document.getElementById('msg');
const selectBox = document.getElementById('selectBox');
const listEl = document.getElementById('list');
const openAtLogin = document.getElementById('openAtLogin');
const loginSetting = document.getElementById('loginSetting');
const closeButton = document.getElementById('closeButton');

const LS_REGION = 'lm.region';
const LS_WINDOW = 'lm.windowName';

let currentId = null;
let region = loadRegion(); // normalized {x, y, w, h} (0..1) of the Spotify window frame
let selecting = false;
let dragStart = null;

function loadRegion() {
  try { return JSON.parse(localStorage.getItem(LS_REGION)) || null; } catch { return null; }
}

function setMsg(text) {
  msg.textContent = text || '';
  msg.style.display = text ? 'flex' : 'none';
}

/* ---------- capture ---------- */

async function startCapture(id) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: id,
        maxFrameRate: 15,
      },
    },
  });
  if (vid.srcObject) vid.srcObject.getTracks().forEach((t) => t.stop());
  vid.srcObject = stream;
  await vid.play();
  currentId = id;
  stream.getVideoTracks()[0].addEventListener('ended', () => { currentId = null; });
  setMsg(region ? '' : 'Press ⌘⇧R and drag a box around the lyrics');
}

async function findSpotify() {
  const sources = await window.lyricsMirror.getSources();
  const saved = localStorage.getItem(LS_WINDOW);
  return (
    sources.find((s) => saved && s.name === saved) ||
    sources.find((s) => /spotify/i.test(s.name)) ||
    null
  );
}

async function ensureCapture() {
  try {
    const perm = await window.lyricsMirror.screenPermission();
    if (perm === 'denied' || perm === 'restricted') {
      setMsg('Screen Recording permission needed:\nSystem Settings → Privacy & Security → Screen Recording → enable this app (or your Terminal), then restart.');
      return;
    }
    const sources = await window.lyricsMirror.getSources();
    // Keep the current stream while its window still exists.
    if (currentId && sources.some((s) => s.id === currentId)) return;

    const found = await findSpotify();
    if (found) {
      await startCapture(found.id);
    } else {
      currentId = null;
      setMsg('');
    }
  } catch (e) {
    setMsg('Capture error: ' + e.message);
  }
}

/* ---------- drawing ---------- */

function draw() {
  requestAnimationFrame(draw);
  if (!vid.videoWidth) return;

  const W = canvas.clientWidth, H = canvas.clientHeight;
  if (canvas.width !== W * devicePixelRatio) {
    canvas.width = W * devicePixelRatio;
    canvas.height = H * devicePixelRatio;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const vw = vid.videoWidth, vh = vid.videoHeight;

  if (selecting || !region) {
    // Show the whole Spotify window, letterboxed, so a region can be chosen.
    const s = Math.min(canvas.width / vw, canvas.height / vh);
    const dw = vw * s, dh = vh * s;
    const dx = (canvas.width - dw) / 2, dy = (canvas.height - dh) / 2;
    ctx.drawImage(vid, dx, dy, dw, dh);
    draw.layout = { dx, dy, dw, dh };
    return;
  }

  // Crop to the chosen lyrics region and scale it to fill the overlay.
  const sx = region.x * vw, sy = region.y * vh, sw = region.w * vw, sh = region.h * vh;
  const s = Math.min(canvas.width / sw, canvas.height / sh);
  const dw = sw * s, dh = sh * s;
  ctx.drawImage(vid, sx, sy, sw, sh, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);

  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const luminance = 0.2126 * pixels.data[i] + 0.7152 * pixels.data[i + 1] + 0.0722 * pixels.data[i + 2];
    const intensity = Math.max(0, Math.min(1, (luminance - 35) / 220));
    pixels.data[i] = 255;
    pixels.data[i + 1] = 255;
    pixels.data[i + 2] = 255;
    pixels.data[i + 3] = Math.round(intensity * intensity * 255);
  }
  ctx.putImageData(pixels, 0, 0);
}

/* ---------- region selection ---------- */

function beginSelect() {
  if (!vid.videoWidth) return;
  selecting = true;
  document.body.classList.add('select');
  setMsg('');
  // Give the user room to see the whole window while selecting.
  window.resizeTo(Math.max(window.outerWidth, 720), Math.max(window.outerHeight, 460));
}

canvas.addEventListener('mousedown', (e) => {
  if (!selecting) return;
  dragStart = { x: e.offsetX, y: e.offsetY };
  selectBox.style.display = 'block';
});

canvas.addEventListener('mousemove', (e) => {
  if (!selecting || !dragStart) return;
  const x = Math.min(dragStart.x, e.offsetX), y = Math.min(dragStart.y, e.offsetY);
  Object.assign(selectBox.style, {
    left: x + 'px', top: y + 'px',
    width: Math.abs(e.offsetX - dragStart.x) + 'px',
    height: Math.abs(e.offsetY - dragStart.y) + 'px',
  });
});

canvas.addEventListener('mouseup', (e) => {
  if (!selecting || !dragStart) return;
  const L = draw.layout;
  const x0 = Math.min(dragStart.x, e.offsetX) * devicePixelRatio;
  const y0 = Math.min(dragStart.y, e.offsetY) * devicePixelRatio;
  const x1 = Math.max(dragStart.x, e.offsetX) * devicePixelRatio;
  const y1 = Math.max(dragStart.y, e.offsetY) * devicePixelRatio;
  dragStart = null;
  selectBox.style.display = 'none';

  if (!L || x1 - x0 < 20 || y1 - y0 < 10) return; // ignore accidental clicks

  const clamp = (v) => Math.min(1, Math.max(0, v));
  region = {
    x: clamp((x0 - L.dx) / L.dw),
    y: clamp((y0 - L.dy) / L.dh),
    w: clamp((x1 - x0) / L.dw),
    h: clamp((y1 - y0) / L.dh),
  };
  localStorage.setItem(LS_REGION, JSON.stringify(region));
  selecting = false;
  document.body.classList.remove('select');

  // Match the overlay's shape to the chosen region.
  const targetW = 560;
  const aspect = (region.w * vid.videoWidth) / (region.h * vid.videoHeight);
  window.resizeTo(targetW, Math.max(80, Math.round(targetW / aspect)));
});

/* ---------- window picker ---------- */

async function showPicker() {
  const sources = await window.lyricsMirror.getSources();
  listEl.innerHTML = '';
  sources.forEach((s) => {
    const b = document.createElement('button');
    b.textContent = s.name;
    b.onclick = async () => {
      localStorage.setItem(LS_WINDOW, s.name);
      document.body.classList.remove('picking');
      await startCapture(s.id);
    };
    listEl.appendChild(b);
  });
  const cancel = document.createElement('button');
  cancel.textContent = 'Cancel';
  cancel.onclick = () => document.body.classList.remove('picking');
  listEl.appendChild(cancel);
  document.body.classList.add('picking');
}

/* ---------- wiring ---------- */

window.lyricsMirror.onSelectRegion(beginSelect);
window.lyricsMirror.onPickWindow(showPicker);
window.lyricsMirror.onClickThrough((on) => {
  document.body.classList.toggle('clickthrough', on);
});

closeButton.addEventListener('click', () => window.lyricsMirror.quit());

openAtLogin.addEventListener('change', async () => {
  const previousValue = !openAtLogin.checked;
  openAtLogin.disabled = true;
  try {
    openAtLogin.checked = await window.lyricsMirror.setOpenAtLogin(openAtLogin.checked);
  } catch (error) {
    openAtLogin.checked = previousValue;
    setMsg('Could not update Open at login: ' + error.message);
  } finally {
    openAtLogin.disabled = false;
  }
});

window.lyricsMirror.getOpenAtLogin().then(({ supported, enabled }) => {
  loginSetting.hidden = !supported;
  openAtLogin.checked = enabled;
}).catch(() => {
  loginSetting.hidden = true;
});

setMsg('Looking for Spotify…');
ensureCapture();
setInterval(ensureCapture, 2000);
requestAnimationFrame(draw);
