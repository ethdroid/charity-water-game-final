// ----- Difficulty settings -----
// Each mode changes the goal, the time limit, how often drops appear,
// how many drops are dirty, and how much a dirty drop costs you.
const MODES = {
  easy: {
    label: "Easy",
    goal: 15,
    time: 40,
    spawnEvery: 900,  // milliseconds between new drops
    dirtyChance: 0.2, // 20% of drops are dirty
    dirtyPenalty: 1,
    fallSpeed: 3.2    // seconds for a drop to fall (bigger = slower)
  },
  normal: {
    label: "Normal",
    goal: 20,
    time: 30,
    spawnEvery: 700,
    dirtyChance: 0.3,
    dirtyPenalty: 2,
    fallSpeed: 2.6
  },
  hard: {
    label: "Hard",
    goal: 30,
    time: 25,
    spawnEvery: 500,
    dirtyChance: 0.4,
    dirtyPenalty: 3,
    fallSpeed: 2.0
  }
};

// ----- Milestones (array + conditionals) -----
// "at" is a fraction of the goal, so milestones work in every difficulty.
const MILESTONES = [
  { at: 0.25, message: "Nice start! A family is getting closer to clean water. 💧" },
  { at: 0.5, message: "Halfway there! The jerry can is half full." },
  { at: 0.75, message: "Almost full! Just a few more drops." }
];

// ----- Sound effects -----
const sounds = {
  drop: new Audio("drop.wav"),
  splat: new Audio("splat.wav"),
  click: new Audio("click.wav"),
  milestone: new Audio("milestone.wav"),
  win: new Audio("win.wav"),
  lose: new Audio("lose.wav")
};
let soundOn = true;

function playSound(name) {
  if (!soundOn) return;
  const sound = sounds[name];
  sound.currentTime = 0; // restart if it's already playing
  sound.play().catch(() => {}); // ignore browsers that block audio
}

// ----- Grab elements from the page -----
const gameArea = document.getElementById("game-area");
const scoreEl = document.getElementById("score");
const goalEl = document.getElementById("goal");
const timeEl = document.getElementById("time");
const progressFill = document.getElementById("progress-fill");
const messageEl = document.getElementById("message");
const milestoneEl = document.getElementById("milestone");
const jerryCan = document.getElementById("jerry-can");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");
const modeInfo = document.getElementById("mode-info");
const modeButtons = document.querySelectorAll(".mode-btn");
const startBtn = document.getElementById("start-btn");
const resetBtn = document.getElementById("reset-btn");
const soundBtn = document.getElementById("sound-btn");

const startText = overlayText.innerHTML;

// ----- Game state -----
let mode = MODES.normal;
let score = 0;
let timeLeft = mode.time;
let gameRunning = false;
let dropTimer = null;
let clockTimer = null;
let milestonesHit = [];

// ----- Pick a difficulty -----
function setMode(modeName) {
  mode = MODES[modeName];

  modeButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === modeName);
  });

  modeInfo.textContent =
    "Goal: " + mode.goal + " points in " + mode.time + " seconds. " +
    "Dirty drops cost " + mode.dirtyPenalty + (mode.dirtyPenalty === 1 ? " point." : " points.");

  goalEl.textContent = mode.goal;
  timeEl.textContent = mode.time;
}

// ----- Start a new round -----
function startGame() {
  playSound("click");
  score = 0;
  timeLeft = mode.time;
  milestonesHit = [];
  gameRunning = true;

  updateScore();
  timeEl.textContent = timeLeft;
  timeEl.classList.remove("urgent");
  messageEl.textContent = "Go! Catch the clean water. (" + mode.label + " mode)";
  overlay.classList.add("hidden");

  dropTimer = setInterval(createDrop, mode.spawnEvery);
  clockTimer = setInterval(tick, 1000);
}

// ----- Countdown clock -----
function tick() {
  timeLeft--;
  timeEl.textContent = timeLeft;

  if (timeLeft <= 5) {
    timeEl.classList.add("urgent");
  }

  if (timeLeft <= 0) {
    endGame(false);
  }
}

// ----- Make one falling drop -----
function createDrop() {
  const drop = document.createElement("div");
  const isDirty = Math.random() < mode.dirtyChance;
  drop.className = isDirty ? "drop dirty" : "drop clean";

  // random horizontal position inside the game area
  const maxX = gameArea.clientWidth - 60;
  drop.style.left = Math.random() * maxX + "px";

  // drops fall a little faster as the clock runs down
  const elapsed = mode.time - timeLeft;
  const duration = mode.fallSpeed + Math.random() - elapsed * 0.03;
  drop.style.animationDuration = Math.max(duration, 1.1) + "s";

  drop.addEventListener("pointerdown", () => catchDrop(drop, isDirty));
  drop.addEventListener("animationend", () => drop.remove());

  gameArea.appendChild(drop);
}

