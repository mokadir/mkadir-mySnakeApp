const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const statusEl = document.getElementById('status');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const gameOverMessage = document.getElementById('gameOverMessage');
const finalScoreEl = document.getElementById('finalScore');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const pauseBtn = document.getElementById('pauseBtn');

const GRID_SIZE = 20;
const TILE_COUNT = canvas.width / GRID_SIZE;
const STORAGE_KEY = 'snakeGameHighScore';
const INITIAL_SPEED = 110;
const MIN_SPEED = 40;
const SPEED_STEP = 5;

let snake = [];
let previousSnake = [];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let food = { x: 0, y: 0 };
let score = 0;
let highScore = 0;
let isRunning = false;
let isPaused = false;
let speed = INITIAL_SPEED;
let tickInterval = speed;
let lastFrameTime = 0;
let accumulator = 0;
let animationFrameId = null;
let audioCtx = null;

/**
 * Initialize the game state and draw the start screen.
 */
function initializeGame() {
  highScore = loadHighScore();
  updateScoreDisplay();
  hideGameOverOverlay();
  setStatus('Press Enter or Start to begin');
  pauseBtn.disabled = true;
  drawStartScreen();
}

/**
 * Read the saved best score from local storage.
 */
function loadHighScore() {
  return Number(localStorage.getItem(STORAGE_KEY) ?? 0);
}

/**
 * Save the best score to local storage.
 */
function saveHighScore(value) {
  localStorage.setItem(STORAGE_KEY, String(value));
}

/**
 * Update both score and best score displays.
 */
function updateScoreDisplay() {
  scoreEl.textContent = score;
  highScoreEl.textContent = highScore;
}

/**
 * Set the status text shown below the board.
 */
function setStatus(message) {
  statusEl.textContent = message;
}

/**
 * Hide the game over overlay.
 */
function hideGameOverOverlay() {
  gameOverOverlay.hidden = true;
}

/**
 * Show the game over overlay with the current score.
 */
function showGameOverOverlay(message) {
  gameOverMessage.textContent = message;
  finalScoreEl.textContent = score;
  gameOverOverlay.hidden = false;
}

/**
 * Reset game state and start a fresh round.
 */
function resetGame() {
  snake = [
    { x: 8, y: 10 },
    { x: 7, y: 10 },
    { x: 6, y: 10 }
  ];
  previousSnake = snake.map(segment => ({ ...segment }));
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  speed = INITIAL_SPEED;
  tickInterval = speed;
  accumulator = 0;
  isPaused = false;
  isRunning = true;
  hideGameOverOverlay();
  placeFood();
  updateScoreDisplay();
  setStatus('Use arrow keys to move.');
  pauseBtn.disabled = false;
  pauseBtn.textContent = 'Pause';
  playStartSound();
  startLoop();
}

/**
 * Place food at a random empty grid position.
 */
function placeFood() {
  let validPosition = false;

  while (!validPosition) {
    food.x = Math.floor(Math.random() * TILE_COUNT);
    food.y = Math.floor(Math.random() * TILE_COUNT);
    validPosition = !snake.some(segment => segment.x === food.x && segment.y === food.y);
  }
}

/**
 * Draw a glowing game cell at the given board coordinates.
 */
function drawCell(x, y, color) {
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.fillStyle = color;
  ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE - 1, GRID_SIZE - 1);
  ctx.shadowBlur = 0;
}

/**
 * Draw the dark neon background of the game board.
 */
