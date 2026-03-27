// ═══════════════════════════════════════
//  JOGO DA MEMÓRIA — MAGALU CLOUD
//  app.js
// ═══════════════════════════════════════

const DEFAULT_WORDS = [
  { text: "Soberania Digital", emoji: "🇧🇷" },
  { text: "Baixa Latência", emoji: "⚡" },
  { text: "Preço em Real", emoji: "💰" },
  { text: "Suporte em Português", emoji: "🗣️" },
  { text: "Data Center Brasil", emoji: "🏢" },
  { text: "LGPD Nativa", emoji: "🔒" },
  { text: "Cloud Soberana", emoji: "🛡️" },
  { text: "Kubernetes", emoji: "☸️" },
  { text: "Object Storage", emoji: "🗄️" },
  { text: "Alta Disponibilidade", emoji: "🔄" },
  { text: "Máquina Virtual", emoji: "🖥️" },
  { text: "Rede Privada", emoji: "🌐" },
  { text: "Escalabilidade", emoji: "📈" },
  { text: "Backup Automático", emoji: "💾" },
  { text: "Monitoramento", emoji: "📊" },
  { text: "Serverless", emoji: "🚀" }
];

const EMOJI_CATEGORIES = {
  "🔧 Tech":    ["🚀","💻","🖥️","📡","📱","🛰️","☸️","🔌","⌨️","🖱️","💿","📀","🔋","📟","📠","🖨️","📺","📻","⏱️","⏰"],
  "🌍 Natureza": ["🌍","🌎","🌏","🌊","🔥","⭐","🌙","☀️","🌈","⛅","🌩️","❄️","🌸","🌺","🌻","🌲","🌵","🍄","🐝","🦋"],
  "🧠 Ciência":  ["🧠","🔬","🧪","⚗️","🧬","🔭","📐","📏","💊","🩺","🌡️","🧲","⚡","💎","🪐","🛸","🤖","👾","🧫","🔮"],
  "📦 Objetos": ["📦","🗄️","🗂️","📁","📂","📝","📎","🔐","🔑","🔒","🛡️","🏷️","💰","💳","📊","📈","📉","🗃️","🧰","🔧"],
  "😀 Rostos":  ["😀","😎","🤓","🧐","🤯","🥳","😱","🤔","🫡","🤩","😴","🥸","👻","💀","🤡","👽","🙈","🙉","🙊","🐵"],
  "🎯 Símbolos":["🎯","💡","⚙️","🏗️","🧩","🎲","♻️","✅","❌","⚠️","🏆","🎖️","🥇","🎪","🎨","🎵","🔔","📢","🏴","🚩"],
  "🇧🇷 Bandeiras":["🇧🇷","🇺🇸","🇪🇺","🇯🇵","🇩🇪","🇫🇷","🇬🇧","🇰🇷","🇮🇳","🇨🇳","🇨🇦","🇦🇺","🇲🇽","🇦🇷","🇵🇹","🇪🇸","🇮🇹","🇷🇺","🇿🇦","🏳️‍🌈"],
  "🐾 Animais": ["🐾","🐶","🐱","🐻","🦊","🐼","🦁","🐯","🐸","🐵","🐔","🐧","🐦","🦅","🦄","🐙","🦀","🐬","🐳","🦈"],
  "🍕 Comida":  ["🍕","🍔","🌮","🍣","🍿","🎂","🍪","🍩","🍉","🍓","🍇","🥑","🌽","🥐","☕","🧃","🍺","🧁","🍫","🥤"]
};
const CATEGORY_NAMES = Object.keys(EMOJI_CATEGORIES);
let activeEmojiCategory = CATEGORY_NAMES[0];

let words = JSON.parse(JSON.stringify(DEFAULT_WORDS));
let gridType = "2x5";
let selectedEmoji = EMOJI_CATEGORIES[CATEGORY_NAMES[0]][0];
let pendingImageUrl = null; // URL of uploaded image for new word
let activeSourceTab = "emoji"; // "emoji" or "image"

let cards = [], flippedCards = [], matchedPairs = 0, totalPairs = 0, moves = 0;
let timerInterval = null, seconds = 0, locked = false;

const gridCfg = t => ({ "2x5": { p: 5 }, "4x4": { p: 8 }, "4x5": { p: 10 }, "4x6": { p: 12 } }[t]);

// ═══════════════════════════════════════
//  CONFIG PERSISTENCE (Server-side)
// ═══════════════════════════════════════

async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    if (data && data.words && data.words.length >= 5) {
      words = data.words;
      gridType = data.gridType || "2x5";
    }
  } catch { /* use defaults */ }
}

async function saveConfig() {
  try {
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ words, gridType })
    });
  } catch { /* silent fail */ }
}

// ═══════════════════════════════════════
//  IMAGE UPLOAD
// ═══════════════════════════════════════

async function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) return data.url;
    throw new Error(data.error);
  } catch (err) {
    alert('Erro no upload: ' + err.message);
    return null;
  }
}

