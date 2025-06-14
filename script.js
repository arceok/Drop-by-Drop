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
let timeLeft = 30; // set to 30 for your timer change
let timerInterval;
let currentVillageEntryDir = null;
let streak = 0; // set to 0 for your streak change
let gameLocked = false;

// Utility to set all pipes draggable or not
function setPipesDraggable(draggable) {
    const pipes = document.querySelectorAll('.pipe');
    pipes.forEach(pipe => {
        pipe.draggable = draggable;
    });
}

const gameContainer = document.getElementById("game-container");
const timerDisplay = document.getElementById("timer");
const factPanel = document.getElementById("fact-panel");
const factText = document.getElementById("fact-text");
const streakDisplay = document.getElementById("streak");

const charityWaterFacts = [
  "771 million people lack access to clean water. charity: water is on a mission to change that.",
  "Every $40 donated to charity: water can give one person clean water for life.",
  "Access to clean water improves health, education, and economic opportunities.",
  "Women and children spend 200 million hours every day collecting water.",
  "100% of public donations to charity: water fund clean water projects."
];

function generateSolvableLevel() {
  const grid = Array.from({ length: 5 }, () => Array(5).fill("empty"));
  let row = 0, col = 0;
  grid[row][col] = "start";

  const path = [[row, col]];
  const visited = Array.from({ length: 5 }, () => Array(5).fill(false));
  visited[row][col] = true;

  // Generate a path without revisiting cells
  while (!(row === 0 && col === 4)) {
    const moves = [];
    if (col + 1 < 5 && !visited[row][col + 1]) moves.push([row, col + 1]);
    if (row + 1 < 5 && !visited[row + 1][col]) moves.push([row + 1, col]);
    if (moves.length === 0) break;

    const [newRow, newCol] = moves[Math.floor(Math.random() * moves.length)];
    path.push([newRow, newCol]);
    visited[newRow][newCol] = true;
    row = newRow;
    col = newCol;
  }

  grid[row][col] = "village";

  // Determine the direction from which the solution path enters the village
  let villageEntryDir = null;
  if (path.length >= 2) {
    const [beforeVillageRow, beforeVillageCol] = path[path.length - 2];
    if (beforeVillageRow === row - 1 && beforeVillageCol === col) villageEntryDir = "top";
    else if (beforeVillageRow === row && beforeVillageCol === col - 1) villageEntryDir = "left";
    else if (beforeVillageRow === row + 1 && beforeVillageCol === col) villageEntryDir = "bottom";
    else if (beforeVillageRow === row && beforeVillageCol === col + 1) villageEntryDir = "right";
  }

  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1];
    const cur = path[i];
    const next = path[i + 1];
    if (!Array.isArray(prev) || !Array.isArray(cur) || !Array.isArray(next)) continue;
    const [prevRow, prevCol] = prev;
    const [curRow, curCol] = cur;
    const [nextRow, nextCol] = next;

    const dx1 = curCol - prevCol, dy1 = curRow - prevRow;
    const dx2 = nextCol - curCol, dy2 = nextRow - curRow;

    if (dx1 === 0 && dx2 === 0) grid[curRow][curCol] = "pipe-vertical";
    else if (dy1 === 0 && dy2 === 0) grid[curRow][curCol] = "pipe-horizontal";
    else if ((dx1 === 1 && dy2 === 1) || (dy1 === 1 && dx2 === 1)) grid[curRow][curCol] = "pipe-curve-ul";
    else if ((dx1 === -1 && dy2 === 1) || (dy1 === 1 && dx2 === -1)) grid[curRow][curCol] = "pipe-curve-ur";
    else if ((dx1 === -1 && dy2 === -1) || (dy1 === -1 && dx2 === -1)) grid[curRow][curCol] = "pipe-curve-dr";
    else if ((dx1 === 1 && dy2 === -1) || (dy1 === -1 && dx2 === 1)) grid[curRow][curCol] = "pipe-curve-dl";
  }

  return {
    grid,
    fact: charityWaterFacts[currentLevel % charityWaterFacts.length],
    villageEntryDir
  };
}

function randomizePipes(grid) {
  const rotations = {
    "pipe-horizontal": ["pipe-horizontal", "pipe-vertical"],
    "pipe-vertical": ["pipe-vertical", "pipe-horizontal"],
    "pipe-curve-ur": ["pipe-curve-ur", "pipe-curve-dr", "pipe-curve-dl", "pipe-curve-ul"],
    "pipe-curve-dr": ["pipe-curve-dr", "pipe-curve-dl", "pipe-curve-ul", "pipe-curve-ur"],
    "pipe-curve-dl": ["pipe-curve-dl", "pipe-curve-ul", "pipe-curve-ur", "pipe-curve-dr"],
    "pipe-curve-ul": ["pipe-curve-ul", "pipe-curve-ur", "pipe-curve-dr", "pipe-curve-dl"]
  };

  const pipePositions = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const type = grid[r][c];
      if (type.startsWith("pipe")) {
        pipePositions.push([r, c]);
      }
    }
  }

  if (pipePositions.length > 0) {
    const [mustChangeR, mustChangeC] = pipePositions[Math.floor(Math.random() * pipePositions.length)];
    const originalType = grid[mustChangeR][mustChangeC];
    const opts = rotations[originalType].filter(opt => opt !== originalType);
    if (opts.length > 0) {
      grid[mustChangeR][mustChangeC] = opts[Math.floor(Math.random() * opts.length)];
    }
    for (const [r, c] of pipePositions) {
      if (r === mustChangeR && c === mustChangeC) continue;
      const type = grid[r][c];
      const opts = rotations[type];
      if (opts && Math.random() < 0.7) {
        grid[r][c] = opts[Math.floor(Math.random() * opts.length)];
      }
    }
  }
}

