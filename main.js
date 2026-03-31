import { chapters } from './data.js';

// ── Pretext: text measurement without DOM ──
// @chenglou/pretext computes text height/lines purely in JS via canvas measureText.
// We use prepare() + layout() for masonry card height prediction,
// and prepareWithSegments() + walkLineRanges() for tight-fit width calculation.

let pt = null; // pretext module

const FONT = '14.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const FONT_MOBILE = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const LINE_HEIGHT_PX = 24; // 14.5 * 1.65 ≈ 24
const LINE_HEIGHT_PX_MOBILE = 23;
const CARD_PAD_X = 32;
const CARD_PAD_TOP = 44;
const CARD_PAD_BOTTOM = 16;
const GAP = 16;

// Canvas fallback for when Pretext isn't loaded yet
const _canvas = document.createElement('canvas');
const _ctx = _canvas.getContext('2d');

function measureFallback(text, maxWidth, font, lh) {
  _ctx.font = font;
  let lines = 1, w = 0;
  for (const ch of text) {
    if (ch === '\n') { lines++; w = 0; continue; }
    const cw = _ctx.measureText(ch).width;
    if (w + cw > maxWidth && w > 0) { lines++; w = cw; }
    else w += cw;
  }
  return lines * lh;
}

// Pretext-powered measurement
function measureHeight(text, maxWidth, font, lh) {
  if (pt) {
    try {
      const prepared = pt.prepare(text, font);
      return pt.layout(prepared, maxWidth, lh).height;
    } catch (_) { /* fallback */ }
  }
  return measureFallback(text, maxWidth, font, lh);
}

// Pretext-powered tight width (shrink-wrap)
function measureTightWidth(text, maxWidth, font) {
  if (pt) {
    try {
      const prepared = pt.prepareWithSegments(text, font);
      let maxW = 0;
      pt.walkLineRanges(prepared, maxWidth, line => {
        if (line.width > maxW) maxW = line.width;
      });
      return maxW;
    } catch (_) { /* fallback */ }
  }
  return null; // no tight width without Pretext
}

// Pretext-powered hero title sizing
function fitHeroTitle() {
  const el = document.getElementById('hero-title');
  if (!el) return;
  const containerW = el.parentElement.offsetWidth;
  const text = el.textContent;

  if (pt) {
    // Binary search with Pretext for accurate single-line fit
    let lo = 24, hi = 72;
    while (hi - lo > 1) {
      const mid = (lo + hi) / 2;
      const font = `700 ${mid}px "Noto Serif KR", Georgia, serif`;
      const prepared = pt.prepare(text, font);
      const { lineCount } = pt.layout(prepared, containerW * 0.98, mid * 1.1);
      if (lineCount <= 1) lo = mid; else hi = mid;
    }
    el.style.fontSize = `${Math.min(lo, 56)}px`;
  } else {
    // Canvas fallback
    let lo = 24, hi = 72;
    while (hi - lo > 1) {
      const mid = (lo + hi) / 2;
      _ctx.font = `700 ${mid}px "Noto Serif KR", Georgia, serif`;
      if (_ctx.measureText(text).width <= containerW * 0.95) lo = mid; else hi = mid;
    }
    el.style.fontSize = `${Math.min(lo, 56)}px`;
  }
}

// ── State ──
let activeChapter = '01';

// ── DOM refs ──
const navInner = document.getElementById('nav-inner');
const contentEl = document.getElementById('content');
const toastEl = document.getElementById('toast');

// ── Navigation ──
function buildNav() {
  chapters.forEach(ch => {
    const pill = document.createElement('button');
    pill.className = `nav-pill${ch.id === activeChapter ? ' active' : ''}`;
    pill.textContent = `${ch.id}장 ${ch.title}`;
    pill.dataset.chapter = ch.id;
    pill.addEventListener('click', () => switchChapter(ch.id));
    navInner.appendChild(pill);
  });
}

// ── Content ──
function buildContent() {
  chapters.forEach(ch => {
    const chapterEl = document.createElement('div');
    chapterEl.className = `chapter${ch.id === activeChapter ? ' active' : ''}`;
    chapterEl.id = `chapter-${ch.id}`;

    ch.sections.forEach(section => {
      const group = document.createElement('div');
      group.className = 'section-group';

      const title = document.createElement('h3');
      title.className = 'section-title';
      title.textContent = section.title;
      group.appendChild(title);

      const masonry = document.createElement('div');
      masonry.className = 'masonry';

      section.prompts.forEach((p, i) => {
        masonry.appendChild(createCard(p, i));
      });

      group.appendChild(masonry);
      chapterEl.appendChild(group);
    });

    contentEl.appendChild(chapterEl);
  });
}

