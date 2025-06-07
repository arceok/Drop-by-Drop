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
let currentVillageEntryDir = null;

const gameContainer = document.getElementById("game-container");
const timerDisplay = document.getElementById("timer");
const factPanel = document.getElementById("fact-panel");
const factText = document.getElementById("fact-text");

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
    if (moves.length === 0) break; // No more moves, should not happen

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
    fact: "Every level is now guaranteed to be solvable!",
    villageEntryDir
  };
}

function randomizePipes(grid) {
  // Rotations for each pipe type
  const rotations = {
    "pipe-horizontal": ["pipe-horizontal", "pipe-vertical"],
    "pipe-vertical": ["pipe-vertical", "pipe-horizontal"],
    "pipe-curve-ur": ["pipe-curve-ur", "pipe-curve-dr", "pipe-curve-dl", "pipe-curve-ul"],
    "pipe-curve-dr": ["pipe-curve-dr", "pipe-curve-dl", "pipe-curve-ul", "pipe-curve-ur"],
    "pipe-curve-dl": ["pipe-curve-dl", "pipe-curve-ul", "pipe-curve-ur", "pipe-curve-dr"],
    "pipe-curve-ul": ["pipe-curve-ul", "pipe-curve-ur", "pipe-curve-dr", "pipe-curve-dl"]
  };

  // Collect all pipe positions (excluding start and village)
  const pipePositions = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const type = grid[r][c];
      if (type.startsWith("pipe")) {
        pipePositions.push([r, c]);
      }
    }
  }

  // Shuffle at least one pipe (ensure at least one is changed)
  if (pipePositions.length > 0) {
    // Pick one random pipe to guarantee a change
    const [mustChangeR, mustChangeC] = pipePositions[Math.floor(Math.random() * pipePositions.length)];
    const originalType = grid[mustChangeR][mustChangeC];
    const opts = rotations[originalType].filter(opt => opt !== originalType);
    if (opts.length > 0) {
      grid[mustChangeR][mustChangeC] = opts[Math.floor(Math.random() * opts.length)];
    }
    // Now randomly rotate the rest (possibly leaving some unchanged)
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
  timeLeft = 60;
  timerDisplay.textContent = timeLeft;
  factPanel.style.display = "none";
  document.querySelectorAll(".tile.connected").forEach(tile => tile.classList.remove("connected"));

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
          // Always check for win after every rotation
          if (isConnected(currentVillageEntryDir)) winLevel();
        }
      });

      gameContainer.appendChild(tile);
    });
  });
  highlightCorrectPipes(); // <-- highlight after level load

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
  highlightCorrectPipes(); // <-- highlight after rotation
}

// Yes, the current logic in isConnected() will count the lines as connected
// if the pipes are already in the correct orientation when the level is generated.
// The player does not need to rotate any pipes for the win to trigger if the path is already valid.
// This is because randomizePipes() only rotates pipes randomly, so sometimes the solution is already present.

function isConnected() {
  const tiles = Array.from(document.querySelectorAll(".tile"));
  const grid = Array.from({ length: 5 }, () => Array(5).fill("empty"));

  tiles.forEach(tile => {
    const r = parseInt(tile.dataset.row);
    const c = parseInt(tile.dataset.col);
    grid[r][c] = tile.dataset.type;
  });

  // Define valid connections for each pipe type
  const pipeConnections = {
    "start": ["left", "right", "top", "bottom"],
    "pipe-horizontal": ["left", "right"],
    "pipe-vertical": ["top", "bottom"],
    // Corrected: Each curve connects the two directions it visually connects
    "pipe-curve-ur": ["right", "top"],   // ┗ connects right and top
    "pipe-curve-dr": ["right", "bottom"],// ┏ connects right and bottom
    "pipe-curve-dl": ["left", "bottom"], // ┓ connects left and bottom
    "pipe-curve-ul": ["left", "top"],    // ┛ connects left and top
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

  // Find start position
  let startRow = -1, startCol = -1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === "start") {
        startRow = r;
        startCol = c;
      }
    }
  }

  // Traverse the path and ensure we can reach the village by following valid pipe connections
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
      // Don't go back the way we came
      if (fromDir && dir === fromDir) continue;
      const [dr, dc] = directions[dir];
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= 5 || nc < 0 || nc >= 5) continue;
      const nextType = grid[nr][nc];
      const nextConnections = pipeConnections[nextType];
      // The two pipes are "connected" if both have a connection in the direction of each other
      if (nextConnections && nextConnections.includes(reverse[dir])) {
        if (dfs(nr, nc, reverse[dir])) return true;
      }
    }
    return false;
  }

  // Try all possible directions from start
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
  highlightPath(); // Highlight only when completed
  factText.textContent = "Level Completed!";
  factPanel.style.display = "block";
}

function nextLevel() {
  currentLevel++;
  loadLevel(currentLevel);
}

// Highlighting function (unchanged)
function highlightPath() {
  // Remove any previous highlights
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
  // Remove previous highlights
  document.querySelectorAll(".tile").forEach(tile => tile.classList.remove("connected"));

  const tiles = Array.from(document.querySelectorAll(".tile"));
  const grid = Array.from({ length: 5 }, () => Array(5).fill("empty"));

  tiles.forEach(tile => {
    const r = parseInt(tile.dataset.row);
    const c = parseInt(tile.dataset.col);
    grid[r][c] = tile.dataset.type;
  });

  // --- FIXED: Correct corner pipe connection definitions ---
  const pipeConnections = {
    "start": ["left", "right", "top", "bottom"],
    "pipe-horizontal": ["left", "right"],
    "pipe-vertical": ["top", "bottom"],
    // Corrected: Each curve connects the two directions it visually connects
    "pipe-curve-ur": ["right", "top"],   // ┗ connects right and top
    "pipe-curve-dr": ["right", "bottom"],// ┏ connects right and bottom
    "pipe-curve-dl": ["left", "bottom"], // ┓ connects left and bottom
    "pipe-curve-ul": ["left", "top"],    // ┛ connects left and top
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

  // For each pipe, check if it is "correctly" connected to at least one neighbor
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

window.nextLevel = nextLevel;

loadLevel(currentLevel);