function loadLevel(levelIndex) {
  clearInterval(timerInterval);
  timeLeft = 30;
  timerDisplay.textContent = timeLeft;
  factPanel.style.display = "none";
  document.querySelectorAll(".tile.connected").forEach(tile => tile.classList.remove("connected"));
  streakDisplay.textContent = `Streak: ${streak}`;

  const level = generateSolvableLevel();
  randomizePipes(level.grid);
  currentVillageEntryDir = level.villageEntryDir;

  gameContainer.innerHTML = "";

  level.grid.forEach((row, rowIndex) => {
    row.forEach((type, colIndex) => {
      const tile = document.createElement("div");
      tile.classList.add("tile");
      tile.dataset.row = rowIndex;
      tile.dataset.col = colIndex;
      tile.dataset.type = type;
      tile.textContent = icons[type];

      tile.addEventListener("click", () => {
        if (tile.dataset.type.startsWith("pipe")) {
          rotatePipe(tile);
          if (isConnected(currentVillageEntryDir)) winLevel();
        }
      });

      gameContainer.appendChild(tile);
    });
  });
  highlightCorrectPipes();

  factText.textContent = level.fact;

  timerInterval = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      showTimesUpCard();
      streak = 0;
      streakDisplay.textContent = `Streak: ${streak}`;
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
  highlightCorrectPipes();
}

function isConnected() {
  const tiles = Array.from(document.querySelectorAll(".tile"));
  const grid = Array.from({ length: 5 }, () => Array(5).fill("empty"));

  tiles.forEach(tile => {
    const r = parseInt(tile.dataset.row);
    const c = parseInt(tile.dataset.col);
    grid[r][c] = tile.dataset.type;
  });

  const pipeConnections = {
    "start": ["left", "right", "top", "bottom"],
    "pipe-horizontal": ["left", "right"],
    "pipe-vertical": ["top", "bottom"],
    "pipe-curve-ur": ["right", "top"],
    "pipe-curve-dr": ["right", "bottom"],
    "pipe-curve-dl": ["left", "bottom"],
    "pipe-curve-ul": ["left", "top"],
    "village": ["left", "right", "top", "bottom"]
  };
  const directions = {
    top: [-1, 0],
    right: [0, 1],
    bottom: [1, 0],
    left: [0, -1]
  };
  const reverse = {
    top: "bottom",
    bottom: "top",
    left: "right",
    right: "left"
  };

  const rows = 5, cols = 5;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));

  let startRow = -1, startCol = -1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === "start") {
        startRow = r;
        startCol = c;
      }
    }
  }

  function dfs(r, c, fromDir) {
    if (r < 0 || r >= 5 || c < 0 || c >= 5) return false;
    if (visited[r][c]) return false;
    const type = grid[r][c];
    if (!type || type === "empty") return false;
    visited[r][c] = true;

    if (type === "village") return true;

    const connections = pipeConnections[type];
    if (!connections) return false;

    for (const dir of connections) {
      if (fromDir && dir === fromDir) continue;
      const [dr, dc] = directions[dir];
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= 5 || nc < 0 || nc >= 5) continue;
      const nextType = grid[nr][nc];
      const nextConnections = pipeConnections[nextType];
      if (nextConnections && nextConnections.includes(reverse[dir])) {
        if (dfs(nr, nc, reverse[dir])) return true;
      }
    }
    return false;
  }

  for (const dir of pipeConnections["start"]) {
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) visited[r][c] = false;
    const [dr, dc] = directions[dir];
    const nr = startRow + dr, nc = startCol + dc;
    if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5) {
      const nextType = grid[nr][nc];
      const nextConnections = pipeConnections[nextType];
      if (nextConnections && nextConnections.includes(reverse[dir])) {
        visited[startRow][startCol] = true;
        if (dfs(nr, nc, reverse[dir])) {
          return true;
        }
        visited[startRow][startCol] = false;
      }
    }
  }
  return false;
}

function winLevel() {
  clearInterval(timerInterval);
  highlightPath();
  factText.textContent = "Level Completed!";
  factPanel.style.display = "block";
  streak++;
  streakDisplay.textContent = `Streak: ${streak}`;
  gameLocked = true;
  setPipesDraggable(false);
  // When level is complete:
  startRainEffect();
}

function nextLevel() {
  currentLevel++;
  loadLevel(currentLevel);
}