function setupImageUpload() {
  const area = document.getElementById('imageUploadArea');
  const input = document.getElementById('imageFileInput');
  if (!area || !input) return;

  area.addEventListener('click', () => input.click());

  area.addEventListener('dragover', (e) => {
    e.preventDefault();
    area.classList.add('dragover');
  });

  area.addEventListener('dragleave', () => {
    area.classList.remove('dragover');
  });

  area.addEventListener('drop', async (e) => {
    e.preventDefault();
    area.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) await handleImageFile(file);
  });

  input.addEventListener('change', async () => {
    if (input.files[0]) await handleImageFile(input.files[0]);
    input.value = '';
  });
}

async function handleImageFile(file) {
  if (file.size > 5 * 1024 * 1024) {
    alert('Imagem muito grande! Máximo 5MB.');
    return;
  }

  const area = document.getElementById('imageUploadArea');
  area.innerHTML = '<div class="upload-label">Enviando...</div>';

  const url = await uploadImage(file);
  if (url) {
    pendingImageUrl = url;
    area.classList.add('has-image');
    area.innerHTML = `
      <div class="image-preview-row">
        <img src="${url}" class="image-preview" alt="Preview">
        <span class="image-preview-name">${file.name}</span>
        <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); clearImagePreview()">✕</button>
      </div>`;
  } else {
    resetUploadArea();
  }
}

function clearImagePreview() {
  pendingImageUrl = null;
  resetUploadArea();
}

function resetUploadArea() {
  const area = document.getElementById('imageUploadArea');
  area.classList.remove('has-image');
  area.innerHTML = `
    <div class="upload-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>
    <div class="upload-label">Arraste uma imagem ou <span>clique para escolher</span></div>
    <div class="upload-hint">JPG, PNG, GIF, WebP ou SVG — máx. 5MB</div>`;
}

// ═══════════════════════════════════════
//  SOURCE TABS (Emoji vs Imagem)
// ═══════════════════════════════════════

function switchSourceTab(tab) {
  activeSourceTab = tab;
  document.querySelectorAll('.image-source-tab').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tab);
  });
  document.querySelectorAll('.tab-content').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tab);
  });
  if (tab === 'image') {
    pendingImageUrl = null;
    resetUploadArea();
  }
}

// ═══════════════════════════════════════
//  SETTINGS MODAL
// ═══════════════════════════════════════

function selectGrid(t) {
  gridType = t;
  document.querySelectorAll('.grid-opt').forEach(e =>
    e.classList.toggle('selected', e.dataset.grid === t)
  );
}

function openSettings() {
  renderWordList();
  renderEmojiPicker();
  switchSourceTab('emoji');
  document.querySelectorAll('.grid-opt').forEach(e =>
    e.classList.toggle('selected', e.dataset.grid === gridType)
  );
  document.getElementById('settingsModal').classList.add('active');
  setupImageUpload();
}

function closeSettings() {
  document.getElementById('settingsModal').classList.remove('active');
  saveConfig();
}

function renderWordList() {
  document.getElementById('wordList').innerHTML = words.map((w, i) => {
    const icon = w.image
      ? `<img src="${w.image}" alt="${w.text}">`
      : `<span>${w.emoji}</span>`;
    return `<div class="word-tag">${icon} ${w.text}<span class="remove-word" ontouchend="event.preventDefault();removeWord(${i})" onclick="removeWord(${i})">✕</span></div>`;
  }).join('');
}

function renderEmojiPicker() {
  // Category tabs
  const tabsEl = document.getElementById('emojiCategoryTabs');
  if (tabsEl) {
    tabsEl.innerHTML = CATEGORY_NAMES.map(cat => {
      const icon = cat.split(' ')[0];
      return `<div class="emoji-cat-tab ${cat === activeEmojiCategory ? 'active' : ''}" onclick="selectEmojiCategory('${cat}')" title="${cat}">${icon}</div>`;
    }).join('');
  }
  // Emoji grid
  const emojis = EMOJI_CATEGORIES[activeEmojiCategory] || [];
  document.getElementById('emojiPicker').innerHTML = emojis.map(e =>
    `<div class="emoji-opt ${e === selectedEmoji ? 'selected' : ''}" onclick="pickEmoji('${e}',this)">${e}</div>`
  ).join('');
}

function selectEmojiCategory(cat) {
  activeEmojiCategory = cat;
  renderEmojiPicker();
}

function pickEmoji(e, el) {
  selectedEmoji = e;
  document.querySelectorAll('.emoji-opt').forEach(x => x.classList.remove('selected'));
  el.classList.add('selected');
}

