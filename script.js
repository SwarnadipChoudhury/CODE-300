/* ============================================================
   Smart Revision Booster — script.js
   Features: File Upload UI, MCQ Quiz, Smart Retry,
             Weak Area Detection, Mastery Heatmap
   ============================================================ */

// ──────────────────────────────────────────────
// 1. QUESTION BANK
//    Each question object contains:
//    - id        : unique identifier
//    - topic     : 'A' or 'B'
//    - question  : question text
//    - options   : array of 4 choices
//    - answer    : index of correct option (0-based)
// ──────────────────────────────────────────────
const allQuestions = [
  // ── Topic A: JavaScript Basics ──
  {
    id: 1,
    topic: 'A',
    question: 'Which keyword is used to declare a block-scoped variable in JavaScript?',
    options: ['var', 'let', 'define', 'int'],
    answer: 1
  },
  {
    id: 2,
    topic: 'A',
    question: 'What does the `===` operator check in JavaScript?',
    options: [
      'Only value equality',
      'Only type equality',
      'Both value and type equality',
      'Assignment of a value'
    ],
    answer: 2
  },
  {
    id: 3,
    topic: 'A',
    question: 'Which built-in method removes the last element from an array and returns it?',
    options: ['shift()', 'pop()', 'splice()', 'slice()'],
    answer: 1
  },
  {
    id: 4,
    topic: 'A',
    question: 'What is the correct way to write a JavaScript arrow function?',
    options: [
      'function => (x) { return x * 2 }',
      'const double = (x) => x * 2',
      'arrow double(x) { return x * 2 }',
      'const double = function x => x * 2'
    ],
    answer: 1
  },
  {
    id: 5,
    topic: 'A',
    question: 'What will `typeof null` return in JavaScript?',
    options: ['"null"', '"undefined"', '"object"', '"boolean"'],
    answer: 2
  },

  // ── Topic B: Web Fundamentals ──
  {
    id: 6,
    topic: 'B',
    question: 'Which HTML tag is used to link an external CSS file?',
    options: ['<style>', '<script>', '<link>', '<css>'],
    answer: 2
  },
  {
    id: 7,
    topic: 'B',
    question: 'In CSS, which property changes the text colour of an element?',
    options: ['font-color', 'text-color', 'color', 'foreground'],
    answer: 2
  },
  {
    id: 8,
    topic: 'B',
    question: 'Which HTTP method is typically used to send form data to a server?',
    options: ['GET', 'PUT', 'DELETE', 'POST'],
    answer: 3
  },
  {
    id: 9,
    topic: 'B',
    question: 'What does CSS `flexbox` primarily help you control?',
    options: [
      'Colour transitions',
      'Layout and alignment of elements',
      'Font sizes and families',
      'Animation keyframes'
    ],
    answer: 1
  },
  {
    id: 10,
    topic: 'B',
    question: 'Which HTML attribute specifies an alternate text for an image?',
    options: ['title', 'src', 'alt', 'href'],
    answer: 2
  }
];

// ──────────────────────────────────────────────
// 2. STATE OBJECT
//    Tracks all quiz progress in one place
// ──────────────────────────────────────────────
const state = {
  activeQueue:    [],   // questions currently being shown
  currentIndex:   0,    // index within activeQueue
  selectedAnswer: null, // user's chosen option index
  wrongIds:       [],   // IDs of wrongly answered questions
  isRetryRound:   false,// true when retrying wrong questions

  // Per-topic tracking
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
const topicBRow       = document.getElementById('topicB-row');
const topicAScore     = document.getElementById('topicA-score');
const topicBScore     = document.getElementById('topicB-score');
const heatmapContainer= document.getElementById('heatmap-container');
const retryWrongBtn   = document.getElementById('retry-wrong-btn');
const restartBtn      = document.getElementById('restart-btn');

// ──────────────────────────────────────────────
// 4. FILE UPLOAD HANDLERS
// ──────────────────────────────────────────────

// Trigger file dialog when label is clicked (label already wraps input, but nice for drag area)
uploadLabel.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadLabel.classList.add('dragover');
});

uploadLabel.addEventListener('dragleave', () => {
  uploadLabel.classList.remove('dragover');
});

uploadLabel.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadLabel.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) handleFileUpload(file);
});

// Listen for file selection via the hidden input
fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) {
    handleFileUpload(fileInput.files[0]);
  }
});

/**
 * Handles file upload UI feedback.
 * In this demo we only show a success message — no real parsing needed.
 * @param {File} file
 */
function handleFileUpload(file) {
  // Accept only PDF files
  if (!file.name.endsWith('.pdf')) {
    showStatus('⚠️ Please upload a valid PDF file.', 'error');
    return;
  }

  // Update upload area text
  uploadText.textContent = `✅ ${file.name}`;

  // Show success message
  showStatus('✅ File uploaded successfully! Ready to start your quiz.', 'success');

  // Reveal the Start Quiz button
  startQuizBtn.classList.remove('hidden');
}

