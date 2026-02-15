const $ = (sel) => document.querySelector(sel);

const envelopeWrap = $("#envelopeWrap");
const envelope = $("#envelope");
const envFlap = $("#envFlap");
const paper = $("#paper");
const paperInner = $("#paperInner");
const nextBtn = $("#nextBtn");
const fnText = $("#fnText");
const graph = $("#graph");
const choiceLL = $("#choiceLL");
const choiceSS = $("#choiceSS");
const modal = $("#modal");
const modalBody = $("#modalBody");
const modalOk = $("#modalOk");
const valentine = $("#valentine");
const heartsRoot = $("#hearts");
let llCleanup = null;
let heartDone = false;
let keyBuffer = "";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function openModal(message, title = "Incorrect") {
  $("#modalTitle").textContent = title;
  modalBody.textContent = message;
  modal.classList.remove("is-hidden");
  modalOk.focus();
}

function closeModal() {
  modal.classList.add("is-hidden");
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function setFunctionText() {
  // Heart curve from the provided handwritten function:
  // x^2 + (y - ∛(x^2))^2 = 1
  // Solving for y (for plotting):
  // y = ∛(x^2) ± √(1 - x^2),  x ∈ [-1, 1]
  fnText.textContent = "x² + (y − ∛(x²))²";
}

function setupCanvasHiDPI(canvas) {
  const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  const cssW = canvas.clientWidth || canvas.width;
  const cssH = canvas.clientHeight || canvas.height;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

function drawAxes(ctx, w, h) {
  ctx.save();

  // Background grid
  ctx.clearRect(0, 0, w, h);
  const grid = 26;
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(12,16,48,0.08)";
  for (let x = 0; x <= w; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += grid) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
    ctx.stroke();
  }

  // Axes
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(21,18,27,0.35)";
  ctx.beginPath();
  ctx.moveTo(0, h / 2 + 0.5);
  ctx.lineTo(w, h / 2 + 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w / 2 + 0.5, 0);
  ctx.lineTo(w / 2 + 0.5, h);
  ctx.stroke();

  ctx.restore();
}

function computeImplicitHeartPoints(steps = 900) {
  // From: x² + (y − ∛(x²))² = 1
  // => y = ∛(x²) ± √(1 − x²)
  // We'll trace the top branch left→right, then bottom branch right→left to close.
  const top = [];
  const bottom = [];
  for (let i = 0; i <= steps; i++) {
    const x = -1 + (2 * i) / steps;
    const c = Math.cbrt(x * x); // ∛(x²) = |x|^(2/3)
    const s = Math.sqrt(Math.max(0, 1 - x * x));
    top.push({ x, y: c + s });
    bottom.push({ x, y: c - s });
  }
  bottom.reverse();
  return top.concat(bottom, [top[0]]);
}

function drawHeartAnimated(canvas, onDone) {
  const ctx = setupCanvasHiDPI(canvas);
  const w = canvas.clientWidth || 920;
  const h = canvas.clientHeight || 520;

  const pts = computeImplicitHeartPoints(1200);
  // Map curve coords to canvas (fit-to-bounds)
  const padding = 34;
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const spanX = Math.max(1e-6, maxX - minX);
  const spanY = Math.max(1e-6, maxY - minY);
  const scale = Math.min((w - padding * 2) / spanX, (h - padding * 2) / spanY);
  const ox = w / 2 - ((minX + maxX) / 2) * scale;
  const oy = h / 2 + ((minY + maxY) / 2) * scale; // invert in toCanvas

  function toCanvas(p) {
    return { cx: ox + p.x * scale, cy: oy - p.y * scale };
  }

  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, "#ff4d8d");
  gradient.addColorStop(0.6, "#7c5cff");
  gradient.addColorStop(1, "#ff7ab0");

  let idx = 1;
  const speed = 7; // points per frame

  function frame() {
    drawAxes(ctx, w, h);

    // Draw partial path
    ctx.save();
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = gradient;
    ctx.shadowColor = "rgba(255,77,141,0.35)";
    ctx.shadowBlur = 10;

    ctx.beginPath();
    const p0 = toCanvas(pts[0]);
    ctx.moveTo(p0.cx, p0.cy);
    for (let i = 1; i <= idx; i++) {
      const pi = toCanvas(pts[i]);
      ctx.lineTo(pi.cx, pi.cy);
    }
    ctx.stroke();

    // Endpoint dot
    const pe = toCanvas(pts[idx]);
    ctx.shadowBlur = 16;
    ctx.fillStyle = "rgba(255,77,141,0.9)";
    ctx.beginPath();
    ctx.arc(pe.cx, pe.cy, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    idx += speed;
    if (idx < pts.length - 1) requestAnimationFrame(frame);
    else {
      // Final redraw fully (avoid missing tail)
      drawAxes(ctx, w, h);
      ctx.save();
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = gradient;
      ctx.shadowColor = "rgba(124,92,255,0.35)";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      const pStart = toCanvas(pts[0]);
      ctx.moveTo(pStart.cx, pStart.cy);
      for (let i = 1; i < pts.length; i++) {
        const pi = toCanvas(pts[i]);
        ctx.lineTo(pi.cx, pi.cy);
      }
      ctx.stroke();
      ctx.restore();
      heartDone = true;
      onDone?.();
    }
  }

  requestAnimationFrame(frame);
}

function drawHeartFull(canvas) {
  if (!canvas) return;
  const ctx = setupCanvasHiDPI(canvas);
  const w = canvas.clientWidth || 920;
  const h = canvas.clientHeight || 520;

  const pts = computeImplicitHeartPoints(1200);
  const padding = 34;
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const spanX = Math.max(1e-6, maxX - minX);
  const spanY = Math.max(1e-6, maxY - minY);
  const scale = Math.min((w - padding * 2) / spanX, (h - padding * 2) / spanY);
  const ox = w / 2 - ((minX + maxX) / 2) * scale;
  const oy = h / 2 + ((minY + maxY) / 2) * scale;

  const toCanvas = (p) => ({ cx: ox + p.x * scale, cy: oy - p.y * scale });

  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, "#ff4d8d");
  gradient.addColorStop(0.6, "#7c5cff");
  gradient.addColorStop(1, "#ff7ab0");

  drawAxes(ctx, w, h);
  ctx.save();
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = gradient;
  ctx.shadowColor = "rgba(124,92,255,0.30)";
  ctx.shadowBlur = 10;
  ctx.beginPath();
  const pStart = toCanvas(pts[0]);
  ctx.moveTo(pStart.cx, pStart.cy);
  for (let i = 1; i < pts.length; i++) {
    const pi = toCanvas(pts[i]);
    ctx.lineTo(pi.cx, pi.cy);
  }
  ctx.stroke();
  ctx.restore();
}