function addWord() {
  const input = document.getElementById('newWordInput');
  const text = input.value.trim();
  if (!text) return;

  const newWord = { text };

  if (activeSourceTab === 'image' && pendingImageUrl) {
    newWord.image = pendingImageUrl;
    newWord.emoji = "🖼️";
  } else {
    newWord.emoji = selectedEmoji;
  }

  words.push(newWord);
  input.value = '';
  pendingImageUrl = null;
  if (activeSourceTab === 'image') resetUploadArea();
  renderWordList();
  saveConfig();
}

function removeWord(i) {
  if (words.length <= 5) return alert("Mínimo de 5 palavras!");
  words.splice(i, 1);
  renderWordList();
  saveConfig();
}

// ═══════════════════════════════════════
//  GAME LOGIC
// ═══════════════════════════════════════

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startGame() {
  const c = gridCfg(gridType);
  totalPairs = c.p; matchedPairs = 0; moves = 0; seconds = 0;
  flippedCards = []; locked = false;
  clearInterval(timerInterval); timerInterval = null;
  updateUI();

  const sel = shuffle([...words]).slice(0, c.p);
  let cd = [];
  sel.forEach((w, i) => {
    cd.push({ text: w.text, emoji: w.emoji, image: w.image || null, pid: i });
    cd.push({ text: w.text, emoji: w.emoji, image: w.image || null, pid: i });
  });
  cards = shuffle(cd);
  renderBoard();
}

function renderBoard() {
  const b = document.getElementById('board');
  b.className = `board grid-${gridType}`;
  b.innerHTML = cards.map((c, i) => {
    const visual = c.image
      ? `<img src="${c.image}" class="card-img" alt="${c.text}">`
      : `<div class="card-emoji">${c.emoji}</div>`;
    return `<div class="card" data-index="${i}"><div class="card-inner"><div class="card-face card-front"><img src="assets/icon-mgc.svg" class="card-front-icon-img" alt="MGC"><div class="card-front-label">MGC</div></div><div class="card-face card-back">${visual}<div class="card-text">${c.text}</div></div></div></div>`;
  }).join('');

  document.querySelectorAll('.card').forEach((el, i) => {
    let t = false;
    el.addEventListener('touchend', e => {
      e.preventDefault(); t = true; flipCard(i);
      setTimeout(() => t = false, 400);
    }, { passive: false });
    el.addEventListener('click', () => { if (!t) flipCard(i); });
  });
}

function flipCard(i) {
  if (locked) return;
  const el = document.querySelectorAll('.card')[i];
  if (!el || el.classList.contains('flipped') || el.classList.contains('matched')) return;
  if (flippedCards.length >= 2) return;
  if (!timerInterval) timerInterval = setInterval(() => { seconds++; updateUI(); }, 1000);
  el.classList.add('flipped');
  flippedCards.push({ i, el, d: cards[i] });
  if (flippedCards.length === 2) { moves++; updateUI(); checkMatch(); }
}

function checkMatch() {
  const [a, b] = flippedCards;
  if (a.d.pid === b.d.pid) {
    setTimeout(() => {
      a.el.classList.add('matched');
      b.el.classList.add('matched');
      matchedPairs++; updateUI(); flippedCards = [];
      if (matchedPairs === totalPairs) {
        clearInterval(timerInterval);
        setTimeout(showVictory, 600);
      }
    }, 400);
  } else {
    locked = true;
    setTimeout(() => { a.el.classList.add('wrong'); b.el.classList.add('wrong'); }, 300);
    setTimeout(() => {
      a.el.classList.remove('flipped', 'wrong');
      b.el.classList.remove('flipped', 'wrong');
      flippedCards = []; locked = false;
    }, 1000);
  }
}

function updateUI() {
  document.getElementById('moves').textContent = moves;
  document.getElementById('timer').textContent =
    `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  document.getElementById('pairsFound').textContent = `${matchedPairs} / ${totalPairs}`;
}

function showVictory() {
  document.getElementById('victoryStats').textContent =
    `${moves} jogadas · ${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')} de tempo`;
  document.getElementById('victory').classList.add('active');
  spawnConfetti();
}

function closeVictory() {
  document.getElementById('victory').classList.remove('active');
}

function spawnConfetti() {
  const cols = ['#01BFFD','#11EE37','#8000FD','#FBD736','#FD4B17','#DF00FF','#0086FF','#FD4F02'];
  for (let i = 0; i < 50; i++) {
    const e = document.createElement('div');
    e.className = 'confetti';
    e.style.left = Math.random() * 100 + 'vw';
    e.style.backgroundColor = cols[Math.floor(Math.random() * cols.length)];
    const s = 6 + Math.random() * 10;
    e.style.width = s + 'px';
    e.style.height = s + 'px';
    e.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    e.style.animationDuration = (2 + Math.random() * 3) + 's';
    e.style.animationDelay = Math.random() * 1.5 + 's';
    document.body.appendChild(e);
    setTimeout(() => e.remove(), 5000);
  }
}

// ═══════════════════════════════════════
//  INIT
// ═══════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('newWordInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') addWord();
  });
  await loadConfig();
  startGame();
});
