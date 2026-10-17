const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');
const bombsEl = document.getElementById('bombs');
const buildPanelEl = document.getElementById('buildPanel');
const buildStatusEl = document.getElementById('buildStatus');
const resourcesEl = document.getElementById('resources');
const buildButton = document.getElementById('buildButton');
const gatherButton = document.getElementById('gatherButton');
const buildGridEl = document.getElementById('houseBuildGrid');
const expandGridButton = document.getElementById('expandGridButton');
const homePanelEl = document.getElementById('homePanel');
const homeStatusEl = document.getElementById('homeStatus');
const farmSuppliesEl = document.getElementById('farmSupplies');
const hungerMeterEl = document.getElementById('hungerMeter');
const hungerValueEl = document.getElementById('hungerValue');
const farmPlotsEl = document.getElementById('farmPlots');
const eatButton = document.getElementById('eatButton');
const earthButton = document.getElementById('earthButton');
const materialButtons = {
  wood: document.getElementById('woodBuildButton'),
  stone: document.getElementById('stoneBuildButton'),
  bunker: document.getElementById('bunkerBuildButton'),
  'bunker-hatch': document.getElementById('hatchBuildButton'),
};
const furnitureButtons = {
  bed: document.getElementById('bedBuildButton'),
  table: document.getElementById('tableBuildButton'),
  chair: document.getElementById('chairBuildButton'),
  cabinet: document.getElementById('cabinetBuildButton'),
};

const keys = {};
const stars = Array.from({ length: 120 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  r: Math.random() * 2 + 1,
  speed: Math.random() * 1.2 + 0.4,
}));

let score = 0;
let lives = 20;
let level = 1;
let bombs = Infinity;
let isGameOver = false;
let gameWon = false;
let escapeMode = false;
let trollMode = false;
let buildMode = false;
let houseBuilt = false;
let homeMode = false;
let returnMode = false;
let hunger = 100;
let food = 0;
let seeds = 3;
let farmMessage = 'Klicke auf ein Beet, um Saatgut zu pflanzen.';
let farmPlots = Array.from({ length: 6 }, () => ({ growth: -1 }));
let farmUiTimer = 0;
const earth = { x: 450, y: 132, radius: 54 };
let mazeMode = false;
let chestMode = false;
let troll = null;
let maze = null;
let mazeLoot = [];
let mazeMessage = '';
let mazeMessageTimer = 0;
let wallImpact = null;
let wallImpactCooldown = 0;
let buildSelection = 'wood';
const buildGrid = { columns: 12, rows: 8, tileSize: 36, y: 116 };
let houseTiles = Array(buildGrid.columns * buildGrid.rows).fill(null);
let bunkerHatchOpen = false;
let lastTime = 0;
let shootCooldown = 0;
let meteorSpawnTimer = 0;
let bombSpawnTimer = 0;
const resources = { wood: 0, stone: 0, bunker: 0 };

const player = {
  x: canvas.width / 2,
  y: canvas.height - 60,
  width: 28,
  height: 32,
  speed: 360,
  shield: 0,
  invulnerabilityTimer: 0,
};
const mouseTarget = { x: player.x, y: player.y };

let rockets = [];
let aliens = [];
let meteors = [];
let bombsPower = [];
let bossShots = [];
let particles = [];
const platform = {
  x: canvas.width / 2,
  y: 52,
  width: 132,
  height: 24,
};

function resetGame() {
  score = 0;
  lives = 20;
  level = 1;
  bombs = Infinity;
  isGameOver = false;
  gameWon = false;
  escapeMode = false;
  trollMode = false;
  buildMode = false;
  houseBuilt = false;
  homeMode = false;
  returnMode = false;
  hunger = 100;
  food = 0;
  seeds = 3;
  farmMessage = 'Klicke auf ein Beet, um Saatgut zu pflanzen.';
  farmPlots = Array.from({ length: 6 }, () => ({ growth: -1 }));
  farmUiTimer = 0;
  mazeMode = false;
  chestMode = false;
  troll = null;
  maze = null;
  mazeLoot = [];
  mazeMessage = '';
  mazeMessageTimer = 0;
  wallImpact = null;
  wallImpactCooldown = 0;
  buildSelection = 'wood';
  houseTiles = Array(buildGrid.columns * buildGrid.rows).fill(null);
  bunkerHatchOpen = false;
  resources.wood = 0;
  resources.stone = 0;
  resources.bunker = 0;
  player.x = canvas.width / 2;
  player.y = canvas.height - 60;
  mouseTarget.x = player.x;
  mouseTarget.y = player.y;
  player.shield = 1.4;
  player.invulnerabilityTimer = 1.4;
  document.getElementById('movementControl').textContent = 'Fliegen: Maus bewegen';
  document.getElementById('bombControl').textContent = 'Atombombe: Rechtsklick';
  rockets = [];
  particles = [];
  meteors = [];
  bombsPower = [];
  bossShots = [];
  meteorSpawnTimer = 0.5;
  bombSpawnTimer = 6;
  spawnWave();
  updateHud();
  updateBuildUi();
  updateHomeUi();
}

function enterMazeCell() {
  const row = Math.floor((player.y - maze.y) / maze.cellSize);
  const column = Math.floor((player.x - maze.x) / maze.cellSize);
  if (row === maze.playerRow && column === maze.playerColumn) return;
  maze.playerRow = row;
  maze.playerColumn = column;

  for (let index = mazeLoot.length - 1; index >= 0; index -= 1) {
    const item = mazeLoot[index];
    if (item.row !== row || item.column !== column) continue;
    resources[item.material] += 1;
    mazeLoot.splice(index, 1);
    mazeMessage = item.material === 'wood' ? 'Feuriges Holz eingesammelt.' : 'Feuriger Stein eingesammelt.';
    updateHud();
  }

  if (maze.cells[row][column] === 'E') {
    mazeMode = false;
    chestMode = true;
    mazeMessage = 'Du hast den Ausgang gefunden. Klicke auf die goldene Truhe.';
  }
}

function canMoveInMaze(x, y) {
  const halfWidth = player.width / 2;
  const halfHeight = player.height / 2;
  const corners = [
    [x - halfWidth, y - halfHeight],
    [x + halfWidth, y - halfHeight],
    [x - halfWidth, y + halfHeight],
    [x + halfWidth, y + halfHeight],
  ];

  for (const [cornerX, cornerY] of corners) {
    const column = Math.floor((cornerX - maze.x) / maze.cellSize);
    const row = Math.floor((cornerY - maze.y) / maze.cellSize);
    const cell = maze.cells[row]?.[column];
    if (!cell || cell === '#') return false;
    if (cell === 'E' && (resources.wood < 5 || resources.stone < 5)) {
      mazeMessage = `Der Ausgang ist versiegelt. Feuriges Holz ${resources.wood}/5, feuriger Stein ${resources.stone}/5.`;
      return false;
    }
  }
  return true;
}

function showWallImpact(x, y) {
  if (wallImpactCooldown > 0) return;
  const column = Math.floor((x - maze.x) / maze.cellSize);
  const row = Math.floor((y - maze.y) / maze.cellSize);
  wallImpact = { row, column, timer: 0.24 };
  wallImpactCooldown = 0.32;
  mazeMessage = 'Wand im Weg!';
  mazeMessageTimer = 0.7;
  createExplosion(x, y, '#ffd166');
}

function updateMazeMovement(dt) {
  mazeMessageTimer = Math.max(0, mazeMessageTimer - dt);
  wallImpactCooldown = Math.max(0, wallImpactCooldown - dt);
  if (wallImpact) {
    wallImpact.timer -= dt;
    if (wallImpact.timer <= 0) {
      wallImpact = null;
    }
  }
  if (mazeMessageTimer === 0 && mazeMode) {
    mazeMessage = `Finde feuriges Holz (${resources.wood}/5) und Stein (${resources.stone}/5), dann den Ausgang. Rechtsklick sprengt Wände.`;
  }
  if (!mazeMode || !maze) return;
  const dx = mouseTarget.x - player.x;
  const dy = mouseTarget.y - player.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1) return;

  const stepSize = Math.min(player.speed * dt, distance);
  const steps = Math.ceil(stepSize / 4);
  const stepX = (dx / distance) * stepSize / steps;
  const stepY = (dy / distance) * stepSize / steps;

  for (let step = 0; step < steps; step += 1) {
    const nextX = player.x + stepX;
    if (canMoveInMaze(nextX, player.y)) {
      player.x = nextX;
    } else {
      showWallImpact(nextX + Math.sign(stepX) * player.width / 2, player.y);
    }
    const nextY = player.y + stepY;
    if (canMoveInMaze(player.x, nextY)) {
      player.y = nextY;
    } else {
      showWallImpact(player.x, nextY + Math.sign(stepY) * player.height / 2);
    }
    enterMazeCell();
    if (!mazeMode) return;
  }
}