function initLLRunAway() {
  // Make LL move across the website (viewport), not just inside the paper.
  // We'll keep the original LL button as a placeholder in the layout,
  // and create a fixed-position clone that actually runs away.
  if (document.querySelector("[data-ll-runner='true']")) return;
  if (llCleanup) llCleanup();

  const placeholder = choiceLL;
  placeholder.disabled = true;
  placeholder.style.opacity = "0.35";
  placeholder.style.cursor = "not-allowed";

  const btn = placeholder.cloneNode(true);
  btn.disabled = false;
  btn.style.opacity = "1";
  btn.style.cursor = "pointer";
  btn.dataset.llRunner = "true";
  btn.dataset.escaped = "0";
  btn.style.position = "fixed";
  btn.style.zIndex = "1000";
  document.body.appendChild(btn);

  function randomPlaceAwayFrom(x, y) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = btn.getBoundingClientRect();
    const bw = rect.width || 110;
    const bh = rect.height || 48;

    // Keep within viewport margins
    const margin = 18;
    const minX = margin;
    const minY = margin;
    const maxX = vw - bw - margin;
    const maxY = vh - bh - margin;

    // Try a few random spots not too close to cursor
    for (let i = 0; i < 16; i++) {
      const nx = minX + Math.random() * (maxX - minX);
      const ny = minY + Math.random() * (maxY - minY);
      const dx = nx - x;
      const dy = ny - y;
      if (dx * dx + dy * dy > 220 * 220) return { nx, ny };
    }
    // Fallback: just clamp near opposite corner-ish
    return {
      nx: clamp(vw - bw - margin - x, minX, maxX),
      ny: clamp(vh - bh - margin - y, minY, maxY),
    };
  }

  function teleport(ev) {
    if (btn.dataset.escaped === "1") return;
    const x = ev?.clientX ?? window.innerWidth / 2;
    const y = ev?.clientY ?? window.innerHeight / 2;
    const { nx, ny } = randomPlaceAwayFrom(x, y);
    btn.style.left = `${nx}px`;
    btn.style.top = `${ny}px`;
  }

  // Initial placement near the paper, then it will run.
  const initialRect = $(".paper-back").getBoundingClientRect();
  btn.style.left = `${Math.round(initialRect.left + initialRect.width * 0.36)}px`;
  btn.style.top = `${Math.round(initialRect.top + initialRect.height * 0.68)}px`;

  btn.addEventListener("pointerenter", teleport);
  btn.addEventListener("mouseover", teleport);
  const onMove = (ev) => {
    if (paperInner?.classList.contains("is-flipped") !== true) return;
    if (!btn.isConnected) return;
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = ev.clientX - cx;
    const dy = ev.clientY - cy;
    if (dx * dx + dy * dy < 140 * 140) teleport(ev);
  };
  document.addEventListener("pointermove", onMove);

  btn.addEventListener("click", () => {
    // If they manage to click, it must say "Incorrect".
    openModal("Incorrect", "Incorrect");
  });

  // Ensure it stays in bounds on resize.
  window.addEventListener("resize", () => teleport());

  llCleanup = () => {
    try {
      document.removeEventListener("pointermove", onMove);
    } catch {}
    try {
      btn.remove();
    } catch {}
    llCleanup = null;
  };
}

