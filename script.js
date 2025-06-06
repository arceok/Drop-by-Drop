const levels = [
  {
    grid: [
      ["start", "pipe-horizontal", "pipe-horizontal", "pipe-curve-ur", "empty"],
      ["empty", "empty", "empty", "pipe-vertical", "village"],
      ["empty", "empty", "empty", "pipe-curve-ul", "empty"],
      ["empty", "empty", "empty", "empty", "empty"],
      ["empty", "empty", "empty", "empty", "empty"]
    ],
    fact: "1 in 10 people lack access to clean water."
  },
  {
    grid: [
      ["start", "pipe-horizontal", "pipe-curve-ur", "pipe-vertical", "village"],
      ["empty", "empty", "empty", "pipe-vertical", "empty"],
      ["empty", "empty", "pipe-horizontal", "pipe-curve-ul", "empty"],
      ["empty", "empty", "empty", "empty", "empty"],
      ["empty", "empty", "empty", "empty", "empty"]
    ],
    fact: "Women and girls spend 200 million hours collecting water every day."
  },
  {
    grid: [
      ["start", "pipe-horizontal", "pipe-horizontal", "pipe-horizontal", "village"],
      ["empty", "empty", "empty", "empty", "empty"],
      ["empty", "empty", "empty", "empty", "empty"],
      ["empty", "empty", "empty", "empty", "empty"],
      ["empty", "empty", "empty", "empty", "empty"]
    ],
    fact: "Access to clean water improves health and education."
  }
];

const icons = {
  "empty": "",
  "start": "🚰",
  "village": "🏠",
  "pipe-horizontal": "━",
  "pipe-vertical": "┃",
  "pipe-curve-ur": "┗",
  "pipe-curve-dr": "┏",
  "pipe-curve-dl": "┓",
  "pipe-curve-ul": "┛"
};

let currentLevel = 0;
let timeLeft = 60;
let timerInterval;

const gameContainer = document.getElementById("game-container");
const timerDisplay = document.getElementById("timer");
const factPanel = document.getElementById("fact-panel");
const factText = document.getElementById("fact-text");

function loadLevel(levelIndex) {
  clearInterval(timerInterval);
  timeLeft = 60;
  timerDisplay.textContent = timeLeft;
  factPanel.style.display = "none";

  gameContainer.innerHTML = "";
  const level = levels[levelIndex];

  level.grid.forEach((row, rowIndex) => {
    row.forEach((type, colIndex) => {
      const tile = document.createElement("div");
      tile.classList.add("tile");
      tile.dataset.row = rowIndex;
      tile.dataset.col = colIndex;
      tile.dataset.type = type;
      tile.textContent = icons[type];

      tile.addEventListener("click", () => {
        if (type.startsWith("pipe")) {
          rotatePipe(tile);
          checkConnection();
        }
      });

      gameContainer.appendChild(tile);
    });
  });

  timerInterval = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      alert("Time's up! Try again.");
      loadLevel(currentLevel);
    }
  }, 1000);
}

function rotatePipe(tile) {
  const current = tile.dataset.type;
  const rotations = {
    "pipe-horizontal": "pipe-vertical",
    "pipe-vertical": "pipe-horizontal",
    "pipe-curve-ur": "pipe-curve-dr",
    "pipe-curve-dr": "pipe-curve-dl",
    "pipe-curve-dl": "pipe-curve-ul",
    "pipe-curve-ul": "pipe-curve-ur"
  };
  if (rotations[current]) {
    tile.dataset.type = rotations[current];
    tile.textContent = icons[rotations[current]];
  }
}

function checkConnection() {
  // Find start and village positions
  const tiles = document.querySelectorAll(".tile");
  let startPos, villagePos;
  tiles.forEach(tile => {
    if (tile.dataset.type === "start") {
      startPos = [parseInt(tile.dataset.row), parseInt(tile.dataset.col)];
    }
    if (tile.dataset.type === "village") {
      villagePos = [parseInt(tile.dataset.row), parseInt(tile.dataset.col)];
    }
  });

  // Build a grid of current types
  const grid = [];
  for (let r = 0; r < 5; r++) {
    grid[r] = [];
    for (let c = 0; c < 5; c++) {
      const tile = Array.from(tiles).find(t => t.dataset.row == r && t.dataset.col == c);
      grid[r][c] = tile ? tile.dataset.type : "empty";
    }
  }

  // Directions: [row offset, col offset]
  const DIRS = {
    up:    [-1, 0],
    down:  [1, 0],
    left:  [0, -1],
    right: [0, 1]
  };

  // For each pipe type, define which directions it connects to
  const PIPE_CONNECTIONS = {
    "start": ["right"],
    "village": ["left"],
    "pipe-horizontal": ["left", "right"],
    "pipe-vertical": ["up", "down"],
    "pipe-curve-ur": ["up", "right"],
    "pipe-curve-dr": ["down", "right"],
    "pipe-curve-dl": ["down", "left"],
    "pipe-curve-ul": ["up", "left"]
  };

  // For each direction, what is the opposite?
  const OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };

  // BFS from start
  function bfs(start, end) {
    const visited = Array.from({length: 5}, () => Array(5).fill(false));
    const queue = [{pos: start, fromDir: null}];
    visited[start[0]][start[1]] = true;

    while (queue.length) {
      const {pos, fromDir} = queue.shift();
      const [r, c] = pos;
      const type = grid[r][c];
      const connections = PIPE_CONNECTIONS[type] || [];

      for (const dir of connections) {
        // Don't go back the way we came
        if (fromDir && dir === OPPOSITE[fromDir]) continue;
        const [dr, dc] = DIRS[dir];
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= 5 || nc < 0 || nc >= 5) continue;
        if (visited[nr][nc]) continue;
        const nextType = grid[nr][nc];
        if (!PIPE_CONNECTIONS[nextType]) continue;
        // The next tile must connect back to us
        if (!PIPE_CONNECTIONS[nextType].includes(OPPOSITE[dir])) continue;
        if (nr === end[0] && nc === end[1]) {
          return true;
        }
        visited[nr][nc] = true;
        queue.push({pos: [nr, nc], fromDir: dir});
      }
    }
    return false;
  }

  if (startPos && villagePos && bfs(startPos, villagePos)) {
    winLevel();
  }
}

function winLevel() {
  clearInterval(timerInterval);
  factText.textContent = levels[currentLevel].fact;
  factPanel.style.display = "block";
  highlightPath();
}

function nextLevel() {
  currentLevel++;
  if (currentLevel < levels.length) {
    loadLevel(currentLevel);
  } else {
    alert("Thanks for playing! More levels coming soon.");
    currentLevel = 0;
    loadLevel(currentLevel);
  }
}

function highlightPath() {
  const tiles = document.querySelectorAll(".tile");
  tiles.forEach(tile => {
    if (tile.dataset.type.startsWith("pipe")) {
      tile.classList.add("connected");
    }
  });
}

loadLevel(currentLevel);