/**
 * Updates the status message div.
 * @param {string} msg
 * @param {string} type — 'success' | 'error'
 */
function showStatus(msg, type) {
  uploadStatus.textContent = msg;
  uploadStatus.className = `status-msg ${type}`;
  uploadStatus.classList.remove('hidden');
}

// ──────────────────────────────────────────────
// 5. QUIZ INITIALISATION
// ──────────────────────────────────────────────

// "Start Quiz" button click
startQuizBtn.addEventListener('click', () => {
  resetState();
  state.activeQueue = shuffle([...allQuestions]);
  uploadSection.classList.add('hidden');
  quizSection.classList.remove('hidden');
  renderQuestion();
});

/**
 * Resets state for a fresh quiz.
 */
function resetState() {
  state.activeQueue    = [];
  state.currentIndex   = 0;
  state.selectedAnswer = null;
  state.wrongIds       = [];
  state.isRetryRound   = false;
  state.topicA         = { correct: 0, total: 0 };
  state.topicB         = { correct: 0, total: 0 };
}

/**
 * Fisher-Yates shuffle — randomises question order.
 * @param {Array} arr
 * @returns {Array}
 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ──────────────────────────────────────────────
// 6. RENDER QUESTION
// ──────────────────────────────────────────────

/**
 * Renders the current question from state.activeQueue.
 */
function renderQuestion() {
  const q = state.activeQueue[state.currentIndex];

  // Reset selected answer
  state.selectedAnswer = null;
  nextBtn.classList.add('hidden');

  // Update topic badge
  topicBadge.textContent = `Topic ${q.topic}: ${q.topic === 'A' ? 'JS Basics' : 'Web Fundamentals'}`;

  // Update counter
  const total = state.activeQueue.length;
  questionCounter.textContent = `Q ${state.currentIndex + 1} / ${total}`;

  // Update progress bar (percentage)
  progressBar.style.width = `${((state.currentIndex) / total) * 100}%`;

  // Show question text
  questionText.textContent = q.question;

  // Clear previous options
  optionsContainer.innerHTML = '';

  // Add retry banner if in retry round
  if (state.isRetryRound && state.currentIndex === 0) {
    const banner = document.createElement('div');
    banner.className = 'retry-banner';
    banner.textContent = '🔄 Retry Round — These are the questions you got wrong';
    quizSection.insertBefore(banner, quizSection.querySelector('#progress-bar-wrap'));
  }

  // Render option buttons
  const letters = ['A', 'B', 'C', 'D'];
  q.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerHTML = `<span class="opt-letter">${letters[idx]}</span> ${opt}`;
    btn.addEventListener('click', () => handleAnswer(idx, q));
    optionsContainer.appendChild(btn);
  });
}

// ──────────────────────────────────────────────
// 7. HANDLE ANSWER SELECTION
// ──────────────────────────────────────────────

/**
 * Processes the user's selected option.
 * @param {number} selectedIdx — index of chosen option
 * @param {Object} question
 */
function handleAnswer(selectedIdx, question) {
  // Prevent double-clicking
  if (state.selectedAnswer !== null) return;
  state.selectedAnswer = selectedIdx;

  const allBtns = optionsContainer.querySelectorAll('.option-btn');
  const isCorrect = selectedIdx === question.answer;

  // Update topic-wise score tracking
  if (question.topic === 'A') {
    state.topicA.total++;
    if (isCorrect) state.topicA.correct++;
  } else {
    state.topicB.total++;
    if (isCorrect) state.topicB.correct++;
  }

  // Highlight correct and wrong answers
  allBtns.forEach((btn, idx) => {
    btn.disabled = true;
    if (idx === question.answer) btn.classList.add('correct');
    if (idx === selectedIdx && !isCorrect) btn.classList.add('wrong');
  });

  // Record wrong question ID for retry
  if (!isCorrect && !state.wrongIds.includes(question.id)) {
    state.wrongIds.push(question.id);
  }

  // Show Next button
  nextBtn.classList.remove('hidden');
}

// ──────────────────────────────────────────────
// 8. NEXT BUTTON HANDLER
// ──────────────────────────────────────────────
nextBtn.addEventListener('click', () => {
  state.currentIndex++;

  if (state.currentIndex < state.activeQueue.length) {
    // More questions remain
    renderQuestion();
  } else {
    // Quiz round finished
    showResults();
  }
});

// ──────────────────────────────────────────────
// 9. SHOW RESULTS
// ──────────────────────────────────────────────

/**
 * Calculates scores and renders the results section.
 */