function updateHud() {
  scoreEl.textContent = score;
  livesEl.textContent = lives;
  levelEl.textContent = level;
  bombsEl.textContent = bombs;
  updateBuildUi();
  updateHomeUi();
}

const cropGrowSeconds = 10;

function updateHomeUi() {
  homePanelEl.hidden = !homeMode || returnMode;
  earthButton.disabled = !homeMode || returnMode;
  farmSuppliesEl.textContent = `Saatgut: ${seeds} | Essen: ${food}`;
  hungerMeterEl.value = hunger;
  hungerValueEl.textContent = `${Math.ceil(hunger)}%`;
  homeStatusEl.textContent = farmMessage;
  eatButton.disabled = !homeMode || food <= 0 || hunger >= 100;
  renderFarmPlots();
}

function renderFarmPlots() {
  while (farmPlotsEl.children.length < farmPlots.length) {
    const plotButton = document.createElement('button');
    plotButton.type = 'button';
    plotButton.className = 'farm-plot';
    plotButton.dataset.plot = farmPlotsEl.children.length;
    farmPlotsEl.appendChild(plotButton);
  }

  for (let index = 0; index < farmPlots.length; index += 1) {
    const plot = farmPlots[index];
    const button = farmPlotsEl.children[index];
    if (plot.growth < 0) {
      button.className = 'farm-plot farm-plot--empty';
      button.textContent = 'Leeres Beet';
      button.disabled = seeds <= 0;
      button.setAttribute('aria-label', `Beet ${index + 1}, leer. Klicken zum Pflanzen.`);
    } else if (plot.growth < cropGrowSeconds) {
      const progress = Math.floor((plot.growth / cropGrowSeconds) * 100);
      button.className = 'farm-plot farm-plot--growing';
      button.innerHTML = `<span class="crop-sprout crop-sprout--young" aria-hidden="true"></span><span>Wächst · ${progress}%</span>`;
      button.disabled = true;
      button.setAttribute('aria-label', `Beet ${index + 1}, Pflanze wächst, ${progress} Prozent.`);
    } else {
      button.className = 'farm-plot farm-plot--ripe';
      button.innerHTML = '<span class="crop-sprout crop-sprout--ripe" aria-hidden="true"></span><span>Ernten</span>';
      button.disabled = false;
      button.setAttribute('aria-label', `Beet ${index + 1}, Ernte ist reif. Klicken zum Ernten.`);
    }
  }
}

function updateFarm(dt) {
  if (!homeMode || returnMode) return;
  hunger = Math.max(0, hunger - dt * 0.18);
  for (const plot of farmPlots) {
    if (plot.growth < 0 || plot.growth >= cropGrowSeconds) continue;
    plot.growth = Math.min(cropGrowSeconds, plot.growth + dt);
  }
  farmUiTimer -= dt;
  if (farmUiTimer <= 0) {
    farmUiTimer = 0.25;
    updateHomeUi();
  }
}

function useFarmPlot(index) {
  if (!homeMode || !farmPlots[index]) return;
  const plot = farmPlots[index];
  if (plot.growth < 0) {
    if (seeds <= 0) {
      farmMessage = 'Du brauchst Saatgut. Ernte zuerst eine reife Pflanze.';
      updateHomeUi();
      return;
    }
    seeds -= 1;
    plot.growth = 0;
    farmMessage = 'Das Saatgut ist gepflanzt. Die Pflanze wächst über die Zeit.';
  } else if (plot.growth >= cropGrowSeconds) {
    plot.growth = -1;
    food += 3;
    seeds += 1;
    farmMessage = 'Geerntet: 3 Essen und 1 Saatgut.';
  }
  updateHomeUi();
}

function eatFood() {
  if (!homeMode || food <= 0 || hunger >= 100) return;
  food -= 1;
  hunger = Math.min(100, hunger + 35);
  farmMessage = 'Du hast gegessen und deinen Hunger gestillt.';
  updateHomeUi();
}

function startEarthReturn() {
  if (!homeMode || returnMode || isGameOver) return;
  returnMode = true;
  hunger = 100;
  player.x = canvas.width / 2;
  player.y = canvas.height - 64;
  mouseTarget.x = player.x;
  mouseTarget.y = player.y;
  meteors = [];
  meteorSpawnTimer = 0.4;
  bombsPower = [];
  document.getElementById('movementControl').textContent = 'Zur Erde fliegen: Maus bewegen';
  homeStatusEl.textContent = 'Fliege zur Erde und weiche den Meteoriten aus.';
  updateHomeUi();
}

function updateBuildUi() {
  buildPanelEl.hidden = !buildMode;
  resourcesEl.textContent = `Feuriges Holz: ${resources.wood} | Feuriger Stein: ${resources.stone} | Bunkermaterial: ${resources.bunker}`;
  buildButton.disabled = !buildMode;
  buildButton.textContent = 'Haus fertigstellen';
  gatherButton.disabled = !buildMode;
  expandGridButton.disabled = !buildMode;
  buildStatusEl.textContent = buildMode
    ? `Platziere die Falltür in der Trennreihe. Ein Klick auf ihren Hebel öffnet den Bunker. Ausgewählt: ${selectionNames[buildSelection]}.`
    : '';
  renderBuildGrid();
  for (const [material, button] of Object.entries(materialButtons)) {
    const resource = material === 'bunker-hatch' ? 'bunker' : material;
    button.disabled = resources[resource] === 0;
    button.setAttribute('aria-pressed', String(buildSelection === material));
  }
  for (const [furniture, button] of Object.entries(furnitureButtons)) {
    button.disabled = resources.wood < 1;
    button.setAttribute('aria-pressed', String(buildSelection === `furniture-${furniture}`));
  }
}

const materialNames = {
  wood: 'feuriges Holz',
  stone: 'feuriger Stein',
  bunker: 'unzerstörbares Material',
  'bunker-hatch': 'Falltür mit Hebel',
};
const furnitureNames = { bed: 'Bett', table: 'Tisch', chair: 'Stuhl', cabinet: 'Schrank' };
const selectionNames = { ...materialNames, ...Object.fromEntries(Object.entries(furnitureNames).map(([key, name]) => [`furniture-${key}`, name])) };

function renderBuildGrid() {
  buildGridEl.style.gridTemplateColumns = `repeat(${buildGrid.columns}, 34px)`;
  const cellCount = buildGrid.columns * buildGrid.rows;
  while (buildGridEl.children.length < cellCount) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'house-build-cell';
    cell.setAttribute('role', 'gridcell');
    buildGridEl.appendChild(cell);
  }
  while (buildGridEl.children.length > cellCount) {
    buildGridEl.lastElementChild.remove();
  }

  for (let index = 0; index < cellCount; index += 1) {
    const row = Math.floor(index / buildGrid.columns);
    const column = index % buildGrid.columns;
    const material = houseTiles[index];
    const cell = buildGridEl.children[index];
    cell.dataset.row = row;
    cell.dataset.column = column;
    const hatchState = material === 'bunker-hatch' && bunkerHatchOpen ? ' house-build-cell--bunker-hatch-open' : '';
    cell.className = `house-build-cell${material ? ` house-build-cell--${material}` : ''}${hatchState}${row === buildGrid.rows / 2 - 1 ? ' house-build-cell--separator' : ''}`;
    const itemName = material === 'bunker-hatch'
      ? `Falltür mit Hebel, ${bunkerHatchOpen ? 'offen' : 'geschlossen'}`
      : selectionNames[material] || materialNames[material] || 'leer';
    cell.setAttribute('aria-label', `${row < buildGrid.rows / 2 ? 'Haus' : 'Bunker'}, Reihe ${row + 1}, Feld ${column + 1}: ${itemName}`);
    cell.title = itemName;
  }
}

function expandBuildGrid() {
  const oldColumns = buildGrid.columns;
  const oldRows = buildGrid.rows;
  const newColumns = oldColumns + 4;
  const newRows = oldRows + 4;
  const expandedTiles = Array(newColumns * newRows).fill(null);

  for (let row = 0; row < oldRows; row += 1) {
    const newRow = row < oldRows / 2 ? row : row + 2;
    for (let column = 0; column < oldColumns; column += 1) {
      expandedTiles[newRow * newColumns + column] = houseTiles[row * oldColumns + column];
    }
  }

  buildGrid.columns = newColumns;
  buildGrid.rows = newRows;
  houseTiles = expandedTiles;
  updateBuildUi();
}

