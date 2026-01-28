/* ================================
   CONSTANTS & DOM REFERENCES
================================ */
const canvas = document.getElementById("pixel-grid");
const gridSizeSlider = document.getElementById("grid-size");
const zoomSlider = document.getElementById("canvas-size");
const workspace = document.querySelector(".inner-workspace");
const toolButtons = document.querySelectorAll(".toolbar-button");
const colorCells = document.querySelectorAll(".color-cell");
const colorPickerInput = document.getElementById("color-picker");
const mixCell = document.getElementById("color-mix");

const undoStack = [];
const redoStack = [];
const EXPORT_SCALE = 10;

/* ================================
   STATE VARIABLES
================================ */
let gridSize = 32;
let zoom = 1;

let isPainting = false;
let isPanning = false;
let isSpacePressed = false;

let startX = 0;
let startY = 0;
let translateX = 0;
let translateY = 0;

let currentTool = "brush";
let currentColor = "#000000";
let currentAction = null;

/* ================================
   CANVAS SETUP
================================ */
function setCanvas(size) {
  canvas.innerHTML = "";

  canvas.style.gridTemplateRows = `repeat(${size}, 1fr)`;
  canvas.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

  for (let i = 0; i < size * size; i++) {
    const pixel = document.createElement("div");
    pixel.className = "pixel-cell";
    canvas.appendChild(pixel);
  }
}

setCanvas(gridSize);

/* ================================
   TRANSFORM & PANNING
================================ */
function applyTransform() {
  canvas.style.transform = `translate(${translateX}px, ${translateY}px) scale(${zoom})`;
}

workspace.addEventListener("mousedown", (e) => {
  if (isPainting || !isSpacePressed) return;
  isPanning = true;
  startX = e.clientX;
  startY = e.clientY;
});

workspace.addEventListener("mousemove", (e) => {
  if (!isPanning) return;

  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  startX = e.clientX;
  startY = e.clientY;

  translateX += dx;
  translateY += dy;
  applyTransform();
});

workspace.addEventListener("mouseleave", () => isPanning = false);
window.addEventListener("mouseup", () => isPanning = false);

/* ================================
   GRID & ZOOM CONTROLS
================================ */
gridSizeSlider.addEventListener("input", (e) => {
  gridSize = Number(e.target.value);
  setCanvas(gridSize);
});

zoomSlider.addEventListener("input", (e) => {
  zoom = Number(e.target.value);
  if (zoom <= 1) {
    translateX = 0;
    translateY = 0;
  }
  applyTransform();
});

/* ================================
   TOOL HANDLING
================================ */
function setActiveTool(tool) {
  currentTool = tool;

  toolButtons.forEach(btn => btn.classList.remove("active"));
  const active = document.querySelector(`.toolbar-button[data-tool="${tool}"]`);
  if (active) active.classList.add("active");
}

setActiveTool("brush");

toolButtons.forEach(button => {
  button.addEventListener("click", () => {
    setActiveTool(button.dataset.tool);
  });
});

/* ================================
   COLOR HANDLING
================================ */
function setCurrentColor(color) {
  currentColor = color;
  colorCells.forEach(cell => cell.classList.remove("selected"));

  const selected = [...colorCells].find(
    cell => getComputedStyle(cell).backgroundColor === color
  );
  if (selected) selected.classList.add("selected");
}

colorCells.forEach(cell => {
  cell.addEventListener("click", () => {
    setCurrentColor(getComputedStyle(cell).backgroundColor);
  });
});

mixCell.addEventListener("click", () => colorPickerInput.click());
colorPickerInput.addEventListener("input", e => setCurrentColor(e.target.value));

/* ================================
   PIXEL HELPERS
================================ */
function getPixelColor(pixel) {
  return pixel.style.backgroundColor || "#F4E5C8";
}

function getPixelColorByIndex(index) {
  return getPixelColor(canvas.children[index]);
}

function setPixelColorByIndex(index, color) {
  canvas.children[index].style.backgroundColor = color;
}

/* ================================
   PAINTING LOGIC
================================ */
function paintPixels(pixel) {
  const index = [...canvas.children].indexOf(pixel);
  const before = getPixelColorByIndex(index);

  let after;
  if (currentTool === "brush") after = currentColor;
  else if (currentTool === "eraser") after = "#F4E5C8";
  else return;

  if (before === after) return;

  setPixelColorByIndex(index, after);

  if (currentAction) {
    const exists = currentAction.some(e => e.index === index);
    if (!exists) currentAction.push({ index, before, after });
  }
}

/* ================================
   POINTER EVENTS
================================ */
canvas.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "mouse" && e.button !== 0) return;

  const pixel = getPixelFromPointer(e);
  if (!pixel) return;

  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);

  const index = [...canvas.children].indexOf(pixel);
  const targetColor = getPixelColor(pixel);

  if (currentTool === "fill") {
    currentAction = [];
    redoStack.length = 0;
    floodFill(index, targetColor, currentColor);
    finalizeAction();
    return;
  }

  if (currentTool === "picker") {
    currentColor = getPixelColor(pixel);
    currentTool = "brush";
    return;
  }

  currentAction = [];
  redoStack.length = 0;
  isPainting = true;
  paintPixels(pixel);
});