function spawnFallingHearts(durationMs = 4200) {
  if (!heartsRoot) return;
  const emojis = ["💗", "💖", "💘", "💝", "❤️", "💕"];
  const start = performance.now();

  const tick = () => {
    const now = performance.now();
    if (now - start > durationMs) return;

    const heart = document.createElement("div");
    heart.className = "heart";
    heart.textContent = emojis[(Math.random() * emojis.length) | 0];

    const x = Math.round(Math.random() * window.innerWidth);
    const r = Math.round((Math.random() * 60 - 30) * 1);
    const dur = (Math.random() * 1.6 + 2.6).toFixed(2);
    const size = Math.round(18 + Math.random() * 16);

    heart.style.setProperty("--x", `${x}px`);
    heart.style.setProperty("--r", `${r}deg`);
    heart.style.setProperty("--dur", `${dur}s`);
    heart.style.fontSize = `${size}px`;
    heart.style.left = "0px";

    heartsRoot.appendChild(heart);
    heart.addEventListener(
      "animationend",
      () => {
        heart.remove();
      },
      { once: true },
    );

    // Spawn cadence
    setTimeout(tick, 70 + Math.random() * 70);
  };

  tick();
}

function enterValentineMode() {
  // Clean up any runaway LL runner + handlers
  if (llCleanup) llCleanup();

  // Hide any modal that might be open
  closeModal();

  // Fade out the envelope/paper experience
  envelopeWrap.classList.add("is-fading-out");
  setTimeout(() => {
    envelopeWrap.style.display = "none";
  }, 650);

  // Switch theme + show note
  document.body.classList.add("is-valentine");
  if (valentine) {
    valentine.classList.remove("is-hidden");
    // Force style flush so transition applies
    void valentine.offsetWidth;
    valentine.classList.add("is-on");
  }
  spawnFallingHearts(5200);
}

async function runSequence() {
  setFunctionText();

  // Wait for the fall animation to finish
  await sleep(950);
  envelopeWrap.classList.remove("is-falling");

  // Open envelope flap
  envelopeWrap.classList.add("is-open");
  await sleep(650);

  // Reveal paper + slide out
  paper.classList.remove("is-hidden");
  envelopeWrap.classList.add("is-paper-out");
  await sleep(420);

  // Draw heart graph; then reveal Next button
  drawHeartAnimated(graph, () => {
    nextBtn.classList.add("is-visible");
  });
}

function setupEasterEggs() {
  document.addEventListener("keydown", (e) => {
    // Ignore if modal is open (except Escape which is handled elsewhere)
    if (!modal.classList.contains("is-hidden") && e.key !== "Escape") return;

    // Filter valid chars for typing
    if (e.key.length === 1) {
      keyBuffer += e.key.toLowerCase();
      if (keyBuffer.length > 60) keyBuffer = keyBuffer.slice(-60);
    } else if (e.key === "Backspace") {
      keyBuffer = keyBuffer.slice(0, -1);
    }

    // 1. GAUSS
    if (keyBuffer.endsWith("gauss")) {
      openModal("∑ 1..100 = 5050. I am happy.", "Carl Friedrich Gauss");
      keyBuffer = "";
    }

    // 2. EMACS
    if (keyBuffer.endsWith("emacs") || keyBuffer.endsWith("i like emacs")) {
      openModal("M-x butterfly", "Emacs Mode");
      keyBuffer = "";
    }

    // 3. BULGARIAN
    if (
      keyBuffer.endsWith("pratar jag bulgariska") ||
      keyBuffer.endsWith("pratarjagbulgariska")
    ) {
      openModal("Да, малко! (Yes, a little!)", "Български");
      keyBuffer = "";
    }

    // 4. DEFTONES
    if (keyBuffer.endsWith("deftones")) {
      openModal("I watched a change in you. It's like you never had wings.", "Deftones");
      keyBuffer = "";
    }

    // 5. SÄG JA (Triggers success)
    if (
      keyBuffer.endsWith("säg ja") ||
      keyBuffer.endsWith("sag ja") ||
      keyBuffer.endsWith("sagja") ||
      keyBuffer.endsWith("sägja")
    ) {
      enterValentineMode();
      keyBuffer = "";
    }
  });
}

function wireUI() {
  nextBtn.addEventListener("click", () => {
    paperInner.classList.add("is-flipped");
    // Ensure LL is set to fixed and starts running once flipped.
    initLLRunAway();
  });

  choiceSS.addEventListener("click", () => {
    enterValentineMode();
  });

  modalOk.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    const t = e.target;
    if (t?.dataset?.close === "true") closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("is-hidden")) closeModal();
  });

  setupEasterEggs();
}

window.addEventListener("load", () => {
  wireUI();
  runSequence();
});

// Keep the graph crisp when the viewport changes (mobile rotation, etc.).
let resizeRaf = 0;
window.addEventListener("resize", () => {
  if (!heartDone) return;
  if (document.body.classList.contains("is-valentine")) return;
  if (!graph?.isConnected) return;
  cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(() => drawHeartFull(graph));
});
