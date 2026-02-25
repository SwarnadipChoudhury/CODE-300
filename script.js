/* ============================================================
   Smart Revision Booster — script.js (PDF Parser Edition)
   Features: Local PDF Parsing (No API), MCQ Quiz, Smart Retry,
             Weak Area Detection, Mastery Heatmap
   ============================================================ */

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// ──────────────────────────────────────────────
// 1. QUESTION BANK (Initially empty, filled by PDF)
// ──────────────────────────────────────────────
let allQuestions = [];

// ──────────────────────────────────────────────
// 2. STATE OBJECT
// ──────────────────────────────────────────────
const state = {
  activeQueue:    [],   
  currentIndex:   0,    
  selectedAnswer: null, 
  wrongIds:       [],   
  isRetryRound:   false,
  topicA: { correct: 0, total: 0 },
  topicB: { correct: 0, total: 0 }
};

// ──────────────────────────────────────────────
// 3. DOM REFERENCES
// ──────────────────────────────────────────────
const uploadSection   = document.getElementById('upload-section');
const quizSection     = document.getElementById('quiz-section');
const resultSection   = document.getElementById('result-section');
const fileInput       = document.getElementById('file-input');
const uploadLabel     = document.getElementById('upload-label');
const uploadText      = document.getElementById('upload-text');
const uploadStatus    = document.getElementById('upload-status');
const startQuizBtn    = document.getElementById('start-quiz-btn');
const topicBadge      = document.getElementById('topic-badge');
const questionCounter = document.getElementById('question-counter');
const progressBar     = document.getElementById('progress-bar');
const questionText    = document.getElementById('question-text');
const optionsContainer= document.getElementById('options-container');
const nextBtn         = document.getElementById('next-btn');
const resultTitle     = document.getElementById('result-title');
const scoreDisplay    = document.getElementById('score-display');
const topicARow       = document.getElementById('topicA-row');
const topicAScore     = document.getElementById('topicA-score');
const heatmapContainer= document.getElementById('heatmap-container');
const retryWrongBtn   = document.getElementById('retry-wrong-btn');
const restartBtn      = document.getElementById('restart-btn');

// ──────────────────────────────────────────────
// 4. PDF PARSING LOGIC
// ──────────────────────────────────────────────

uploadLabel.addEventListener('dragover', (e) => { e.preventDefault(); uploadLabel.classList.add('dragover'); });
uploadLabel.addEventListener('dragleave', () => { uploadLabel.classList.remove('dragover'); });
uploadLabel.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadLabel.classList.remove('dragover');
  if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) handleFileUpload(fileInput.files[0]);
});

async function handleFileUpload(file) {
  if (!file.name.endsWith('.pdf')) {
    showStatus('⚠️ Please upload a valid PDF file.', 'error');
    return;
  }

  showStatus('Reading PDF content locally...', 'success');
  uploadText.textContent = `Processing: ${file.name}`;

  const reader = new FileReader();
  reader.onload = async function() {
    const typedarray = new Uint8Array(this.result);
    try {
      const pdf = await pdfjsLib.getDocument(typedarray).promise;
      let fullText = "";
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map(item => item.str).join(" ") + "\n";
      }
      
      const extracted = parseQuestions(fullText);
      
      if (extracted.length > 0) {
        allQuestions = extracted;
        showStatus(`✅ Loaded ${extracted.length} questions from PDF!`, 'success');
        startQuizBtn.classList.remove('hidden');
      } else {
        showStatus('❌ Could not find questions. Check PDF format.', 'error');
      }
    } catch (err) {
      showStatus('Error parsing PDF.', 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

/**
 * Regex-based parser for MCQ format:
 * 1. Question text? A) Opt1 B) Opt2 C) Opt3 D) Opt4 Answer: A
 */
function parseQuestions(text) {
  const qs = [];
  // Split by digit followed by dot or bracket (1. or 1))
  const rawBlocks = text.split(/\d+[\.\)]/).filter(b => b.trim().length > 20);

  rawBlocks.forEach((block, i) => {
    const cleanBlock = block.replace(/\s+/g, ' ');
    const qMatch = cleanBlock.match(/(.*?)(?=A[\)\.]) /);
    const aMatch = cleanBlock.match(/A[\)\.](.*?)(?=B[\)\.])/);
    const bMatch = cleanBlock.match(/B[\)\.](.*?)(?=C[\)\.])/);
    const cMatch = cleanBlock.match(/C[\)\.](.*?)(?=D[\)\.])/);
    const dMatch = cleanBlock.match(/D[\)\.](.*?)(?=Answer|Correct|$)/);
    const ansMatch = cleanBlock.match(/Answer:\s*([A-D])/i);

    if (qMatch && aMatch && bMatch && ansMatch) {
      const map = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
      qs.push({
        id: i + 1,
        topic: 'A',
        question: qMatch[1].trim(),
        options: [aMatch[1].trim(), bMatch[1].trim(), cMatch[1].trim(), dMatch ? dMatch[1].trim() : ""],
        answer: map[ansMatch[1].toUpperCase()]
      });
    }
  });
  return qs;
}