canvas.addEventListener("pointermove", (e) => {
  if (!isPainting) return;
  const pixel = getPixelFromPointer(e);
  if (pixel) paintPixels(pixel);
});

canvas.addEventListener("pointerup", stopPainting);
canvas.addEventListener("pointercancel", stopPainting);

function stopPainting(e) {
  if (!isPainting) return;
  isPainting = false;
  finalizeAction();
  try { canvas.releasePointerCapture(e.pointerId); } catch {}
}

/* ================================
   FLOOD FILL
================================ */
function getIndex(r, c, size) {
  return r * size + c;
}

function getRowCol(index, size) {
  return { row: Math.floor(index / size), col: index % size };
}

function floodFill(startIndex, targetColor, fillColor) {
  if (targetColor === fillColor) return;

  const pixels = canvas.children;
  const queue = [startIndex];
  const visited = new Set(queue);

  while (queue.length) {
    const current = queue.shift();
    const pixel = pixels[current];

    if (getPixelColor(pixel) !== targetColor) continue;

    if (currentAction) {
      const before = getPixelColor(pixel);
      const exists = currentAction.some(e => e.index === current);
      if (!exists) currentAction.push({ index: current, before, after: fillColor });
    }

    pixel.style.backgroundColor = fillColor;

    const { row, col } = getRowCol(current, gridSize);
    [
      { r: row, c: col + 1 },
      { r: row, c: col - 1 },
      { r: row + 1, c: col },
      { r: row - 1, c: col }
    ].forEach(({ r, c }) => {
      if (r < 0 || c < 0 || r >= gridSize || c >= gridSize) return;
      const next = getIndex(r, c, gridSize);
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    });
  }
}

/* ================================
   UNDO / REDO
================================ */
function finalizeAction() {
  if (currentAction?.length) undoStack.push(currentAction);
  currentAction = null;
}

function undo() {
  if (!undoStack.length) return;
  const action = undoStack.pop();
  action.forEach(({ index, before }) => setPixelColorByIndex(index, before));
  redoStack.push(action);
}

function redo() {
  if (!redoStack.length) return;
  const action = redoStack.pop();
  action.forEach(({ index, after }) => setPixelColorByIndex(index, after));
  undoStack.push(action);
}

document.querySelector("img[alt='undo-icon']").closest("button").addEventListener("click", undo);
document.querySelector("img[alt='redo-icon']").closest("button").addEventListener("click", redo);

/* ================================
   EXPORT
================================ */
function saveAsPng() {
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = gridSize * EXPORT_SCALE;
  exportCanvas.height = gridSize * EXPORT_SCALE;

  const ctx = exportCanvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  [...canvas.children].forEach((pixel, i) => {
    const row = Math.floor(i / gridSize);
    const col = i % gridSize;
    ctx.fillStyle = getPixelColor(pixel);
    ctx.fillRect(col * EXPORT_SCALE, row * EXPORT_SCALE, EXPORT_SCALE, EXPORT_SCALE);
  });

  const link = document.createElement("a");
  link.href = exportCanvas.toDataURL("image/png");
  link.download = "bitcanvas.png";
  link.click();
}

document.querySelector(".top-button-save").addEventListener("click", saveAsPng);

/* ================================
   KEYBOARD SHORTCUTS
================================ */
window.addEventListener("keydown", (e) => {
  if (["input", "textarea"].includes(e.target.tagName.toLowerCase())) return;

  if (e.code === "Space") {
    isSpacePressed = true;
    workspace.classList.add("panning");
    e.preventDefault();
  }

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
    e.preventDefault();
    undo();
  }

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
    e.preventDefault();
    redo();
  }
});

window.addEventListener("keyup", (e) => {
  if (e.code === "Space") {
    isSpacePressed = false;
    workspace.classList.remove("panning");
  }
});

/* ================================
   NEW CANVAS
================================ */
function newCanvas(size = 32) {
  gridSize = size;
  gridSizeSlider.value = size;
  setCanvas(size);

  zoom = 1;
  zoomSlider.value = 1;
  translateX = 0;
  translateY = 0;
  applyTransform();

  setActiveTool("brush");
  currentColor = "#000000";

  undoStack.length = 0;
  redoStack.length = 0;
  currentAction = null;
}

document.querySelector(".top-button-new").addEventListener("click", () => {
  if (confirm("Create a new canvas? Unsaved work will be lost!")) {
    newCanvas(32);
  }
});

/* ================================
   POINTER → PIXEL
================================ */
function getPixelFromPointer(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / zoom;
  const y = (e.clientY - rect.top) / zoom;

  const cellSize = rect.width / gridSize;
  const col = Math.floor(x / cellSize);
  const row = Math.floor(y / cellSize);

  if (row < 0 || col < 0 || row >= gridSize || col >= gridSize) return null;
  return canvas.children[row * gridSize + col];
}
