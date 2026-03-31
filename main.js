import { chapters } from './data.js';

const activeChapter = { id: '01' };
const navInner = document.getElementById('nav-inner');
const contentEl = document.getElementById('content');
const toastEl = document.getElementById('toast');

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

      prompt.addEventListener('click', () => {
        navigator.clipboard.writeText(p.text).then(() => showToast('복사됨'));
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

  // Phase 1: 기존 글자 계단식으로 지우기
  const oldTexts = oldChapter.querySelectorAll('.prompt-text, .section-title');
  const erasePromises = [];

  oldTexts.forEach((el, i) => {
    const full = el.textContent;
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

// ── Toast (타이핑) ──
let toastTimer, toastRaf;
function showToast(msg) {
  clearTimeout(toastTimer);
  cancelAnimationFrame(toastRaf);

  toastEl.textContent = '';
  toastEl.classList.add('show');

  let i = 0;
  function tick() {
    i++;
    toastEl.textContent = msg.slice(0, i);
    if (i < msg.length) toastRaf = requestAnimationFrame(tick);
    else toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1200);
  }
  toastRaf = requestAnimationFrame(tick);
}