function createCard(prompt, idx) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.index = idx;

  const label = prompt.baro ? `BARO ${prompt.baro}` : '';
  const step = prompt.step || '';

  card.innerHTML = `
    <div class="card-header">
      ${label ? `<span class="card-label">${label}</span>` : '<span></span>'}
      ${step ? `<span class="card-step">${step}</span>` : ''}
    </div>
    <div class="card-body">
      <div class="card-text"></div>
    </div>
    <button class="card-copy" title="복사">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    </button>
  `;

  card.querySelector('.card-text').textContent = prompt.text;

  card.querySelector('.card-copy').addEventListener('click', e => {
    e.stopPropagation();
    copyText(prompt.text);
  });
  card.addEventListener('click', () => copyText(prompt.text));

  return card;
}

// ── Masonry layout powered by Pretext ──
function layoutMasonry() {
  const containerW = contentEl.offsetWidth;
  const mobile = window.innerWidth <= 760;
  const cols = mobile ? 1 : 2;
  const colW = (containerW - GAP * (cols - 1)) / cols;
  const textW = colW - CARD_PAD_X;
  const font = mobile ? FONT_MOBILE : FONT;
  const lh = mobile ? LINE_HEIGHT_PX_MOBILE : LINE_HEIGHT_PX;

  document.querySelectorAll('.chapter.active .masonry').forEach(masonry => {
    const cards = masonry.querySelectorAll('.card');
    const colHeights = new Array(cols).fill(0);

    cards.forEach(card => {
      const text = card.querySelector('.card-text').textContent;

      // Pretext: predict text height without reading DOM
      const textH = measureHeight(text, textW, font, lh);
      const cardH = CARD_PAD_TOP + textH + CARD_PAD_BOTTOM;

      // Pretext: compute tight width for short prompts
      const tightW = measureTightWidth(text, textW, font);
      let finalCardW = colW;
      if (tightW !== null && cols > 1 && tightW < textW * 0.7) {
        // Shrink card to tight-fit width (Pretext bubble style)
        finalCardW = tightW + CARD_PAD_X + 8;
      }

      // Place in shortest column
      let minCol = 0;
      for (let i = 1; i < cols; i++) {
        if (colHeights[i] < colHeights[minCol]) minCol = i;
      }

      const x = minCol * (colW + GAP);
      const y = colHeights[minCol];

      card.style.width = `${finalCardW}px`;
      card.style.transform = `translate(${x}px, ${y}px)`;
      card.style.opacity = '1';

      colHeights[minCol] = y + cardH + GAP;
    });

    masonry.style.height = `${Math.max(...colHeights)}px`;
  });
}

// ── Chapter switching ──
function switchChapter(id) {
  activeChapter = id;
  document.querySelectorAll('.nav-pill').forEach(p =>
    p.classList.toggle('active', p.dataset.chapter === id)
  );
  document.querySelectorAll('.chapter').forEach(c =>
    c.classList.toggle('active', c.id === `chapter-${id}`)
  );
  requestAnimationFrame(layoutMasonry);
}

// ── Clipboard + Toast ──
let toastT = null;
function copyText(text) {
  navigator.clipboard.writeText(text).then(() => showToast('프롬프트가 복사되었습니다'));
}
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => toastEl.classList.remove('show'), 2000);
}

// ── Stats ──
function updateStats() {
  let prompts = 0, sections = 0;
  chapters.forEach(ch => ch.sections.forEach(s => { sections++; prompts += s.prompts.length; }));
  document.getElementById('stat-prompts').textContent = prompts;
  document.getElementById('stat-sections').textContent = sections;
  document.getElementById('stat-chapters').textContent = chapters.length;
}

// ── Init ──
async function init() {
  // Load Pretext from CDN (non-blocking)
  const pretextLoad = import('https://esm.sh/@chenglou/pretext@0.0.3').then(m => {
    pt = m;
    console.log('Pretext loaded');
  }).catch(() => console.log('Pretext CDN unavailable, using canvas fallback'));

  buildNav();
  buildContent();
  updateStats();

  // Wait for fonts before measuring
  await document.fonts?.ready;

  fitHeroTitle();
  layoutMasonry();

  // Re-layout once Pretext loads for tighter measurements
  pretextLoad.then(() => {
    if (pt) {
      fitHeroTitle();
      layoutMasonry();
    }
  });

  // Resize debounce
  let resizeT;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { fitHeroTitle(); layoutMasonry(); }, 80);
  });
}

init();