function showStatus(msg, type) {
  uploadStatus.textContent = msg;
  uploadStatus.className = `status-msg ${type}`;
  uploadStatus.classList.remove('hidden');
}

// ──────────────────────────────────────────────
// 5. QUIZ CONTROL
// ──────────────────────────────────────────────

startQuizBtn.addEventListener('click', () => {
  resetState();
  state.activeQueue = shuffle([...allQuestions]);
  uploadSection.classList.add('hidden');
  quizSection.classList.remove('hidden');
  renderQuestion();
});

function resetState() {
  state.currentIndex = 0;
  state.selectedAnswer = null;
  state.wrongIds = [];
  state.isRetryRound = false;
  state.topicA = { correct: 0, total: 0 };
  state.topicB = { correct: 0, total: 0 };
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function renderQuestion() {
  const q = state.activeQueue[state.currentIndex];
  state.selectedAnswer = null;
  nextBtn.classList.add('hidden');

  topicBadge.textContent = state.isRetryRound ? "🔄 Retry Mode" : `Question ${q.id}`;
  const total = state.activeQueue.length;
  questionCounter.textContent = `Q ${state.currentIndex + 1} / ${total}`;
  progressBar.style.width = `${((state.currentIndex) / total) * 100}%`;
  questionText.textContent = q.question;
  optionsContainer.innerHTML = '';

  const letters = ['A', 'B', 'C', 'D'];
  q.options.forEach((opt, idx) => {
    if (opt.trim() === "") return;
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerHTML = `<span class="opt-letter">${letters[idx]}</span> ${opt}`;
    btn.addEventListener('click', () => handleAnswer(idx, q));
    optionsContainer.appendChild(btn);
  });
}

function handleAnswer(selectedIdx, question) {
  if (state.selectedAnswer !== null) return;
  state.selectedAnswer = selectedIdx;

  const allBtns = optionsContainer.querySelectorAll('.option-btn');
  const isCorrect = selectedIdx === question.answer;

  state.topicA.total++;
  if (isCorrect) state.topicA.correct++;

  allBtns.forEach((btn, idx) => {
    btn.disabled = true;
    if (idx === question.answer) btn.classList.add('correct');
    if (idx === selectedIdx && !isCorrect) btn.classList.add('wrong');
  });

  if (!isCorrect && !state.wrongIds.includes(question.id)) {
    state.wrongIds.push(question.id);
  }
  nextBtn.classList.remove('hidden');
}

nextBtn.addEventListener('click', () => {
  state.currentIndex++;
  if (state.currentIndex < state.activeQueue.length) renderQuestion();
  else showResults();
});

function showResults() {
  quizSection.classList.add('hidden');
  resultSection.classList.remove('hidden');

  const total = state.activeQueue.length;
  const correct = state.topicA.correct;
  const pct = Math.round((correct / total) * 100);

  resultTitle.textContent = pct >= 80 ? '🌟 Great Job!' : '📚 Keep Practising!';
  scoreDisplay.textContent = `${correct} / ${total}`;
  topicAScore.textContent = `${pct}%`;

  buildHeatmap(pct);

  if (state.wrongIds.length > 0 && !state.isRetryRound) retryWrongBtn.classList.remove('hidden');
  else retryWrongBtn.classList.add('hidden');
}

function buildHeatmap(pct) {
  heatmapContainer.innerHTML = '';
  const color = pct >= 80 ? 'green' : pct >= 50 ? 'yellow' : 'red';
  
  state.activeQueue.forEach(q => {
    const dot = document.createElement('div');
    dot.className = `heat-box ${color}`;
    dot.innerHTML = `<strong>Q${q.id}</strong>`;
    heatmapContainer.appendChild(dot);
  });
}

retryWrongBtn.addEventListener('click', () => {
  const wrongQs = allQuestions.filter(q => state.wrongIds.includes(q.id));
  state.topicA = { correct: 0, total: 0 };
  state.wrongIds = [];
  state.currentIndex = 0;
  state.isRetryRound = true;
  state.activeQueue = shuffle(wrongQs);
  resultSection.classList.add('hidden');
  quizSection.classList.remove('hidden');
  renderQuestion();
});

restartBtn.addEventListener('click', () => {
  location.reload(); // Simplest way to restart and clear everything
});