import { chapters } from './data.js';

const activeChapter = { id: '01' };
const navInner = document.getElementById('nav-inner');
const contentEl = document.getElementById('content');

// ── ASCII 로고 교대 ──
const LOGO_A = `                                     ooooot               It
                                   Itoooooot            Ioooot
                                   ¤ooooooooI           oooooo
                                    oooooooooo         ooooooo
                                     tooooooot         coooooI         ooooot
                                      toooooooo        ooooot%       Jtooooooo
                                       tooooooot       tooooo       toooooooot
                         tooooot        oooooooot      toooot     IooooooooooI
                         toooooootI      ttooooot¤     ooooo‰    toooooooooo
                         cooooooooooo     tooooooot   Iooooo   oooooooooooI
                           IooooooooootI   oooooooot  toooot  tooooooooot
                              ¤tooooooooot  ItooooooI tooot IooooooooooI
                                totooooooooo¤Iooooooo‰tooootooooooooot
                                   rtoooooooootooooooItoooooooooooooo
                                      tooooooooooooooooooooooooooooI         %totctotIî
                                         ooooooooooooooooooooooooot  tttoooooooooooooot
                     t¤%                    ttoooooooooooooooooooooooooooooooooooooooo
                    oooooooooooooooottottttItIooooooooooooooooooooooooooooootot%î
                     ttooooooooooooooooooooooooooooooooooooooooooooootI
                                 zttoottt%tIttooooooooooooooooooootttIIttttttz
                                            ¤oooooooooooooooooooooooooooooooooooooootI
                                        ‰ttoooootooooooooooooooto  ¤ottoooooooooooooooo
                                     %oooooooooIIooooooooooooooooot         Itooooooooo
                                  toooooooooI otoooottooooooooooooooo              %
                               toooooooott   otooot Iooootoooooo¤oooooo
                            ¤tooooooooI     tooott  toooI toooooo Itoooot
                           toooooooo      ƒoooott   ooot   ooooooo% Itoooot
                           otooot        toooot    %ooot    ttoooooI  %tooooo
                                       toooooo     toooo     toooooot    ttooto
                                      tooooot      tooot       toooooo     otooo
                                    ttoooto       toooot        toooooot     ‰I
                                   toooot         tooooI         Iooooot
                                   oooot          oooot           oooooo
                                    %‰           toooot
                                                 toooot
                                                  ooooI`;

const LOGO_B = `                     (»»«»«««»««»»»//¬
                 /»«»+                «»»/
             *«««                      »«««««¬
           (»«     )»                /«««««««««»
         ¬«»       ««/    /«»/       »«««««««««««»
        »»                 ««»       ««««««««««««««
      ¬»/      •«»                   »««««««««««««««)
     »»«    «» ««•                 «»/»««««««««««««««»
    )»     »«« »«) /«««»          »««»/«««««««««««««««/
    »«     »««»»»»»«««»)          »««««/»«««««««««««««««
   »»«/   ««««»«»»»»/            /««««»»»«««««««««««««»
  /»««   /««»«                   »««««»/»««««««««««««»7
  «« »««»   »«»»»««««»       (»     »«««««««««««««««««««/
  «» /«««»  »«««««««««               »««««« ««««««««««««»
  «»   »««»«»                  »«»     »«««»««««««««««««»
  »«    »««« )««»«»«                    «««»»«««««««««««»
  »»     ¬«»««««««»                     /«««»«««««««««««/
  *»»    »«»««»»«             «»»»/»«»(  »»«««««««««««««
   /»   »«                »««««««««««««««/»««««««««««««»
    «»  «»     »  )    «»«««««««««««««««««««««««««««««»/
    »»/ »»   «««»     »««««««««««««««««««««««««««««««»»
     (««»/    «(     ««««««««««» /«««««««««««««««««««/
       «»»          ««««««««««««««««««««««««««««««««)
        •««         ««««««««««««««««««««««««««««««»
          »•(      /»«««««««««««««««««««««««««««««
           (»»(    «««««««««««««««««««««««««««»)
              )»»/ «««««««««««««««««««««««««/
                 /»««««««««««««««««««««»««
                       »»»««««««»»»«¬`;

const logoEl = document.getElementById('ascii-logo');
const logos = [LOGO_A, LOGO_B];
let logoIdx = 0;
let logoRaf;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.random() * (i + 1) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function swapLogo() {
  const from = logos[logoIdx];
  const to = logos[1 - logoIdx];
  logoIdx = 1 - logoIdx;

  // 줄 단위로 정렬, 각 줄 내에서만 랜덤 모프
  const fromLines = from.split('\n');
  const toLines = to.split('\n');
  const lineCount = Math.max(fromLines.length, toLines.length);

  const bufs = [];
  const allJobs = []; // { line, col }

  for (let r = 0; r < lineCount; r++) {
    const fl = fromLines[r] || '';
    const tl = toLines[r] || '';
    const maxW = Math.max(fl.length, tl.length);
    bufs[r] = [...fl.padEnd(maxW)];
    for (let c = 0; c < maxW; c++) {
      const target = c < tl.length ? tl[c] : ' ';
      if (bufs[r][c] !== target) allJobs.push({ r, c, ch: target });
    }
  }

  shuffle(allJobs);
  let cursor = 0;
  const PER_FRAME = 8;

  function morphStep() {
    const end = Math.min(allJobs.length, cursor + PER_FRAME);
    for (let k = cursor; k < end; k++) {
      const { r, c, ch } = allJobs[k];
      bufs[r][c] = ch;
    }
    cursor = end;
    logoEl.textContent = bufs.map(b => b.join('')).join('\n');
    if (cursor < allJobs.length) logoRaf = requestAnimationFrame(morphStep);
    else logoEl.textContent = to;
  }
  logoRaf = requestAnimationFrame(morphStep);
}

logoEl.textContent = LOGO_A;
setInterval(swapLogo, 10000);

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
