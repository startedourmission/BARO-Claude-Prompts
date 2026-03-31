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

// ── Switch chapter ──
function switchChapter(id) {
  activeChapter.id = id;
  document.querySelectorAll('.nav-pill').forEach(p =>
    p.classList.toggle('active', p.dataset.chapter === id)
  );
  document.querySelectorAll('.chapter').forEach(c =>
    c.classList.toggle('active', c.id === `chapter-${id}`)
  );
}

// ── Toast ──
let t;
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(t);
  t = setTimeout(() => toastEl.classList.remove('show'), 1500);
}