// ----- Player taps a drop -----
function catchDrop(drop, isDirty) {
  if (!gameRunning) return;

  if (isDirty) {
    score = Math.max(0, score - mode.dirtyPenalty);
    showPop(drop, "-" + mode.dirtyPenalty, "bad");
    messageEl.textContent = "Oops! That water was dirty.";
    playSound("splat");
    flash("hit-dirty");
  } else {
    score++;
    showPop(drop, "+1", "good");
    playSound("drop");
    flash("hit-clean");
    checkMilestones();
  }

  drop.remove(); // the drop disappears when it's tapped
  updateScore();

  if (score >= mode.goal) {
    endGame(true);
  }
}

// ----- Show a milestone banner the first time each one is reached -----
function checkMilestones() {
  for (let i = 0; i < MILESTONES.length; i++) {
    const target = Math.ceil(MILESTONES[i].at * mode.goal);
    if (score >= target && !milestonesHit.includes(i)) {
      milestonesHit.push(i);
      showMilestone(MILESTONES[i].message);
    }
  }
}

function showMilestone(text) {
  milestoneEl.textContent = text;
  milestoneEl.classList.remove("hidden");
  messageEl.textContent = text;
  playSound("milestone");

  clearTimeout(showMilestone.timer);
  showMilestone.timer = setTimeout(() => milestoneEl.classList.add("hidden"), 1800);
}

// ----- Floating +1 / -2 text -----
function showPop(drop, text, type) {
  const pop = document.createElement("span");
  pop.className = "pop " + type;
  pop.textContent = text;
  const dropBox = drop.getBoundingClientRect();
  const areaBox = gameArea.getBoundingClientRect();
  pop.style.left = dropBox.left - areaBox.left + "px";
  pop.style.top = dropBox.top - areaBox.top + "px";
  gameArea.appendChild(pop);
  setTimeout(() => pop.remove(), 700);
}

// ----- Quick color flash on the game area and a wiggle on the jerry can -----
function flash(className) {
  gameArea.classList.remove("hit-clean", "hit-dirty");
  jerryCan.classList.remove("wiggle");
  void gameArea.offsetWidth; // restart the animation
  gameArea.classList.add(className);
  jerryCan.classList.add("wiggle");
}

// ----- Update score number and progress bar -----
function updateScore() {
  scoreEl.textContent = score;
  progressFill.style.width = Math.min(score / mode.goal, 1) * 100 + "%";
}

// ----- End the round (win or lose) -----
function endGame(won) {
  gameRunning = false;
  clearInterval(dropTimer);
  clearInterval(clockTimer);
  removeAllDrops();
  milestoneEl.classList.add("hidden");

  if (won) {
    overlayTitle.textContent = "You did it! 🎉";
    overlayText.innerHTML =
      "You filled the jerry can on <strong>" + mode.label + "</strong> mode with " + timeLeft + " seconds to spare.<br>" +
      'Now help make it real: <a href="https://www.charitywater.org/donate" target="_blank" rel="noopener">donate to charity: water</a>.';
    messageEl.textContent = "Clean water delivered!";
    playSound("win");
    launchConfetti();
  } else {
    overlayTitle.textContent = "Time's up!";
    overlayText.textContent =
      "You collected " + score + " of " + mode.goal + " drops on " + mode.label + " mode. Try again, every drop counts!";
    messageEl.textContent = "So close. Give it another shot.";
    playSound("lose");
  }

  startBtn.textContent = "Play Again";
  overlay.classList.remove("hidden");
}

// ----- Reset button: stop everything and go back to the start screen -----
function resetGame() {
  playSound("click");
  gameRunning = false;
  clearInterval(dropTimer);
  clearInterval(clockTimer);
  removeAllDrops();
  milestoneEl.classList.add("hidden");

  score = 0;
  timeLeft = mode.time;
  updateScore();
  timeEl.textContent = timeLeft;
  timeEl.classList.remove("urgent");
  messageEl.textContent = "Every drop counts.";

  overlayTitle.textContent = "Ready to bring clean water?";
  overlayText.innerHTML = startText;
  startBtn.textContent = "Start Game";
  overlay.classList.remove("hidden");
}

function removeAllDrops() {
  gameArea.querySelectorAll(".drop, .pop").forEach((el) => el.remove());
}

// ----- Sound on/off -----
function toggleSound() {
  soundOn = !soundOn;
  soundBtn.textContent = soundOn ? "🔊 Sound On" : "🔇 Sound Off";
  soundBtn.setAttribute("aria-pressed", soundOn);
  playSound("click");
}

// ----- Confetti celebration -----
function launchConfetti() {
  const canvas = document.getElementById("confetti");
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ["#FFC907", "#2E9DF7", "#8BD1CB", "#4FCB53", "#FF902A", "#F5402C"];
  const pieces = [];
  for (let i = 0; i < 150; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      size: 6 + Math.random() * 6,
      speed: 2 + Math.random() * 4,
      drift: Math.random() * 2 - 1,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }

  let frames = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach((p) => {
      p.y += p.speed;
      p.x += p.drift;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    frames++;
    if (frames < 240) {
      requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  draw();
}

// ----- Button listeners -----
modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    playSound("click");
    setMode(btn.dataset.mode);
  });
});
startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", resetGame);
soundBtn.addEventListener("click", toggleSound);

setMode("normal");
