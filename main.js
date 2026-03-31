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

// ── Switch chapter with stagger transition ──
let transitioning = false;

function switchChapter(id) {
  if (id === activeChapter.id || transitioning) return;
  transitioning = true;

  // Nav update
  document.querySelectorAll('.nav-pill').forEach(p =>
    p.classList.toggle('active', p.dataset.chapter === id)
  );

  const oldChapter = document.getElementById(`chapter-${activeChapter.id}`);
  const newChapter = document.getElementById(`chapter-${id}`);
  activeChapter.id = id;

  // Stagger-out: old items slide left
  const oldItems = oldChapter.querySelectorAll('.section-group, .prompt');
  const STAGGER = 25;
  const DURATION = 280;

  oldItems.forEach((el, i) => {
    el.style.transition = `opacity ${DURATION}ms ease, transform ${DURATION}ms ease`;
    el.style.transitionDelay = `${i * STAGGER}ms`;
    el.classList.add('exit-left');
  });

  const outTime = Math.min(oldItems.length * STAGGER, 200) + DURATION;

  setTimeout(() => {
    oldChapter.classList.remove('active');
    // Clean up old
    oldItems.forEach(el => {
      el.classList.remove('exit-left');
      el.style.transition = '';
      el.style.transitionDelay = '';
    });

    // Show new chapter, items start hidden to the right
    const newItems = newChapter.querySelectorAll('.section-group, .prompt');
    newItems.forEach(el => el.classList.add('enter-right'));
    newChapter.classList.add('active');

    // Force reflow then stagger-in
    void newChapter.offsetHeight;

    newItems.forEach((el, i) => {
      el.style.transition = `opacity ${DURATION}ms ease, transform ${DURATION}ms ease`;
      el.style.transitionDelay = `${i * STAGGER}ms`;
      el.classList.remove('enter-right');
    });

    const inTime = Math.min(newItems.length * STAGGER, 200) + DURATION;

    setTimeout(() => {
      newItems.forEach(el => {
        el.style.transition = '';
        el.style.transitionDelay = '';
      });
      transitioning = false;
    }, inTime);
  }, outTime);
}

// ── Toast ──
let t;
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(t);
  t = setTimeout(() => toastEl.classList.remove('show'), 1500);
}