function showResults() {
  quizSection.classList.add('hidden');
  resultSection.classList.remove('hidden');
  resultSection.style.animation = 'none'; // reset
  void resultSection.offsetWidth;
  resultSection.style.animation = '';

  const total   = state.activeQueue.length;
  const correct = state.topicA.correct + state.topicB.correct;
  const pct     = Math.round((correct / total) * 100);

  // Result title based on score
  if (pct === 100)      resultTitle.textContent = '🎉 Perfect Score!';
  else if (pct >= 80)   resultTitle.textContent = '🌟 Great Job!';
  else if (pct >= 50)   resultTitle.textContent = '📚 Keep Practising!';
  else                  resultTitle.textContent = '💪 Don\'t Give Up!';

  // Score display
  scoreDisplay.textContent = `${correct} / ${total}`;

  // ── Topic-wise percentages ──
  const pctA = state.topicA.total > 0
    ? Math.round((state.topicA.correct / state.topicA.total) * 100)
    : 0;
  const pctB = state.topicB.total > 0
    ? Math.round((state.topicB.correct / state.topicB.total) * 100)
    : 0;

  topicAScore.textContent = `${pctA}%`;
  topicBScore.textContent = `${pctB}%`;

  // Highlight weak topics in red
  toggleWeakRow(topicARow, pctA);
  toggleWeakRow(topicBRow, pctB);

  // ── Mastery Heatmap ──
  buildHeatmap(pctA, pctB);

  // ── Show retry button if there are wrong questions ──
  if (state.wrongIds.length > 0 && !state.isRetryRound) {
    retryWrongBtn.classList.remove('hidden');
  } else {
    retryWrongBtn.classList.add('hidden');
  }
}

/**
 * Adds/removes the .weak class on a topic row based on percentage.
 * @param {HTMLElement} row
 * @param {number} pct
 */
function toggleWeakRow(row, pct) {
  if (pct < 50) {
    row.classList.add('weak');
  } else {
    row.classList.remove('weak');
  }
}

// ──────────────────────────────────────────────
// 10. MASTERY HEATMAP BUILDER
// ──────────────────────────────────────────────

/**
 * Builds a simple heatmap showing one box per topic.
 * Green ≥ 80%, Yellow 50–79%, Red < 50%
 * @param {number} pctA — Topic A percentage
 * @param {number} pctB — Topic B percentage
 */
function buildHeatmap(pctA, pctB) {
  heatmapContainer.innerHTML = ''; // clear previous

  const topics = [
    { label: 'JS Basics', pct: pctA },
    { label: 'Web Fund.', pct: pctB }
  ];

  topics.forEach(t => {
    const box = document.createElement('div');
    box.className = `heat-box ${getHeatColor(t.pct)}`;
    box.innerHTML = `
      <strong>${t.pct}%</strong>
      <span class="heat-label">${t.label}</span>
    `;
    box.title = `${t.label}: ${t.pct}%`;
    heatmapContainer.appendChild(box);
  });

  // Also show a box for every individual question (show as dots)
  state.activeQueue.forEach(q => {
    // Determine if this question was answered correctly this round
    // We can't know per-question from state; show topic colour
    const pct = q.topic === 'A' ? pctA : pctB;
    const dot = document.createElement('div');
    dot.className = `heat-box ${getHeatColor(pct)}`;
    dot.innerHTML = `
      <strong>Q${q.id}</strong>
      <span class="heat-label">T${q.topic}</span>
    `;
    dot.title = `Question ${q.id} — Topic ${q.topic}`;
    heatmapContainer.appendChild(dot);
  });
}

/**
 * Returns CSS class name based on percentage.
 * @param {number} pct
 * @returns {string} 'green' | 'yellow' | 'red'
 */
function getHeatColor(pct) {
  if (pct >= 80) return 'green';
  if (pct >= 50) return 'yellow';
  return 'red';
}

// ──────────────────────────────────────────────
// 11. SMART RETRY LOGIC
// ──────────────────────────────────────────────

/**
 * Starts a new quiz round using only the incorrectly answered questions.
 */
retryWrongBtn.addEventListener('click', () => {
  // Filter questions by wrong IDs
  const wrongQuestions = allQuestions.filter(q => state.wrongIds.includes(q.id));

  if (wrongQuestions.length === 0) return;

  // Reset scores only for the retry round
  state.topicA         = { correct: 0, total: 0 };
  state.topicB         = { correct: 0, total: 0 };
  state.wrongIds       = [];
  state.currentIndex   = 0;
  state.selectedAnswer = null;
  state.isRetryRound   = true;
  state.activeQueue    = shuffle(wrongQuestions);

  // Remove any old retry banners
  const oldBanner = quizSection.querySelector('.retry-banner');
  if (oldBanner) oldBanner.remove();

  // Switch sections
  resultSection.classList.add('hidden');
  quizSection.classList.remove('hidden');

  renderQuestion();
});

// ──────────────────────────────────────────────
// 12. RESTART FROM SCRATCH
// ──────────────────────────────────────────────
restartBtn.addEventListener('click', () => {
  // Remove any retry banners
  const oldBanner = quizSection.querySelector('.retry-banner');
  if (oldBanner) oldBanner.remove();

  // Reset everything
  resetState();
  state.activeQueue = shuffle([...allQuestions]);

  resultSection.classList.add('hidden');
  quizSection.classList.remove('hidden');

  renderQuestion();
});