function drawBackground() {
  ctx.fillStyle = '#040712';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/**
 * Draw the current game state with smooth interpolation.
 */
function draw(progress = 1) {
  drawBackground();
  drawCell(food.x, food.y, '#ff5c8d');

  snake.forEach((segment, index) => {
    const current = segment;
    const previous = previousSnake[index] || segment;
    const x = previous.x + (current.x - previous.x) * progress;
    const y = previous.y + (current.y - previous.y) * progress;
    const fill = index === 0 ? '#7c60ff' : '#59f0ff';
    drawCell(x, y, fill);
  });
}

/**
 * Draw a compact title screen before the game starts.
 */
function drawStartScreen() {
  drawBackground();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.textAlign = 'center';
  ctx.font = '700 22px Inter, sans-serif';
  ctx.fillText('NEON SNAKE', canvas.width / 2, canvas.height * 0.42);
  ctx.font = '400 14px Inter, sans-serif';
  ctx.fillText('Press Start or Enter to begin', canvas.width / 2, canvas.height * 0.54);
  ctx.fillText('Arrow keys only', canvas.width / 2, canvas.height * 0.62);
}

/**
 * Advance the game state by one tick.
 */
function updateGame() {
  if (!isRunning || isPaused) {
    return;
  }

  previousSnake = snake.map(segment => ({ ...segment }));
  direction = nextDirection;

  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y
  };

  if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
    return handleGameOver('You hit the wall!');
  }

  if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
    return handleGameOver('You hit yourself!');
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 1;

    if (score > highScore) {
      highScore = score;
      saveHighScore(highScore);
    }

    updateScoreDisplay();
    placeFood();
    speed = Math.max(MIN_SPEED, speed - SPEED_STEP);
    tickInterval = speed;
    playEatSound();
  } else {
    snake.pop();
  }
}

/**
 * Handle the animation frame loop for smooth movement.
 */
function animate(timestamp) {
  if (!lastFrameTime) {
    lastFrameTime = timestamp;
  }

  const delta = timestamp - lastFrameTime;
  lastFrameTime = timestamp;

  if (isRunning && !isPaused) {
    accumulator += delta;

    while (accumulator >= tickInterval) {
      updateGame();
      accumulator -= tickInterval;
    }
  }

  draw(Math.min(accumulator / tickInterval, 1));
  animationFrameId = requestAnimationFrame(animate);
}

/**
 * Start the game animation loop.
 */
function startLoop() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  lastFrameTime = 0;
  accumulator = 0;
  animationFrameId = requestAnimationFrame(animate);
}

/**
 * Toggle pause state during an active game.
 */
function pauseGame() {
  if (!isRunning) {
    return;
  }

  isPaused = !isPaused;
  pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
  setStatus(isPaused ? 'Paused — press Enter to resume.' : 'Resumed — arrow keys active.');
}

/**
 * End the game and show the game over overlay.
 */
function handleGameOver(message) {
  isRunning = false;

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  setStatus(`Game over — ${message}`);
  pauseBtn.disabled = true;
  showGameOverOverlay(message);
  playCrashSound();
}

/**
 * Update the direction while preventing backwards movement.
 */
function setDirection(newDirection) {
  if (newDirection.x === -direction.x && newDirection.y === -direction.y) {
    return;
  }

  nextDirection = newDirection;
}

/**
 * Return or create a browser audio context.
 */
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  return audioCtx;
}

/**
 * Play a short tone for feedback.
 */
function playTone(frequency, duration = 0.08, type = 'sine', volume = 0.12) {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = volume;

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start();
  oscillator.stop(ctx.currentTime + duration);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
}

/**
 * Play sound when food is eaten.
 */
function playEatSound() {
  playTone(520, 0.08, 'triangle', 0.18);
  setTimeout(() => playTone(720, 0.05, 'square', 0.1), 90);
}

/**
 * Play sound when the game ends.
 */
function playCrashSound() {
  playTone(140, 0.18, 'sawtooth', 0.2);
  setTimeout(() => playTone(90, 0.1, 'sine', 0.14), 120);
}

/**
 * Play a brief start sound when the game launches.
 */
function playStartSound() {
  playTone(340, 0.08, 'sine', 0.1);
  setTimeout(() => playTone(540, 0.06, 'triangle', 0.1), 90);
}

window.addEventListener('keydown', (event) => {
  if (event.defaultPrevented) return;

  switch (event.key) {
    case 'ArrowUp':
      setDirection({ x: 0, y: -1 });
      break;
    case 'ArrowDown':
      setDirection({ x: 0, y: 1 });
      break;
    case 'ArrowLeft':
      setDirection({ x: -1, y: 0 });
      break;
    case 'ArrowRight':
      setDirection({ x: 1, y: 0 });
      break;
    case 'Enter':
      if (!isRunning) {
        resetGame();
      } else {
        pauseGame();
      }
      break;
    case ' ': // space toggles pause
      event.preventDefault();
      if (isRunning) {
        pauseGame();
      }
      break;
  }
});

startBtn.addEventListener('click', resetGame);
restartBtn.addEventListener('click', resetGame);
pauseBtn.addEventListener('click', pauseGame);

initializeGame();