function highlightPath() {
  document.querySelectorAll(".tile.connected").forEach(tile => tile.classList.remove("connected"));
  const tiles = Array.from(document.querySelectorAll(".tile"));
  const grid = Array.from({ length: 5 }, () => Array(5).fill("empty"));

  tiles.forEach(tile => {
    const r = parseInt(tile.dataset.row);
    const c = parseInt(tile.dataset.col);
    grid[r][c] = tile.dataset.type;
  });

  const directions = {
    "pipe-horizontal": [[0, -1], [0, 1]],
    "pipe-vertical": [[-1, 0], [1, 0]],
    "pipe-curve-ur": [[1, 0], [0, -1]],
    "pipe-curve-dr": [[-1, 0], [0, -1]],
    "pipe-curve-dl": [[-1, 0], [0, 1]],
    "pipe-curve-ul": [[1, 0], [0, 1]]
  };

  const queue = [[0, 0]];
  const visited = Array.from({ length: 5 }, () => Array(5).fill(false));
  visited[0][0] = true;

  while (queue.length > 0) {
    const [r, c] = queue.shift();
    const tile = document.querySelector(`.tile[data-row='${r}'][data-col='${c}']`);
    tile.classList.add("connected");
    const type = grid[r][c];
    const conns = directions[type] || [];
    for (const [dr, dc] of conns) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5 && !visited[nr][nc]) {
        visited[nr][nc] = true;
        queue.push([nr, nc]);
      }
    }
  }
}

function highlightCorrectPipes() {
  document.querySelectorAll(".tile").forEach(tile => tile.classList.remove("connected"));

  const tiles = Array.from(document.querySelectorAll(".tile"));
  const grid = Array.from({ length: 5 }, () => Array(5).fill("empty"));

  tiles.forEach(tile => {
    const r = parseInt(tile.dataset.row);
    const c = parseInt(tile.dataset.col);
    grid[r][c] = tile.dataset.type;
  });

  const pipeConnections = {
    "start": ["left", "right", "top", "bottom"],
    "pipe-horizontal": ["left", "right"],
    "pipe-vertical": ["top", "bottom"],
    "pipe-curve-ur": ["right", "top"],
    "pipe-curve-dr": ["right", "bottom"],
    "pipe-curve-dl": ["left", "bottom"],
    "pipe-curve-ul": ["left", "top"],
    "village": ["left", "right", "top", "bottom"]
  };
  const directions = {
    top: [-1, 0],
    right: [0, 1],
    bottom: [1, 0],
    left: [0, -1]
  };
  const reverse = {
    top: "bottom",
    bottom: "top",
    left: "right",
    right: "left"
  };

  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const type = grid[r][c];
      if (!type || type === "empty") continue;
      const connections = pipeConnections[type];
      if (!connections) continue;
      let correct = false;
      for (const dir of connections) {
        const [dr, dc] = directions[dir];
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= 5 || nc < 0 || nc >= 5) continue;
        const neighborType = grid[nr][nc];
        const neighborConnections = pipeConnections[neighborType];
        if (neighborConnections && neighborConnections.includes(reverse[dir])) {
          correct = true;
          break;
        }
      }
      if (correct) {
        const tile = document.querySelector(`.tile[data-row='${r}'][data-col='${c}']`);
        if (tile) tile.classList.add("connected");
      }
    }
  }
}

function showTimesUpCard() {
  factText.textContent = "Time's Up! Try Again!";
  factPanel.style.display = "block";
  factPanel.style.backgroundColor = "#fffbea";
  factPanel.style.borderColor = "#f4b400";
  factPanel.style.color = "#f4b400";
  // Hide the continue button and charity: water button for this state
  factPanel.querySelector('button[onclick="nextLevel()"]').style.display = "none";
  document.getElementById("cw-action-btn").style.display = "none";
  // Add a restart button if not already present
  let restartBtn = document.getElementById("restart-btn");
  if (!restartBtn) {
    restartBtn = document.createElement("button");
    restartBtn.id = "restart-btn";
    restartBtn.textContent = "Restart";
    restartBtn.style.marginTop = "1rem";
    restartBtn.style.backgroundColor = "#f4b400";
    restartBtn.style.color = "#222";
    restartBtn.style.fontWeight = "bold";
    restartBtn.style.border = "none";
    restartBtn.style.borderRadius = "5px";
    restartBtn.style.cursor = "pointer";
    restartBtn.style.fontSize = "1.1rem";
    restartBtn.onclick = () => {
      // Restore buttons
      factPanel.querySelector('button[onclick="nextLevel()"]').style.display = "";
      document.getElementById("cw-action-btn").style.display = "";
      restartBtn.remove();
      loadLevel(currentLevel);
    };
    factPanel.appendChild(restartBtn);
  }
}

function onLevelComplete() {
    // ...existing code...
    gameLocked = true;
    setPipesDraggable(false);
    // ...existing code...
}

function onNextLevelButtonClick() {
    // Called when the player clicks to start the next level
    // ...existing code...
    gameLocked = false;
    setPipesDraggable(true);
    // ...existing code...
}

window.nextLevel = nextLevel;

loadLevel(currentLevel);