function spawnWave() {
  aliens = [];
  document.getElementById('shootControl').hidden = false;
  document.getElementById('bombControl').hidden = false;

  if (level > 5) {
    escapeMode = true;
    trollMode = false;
    buildMode = false;
    houseBuilt = false;
    mazeMode = false;
    chestMode = false;
    document.getElementById('shootControl').hidden = true;
    document.getElementById('bombControl').hidden = true;
    buildPanelEl.hidden = true;
    rockets = [];
    bombsPower = [];
    bossShots = [];
    return;
  }

  if (level > 1 && level % 3 === 0) {
    const bossWidth = 140;
    const bossHeight = 90;

    aliens.push({
      x: canvas.width / 2 - bossWidth / 2,
      y: 40,
      width: bossWidth,
      height: bossHeight,
      vx: 120 + level * 15,
      vy: 40 + level * 6,
      hp: 10 + level,
      maxHp: 10 + level,
      isBoss: true,
      color: `hsl(${(level * 30) % 360}, 90%, 60%)`,
    });
    return;
  }

  const alienWidth = 32;
  const alienHeight = 26;

  aliens.push({
    x: canvas.width / 2 - alienWidth / 2,
    y: 60,
    width: alienWidth,
    height: alienHeight,
    vx: 130 + level * 15,
    vy: 18 + level * 5,
    color: `hsl(${(level * 35) % 360}, 85%, 65%)`,
  });
}

function startTrollFight() {
  escapeMode = false;
  trollMode = true;
  troll = {
    x: canvas.width / 2 - 95,
    y: 72,
    width: 190,
    height: 150,
    vx: 115,
    hp: 20,
    maxHp: 20,
  };
  meteors = [];
  rockets = [];
  document.getElementById('shootControl').hidden = false;
  document.getElementById('bombControl').hidden = false;
}

function createMaze() {
  const rows = 13;
  const columns = 17;
  const cells = Array.from({ length: rows }, () => Array(columns).fill('#'));

  function carve(row, column) {
    cells[row][column] = '.';
    const directions = [
      [-2, 0], [2, 0], [0, -2], [0, 2],
    ].sort(() => Math.random() - 0.5);

    for (const [rowStep, columnStep] of directions) {
      const nextRow = row + rowStep;
      const nextColumn = column + columnStep;
      if (nextRow <= 0 || nextRow >= rows - 1 || nextColumn <= 0 || nextColumn >= columns - 1) continue;
      if (cells[nextRow][nextColumn] !== '#') continue;
      cells[row + rowStep / 2][column + columnStep / 2] = '.';
      carve(nextRow, nextColumn);
    }
  }

  carve(1, 1);
  cells[1][1] = 'S';
  cells[rows - 2][columns - 2] = 'E';
  maze = { cells, rows, columns, cellSize: 38, x: 127, y: 52, playerRow: 1, playerColumn: 1 };

  const openCells = [];
  for (let row = 1; row < rows - 1; row += 1) {
    for (let column = 1; column < columns - 1; column += 1) {
      if (cells[row][column] === '.' && !(row === 1 && column === 1)) openCells.push({ row, column });
    }
  }
  openCells.sort(() => Math.random() - 0.5);
  mazeLoot = [
    ...openCells.slice(0, 5).map((cell) => ({ ...cell, material: 'wood' })),
    ...openCells.slice(5, 10).map((cell) => ({ ...cell, material: 'stone' })),
  ];
}

function startMaze() {
  escapeMode = false;
  trollMode = false;
  mazeMode = true;
  chestMode = false;
  buildMode = false;
  mazeMessage = 'Finde feuriges Holz und Stein, dann den Ausgang. Bewege dich mit der Maus.';
  createMaze();
  player.x = maze.x + maze.cellSize * 1.5;
  player.y = maze.y + maze.cellSize * 1.5;
  mouseTarget.x = player.x;
  mouseTarget.y = player.y;
  document.getElementById('shootControl').hidden = true;
  document.getElementById('bombControl').hidden = false;
  document.getElementById('bombControl').textContent = 'Atombombe: Rechtsklick (Wände sprengen)';
  document.getElementById('movementControl').textContent = 'Labyrinth: Maus bewegen';
}

function moveInMaze(key) {
  if (!mazeMode || !maze) return;
  const moves = {
    ArrowUp: [-1, 0], w: [-1, 0], W: [-1, 0],
    ArrowDown: [1, 0], s: [1, 0], S: [1, 0],
    ArrowLeft: [0, -1], a: [0, -1], A: [0, -1],
    ArrowRight: [0, 1], d: [0, 1], D: [0, 1],
  };
  const move = moves[key];
  if (!move) return;
  const nextRow = maze.playerRow + move[0];
  const nextColumn = maze.playerColumn + move[1];
  if (maze.cells[nextRow]?.[nextColumn] === '#') return;

  if (maze.cells[nextRow][nextColumn] === 'E' && (resources.wood < 5 || resources.stone < 5)) {
    mazeMessage = `Der Ausgang ist versiegelt. Feuriges Holz ${resources.wood}/5, feuriger Stein ${resources.stone}/5.`;
    return;
  }

  maze.playerRow = nextRow;
  maze.playerColumn = nextColumn;
  player.x = maze.x + (nextColumn + 0.5) * maze.cellSize;
  player.y = maze.y + (nextRow + 0.5) * maze.cellSize;

  for (let index = mazeLoot.length - 1; index >= 0; index -= 1) {
    const item = mazeLoot[index];
    if (item.row !== nextRow || item.column !== nextColumn) continue;
    resources[item.material] += 1;
    mazeLoot.splice(index, 1);
    mazeMessage = item.material === 'wood' ? 'Feuriges Holz eingesammelt.' : 'Feuriger Stein eingesammelt.';
    updateHud();
  }

  if (maze.cells[nextRow][nextColumn] === 'E') {
    mazeMode = false;
    chestMode = true;
    mazeMessage = 'Du hast den Ausgang gefunden. Klicke auf die goldene Truhe.';
  }
}

function openGoldenChest() {
  if (!chestMode) return;
  chestMode = false;
  buildMode = true;
  resources.bunker = 12;
  houseTiles = Array(buildGrid.columns * buildGrid.rows).fill(null);
  bunkerHatchOpen = false;
  mazeMessage = 'Die Truhe enthielt 12 Blöcke unzerstörbares Bunkermaterial.';
  player.x = canvas.width / 2;
  player.y = canvas.height - 58;
  document.getElementById('movementControl').textContent = 'Bauen: Material wählen, dann Rasterfeld anklicken';
  updateHud();
}

function placeHouseTileAt(row, column) {
  if (!buildMode) return;
  if (column < 0 || column >= buildGrid.columns || row < 0 || row >= buildGrid.rows) return;

  const material = buildSelection;
  const isHatch = material === 'bunker-hatch';
  const hatchRow = buildGrid.rows / 2 - 1;
  const isBunker = row >= buildGrid.rows / 2;
  const isFurniture = material.startsWith('furniture-');
  if (isHatch && row !== hatchRow) return;
  if (isBunker && material !== 'bunker') return;
  if (!isBunker && material === 'bunker') return;
  if (isFurniture && (row >= buildGrid.rows / 2 || resources.wood < 1)) return;
  const index = row * buildGrid.columns + column;
  const previousMaterial = houseTiles[index];
  if (previousMaterial === material) return;
  const resource = isHatch ? 'bunker' : material;
  if (!isFurniture && resources[resource] <= 0) return;

  if (previousMaterial) {
    if (previousMaterial.startsWith('furniture-')) resources.wood += 1;
    else if (previousMaterial === 'bunker-hatch') resources.bunker += 1;
    else resources[previousMaterial] += 1;
  }
  if (isFurniture) resources.wood -= 1;
  else resources[resource] -= 1;
  houseTiles[index] = material;
  if (previousMaterial === 'bunker-hatch' || isHatch) bunkerHatchOpen = false;
  updateHud();
}

function toggleBunkerHatch(row, column) {
  if (!buildMode || houseTiles[row * buildGrid.columns + column] !== 'bunker-hatch') return false;
  bunkerHatchOpen = !bunkerHatchOpen;
  buildStatusEl.textContent = bunkerHatchOpen ? 'Falltür offen: Die Leiter führt in den Bunker.' : 'Falltür geschlossen. Klicke erneut auf den Hebel zum Öffnen.';
  renderBuildGrid();
  return true;
}

