/* Modern Tic Tac Toe - enhanced
   - Minimax smart AI + easy mode
   - Hover/click sounds
   - Winner popup + celebration
   - Confetti
   - LocalStorage scores
*/

// --------- DOM Refs ---------
const setup = document.getElementById('setup');
const modeSelect = document.getElementById('modeSelect');
const aiOptions = document.getElementById('aiOptions');
const aiDiff = document.getElementById('aiDiff');
const firstSelect = document.getElementById('firstSelect');
const startBtn = document.getElementById('startBtn');
const resetAllBtn = document.getElementById('resetAllBtn');
const pXName = document.getElementById('pXName');
const pOName = document.getElementById('pOName');

const boardEl = document.getElementById('board');
const nameX = document.getElementById('nameX');
const nameO = document.getElementById('nameO');
const scoreX = document.getElementById('scoreX');
const scoreO = document.getElementById('scoreO');
const scoreD = document.getElementById('scoreD');
const turnIndicator = document.getElementById('turnIndicator');
const themeToggle = document.getElementById('themeToggle');
const restartBtn = document.getElementById('restartBtn');
const fullResetBtn = document.getElementById('fullResetBtn');
const undoBtn = document.getElementById('undoBtn');
const infoBtn = document.getElementById('infoBtn');

const confettiCanvas = document.getElementById('confettiCanvas');
confettiCanvas.width = innerWidth; confettiCanvas.height = innerHeight;

const winnerOverlay = document.getElementById('winnerOverlay');
const winnerText = document.getElementById('winnerText');
const celebrationName = document.getElementById('celebrationName');
const playAgainBtn = document.getElementById('playAgainBtn');
const closeWinnerBtn = document.getElementById('closeWinnerBtn');

// --------- State ---------
let board = Array(9).fill(null);
let history = [];
let currentPlayer = 'X';
let gameActive = false;
let mode = 'pvp';
let aiPlayer = null;       // 'X' or 'O' when mode==='pvc'
let aiDifficulty = 'hard';
let scores = {X:0, O:0, D:0};
let hoverEnabled = true;

// Audio context for small sounds
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playTone(freq=440, dur=0.06, gain=0.02){
  try {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g); g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + dur);
  } catch(e){}
}

// small click + hover sounds
function playClick(){ playTone(880, 0.04, 0.03); }
function playHover(){ playTone(440, 0.03, 0.008); }
function playPopSound() {
  playTone(1200, 0.08, 0.03);
  setTimeout(() => playTone(800, 0.06, 0.02), 80);
}

// Load saved scores
if(localStorage.getItem('ttt_scores')){
  try { scores = JSON.parse(localStorage.getItem('ttt_scores')) || scores; } catch(e){/* ignore */ }
}
updateScoreUI();

// Create cells
for(let i=0;i<9;i++){
  const cell = document.createElement('div');
  cell.className='cell';
  cell.dataset.index=i;
  cell.setAttribute('role','button');
  cell.innerHTML = '<div class="mark" aria-hidden="true"></div>';
  cell.addEventListener('click', onCellClick);
  cell.addEventListener('mouseenter', ()=> {
    if(hoverEnabled) playHover();
    cell.classList.add('hovered');
  });
  cell.addEventListener('mouseleave', ()=> cell.classList.remove('hovered'));
  boardEl.appendChild(cell);
}

// UI Helpers
function setNames(px,po){
  nameX.textContent = px;
  nameO.textContent = po;
}
function updateScoreUI(){
  scoreX.textContent = scores.X;
  scoreO.textContent = scores.O;
  scoreD.textContent = scores.D;
  try { localStorage.setItem('ttt_scores', JSON.stringify(scores)); } catch(e){/* ignore */ }
}

function showTurn(){
  if(!gameActive){ turnIndicator.textContent='—'; return; }
  if(mode==='pvc' && currentPlayer === aiPlayer){
    turnIndicator.textContent = `AI (${aiPlayer})`;
  } else {
    turnIndicator.textContent = (currentPlayer === 'X') ? (`${nameX.textContent} (X)`) : (`${nameO.textContent} (O)`);
  }
}

// Setup interactions
modeSelect.addEventListener('change', ()=>{ 
  aiOptions.style.display = (modeSelect.value==='pvc') ? 'block' : 'none'; 
});

