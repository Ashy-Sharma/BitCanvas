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

let isSpacePressed = false;
let currentAction = null;

let zoom = 1;
let gridSize = 32;

function setCanvas(size){
  canvas.innerHTML = "";

  canvas.style.gridTemplateRows = `repeat(${size} , 1fr)`;
  canvas.style.gridTemplateColumns = `repeat(${size} , 1fr)`;

  for ( let i = 0 ; i < size * size ; i++){
    const pixel = document.createElement("div");
    pixel.className = "pixel-cell";
    canvas.appendChild(pixel);
  }
}

// To get gridSize :
gridSizeSlider.addEventListener("input", (e)=>{
  gridSize = Number(e.target.value);
  setCanvas(gridSize);
});

zoomSlider.addEventListener("input", (e) =>{
  zoom = Number(e.target.value);
  if (zoom <= 1) {
    translateX = 0;
    translateY = 0;
  }
  applyTransform();
});

let isPanning = false;
let startX = 0;
let startY = 0;
let translateX = 0;
let translateY = 0;

function applyTransform(){
  canvas.style.transform = `translate(${translateX}px, ${translateY}px) scale(${zoom})`;
}

workspace.addEventListener("mousedown", (e) =>{
  if( !isSpacePressed){
    return;
  }
  isPanning = true;
  startX = e.clientX;
  startY = e.clientY;
});

workspace.addEventListener("mousemove", (e) => {
  if(!isPanning){
    return;
  }

  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  startX = e.clientX;
  startY = e.clientY;

  translateX += dx;
  translateY += dy;
  applyTransform();
});

window.addEventListener("mouseup", () =>{
  isPanning = false;
});

workspace.addEventListener("mouseleave", () => {
  isPanning = false;
});

setCanvas(gridSize);

let isPainting = false;
let currentTool = "brush";
let currentColor = "#000000";

toolButtons.forEach(button => {
  button.addEventListener("click", () => {
    const tool = button.dataset.tool;
    setActiveTool(tool);
  });
});

function paintPixels(pixel) {
  const index = [...canvas.children].indexOf(pixel);
  const before = getPixelColorByIndex(index);

  let after;
  if (currentTool === "brush") {
    after = currentColor;
  }
  else if (currentTool === "eraser") {
    after = "#F4E5C8";
  }else{
    return;
  }

  if(before === after){
    return;
  }

  setPixelColorByIndex(index,after);

  if(currentAction){
    const alreadyRecorded = currentAction.some(
      entry => entry.index === index
    );

    if(!alreadyRecorded){
      currentAction.push({index, before , after});
    }
  }

}

