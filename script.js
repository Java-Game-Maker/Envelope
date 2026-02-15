const $ = (sel) => document.querySelector(sel);

const envelopeWrap = $("#envelopeWrap");
const paper = $("#paper");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runSequence() {
  // 1. Wait for the fall animation to finish (approx 1s)
  await sleep(950);
  envelopeWrap.classList.remove("is-falling");

  // 2. Open envelope flap
  envelopeWrap.classList.add("is-open");
  await sleep(650);

  // 3. Reveal paper + slide out
  paper.classList.remove("is-hidden");
  envelopeWrap.classList.add("is-paper-out");
}

window.addEventListener("load", () => {
  runSequence();
});
