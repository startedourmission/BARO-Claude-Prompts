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

// ── 페이지 로드 시 모든 텍스트 타이핑 ──
function typeAll() {
  // 느린 그룹: 히어로, 네비 (프레임당 1글자)
  const slow = [
    ...document.querySelectorAll('.hero-title, .hero-subtitle'),
    ...document.querySelectorAll('.nav-pill'),
  ];
  // 빠른 그룹: 본문 (프레임당 18글자)
  const fast = [
    ...document.querySelectorAll('.chapter.active .section-title, .chapter.active .prompt-meta, .chapter.active .prompt-text'),
  ];

  const logoText = LOGO;
  logoEl.textContent = '';

  const slowOrig = slow.map(el => { const t = el.textContent; el.textContent = ''; return t; });
  const fastOrig = fast.map(el => { const t = el.textContent; el.textContent = ''; return t; });

  let globalI = 0;
  const SLOW_SPEED = 1;
  const FAST_SPEED = 18;
  // 빠른 그룹은 느린 그룹이 어느 정도 진행된 후 시작
  const FAST_START = 30; // 30프레임 후

  function tick() {
    let allDone = true;

    // 로고: 느린 속도
    if (logoEl.textContent.length < logoText.length) {
      logoEl.textContent = logoText.slice(0, Math.min(logoText.length, logoEl.textContent.length + 3));
      allDone = false;
    }

    // 느린 그룹
    slow.forEach((el, idx) => {
      const full = slowOrig[idx];
      const delay = idx * 8; // 요소마다 8프레임 딜레이
      const progress = Math.max(0, globalI - delay);
      const len = Math.min(full.length, progress * SLOW_SPEED);
      if (el.textContent.length < full.length) {
        el.textContent = full.slice(0, len);
        allDone = false;
      }
    });

    // 빠른 그룹
    if (globalI >= FAST_START) {
      fast.forEach((el, idx) => {
        const full = fastOrig[idx];
        const delay = idx * 2;
        const progress = Math.max(0, (globalI - FAST_START) - delay);
        const len = Math.min(full.length, progress * FAST_SPEED);
        if (el.textContent.length < full.length) {
          el.textContent = full.slice(0, len);
          allDone = false;
        }
      });
    } else {
      allDone = false;
    }

    globalI++;
    if (!allDone) requestAnimationFrame(tick);
    else {}
  }

  requestAnimationFrame(tick);
}

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

// ── Pretext 단어 단위 stagger transition ──
let transitioning = false;
let pt = null;
const STAGGER_DELAY = 30;
const REFLOW_FONT = '15.5px "Noto Serif KR", Georgia, "Times New Roman", serif';

import('https://esm.sh/@chenglou/pretext@0.0.3').then(m => {
  pt = m;
  console.log('Pretext loaded');
}).catch(() => {});

// 텍스트를 단어(세그먼트) 단위로 분리
function splitWords(text) {
  if (pt) {
    try {
      const prepared = pt.prepareWithSegments(text, REFLOW_FONT);
      const { lines } = pt.layoutWithLines(prepared, 9999, 28);
      // 한 줄로 나오니까 단어 경계를 추출
      // Pretext가 세그먼트로 분리해주므로 공백 기준 split보다 정확
    } catch (_) {}
  }
  // 공백/줄바꿈 기준 단어 분리 (구분자 포함)
  return text.match(/\S+\s*|\n/g) || [text];
}

// 한번에 지우기
function eraseText(el, full, resolve) {
  el.textContent = '';
  resolve();
}

// 단어 단위로 채우기 (앞에서부터)
function typeText(el, full, resolve) {
  const words = splitWords(full);
  let count = 0;
  function tick() {
    count = Math.min(words.length, count + 3);
    el.textContent = words.slice(0, count).join('');
    if (count < words.length) requestAnimationFrame(tick);
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

  // Phase 1: 한번에 지우기
  oldChapter.classList.remove('active');
  restoreTexts(oldChapter);

  {

    // Phase 2: 새 글자 계단식으로 타이핑
    const newTexts = newChapter.querySelectorAll('.prompt-text, .prompt-meta, .section-title');
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
    });
  }
}

// 숨겨진 챕터의 텍스트를 원본으로 복원
function restoreTexts(chapterEl) {
  const chId = chapterEl.id.replace('chapter-', '');
  const ch = chapters.find(c => c.id === chId);
  if (!ch) return;
  const titles = chapterEl.querySelectorAll('.section-title');
  const metas = chapterEl.querySelectorAll('.prompt-meta');
  const texts = chapterEl.querySelectorAll('.prompt-text');
  let ti = 0, mi = 0, pi = 0;
  ch.sections.forEach(sec => {
    if (titles[ti]) titles[ti].textContent = sec.title;
    ti++;
    sec.prompts.forEach(p => {
      const meta = [];
      if (p.baro) meta.push(`바로 ${p.baro}`);
      if (p.step) meta.push(p.step);
      if (meta.length && metas[mi]) { metas[mi].textContent = meta.join(' · '); mi++; }
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

// ── 페이지 로드 시 타이핑 시작 ──
typeAll();

