# 🎨 BitCanvas

**BitCanvas** is a pixel-art drawing editor built using **HTML, CSS, and Vanilla JavaScript**.  
It focuses on editor-style interactions such as painting, erasing, flood fill, undo/redo, zoom & pan, and exporting artwork as PNG — all without using external libraries or frameworks.

This project was built to deeply understand **state management, mouse interactions, algorithms, and editor architecture** before moving to frameworks like React or backend integration.

---

## ✨ Features

### 🖌️ Drawing Tools
- **Brush** – Paint individual pixels
- **Eraser** – Clear pixels back to canvas background
- **Fill (Flood Fill)** – Fill connected regions using BFS
- **Color Picker** – Pick color directly from the canvas

### 🎨 Color System
- Predefined color palette
- **Custom color picker (Mix)** using native color input
- Visual indication of currently selected color

### 🔄 Undo / Redo
- Diff-based undo/redo system
- One undo step per user action (stroke / fill)
- Keyboard shortcuts:
  - `Ctrl / Cmd + Z` → Undo
  - `Ctrl / Cmd + Y` or `Ctrl / Cmd + Shift + Z` → Redo

### 🔍 View Controls
- **Zoom** (independent of painting)
- **Pan** using `Space + Drag`
- Pixel-perfect rendering at any zoom level

### 💾 Export
- **Save as PNG**
- Pixel-perfect export using offscreen `<canvas>`
- Adjustable export scale (high-resolution output)

### 🧱 Canvas Management
- Create a **New Canvas** without reloading the page
- Reset grid, zoom, tools, and history safely

---

## 🧠 Technical Highlights

- **Flood Fill Algorithm** implemented using **BFS**
- **Diff-based undo/redo** (stores only changed pixels, not full snapshots)
- Event delegation using `.closest()` for reliable interaction handling
- Clear separation between:
  - Tool state
  - Canvas state
  - UI state
- No frameworks, no libraries — pure JavaScript

---

## 🛠️ Tech Stack

- **HTML5**
- **CSS3**
- **Vanilla JavaScript (ES6+)**

---

## 📂 Project Structure

```text
bitcanvas/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── app.js
├── img/
│   └── tools/
├── README.md
└── devnotes.txt (ignored via .gitignore)