function placeHouseTile(event) {
  if (!buildMode) return;
  const bounds = canvas.getBoundingClientRect();
  const canvasX = ((event.clientX - bounds.left) / bounds.width) * canvas.width;
  const canvasY = ((event.clientY - bounds.top) / bounds.height) * canvas.height;
  const columns = buildGrid.columns;
  const rows = buildGrid.rows;
  const tileSize = Math.min(buildGrid.tileSize, (canvas.width - 100) / columns, 340 / rows);
  const gridX = (canvas.width - tileSize * columns) / 2;
  const gridY = buildGrid.y;
  const column = Math.floor((canvasX - gridX) / tileSize);
  const row = Math.floor((canvasY - gridY) / tileSize);
  placeHouseTileAt(row, column);
}

function defeatTroll() {
  if (!trollMode) return;

  createExplosion(troll.x + troll.width / 2, troll.y + troll.height / 2, '#a3e635');
  troll = null;
  rockets = [];
  score += 250;
  updateHud();
  startMaze();
}

function updateTroll(dt) {
  if (!trollMode || !troll) return;

  troll.x += troll.vx * dt;
  if (troll.x <= 0 || troll.x + troll.width >= canvas.width) {
    troll.vx *= -1;
    troll.x = Math.max(0, Math.min(canvas.width - troll.width, troll.x));
  }
  troll.y = 72 + Math.sin(Date.now() / 350) * 12;
}

function shootRocket() {
  if (shootCooldown > 0 || isGameOver || escapeMode || buildMode || homeMode) return;

  rockets.push({
    x: player.x,
    y: player.y - 18,
    radius: 5,
    speed: 540,
  });

  shootCooldown = 180;
}

function spawnMeteor() {
  meteors.push({
    x: Math.random() * (canvas.width - 60) + 30,
    y: -30,
    radius: Math.random() * 18 + 12,
    speed: Math.random() * 150 + 130 + level * 18,
    drift: (Math.random() - 0.5) * 120,
    spin: (Math.random() - 0.5) * 2,
    rotation: Math.random() * Math.PI * 2,
  });
}

function createExplosion(x, y, color) {
  for (let i = 0; i < 18; i += 1) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 30 + Math.random() * 16,
      size: Math.random() * 4 + 2,
      color,
    });
  }
}

function takeDamage(color = '#ff4d6d') {
  if (player.invulnerabilityTimer > 0 || isGameOver) return;
  lives -= 1;
  player.invulnerabilityTimer = 1.2;
  player.shield = Math.max(player.shield, 0.8);
  createExplosion(player.x, player.y, color);
  updateHud();
  if (lives <= 0) isGameOver = true;
}

function triggerBomb() {
  if (isGameOver || escapeMode || chestMode || buildMode || homeMode) return;

  if (mazeMode && maze) {
    const centerRow = maze.playerRow;
    const centerColumn = maze.playerColumn;
    let destroyedWalls = 0;

    for (let row = Math.max(1, centerRow - 2); row <= Math.min(maze.rows - 2, centerRow + 2); row += 1) {
      for (let column = Math.max(1, centerColumn - 2); column <= Math.min(maze.columns - 2, centerColumn + 2); column += 1) {
        const distance = Math.hypot(row - centerRow, column - centerColumn);
        if (distance > 2 || maze.cells[row][column] !== '#') continue;
        maze.cells[row][column] = '.';
        destroyedWalls += 1;
        createExplosion(
          maze.x + (column + 0.5) * maze.cellSize,
          maze.y + (row + 0.5) * maze.cellSize,
          '#ffb347',
        );
      }
    }

    mazeMessage = destroyedWalls > 0
      ? `Atombombe! ${destroyedWalls} Wandstücke weggesprengt.`
      : 'Hier gibt es keine Wand zum Sprengen.';
    mazeMessageTimer = 1.6;
    updateHud();
    return;
  }

  if (trollMode && troll) {
    troll.hp -= 5;
    createExplosion(troll.x + troll.width / 2, troll.y + troll.height / 2, '#a3e635');
    score += 25;
    if (troll.hp <= 0) defeatTroll();
    updateHud();
    return;
  }

  bombs = Infinity;
  score += 50;
  player.shield = Math.max(player.shield, 1.8);

  for (let i = aliens.length - 1; i >= 0; i -= 1) {
    const alien = aliens[i];
    createExplosion(alien.x + alien.width / 2, alien.y + alien.height / 2, '#8b5cf6');
  }

  for (let i = meteors.length - 1; i >= 0; i -= 1) {
    const meteor = meteors[i];
    createExplosion(meteor.x, meteor.y, '#f59e0b');
  }

  aliens = [];
  meteors = [];
  updateHud();
}

function handleInput(dt) {
  if (mazeMode) {
    updateMazeMovement(dt);
    return;
  }
  if (chestMode || buildMode) return;

  const mouseDx = mouseTarget.x - player.x;
  const mouseDy = mouseTarget.y - player.y;
  const mouseDistance = Math.hypot(mouseDx, mouseDy);

  if (mouseDistance > 1) {
    const travel = Math.min(mouseDistance, player.speed * dt);
    player.x += (mouseDx / mouseDistance) * travel;
    player.y += (mouseDy / mouseDistance) * travel;
  }

  if (homeMode && !returnMode) {
    player.x = Math.max(205, Math.min(695, player.x));
    player.y = Math.max(270, Math.min(475, player.y));
    return;
  }

  let direction = 0;

  if (keys.ArrowLeft || keys.a || keys.A) direction -= 1;
  if (keys.ArrowRight || keys.d || keys.D) direction += 1;

  player.x += direction * player.speed * dt;
  player.x = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, player.x));
  player.y = Math.max(player.height / 2, Math.min(canvas.height - player.height / 2, player.y));

  if (keys[' '] || keys.Space || keys.Spacebar) shootRocket();
}

function updateStars(dt) {
  for (const star of stars) {
    star.y += star.speed * 60 * dt;
    if (star.y > canvas.height) {
      star.y = -5;
      star.x = Math.random() * canvas.width;
    }
  }
}

function updateRockets(dt) {
  rockets = rockets.filter((rocket) => {
    rocket.y -= rocket.speed * dt;
    return rocket.y > -20;
  });
}

function updateAliens(dt) {
  if (escapeMode || trollMode || mazeMode || chestMode || buildMode || houseBuilt) return;

  if (aliens.length === 0) {
    level += 1;
    spawnWave();
    updateHud();
    return;
  }

  for (let alienIndex = 0; alienIndex < aliens.length; alienIndex += 1) {
    const alien = aliens[alienIndex];
    if (alien.isBoss) {
      alien.x += alien.vx * dt;
      if (alien.x <= 0 || alien.x + alien.width >= canvas.width) {
        alien.vx *= -1;
        alien.x = Math.max(0, Math.min(canvas.width - alien.width, alien.x));
      }

      alien.y += Math.sin((alien.x + level * 20) / 32) * 0.8;

      if (Math.random() < 0.018) {
        spawnBossShot(alien.x + alien.width / 2, alien.y + alien.height / 2);
      }

      if (alien.y + alien.height >= player.y - 10) {
        aliens.splice(alienIndex, 1);
        takeDamage();
        return;
      }

      continue;
    }

    const nextX = alien.x + alien.vx * dt;
    if (nextX < 0 || nextX + alien.width > canvas.width) {
      alien.vx *= -1;
      alien.y += alien.vy * dt;
    } else {
      alien.x = nextX;
    }

    if (alien.y + alien.height >= player.y - 10) {
      aliens.splice(alienIndex, 1);
      takeDamage();
      return;
    }
  }
}

function updateMeteors(dt) {
  if (trollMode || mazeMode || chestMode || buildMode || (homeMode && !returnMode)) {
    meteors = [];
    return;
  }

  meteorSpawnTimer -= dt;
  if (meteorSpawnTimer <= 0) {
    spawnMeteor();
    meteorSpawnTimer = Math.max(0.35, 1.2 - level * 0.08) + Math.random() * 0.6;
  }

  for (const meteor of meteors) {
    meteor.x += meteor.drift * dt;
    meteor.y += meteor.speed * dt;
    meteor.rotation += meteor.spin * dt * 60;
  }

  for (let i = meteors.length - 1; i >= 0; i -= 1) {
    const meteor = meteors[i];
    if (meteor.y - meteor.radius > canvas.height) {
      meteors.splice(i, 1);
    }
  }
}

function spawnBombPower() {
  bombsPower.push({
    x: Math.random() * (canvas.width - 40) + 20,
    y: -20,
    radius: 12,
    speed: 150 + level * 10,
    rotation: 0,
  });
}