startBtn.addEventListener('click', () => {
  mode = modeSelect.value;
  aiDifficulty = aiDiff.value;
  const first = firstSelect.value;
  const px = pXName.value.trim() || 'Player X';
  const po = pOName.value.trim() || 'Player O';

  // Reset board and state
  board = Array(9).fill(null);
  history = [];
  gameActive = true;

  if (mode === 'pvc') {
    if (first === 'AI') {
      aiPlayer = 'X'; currentPlayer = 'X';
      setNames('AI', po);
    } else if (first === 'X') {
      aiPlayer = 'O'; currentPlayer = 'X';
      setNames(px, 'AI');
    } else { // first === 'O'
      aiPlayer = 'X'; currentPlayer = 'O';
      setNames(px, 'AI');
    }
  } else {
    aiPlayer = null;
    currentPlayer = (first === 'O') ? 'O' : 'X';
    setNames(px, po);
  }

  setup.classList.remove('visible');
  winnerOverlay.style.display = 'none';
  renderBoard();
  showTurn();

  // If AI starts
  if (mode === 'pvc' && currentPlayer === aiPlayer) {
    setTimeout(()=> aiMove(), 360);
  }
});

resetAllBtn.addEventListener('click', ()=>{ 
  if(confirm('Reset saved scores?')){
    scores={X:0,O:0,D:0}; 
    updateScoreUI(); 
  } 
});

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('light');
  
  const icon = themeToggle.querySelector('i');
  if (document.body.classList.contains('light')) {
    icon.classList.remove('fa-moon');
    icon.classList.add('fa-sun');
  } else {
    icon.classList.remove('fa-sun');
    icon.classList.add('fa-moon');
  }
});

infoBtn.addEventListener('click', ()=>{ restartRound(); });
restartBtn.addEventListener('click', ()=>{ 
  if(confirm('Do you want to change players or mode?')){
    setup.classList.add('visible'); // Open setup modal
  } else {
    restartRound(); // Just restart current round
  }
});

undoBtn.addEventListener('click', undoMove);

// Winner popup handlers
playAgainBtn.addEventListener('click', ()=> {
  winnerOverlay.style.display = 'none';
  setup.classList.add('visible'); // Show setup modal for new round
});

closeWinnerBtn.addEventListener('click', ()=> {
  document.getElementById('winnerCard').classList.remove('visible');
  setTimeout(() => {
    winnerOverlay.style.display = 'none';
  }, 300);
});

// Core Game
function onCellClick(e){
  const idx = +e.currentTarget.dataset.index;
  if(!gameActive) return;
  if(board[idx]) return;
  if(mode==='pvc' && currentPlayer === aiPlayer) return;

  playClick();
  let mark = (currentPlayer === 'X') ? 'X' : 'O';
  makeMove(idx, mark);
}

function makeMove(i, mark){
  if(board[i] || !gameActive) return;
  board[i] = mark;
  history.push({board:board.slice(), player:mark});
  renderBoard();
  playBeep(220, 0.04);
  const res = checkWinner(board);
  if(res){ handleGameEnd(res); return; }

  if(mode === 'pvc'){
    currentPlayer = (mark === 'X') ? 'O' : 'X';
    if(currentPlayer === aiPlayer){
      showTurn();
      setTimeout(()=> aiMove(), 320);
      return;
    }
  } else {
    currentPlayer = (mark === 'X') ? 'O' : 'X';
  }
  showTurn();
}

function aiMove(){
  if(!gameActive) return;
  const mark = aiPlayer;
  const empties = board.map((v,i)=> v? null : i).filter(v=> v !== null);
  if(empties.length === 0) return;

  let idx = null;
  if(aiDifficulty === 'easy'){
    idx = empties[Math.floor(Math.random()*empties.length)];
  } else {
    idx = bestMove(board.slice(), mark);
    if(idx === null) idx = empties[Math.floor(Math.random()*empties.length)];
  }
  setTimeout(()=> { makeMove(idx, mark); }, 260);
}

function renderBoard(){
  board.forEach((v,i)=>{
    const c = boardEl.children[i];
    const markEl = c.querySelector('.mark');
    if(v){
      c.classList.add('played','disabled');
      markEl.textContent = v;
      void markEl.offsetWidth;
      c.classList.add('played');
    } else {
      c.classList.remove('played','disabled','win','win-glow');
      markEl.textContent = '';
    }
  });
}

// restart the round keeping scores (if keepScores false, we'll also clear scores)
function restartRound(keepScores=false){
  board = Array(9).fill(null);
  history = [];
  gameActive = true;
  for(let i=0;i<9;i++){ 
    boardEl.children[i].classList.remove('win','win-glow'); 
  }
  renderBoard();
  showTurn();
}

// undo move (single step)
function undoMove(){
  if(history.length <= 0) return;
  history.pop();
  board = history.length ? history[history.length-1].board.slice() : Array(9).fill(null);
  currentPlayer = (currentPlayer === 'X') ? 'O' : 'X';
  renderBoard();
  showTurn();
}

