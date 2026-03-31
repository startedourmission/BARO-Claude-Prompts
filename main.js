import { chapters } from './data.js';

const activeChapter = { id: '01' };
const navInner = document.getElementById('nav-inner');
const contentEl = document.getElementById('content');

// ── ASCII 로고 ──
const LOGO = `                   vlllr       1l1
                   vlllll     1llv
                    vlll1j    lllî    jll1
              1lv    1lll1   vll1   rllll1j
             lllllv   jllll  rllv  vllllv
              v11ll1v1 jllll vllv1llllll
                 r1llllvvllll1l1vlllllv
                    v1llllllllllllllv      îj1l
                       vlllllllllllll1llllll1lv
           1llllllllllllvlllllllllllll1vvr
                    vîîî1lllllllllllv1vvl1v1vr
                     v1lll11lllllllj l11llllll1í
                  lllll1lvllvl1llll1lv
               v1lll11 î1ll 1l1vlll11l1v
              j1l1j   vllv  1ll l1llv 111v
                     1llv  v11   îlll1  11lj
                   j111    lll     vll1
                  î11z    lll1      vlv
                          o1l1`;

const logoEl = document.getElementById('ascii-logo');
logoEl.textContent = LOGO;

// ── Pretext: 텍스트가 로고를 피해 리플로우 ──
let pt = null;
const FONT = '15.5px "Noto Serif KR", Georgia, "Times New Roman", serif';
const LH = 28; // 15.5 * 1.8

import('https://esm.sh/@chenglou/pretext@0.0.3').then(m => {
  pt = m;
  reflowAll();
}).catch(() => console.log('Pretext unavailable'));

function reflowAll() {
  if (!pt) return;
  const logoRect = logoEl.getBoundingClientRect();
  if (logoRect.width === 0) return;

  const prompts = document.querySelectorAll('.chapter.active .prompt-text');

  prompts.forEach(el => {
    const elRect = el.getBoundingClientRect();
    const overlaps = elRect.bottom > logoRect.top && elRect.top < logoRect.bottom &&
                     elRect.right > logoRect.left;

    if (!overlaps) {
      // 겹치지 않으면 원본 복원
      if (el.dataset.reflowed) {
        el.textContent = el.dataset.original;
        delete el.dataset.reflowed;
      }
      return;
    }

    // Pretext layoutNextLine으로 줄마다 다른 너비 적용
    const original = el.dataset.original || el.textContent;
    el.dataset.original = original;
    el.dataset.reflowed = '1';

    const fullW = el.offsetWidth;
    const logoW = logoRect.width + 20; // gap
    const prepared = pt.prepareWithSegments(original, FONT, { whiteSpace: 'pre-wrap' });
    let cursor = { segmentIndex: 0, graphemeIndex: 0 };
    let y = elRect.top;

    el.innerHTML = '';

    for (let safety = 0; safety < 200; safety++) {
      const lineHitsLogo = (y + LH > logoRect.top && y < logoRect.bottom);
      const w = lineHitsLogo ? Math.max(fullW - logoW, 80) : fullW;

      const line = pt.layoutNextLine(prepared, cursor, w);
      if (!line) break;

      const div = document.createElement('div');
      div.className = 'reflow-line';
      div.textContent = line.text;
      if (lineHitsLogo) div.style.maxWidth = w + 'px';
      el.appendChild(div);

      cursor = line.end;
      y += LH;
    }
  });
}

let scrollRaf;
window.addEventListener('scroll', () => {
  if (scrollRaf) return;
  scrollRaf = requestAnimationFrame(() => { reflowAll(); scrollRaf = null; });
}, { passive: true });

// ── Nav ──
chapters.forEach(ch => {
  const btn = document.createElement('button');
  btn.className = `nav-pill${ch.id === activeChapter.id ? ' active' : ''}`;
  btn.textContent = `${ch.id}장 ${ch.title}`;
  btn.dataset.chapter = ch.id;
  btn.addEventListener('click', () => switchChapter(ch.id));
  navInner.appendChild(btn);
});

// ── Content ──
chapters.forEach(ch => {
  const div = document.createElement('div');
  div.className = `chapter${ch.id === activeChapter.id ? ' active' : ''}`;
  div.id = `chapter-${ch.id}`;

  ch.sections.forEach(section => {
    const group = document.createElement('div');
    group.className = 'section-group';

    const title = document.createElement('h3');
    title.className = 'section-title';
    title.textContent = section.title;
    group.appendChild(title);

    section.prompts.forEach(p => {
      const prompt = document.createElement('div');
      prompt.className = 'prompt';

      const meta = [];
      if (p.baro) meta.push(`바로 ${p.baro}`);
      if (p.step) meta.push(p.step);

      if (meta.length) {
        const metaEl = document.createElement('div');
        metaEl.className = 'prompt-meta';
        metaEl.textContent = meta.join(' · ');
        prompt.appendChild(metaEl);
      }

      const text = document.createElement('div');
      text.className = 'prompt-text';
      text.textContent = p.text;
      prompt.appendChild(text);

      prompt.addEventListener('click', (e) => {
        navigator.clipboard.writeText(p.text);
        inlineCopied(text, e);
      });

      group.appendChild(prompt);
    });
    div.appendChild(group);
  });

  contentEl.appendChild(div);
});