function spawnBossShot(x, y) {
  const dx = player.x - x;
  const dy = player.y - y;
  const length = Math.hypot(dx, dy) || 1;

  bossShots.push({
    x,
    y,
    vx: (dx / length) * 220,
    vy: (dy / length) * 220,
    radius: 8,
    color: '#f87171',
  });
}

function updateBombPower(dt) {
  if (escapeMode || mazeMode || chestMode || buildMode || homeMode) {
    bombsPower = [];
    return;
  }

  bombSpawnTimer -= dt;
  if (bombSpawnTimer <= 0) {
    spawnBombPower();
    bombSpawnTimer = 8 + Math.random() * 5;
  }

  for (const bomb of bombsPower) {
    bomb.y += bomb.speed * dt;
    bomb.rotation += dt * 3;
  }

  for (let i = bombsPower.length - 1; i >= 0; i -= 1) {
    if (bombsPower[i].y - bombsPower[i].radius > canvas.height) {
      bombsPower.splice(i, 1);
    }
  }
}

function handleCollisions() {
  if (homeMode) {
    if (!returnMode) return;

    for (let index = meteors.length - 1; index >= 0; index -= 1) {
      const meteor = meteors[index];
      const hitX = meteor.x + meteor.radius > player.x - player.width / 2 && meteor.x - meteor.radius < player.x + player.width / 2;
      const hitY = meteor.y + meteor.radius > player.y - player.height / 2 && meteor.y - meteor.radius < player.y + player.height / 2;
      if (!hitX || !hitY) continue;
      meteors.splice(index, 1);
      takeDamage();
    }

    if (isGameOver) return;
    if (Math.hypot(player.x - earth.x, player.y - earth.y) < earth.radius + 16) {
      gameWon = true;
      isGameOver = true;
    }
    return;
  }

  for (let i = rockets.length - 1; i >= 0; i -= 1) {
    const rocket = rockets[i];

    for (let j = aliens.length - 1; j >= 0; j -= 1) {
      const alien = aliens[j];
      const dx = rocket.x - (alien.x + alien.width / 2);
      const dy = rocket.y - (alien.y + alien.height / 2);

      if (Math.abs(dx) < alien.width / 2 + rocket.radius && Math.abs(dy) < alien.height / 2 + rocket.radius) {
        rockets.splice(i, 1);

        if (alien.isBoss) {
          alien.hp -= 1;
          createExplosion(rocket.x, rocket.y, '#fbbf24');
          score += 5;
          if (alien.hp <= 0) {
            aliens.splice(j, 1);
            score += 150;
            createExplosion(alien.x + alien.width / 2, alien.y + alien.height / 2, '#f59e0b');
          }
        } else {
          aliens.splice(j, 1);
          score += 10;
          createExplosion(alien.x + alien.width / 2, alien.y + alien.height / 2, alien.color);
        }

        updateHud();
        break;
      }
    }

    if (i < rockets.length && trollMode && troll) {
      const hitTroll =
        rocket.x + rocket.radius > troll.x &&
        rocket.x - rocket.radius < troll.x + troll.width &&
        rocket.y + rocket.radius > troll.y &&
        rocket.y - rocket.radius < troll.y + troll.height;

      if (hitTroll) {
        rockets.splice(i, 1);
        troll.hp -= 1;
        score += 5;
        createExplosion(rocket.x, rocket.y, '#bef264');
        if (troll.hp <= 0) defeatTroll();
        updateHud();
      }
    }

    if (i < rockets.length) {
      for (let j = meteors.length - 1; j >= 0; j -= 1) {
        const meteor = meteors[j];
        const dx = rocket.x - meteor.x;
        const dy = rocket.y - meteor.y;

        if (Math.abs(dx) < meteor.radius + rocket.radius && Math.abs(dy) < meteor.radius + rocket.radius) {
          rockets.splice(i, 1);
          meteors.splice(j, 1);
          score += 15;
          createExplosion(meteor.x, meteor.y, '#ffb067');
          updateHud();
          break;
        }
      }
    }
  }

  for (let i = bossShots.length - 1; i >= 0; i -= 1) {
    const shot = bossShots[i];
    shot.x += shot.vx * 0.016;
    shot.y += shot.vy * 0.016;

    const hitX = shot.x + shot.radius > player.x - player.width / 2 && shot.x - shot.radius < player.x + player.width / 2;
    const hitY = shot.y + shot.radius > player.y - player.height / 2 && shot.y - shot.radius < player.y + player.height / 2;

    if (hitX && hitY) {
      bossShots.splice(i, 1);
      takeDamage('#ef4444');
      continue;
    }

    if (shot.x < -20 || shot.x > canvas.width + 20 || shot.y < -20 || shot.y > canvas.height + 20) {
      bossShots.splice(i, 1);
    }
  }

  if (isGameOver) return;

  for (const alien of aliens) {
    const hitX = alien.x < player.x + player.width / 2 && alien.x + alien.width > player.x - player.width / 2;
    const hitY = alien.y < player.y + player.height / 2 && alien.y + alien.height > player.y - player.height / 2;

    if (hitX && hitY) {
      takeDamage();
      break;
    }
  }

  for (let i = meteors.length - 1; i >= 0; i -= 1) {
    const meteor = meteors[i];
    const hitX = meteor.x + meteor.radius > player.x - player.width / 2 && meteor.x - meteor.radius < player.x + player.width / 2;
    const hitY = meteor.y + meteor.radius > player.y - player.height / 2 && meteor.y - meteor.radius < player.y + player.height / 2;

    if (hitX && hitY) {
      meteors.splice(i, 1);
      takeDamage();
      break;
    }
  }

  if (escapeMode && !isGameOver) {
    const playerLeft = player.x - player.width / 2;
    const playerRight = player.x + player.width / 2;
    const playerTop = player.y - player.height / 2;
    const playerBottom = player.y + player.height / 2;
    const platformLeft = platform.x - platform.width / 2;
    const platformRight = platform.x + platform.width / 2;
    const platformBottom = platform.y + platform.height;
    const touchingPlatform =
      playerRight > platformLeft &&
      playerLeft < platformRight &&
      playerBottom > platform.y &&
      playerTop < platformBottom;

    if (touchingPlatform) startTrollFight();
  }

  for (let i = bombsPower.length - 1; i >= 0; i -= 1) {
    const bomb = bombsPower[i];
    const hitX = bomb.x + bomb.radius > player.x - player.width / 2 && bomb.x - bomb.radius < player.x + player.width / 2;
    const hitY = bomb.y + bomb.radius > player.y - player.height / 2 && bomb.y - bomb.radius < player.y + player.height / 2;

    if (hitX && hitY) {
      bombsPower.splice(i, 1);
      bombs = Infinity;
      createExplosion(bomb.x, bomb.y, '#8b5cf6');
      updateHud();
      break;
    }
  }
}