const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
function checkWinner(b){
  for(const [a,c,d] of wins){
    if(b[a] && b[a] === b[c] && b[a] === b[d]) return {winner: b[a], line: [a,c,d]};
  }
  if(b.every(Boolean)) return {winner: 'D'};
  return null;
}

function handleGameEnd(res){
  gameActive = false;
  if(res.winner === 'D'){
    scores.D++; updateScoreUI();
    turnIndicator.textContent = 'Draw!';
    playBeep(200,0.08);
    flashDraw();
    showDrawPopup();
    return;
  }

  // highlight winning cells and add glow
  res.line.forEach(i => {
    boardEl.children[i].classList.add('win','win-glow');
  });

  scores[res.winner]++; updateScoreUI();
  turnIndicator.textContent = `${res.winner} wins!`;
  playBeep(440,0.14);

  // celebration
  showWinnerPopup(res.winner);
}

// Celebration with enhanced effects
function showWinnerPopup(winner) {
  winnerText.textContent = `${winner} wins!`;
  const name = (winner === 'X') ? nameX.textContent : nameO.textContent;
  celebrationName.textContent = `${name} (${winner})`;
  
  // Show overlay with animation
  winnerOverlay.style.display = 'grid';
  setTimeout(() => {
    document.getElementById('winnerCard').classList.add('visible');
  }, 10);
  
  // Animate winner name
  setTimeout(() => {
    celebrationName.classList.add('show');
  }, 300);
  
  // Create confetti
  createConfetti();
  
  // Add "pop-pop" sound effect
  playPopSound();
}

function showDrawPopup() {
  winnerText.textContent = `It's a Draw!`;
  celebrationName.textContent = '';
  celebrationName.classList.remove('show');
  
  // Show overlay with animation
  winnerOverlay.style.display = 'grid';
  setTimeout(() => {
    document.getElementById('winnerCard').classList.add('visible');
  }, 10);
  
  // Create more subtle confetti for draw
  createConfetti(true);
}

function createConfetti(isDraw = false) {
  const colors = isDraw ? 
    ['var(--muted)', 'var(--text)', 'var(--glass)'] : 
    ['var(--accent)', 'var(--accent-2)', 'var(--win)', '#ff6b6b', '#feca57'];
  
  for (let i = 0; i < 100; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti-particle';
    
    // Random properties
    const size = Math.random() * 10 + 5;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const delay = Math.random() * 2;
    const duration = Math.random() * 2 + 2;
    const shape = Math.random() > 0.5 ? '50%' : '2px';
    
    Object.assign(confetti.style, {
      width: `${size}px`,
      height: `${size}px`,
      background: color,
      left: `${left}%`,
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
      borderRadius: shape,
      transform: `rotate(${Math.random() * 360}deg)`
    });
    
    winnerOverlay.appendChild(confetti);
    
    // Remove after animation
    setTimeout(() => {
      confetti.remove();
    }, duration * 1000);
  }
}

// Minimax AI (returns best index)
function bestMove(b, player){
  const opponent = player === 'X' ? 'O' : 'X';
  let bestScore = -Infinity, move = null;
  for(let i=0;i<9;i++){
    if(!b[i]){
      b[i] = player;
      const score = minimax(b, 0, false, player, opponent);
      b[i] = null;
      if(score > bestScore){ bestScore = score; move = i; }
    }
  }
  return move;
}

function minimax(b, depth, isMaximizing, player, opponent){
  const res = checkWinner(b);
  if(res){
    if(res.winner === player) return 10 - depth;
    if(res.winner === opponent) return depth - 10;
    return 0;
  }
  if(isMaximizing){
    let best = -Infinity;
    for(let i=0;i<9;i++){
      if(!b[i]){
        b[i] = player;
        best = Math.max(best, minimax(b, depth+1, false, player, opponent));
        b[i] = null;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for(let i=0;i<9;i++){
      if(!b[i]){
        b[i] = opponent;
        best = Math.min(best, minimax(b, depth+1, true, player, opponent));
        b[i] = null;
      }
    }
    return best;
  }
}

// Audio & Confetti (improved)
function playBeep(freq, dur){
  try{
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.value = 0.02;
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
  }catch(e){}
}

function flashDraw(){
  const el = document.querySelector('.board');
  el.style.transition='transform .08s ease';
  el.style.transform='scale(0.98)';
  setTimeout(()=> el.style.transform='scale(1)', 120);
}

// handle window resize for canvas
window.addEventListener('resize', ()=>{ 
  confettiCanvas.width = innerWidth; 
  confettiCanvas.height = innerHeight; 
});

// initial UI state
aiOptions.style.display = 'none';
showTurn();