canvas.addEventListener("pointerdown", (e) =>{

  if( e.pointerType === "mouse" && e.button !== 0){
    return;
  }

  const pixel = e.target.closest(".pixel-cell");
  if(!pixel){
    return;
  }

  canvas.setPointerCapture(e.pointerId);

  const index = [...canvas.children].indexOf(pixel);
  const targetColor = getPixelColor(pixel);

  if( currentTool === "fill"){
    currentAction = [];
    redoStack.length = 0;

    floodFill(index , targetColor, currentColor);
    finalizeAction();
    return;
  }
  if (currentTool === "picker") {
    currentColor = pixel.style.backgroundColor || "#F4E5C8";
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

  const pixel = e.target.closest(".pixel-cell");
  if (!pixel) return;

  paintPixels(pixel);
});


window.addEventListener("mouseup", () => {
  isPainting = false;
  finalizeAction();
});

function setCurrentColor(color){
  currentColor = color;

  colorCells.forEach(cell => cell.classList.remove("selected"));

  const selected = [...colorCells].find(
    cell => getComputedStyle(cell).backgroundColor === color
  );
  if(selected){
    selected.classList.add("selected");
  }
}

colorCells.forEach(cell =>{
  cell.addEventListener("click", () =>{
    const color = getComputedStyle(cell).backgroundColor;
    setCurrentColor(color);
  })
})

mixCell.addEventListener("click" , () => {
  colorPickerInput.click();
});

colorPickerInput.addEventListener("input", (e) =>{
  const pickedColor = e.target.value;
  setCurrentColor(pickedColor);
});

function getIndex(row,col,size){
  return row * size + col;
}

function getRowCol(index, size){
  return {
    row: Math.floor(index/size),
    col: index % size
  }
}

function getPixelColor(pixel){
  return pixel.style.backgroundColor || "#F4E5C8";
}

function floodFill(startIndex , targetColor , fillColor){
  if ( targetColor === fillColor){
    return;
  }

  const size = gridSize;
  const pixels = canvas.children;

  const queue = [];
  const visited = new Set();

  queue.push(startIndex);
  visited.add(startIndex);

  while(queue.length > 0){
    const current = queue.shift();
    const pixel = pixels[current];

    if( getPixelColor(pixel) !== targetColor){
      continue;
    }

    if (currentAction) {
      const before = getPixelColor(pixel);
      if (before !== fillColor) {
        const alreadyRecorded = currentAction.some(
          entry => entry.index === current
        );
        if (!alreadyRecorded) {
          currentAction.push({
            index: current,
            before,
            after: fillColor
          });
        }
      }
    }

    pixel.style.backgroundColor = fillColor;

    const {row , col} = getRowCol(current , size);

    const neighbours = [
      {r : row , c: col + 1},
      {r : row , c: col - 1},
      {r : row + 1 , c: col},
      {r : row - 1 , c: col}
    ];

    neighbours.forEach(({r , c}) =>{
      if( r < 0 || c < 0 || r >= size || c >= size){
        return;
      }
      const nextIndex = getIndex(r,c,size);
      if(visited.has(nextIndex)){
        return;
      }
      visited.add(nextIndex);
      queue.push(nextIndex);

    });
  }
}

function setActiveTool(tool){
  currentTool = tool;

  toolButtons.forEach(button =>{
    button.classList.remove("active");
  });

  const activeButton = document.querySelector(
    `.toolbar-button[data-tool="${tool}"]`
  );

  if (activeButton) {
    activeButton.classList.add("active");
  }
}

setActiveTool("brush");

function getPixelColorByIndex(index){
  const pixel = canvas.children[index];
  return pixel.style.backgroundColor || "#F4E5C8";
}

function setPixelColorByIndex(index , setColor){
  canvas.children[index].style.backgroundColor = setColor;
}

function finalizeAction(){
  if( currentAction && currentAction.length > 0){
    undoStack.push(currentAction);
  }
  currentAction = null;
}

function undo(){
  if(undoStack.length === 0){
    return;
  }
  const action = undoStack.pop();
  action.forEach(({index , before , after}) => {
    setPixelColorByIndex(index, before);
  })

  redoStack.push(action);
}

function redo(){
  if(redoStack.length === 0){
    return;
  }
  const action = redoStack.pop();
  action.forEach(({index , before , after}) => {
    setPixelColorByIndex(index, after);
  })

  undoStack.push(action);
}

document.querySelector("img[alt='undo-icon']")
  .closest("button")
  .addEventListener("click", undo);

document.querySelector("img[alt='redo-icon']")
  .closest("button")
  .addEventListener("click", redo);


window.addEventListener("keydown" , (e)=> {
  const tag = e.target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea") return;
  const isCtrlOrCmd = e.ctrlKey || e.metaKey;

  if(!isCtrlOrCmd){
    return;
  }

  if(e.key.toLowerCase() === 'z'){
    e.preventDefault();
    undo();
  }
  else if(e.key.toLowerCase() === 'y'){
    e.preventDefault();
    redo();
  }
})

function saveAsPng(){
  const size = gridSize;
  const scale = EXPORT_SCALE;

  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = size * size;
  exportCanvas.height = size * size;

  const ctx = exportCanvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const pixels = canvas.children;
  for( let i = 0 ; i < pixels.length ; i++){
    const color = pixels[i].style.backgroundColor || "#F4E5C8";
    const row = Math.floor(i/size);
    const col = i % size;

    ctx.fillStyle = color;
    ctx.fillRect(
      col * scale,
      row * scale,
      scale,
      scale
    );
  }
  const dataUrl = exportCanvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = "bitcanvas.png";
  link.click();
}

document.querySelector(".top-button-save")
  .addEventListener("click", saveAsPng);

window.addEventListener("keydown", (e) => {
  if(e.code === "Space" ){
    isSpacePressed = true;
    workspace.classList.add("panning");
    e.preventDefault();
  }
});

window.addEventListener("keyup", (e) => {
  if(e.code === "Space" ){
    isSpacePressed = false;
    workspace.classList.remove("panning");
    e.preventDefault();
  }
});

function newCanvas(size = 32){
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

document.querySelector(".top-button-new").addEventListener("click", () =>{
  const confirmed = confirm("Create a new canvas? Unsaved work will be lost!");
  if(!confirmed){
    return;
  }
  newCanvas(32);
});

canvas.addEventListener("pointerup" , stopPainting);
canvas.addEventListener("pointercancel", stopPainting);

function stopPainting(e){
  if (!isPainting){
    return;
  }
  isPainting = false;
  finalizeAction();
  try{
    canvas.releasePointerCapture(e.pointerId);
  }catch {}
}