function updateParticles(dt) {
  for (const particle of particles) {
    particle.x += particle.vx * 60 * dt;
    particle.y += particle.vy * 60 * dt;
    particle.life -= dt * 60;
  }
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    if (particles[i].life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function drawBackground() {
  ctx.fillStyle = '#020b16';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const star of stars) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);

  if (buildMode || houseBuilt) {
    ctx.fillStyle = '#eaf7ff';
    ctx.beginPath();
    ctx.arc(0, -9, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#67d0ff';
    ctx.fillRect(-9, 2, 18, 17);
    ctx.fillStyle = '#eaf7ff';
    ctx.fillRect(-15, 5, 6, 13);
    ctx.fillRect(9, 5, 6, 13);
    ctx.fillRect(-8, 18, 6, 12);
    ctx.fillRect(2, 18, 6, 12);
    ctx.fillStyle = '#17334a';
    ctx.beginPath();
    ctx.arc(0, -9, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (player.shield > 0) {
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 8, 28 + Math.sin(Date.now() * 0.01) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = '#67d0ff';
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(18, 18);
  ctx.lineTo(0, 12);
  ctx.lineTo(-18, 18);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#dff7ff';
  ctx.fillRect(-3, 10, 6, 14);
  ctx.restore();
}

function drawRockets() {
  for (const rocket of rockets) {
    ctx.fillStyle = '#ff7a59';
    ctx.fillRect(rocket.x - 2, rocket.y - 10, 4, 16);

    ctx.fillStyle = '#ffd166';
    ctx.fillRect(rocket.x - 1, rocket.y - 15, 2, 8);
  }
}

function drawAliens() {
  for (const alien of aliens) {
    ctx.save();
    ctx.translate(alien.x + alien.width / 2, alien.y + alien.height / 2);

    if (alien.isBoss) {
      ctx.fillStyle = alien.color;
      ctx.beginPath();
      ctx.moveTo(-alien.width / 2, 0);
      ctx.lineTo(-alien.width / 4, -alien.height / 2);
      ctx.lineTo(alien.width / 4, -alien.height / 2);
      ctx.lineTo(alien.width / 2, 0);
      ctx.lineTo(alien.width / 4, alien.height / 2);
      ctx.lineTo(-alien.width / 4, alien.height / 2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#0a1120';
      ctx.fillRect(-22, -8, 12, 12);
      ctx.fillRect(10, -8, 12, 12);

      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(-alien.width / 2 - 8, -alien.height / 2 - 18, alien.width + 16, 8);
      ctx.fillStyle = '#ef4444';
      const healthRatio = Math.max(0, alien.hp / alien.maxHp);
      ctx.fillRect(-alien.width / 2 - 8, -alien.height / 2 - 18, (alien.width + 16) * healthRatio, 8);
    } else {
      ctx.fillStyle = alien.color;
      ctx.beginPath();
      ctx.moveTo(-alien.width / 2, 0);
      ctx.lineTo(-alien.width / 4, -alien.height / 2);
      ctx.lineTo(alien.width / 4, -alien.height / 2);
      ctx.lineTo(alien.width / 2, 0);
      ctx.lineTo(alien.width / 4, alien.height / 2);
      ctx.lineTo(-alien.width / 4, alien.height / 2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#0a1120';
      ctx.fillRect(-6, -2, 4, 4);
      ctx.fillRect(2, -2, 4, 4);
    }

    ctx.restore();
  }
}

function drawMeteors() {
  for (const meteor of meteors) {
    ctx.save();
    ctx.translate(meteor.x, meteor.y);
    ctx.rotate(meteor.rotation);

    ctx.fillStyle = '#8a6b5b';
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2;
      const radius = meteor.radius * (0.75 + ((i % 2) * 0.25));
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.arc(-meteor.radius * 0.2, -meteor.radius * 0.2, meteor.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

function drawPlatform() {
  if (!escapeMode) return;

  ctx.fillStyle = '#596b79';
  ctx.fillRect(platform.x - platform.width / 2, platform.y, platform.width, platform.height);
  ctx.fillStyle = '#9be7ff';
  ctx.fillRect(platform.x - platform.width / 2 + 8, platform.y + 5, platform.width - 16, 5);
  ctx.fillStyle = '#ffcf70';
  ctx.fillRect(platform.x - platform.width / 2 + 12, platform.y + platform.height, 10, 12);
  ctx.fillRect(platform.x + platform.width / 2 - 22, platform.y + platform.height, 10, 12);
}

function drawTroll() {
  if (!trollMode || !troll) return;

  ctx.save();
  ctx.translate(troll.x, troll.y);
  ctx.fillStyle = '#547b3b';
  ctx.beginPath();
  ctx.ellipse(troll.width / 2, troll.height * 0.63, troll.width * 0.46, troll.height * 0.37, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(troll.width / 2, troll.height * 0.3, troll.width * 0.34, troll.height * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d9f99d';
  ctx.beginPath();
  ctx.moveTo(troll.width * 0.25, troll.height * 0.16);
  ctx.lineTo(troll.width * 0.18, -8);
  ctx.lineTo(troll.width * 0.38, troll.height * 0.1);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(troll.width * 0.75, troll.height * 0.16);
  ctx.lineTo(troll.width * 0.82, -8);
  ctx.lineTo(troll.width * 0.62, troll.height * 0.1);
  ctx.fill();
  ctx.fillStyle = '#fff7c2';
  ctx.fillRect(troll.width * 0.32, troll.height * 0.27, 15, 10);
  ctx.fillRect(troll.width * 0.6, troll.height * 0.27, 15, 10);
  ctx.fillStyle = '#1b2d17';
  ctx.fillRect(troll.width * 0.37, troll.height * 0.29, 6, 7);
  ctx.fillRect(troll.width * 0.64, troll.height * 0.29, 6, 7);
  ctx.fillStyle = '#263b1f';
  ctx.fillRect(troll.width * 0.39, troll.height * 0.47, troll.width * 0.22, 8);
  ctx.restore();

  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(troll.x, troll.y - 20, troll.width, 9);
  ctx.fillStyle = '#84cc16';
  ctx.fillRect(troll.x, troll.y - 20, troll.width * Math.max(0, troll.hp / troll.maxHp), 9);
}

function drawHouse() {
  if (returnMode || (!buildMode && !houseBuilt)) return;

  const { columns, rows, y: gridY } = buildGrid;
  const tileSize = Math.min(buildGrid.tileSize, (canvas.width - 100) / columns, 340 / rows);
  const gridX = (canvas.width - tileSize * columns) / 2;
  const bunkerStartY = gridY + (rows / 2) * tileSize;
  ctx.textAlign = 'center';
  ctx.font = 'bold 15px Arial';
  ctx.fillStyle = '#eaf7ff';
  ctx.fillText('HAUS | FEURIGES HOLZ UND STEIN', canvas.width / 2, gridY - 12);
  ctx.fillText('VERSTÄRKTER BUNKER', canvas.width / 2, bunkerStartY - 8);

  for (let index = 0; index < houseTiles.length; index += 1) {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const x = gridX + column * tileSize;
    const y = gridY + row * tileSize;
    const material = houseTiles[index];
    ctx.fillStyle = row < rows / 2 ? 'rgba(234,247,255,0.035)' : 'rgba(103,208,255,0.045)';
    ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);

    if (material === 'wood') {
      ctx.fillStyle = '#9d4828';
      ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
      ctx.fillStyle = '#d57a43';
      ctx.fillRect(x + 3, y + 4, tileSize - 6, tileSize * 0.3);
      ctx.fillStyle = '#66331f';
      ctx.fillRect(x + 3, y + tileSize * 0.54, tileSize - 6, 2);
      ctx.fillStyle = '#f0b06c';
      ctx.fillRect(x + tileSize * 0.27, y + 5, 2, tileSize - 10);
      ctx.fillRect(x + tileSize * 0.72, y + 5, 2, tileSize - 10);
      ctx.fillStyle = '#f2d1a0';
      ctx.fillRect(x + 5, y + 5, 3, 3);
      ctx.fillRect(x + tileSize - 8, y + tileSize - 8, 3, 3);
    } else if (material === 'stone') {
      ctx.fillStyle = '#7c8585';
      ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
      ctx.fillStyle = '#c1c8c3';
      ctx.fillRect(x + 3, y + 4, tileSize - 6, tileSize * 0.24);
      ctx.fillRect(x + 3, y + tileSize * 0.55, tileSize - 6, 2);
      ctx.fillRect(x + tileSize * 0.47, y + tileSize * 0.28, 2, tileSize * 0.27);
      ctx.fillRect(x + tileSize * 0.25, y + tileSize * 0.58, 2, tileSize * 0.3);
    } else if (material === 'bunker') {
      ctx.fillStyle = '#405967';
      ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
      ctx.strokeStyle = '#a4c2c9';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 5, y + 5, tileSize - 10, tileSize - 10);
      ctx.fillStyle = '#d4e6e4';
      for (const [rivetX, rivetY] of [[7, 7], [tileSize - 8, 7], [7, tileSize - 8], [tileSize - 8, tileSize - 8]]) {
        ctx.beginPath();
        ctx.arc(x + rivetX, y + rivetY, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (material === 'bunker-hatch') {
      ctx.fillStyle = '#253943';
      ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
      ctx.strokeStyle = '#c3d9d9';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 4, y + 4, tileSize - 8, tileSize - 8);
      if (bunkerHatchOpen) {
        ctx.fillStyle = '#0b151b';
        ctx.fillRect(x + 7, y + 7, tileSize - 14, tileSize - 14);
        ctx.strokeStyle = '#d8e5df';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + tileSize * 0.3, y + 8);
        ctx.lineTo(x + tileSize * 0.3, y + tileSize - 8);
        ctx.moveTo(x + tileSize * 0.7, y + 8);
        ctx.lineTo(x + tileSize * 0.7, y + tileSize - 8);
        ctx.moveTo(x + tileSize * 0.3, y + 14);
        ctx.lineTo(x + tileSize * 0.7, y + 14);
        ctx.moveTo(x + tileSize * 0.3, y + 22);
        ctx.lineTo(x + tileSize * 0.7, y + 22);
        ctx.moveTo(x + tileSize * 0.3, y + 30);
        ctx.lineTo(x + tileSize * 0.7, y + 30);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#526d79';
        ctx.fillRect(x + 7, y + 7, tileSize - 14, tileSize - 14);
        ctx.strokeStyle = '#a9c5c8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 8, y + tileSize / 2);
        ctx.lineTo(x + tileSize - 8, y + tileSize / 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#e3b64f';
      ctx.fillRect(x + tileSize - 8, y + 5, 3, 10);
      ctx.beginPath();
      ctx.arc(x + tileSize - 6.5, y + 15, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (material?.startsWith('furniture-')) {
      const item = material.slice('furniture-'.length);
      ctx.fillStyle = '#6b4530';
      if (item === 'bed') {
        ctx.fillRect(x + 4, y + tileSize * 0.52, tileSize - 8, tileSize * 0.28);
        ctx.fillStyle = '#c8e2e3';
        ctx.fillRect(x + 5, y + tileSize * 0.39, tileSize - 10, tileSize * 0.22);
        ctx.fillStyle = '#f4f0d6';
        ctx.fillRect(x + 7, y + tileSize * 0.41, tileSize * 0.3, tileSize * 0.13);
        ctx.fillStyle = '#7f392e';
        ctx.fillRect(x + 4, y + tileSize * 0.78, 3, tileSize * 0.12);
        ctx.fillRect(x + tileSize - 7, y + tileSize * 0.78, 3, tileSize * 0.12);
      } else if (item === 'table') {
        ctx.fillRect(x + 5, y + tileSize * 0.35, tileSize - 10, tileSize * 0.15);
        ctx.fillRect(x + 8, y + tileSize * 0.5, 3, tileSize * 0.35);
        ctx.fillRect(x + tileSize - 11, y + tileSize * 0.5, 3, tileSize * 0.35);
        ctx.fillStyle = '#e2aa56';
        ctx.beginPath();
        ctx.arc(x + tileSize / 2, y + tileSize * 0.28, tileSize * 0.09, 0, Math.PI * 2);
        ctx.fill();
      } else if (item === 'chair') {
        ctx.fillRect(x + tileSize * 0.3, y + tileSize * 0.35, tileSize * 0.4, tileSize * 0.13);
        ctx.fillRect(x + tileSize * 0.3, y + tileSize * 0.23, tileSize * 0.12, tileSize * 0.22);
        ctx.fillRect(x + tileSize * 0.35, y + tileSize * 0.48, 3, tileSize * 0.32);
        ctx.fillRect(x + tileSize * 0.62, y + tileSize * 0.48, 3, tileSize * 0.32);
      } else if (item === 'cabinet') {
        ctx.fillStyle = '#80452f';
        ctx.fillRect(x + tileSize * 0.24, y + tileSize * 0.12, tileSize * 0.52, tileSize * 0.76);
        ctx.fillStyle = '#bd7650';
        ctx.fillRect(x + tileSize * 0.29, y + tileSize * 0.17, tileSize * 0.42, tileSize * 0.32);
        ctx.fillRect(x + tileSize * 0.29, y + tileSize * 0.53, tileSize * 0.42, tileSize * 0.3);
        ctx.fillStyle = '#f2d18a';
        ctx.fillRect(x + tileSize * 0.62, y + tileSize * 0.3, 2, 4);
        ctx.fillRect(x + tileSize * 0.62, y + tileSize * 0.64, 2, 4);
      }
    }

    ctx.strokeStyle = row < rows / 2 ? 'rgba(255, 226, 185, 0.52)' : 'rgba(169, 226, 232, 0.65)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
  }
}

function drawHomeInterior() {
  if (!homeMode || returnMode) return;

  const left = 170;
  const top = 208;
  const width = 560;
  const height = 300;

  ctx.fillStyle = '#472f27';
  ctx.beginPath();
  ctx.moveTo(left - 28, top + 12);
  ctx.lineTo(canvas.width / 2, top - 108);
  ctx.lineTo(left + width + 28, top + 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#9b5738';
  ctx.beginPath();
  ctx.moveTo(left - 12, top + 14);
  ctx.lineTo(canvas.width / 2, top - 88);
  ctx.lineTo(left + width + 12, top + 14);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#cfb88b';
  ctx.fillRect(left, top, width, height);
  ctx.fillStyle = '#dfd0ad';
  ctx.fillRect(left + 12, top + 12, width - 24, height - 24);
  ctx.fillStyle = '#76503a';
  ctx.fillRect(left, top + height - 42, width, 42);
  ctx.fillStyle = '#a7774d';
  for (let board = 0; board < 8; board += 1) {
    ctx.fillRect(left + board * 72, top + height - 40, 2, 38);
  }

  ctx.fillStyle = '#c8eced';
  ctx.fillRect(left + 38, top + 48, 94, 72);
  ctx.strokeStyle = '#7b4e34';
  ctx.lineWidth = 9;
  ctx.strokeRect(left + 38, top + 48, 94, 72);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(left + 85, top + 50);
  ctx.lineTo(left + 85, top + 118);
  ctx.moveTo(left + 40, top + 84);
  ctx.lineTo(left + 130, top + 84);
  ctx.stroke();

  ctx.fillStyle = '#71432f';
  ctx.fillRect(left + 370, top + 93, 150, 128);
  ctx.fillStyle = '#e5e1c9';
  ctx.fillRect(left + 380, top + 103, 130, 108);
  ctx.fillStyle = '#8d4b38';
  ctx.fillRect(left + 380, top + 155, 130, 56);
  ctx.fillStyle = '#f4f0d6';
  ctx.fillRect(left + 386, top + 108, 54, 38);
  ctx.fillStyle = '#6b4130';
  ctx.fillRect(left + 374, top + 217, 9, 23);
  ctx.fillRect(left + 507, top + 217, 9, 23);

  ctx.fillStyle = '#865035';
  ctx.fillRect(left + 184, top + 168, 118, 16);
  ctx.fillRect(left + 195, top + 184, 8, 50);
  ctx.fillRect(left + 283, top + 184, 8, 50);
  ctx.fillStyle = '#f1c165';
  ctx.beginPath();
  ctx.arc(left + 243, top + 153, 13, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#67402f';
  ctx.fillRect(left + width - 84, top + height - 138, 58, 138);
  ctx.fillStyle = '#e6bd62';
  ctx.beginPath();
  ctx.arc(left + width - 39, top + height - 70, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawMaze() {
  if ((!mazeMode && !chestMode) || !maze) return;
  const size = maze.cellSize;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(maze.x - 8, maze.y - 8, maze.columns * size + 16, maze.rows * size + 16);

  for (let row = 0; row < maze.rows; row += 1) {
    for (let column = 0; column < maze.columns; column += 1) {
      const x = maze.x + column * size;
      const y = maze.y + row * size;
      ctx.fillStyle = maze.cells[row][column] === '#' ? '#655b56' : '#182a32';
      ctx.fillRect(x, y, size - 1, size - 1);
      if (maze.cells[row][column] === 'E') {
        ctx.fillStyle = '#c8f169';
        ctx.fillRect(x + 8, y + 8, size - 17, size - 17);
        ctx.fillStyle = '#1b2b18';
        ctx.textAlign = 'center';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('AUS', x + size / 2, y + size / 2 + 5);
      }
    }
  }

  if (wallImpact && maze.cells[wallImpact.row]?.[wallImpact.column] === '#') {
    const flash = Math.min(1, wallImpact.timer * 7);
    ctx.fillStyle = `rgba(255, 183, 77, ${flash * 0.78})`;
    ctx.fillRect(
      maze.x + wallImpact.column * size,
      maze.y + wallImpact.row * size,
      size - 1,
      size - 1,
    );
  }

  for (const item of mazeLoot) {
    const x = maze.x + (item.column + 0.5) * size;
    const y = maze.y + (item.row + 0.5) * size;
    ctx.fillStyle = item.material === 'wood' ? '#ff793f' : '#c7d0d5';
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = item.material === 'wood' ? '#ffd18e' : '#697b83';
    ctx.fillRect(x - 4, y - 4, 8, 8);
  }
}

function drawGoldenChest() {
  if (!chestMode) return;
  const chestX = canvas.width / 2 - 52;
  const chestY = canvas.height / 2 - 37;
  ctx.fillStyle = 'rgba(2, 11, 22, 0.76)';
  ctx.fillRect(chestX - 28, chestY - 56, 160, 170);
  ctx.fillStyle = '#8b4b18';
  ctx.fillRect(chestX, chestY + 20, 104, 56);
  ctx.fillStyle = '#f5b82e';
  ctx.fillRect(chestX, chestY + 10, 104, 22);
  ctx.fillRect(chestX + 43, chestY + 30, 18, 22);
  ctx.fillStyle = '#fff0a8';
  ctx.fillRect(chestX + 8, chestY + 14, 88, 5);
  ctx.textAlign = 'center';
  ctx.font = 'bold 16px Arial';
  ctx.fillStyle = '#fff7d1';
  ctx.fillText('GOLDENE TRUHE', canvas.width / 2, chestY - 12);
  ctx.font = '14px Arial';
  ctx.fillText('Hier klicken zum Öffnen', canvas.width / 2, chestY + 98);
}

function drawPhaseMessage() {
  if (isGameOver) return;
  let message = '';
  if (escapeMode) message = 'Flieg zur Plattform';
  if (trollMode && troll) message = `Besiege den Riesen-Troll! ${troll.hp}/${troll.maxHp}`;
  if (mazeMode || chestMode) message = mazeMessage;
  if (buildMode) message = 'Platziere die Baumaterialien selbst: Haus oben, Bunker unten.';
  if (homeMode && !returnMode) message = 'Zuhause: Bewege den Astronauten mit der Maus und kümmere dich um die Farm.';
  if (returnMode) message = 'Heimflug zur Erde: Steuere den Astronauten zur Erde und weiche Meteoriten aus.';
  if (!message) return;

  ctx.font = mazeMode || chestMode ? '16px Arial' : 'bold 20px Arial';
  const messageWidth = Math.min(820, Math.max(380, ctx.measureText(message).width + 32));
  ctx.fillStyle = 'rgba(2, 11, 22, 0.78)';
  ctx.fillRect(canvas.width / 2 - messageWidth / 2, 14, messageWidth, 38);
  ctx.fillStyle = '#eaf7ff';
  ctx.textAlign = 'center';
  ctx.fillText(message, canvas.width / 2, 40);
}

function drawEarth() {
  if (!returnMode) return;

  ctx.save();
  ctx.translate(earth.x, earth.y);
  ctx.fillStyle = '#4b9cd3';
  ctx.beginPath();
  ctx.arc(0, 0, earth.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#63ad62';
  ctx.beginPath();
  ctx.ellipse(-18, -15, 19, 11, -0.5, 0, Math.PI * 2);
  ctx.ellipse(20, 11, 21, 14, 0.4, 0, Math.PI * 2);
  ctx.ellipse(-5, 32, 11, 7, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(198, 233, 255, 0.75)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, earth.radius + 3, -0.2, Math.PI + 0.2);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#eaf7ff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 18px Arial';
  ctx.fillText('ERDE', earth.x, earth.y + earth.radius + 23);
}

function drawBombsPower() {
  for (const bomb of bombsPower) {
    ctx.save();
    ctx.translate(bomb.x, bomb.y);
    ctx.rotate(bomb.rotation);

    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, bomb.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-bomb.radius * 0.8, 0);
    ctx.lineTo(bomb.radius * 0.8, 0);
    ctx.moveTo(0, -bomb.radius * 0.8);
    ctx.lineTo(0, bomb.radius * 0.8);
    ctx.stroke();

    ctx.fillStyle = '#d8b4fe';
    ctx.beginPath();
    ctx.arc(0, 0, bomb.radius * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawBossShots() {
  for (const shot of bossShots) {
    ctx.fillStyle = shot.color;
    ctx.beginPath();
    ctx.arc(shot.x, shot.y, shot.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles() {
  for (const particle of particles) {
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = Math.max(0, particle.life / 45);
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  }
  ctx.globalAlpha = 1;
}

function drawGameOver() {
  if (!isGameOver) return;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 52px Arial';
  ctx.fillText(gameWon ? 'Zur Erde zurückgekehrt!' : 'Game Over', canvas.width / 2, canvas.height / 2 - 20);
  ctx.font = '26px Arial';
  ctx.fillText(gameWon ? 'Der Astronaut ist wieder zuhause.' : 'Drücke R zum Neustart', canvas.width / 2, canvas.height / 2 + 30);
}

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000 || 0.016, 0.033);
  lastTime = timestamp;

  if (!isGameOver) {
    handleInput(dt);
    updateStars(dt);
    updateRockets(dt);
    updateAliens(dt);
    updateTroll(dt);
    updateMeteors(dt);
    updateBombPower(dt);
    handleCollisions();
    updateParticles(dt);
    updateFarm(dt);
    shootCooldown = Math.max(0, shootCooldown - dt * 1000);
    player.shield = Math.max(0, player.shield - dt * 0.06);
    player.invulnerabilityTimer = Math.max(0, player.invulnerabilityTimer - dt);
  }

  drawBackground();
  drawMaze();
  drawParticles();
  drawRockets();
  drawMeteors();
  drawPlatform();
  drawTroll();
  drawHouse();
  drawHomeInterior();
  drawEarth();
  drawGoldenChest();
  drawBombsPower();
  drawBossShots();
  drawAliens();
  if (!chestMode) drawPlayer();
  drawPhaseMessage();
  drawGameOver();

  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (event) => {
  const key = event.key;

  keys[key] = true;

  if (key === ' ' || key === 'Spacebar') {
    event.preventDefault();
  }

  if (key === 'r' || key === 'R') {
    if (isGameOver) {
      resetGame();
    }
  }

  if (key === 'b' || key === 'B') {
    triggerBomb();
  }
});

window.addEventListener('keyup', (event) => {
  keys[event.key] = false;
});

canvas.addEventListener('pointermove', (event) => {
  const bounds = canvas.getBoundingClientRect();
  mouseTarget.x = ((event.clientX - bounds.left) / bounds.width) * canvas.width;
  mouseTarget.y = ((event.clientY - bounds.top) / bounds.height) * canvas.height;
  mouseTarget.x = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, mouseTarget.x));
  mouseTarget.y = Math.max(player.height / 2, Math.min(canvas.height - player.height / 2, mouseTarget.y));
});

canvas.addEventListener('contextmenu', (event) => event.preventDefault());
canvas.addEventListener('pointerdown', (event) => {
  if (event.button === 2) {
    triggerBomb();
    return;
  }

  if (event.button !== 0) return;
  if (chestMode) {
    const bounds = canvas.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * canvas.width;
    const y = ((event.clientY - bounds.top) / bounds.height) * canvas.height;
    const chestCenterX = canvas.width / 2;
    const chestCenterY = canvas.height / 2 - 7;
    if (Math.abs(x - chestCenterX) < 82 && Math.abs(y - chestCenterY) < 82) openGoldenChest();
    return;
  }

  placeHouseTile(event);
});

buildGridEl.addEventListener('click', (event) => {
  const cell = event.target.closest('.house-build-cell');
  if (!cell) return;
  const row = Number(cell.dataset.row);
  const column = Number(cell.dataset.column);
  if (!toggleBunkerHatch(row, column)) placeHouseTileAt(row, column);
});

expandGridButton.addEventListener('click', expandBuildGrid);

for (const [material, button] of Object.entries(materialButtons)) {
  button.addEventListener('click', () => {
    if (resources[material] === 0) return;
    buildSelection = material;
    updateBuildUi();
  });
}

for (const [furniture, button] of Object.entries(furnitureButtons)) {
  button.addEventListener('click', () => {
    if (resources.wood === 0) return;
    buildSelection = `furniture-${furniture}`;
    updateBuildUi();
  });
}

gatherButton.addEventListener('click', () => {
  if (!buildMode) return;
  const resource = buildSelection.startsWith('furniture-') ? 'wood' : buildSelection;
  resources[resource] += 5;
  updateBuildUi();
});

buildButton.addEventListener('click', () => {
  if (!buildMode || buildButton.disabled) return;

  houseBuilt = true;
  buildMode = false;
  homeMode = true;
  gameWon = false;
  isGameOver = false;
  hunger = 100;
  food = 0;
  seeds = 3;
  lives = 20;
  farmMessage = 'Du wohnst jetzt in deinem Haus. Pflanze Saatgut und ernte Essen.';
  farmPlots = Array.from({ length: 6 }, () => ({ growth: -1 }));
  player.x = canvas.width / 2;
  player.y = 365;
  mouseTarget.x = player.x;
  mouseTarget.y = player.y;
  aliens = [];
  meteors = [];
  bossShots = [];
  bombsPower = [];
  document.getElementById('movementControl').textContent = 'Zuhause: Maus bewegen';
  document.getElementById('shootControl').hidden = true;
  document.getElementById('bombControl').hidden = true;
  shootCooldown = 0;
  updateBuildUi();
  updateHomeUi();
});

farmPlotsEl.addEventListener('click', (event) => {
  const plotButton = event.target.closest('.farm-plot');
  if (!plotButton) return;
  useFarmPlot(Number(plotButton.dataset.plot));
});

eatButton.addEventListener('click', eatFood);
earthButton.addEventListener('click', startEarthReturn);

resetGame();
requestAnimationFrame(gameLoop);