// ── Character-by-character stagger transition ──
let transitioning = false;
const CHARS_PER_FRAME = 12; // 한 프레임당 지울/채울 글자 수
const STAGGER_DELAY = 30;   // 프롬프트 간 시차(ms)

// 글자를 한 글자씩 지우기 (뒤에서부터)
function eraseText(el, full, resolve) {
  let len = full.length;
  function tick() {
    len = Math.max(0, len - CHARS_PER_FRAME);
    el.textContent = full.slice(0, len);
    if (len > 0) requestAnimationFrame(tick);
    else resolve();
  }
  requestAnimationFrame(tick);
}

// 글자를 한 글자씩 채우기 (앞에서부터)
function typeText(el, full, resolve) {
  let len = 0;
  function tick() {
    len = Math.min(full.length, len + CHARS_PER_FRAME);
    el.textContent = full.slice(0, len);
    if (len < full.length) requestAnimationFrame(tick);
    else resolve();
  }
  requestAnimationFrame(tick);
}

function switchChapter(id) {
  if (id === activeChapter.id || transitioning) return;
  transitioning = true;

  document.querySelectorAll('.nav-pill').forEach(p =>
    p.classList.toggle('active', p.dataset.chapter === id)
  );

  const oldChapter = document.getElementById(`chapter-${activeChapter.id}`);
  const newChapter = document.getElementById(`chapter-${id}`);
  activeChapter.id = id;

  // Phase 1: 기존 글자 계단식으로 지우기 (reflowed 상태 복원 먼저)
  oldChapter.querySelectorAll('.prompt-text[data-reflowed]').forEach(el => {
    el.textContent = el.dataset.original;
    delete el.dataset.reflowed;
  });
  const oldTexts = oldChapter.querySelectorAll('.prompt-text, .section-title');
  const erasePromises = [];

  oldTexts.forEach((el, i) => {
    const full = el.dataset.original || el.textContent;
    erasePromises.push(new Promise(resolve => {
      setTimeout(() => eraseText(el, full, resolve), i * STAGGER_DELAY);
    }));
  });

  Promise.all(erasePromises).then(() => {
    // 원문 복원 후 숨기기
    oldTexts.forEach(el => {
      const ch = chapters.find(c => oldChapter.id === `chapter-${c.id}`);
      // textContent는 이미 빈 상태이므로 active만 제거
    });
    oldChapter.classList.remove('active');
    restoreTexts(oldChapter);

    // Phase 2: 새 글자 계단식으로 타이핑
    const newTexts = newChapter.querySelectorAll('.prompt-text, .section-title');
    const originals = Array.from(newTexts).map(el => el.textContent);
    newTexts.forEach(el => el.textContent = '');
    newChapter.classList.add('active');

    const typePromises = [];
    newTexts.forEach((el, i) => {
      typePromises.push(new Promise(resolve => {
        setTimeout(() => typeText(el, originals[i], resolve), i * STAGGER_DELAY);
      }));
    });

    Promise.all(typePromises).then(() => {
      transitioning = false;
      reflowAll();
    });
  });
}

// 숨겨진 챕터의 텍스트를 원본으로 복원
function restoreTexts(chapterEl) {
  const chId = chapterEl.id.replace('chapter-', '');
  const ch = chapters.find(c => c.id === chId);
  if (!ch) return;
  const titles = chapterEl.querySelectorAll('.section-title');
  const texts = chapterEl.querySelectorAll('.prompt-text');
  let ti = 0, pi = 0;
  ch.sections.forEach(sec => {
    if (titles[ti]) titles[ti].textContent = sec.title;
    ti++;
    sec.prompts.forEach(p => {
      if (texts[pi]) texts[pi].textContent = p.text;
      pi++;
    });
  });
}

// ── 인라인 "복사됨!" 타이핑 ──
const COPY_MSG = ' 복사됨! ';
let copyAnimating = false;

function inlineCopied(textEl, event) {
  if (copyAnimating) return;
  copyAnimating = true;

  const original = textEl.textContent;

  // 클릭 위치에서 텍스트 내 오프셋 찾기
  let offset = original.length;
  const range = document.caretRangeFromPoint?.(event.clientX, event.clientY);
  if (range && textEl.contains(range.startContainer)) {
    offset = range.startOffset;
  }

  const before = original.slice(0, offset);
  const after = original.slice(offset);

  const span = document.createElement('span');
  span.className = 'copy-badge';

  function render(msg) {
    textEl.textContent = '';
    textEl.appendChild(document.createTextNode(before));
    span.textContent = msg;
    textEl.appendChild(span);
    textEl.appendChild(document.createTextNode(after));
  }

  // Phase 1: 한 글자씩 타이핑
  let i = 0;
  function typeIn() {
    i++;
    render(COPY_MSG.slice(0, i));
    if (i < COPY_MSG.length) requestAnimationFrame(typeIn);
    else setTimeout(eraseOut, 600);
  }

  // Phase 2: 한 글자씩 지우기
  function eraseOut() {
    let j = COPY_MSG.length;
    function tick() {
      j--;
      if (j > 0) { render(COPY_MSG.slice(0, j)); requestAnimationFrame(tick); }
      else { textEl.textContent = original; copyAnimating = false; }
    }
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(typeIn);
}
