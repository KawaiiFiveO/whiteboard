'use strict';

// =====================================================================
// Configuration
// =====================================================================

// Storyboard drawings are stored in fixed "panel units", independent of
// screen size AND of the chosen canvas size: the panel's long edge is always
// LONG_EDGE units and the other edge follows the canvas size's aspect ratio.
// The canvas size sets the frame shape and the export resolution, so
// switching 1080p -> 4K changes nothing on screen, just a sharper export.
// (Whiteboard mode uses 1 unit = 1 CSS px instead.)
const LONG_EDGE = 1920;
const MAX_CANVAS_EDGE = 8192;

const CANVAS_SIZES = [
    { group: 'Video', sizes: [
        { name: 'HD 720p', w: 1280, h: 720 },
        { name: 'Full HD 1080p', w: 1920, h: 1080 },
        { name: 'QHD 1440p', w: 2560, h: 1440 },
        { name: '4K UHD', w: 3840, h: 2160 },
    ] },
    { group: 'Cinema', sizes: [
        { name: 'Flat 1.85:1', w: 1998, h: 1080 },
        { name: 'Scope 2.39:1', w: 2048, h: 858 },
        { name: 'DCI 4K 1.90:1', w: 4096, h: 2160 },
    ] },
    { group: 'Screens', sizes: [
        { name: 'Laptop 16:10', w: 1920, h: 1200 },
        { name: 'Laptop 16:10 hi-res', w: 2560, h: 1600 },
        { name: 'Ultrawide 21:9', w: 3440, h: 1440 },
        { name: 'iPad 4:3', w: 2048, h: 1536 },
        { name: 'Classic TV 4:3', w: 1440, h: 1080 },
    ] },
    { group: 'Vertical & social', sizes: [
        { name: 'Vertical video 9:16', w: 1080, h: 1920 },
        { name: 'Phone 19.5:9', w: 1170, h: 2532 },
        { name: 'Portrait post 4:5', w: 1080, h: 1350 },
        { name: 'Square 1:1', w: 1080, h: 1080 },
    ] },
];
const DEFAULT_CANVAS_SIZE = { w: 1920, h: 1080 };

// Documents saved before canvas sizes stored an aspect ratio instead
const LEGACY_ASPECT_SIZES = {
    '16:9': { w: 1920, h: 1080 },
    '1.85:1': { w: 1998, h: 1080 },
    '2.39:1': { w: 2048, h: 858 },
    '4:3': { w: 1440, h: 1080 },
    '1:1': { w: 1080, h: 1080 },
    '9:16': { w: 1080, h: 1920 },
};

// Stabilizer strengths: each pointer move, the line moves this fraction of
// the way toward the pen. Lower = smoother but trails further behind.
const STABILIZER_LEVELS = {
    light:  { name: 'Light',  detail: 'Subtle, almost no lag', factor: 0.35 },
    medium: { name: 'Medium', detail: 'Balanced',              factor: 0.2 },
    heavy:  { name: 'Heavy',  detail: 'Smoothest, more lag',   factor: 0.1 },
};
const DEFAULT_STABILIZER_LEVEL = 'medium';
const PRESSURE_SMOOTHING = 0.35; // Per pen sample, stabilizer off: evens out pressure noise
const MAX_HISTORY = 200;
const MIN_SHAPE = 3; // Shapes smaller than this (panel units) are treated as accidental taps

// 'ink' is the theme-adaptive default color: near-black on light paper,
// near-white on dark paper. Hex colors render unchanged in both themes.
// Exports always use the light theme.
const INK = 'ink';
const THEME_INK = { light: '#111111', dark: '#f2f2f2' };
const PALETTE = [
    { color: INK, name: 'Ink' },
    { color: '#868e96', name: 'Gray' },
    { color: '#ced4da', name: 'Light gray' },
    { color: '#e03131', name: 'Red' },
    { color: '#f08c00', name: 'Orange' },
    { color: '#2f9e44', name: 'Green' },
    { color: '#1971c2', name: 'Blue' },
    { color: '#9c36b5', name: 'Purple' },
];

const FONT_FAMILY = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'; // UI & sheet export
const LINE_HEIGHT = 1.25;

// Fonts for the Text tool: widely installed fonts (Windows, macOS, iOS),
// each falling back to the generic family. Objects store the key, not the
// stack, so stacks can change without touching saved drawings.
const TEXT_FONTS = {
    sans:  { label: 'Sans',  name: 'Sans-serif (Arial)',  stack: 'Arial, Helvetica, sans-serif' },
    serif: { label: 'Serif', name: 'Serif (Georgia)',     stack: 'Georgia, "Times New Roman", Times, serif' },
    mono:  { label: 'Mono',  name: 'Monospace (Consolas / Menlo)', stack: 'Consolas, Menlo, Monaco, "Courier New", monospace' },
};
const DEFAULT_TEXT_FONT = 'sans';

// Modes:
//   whiteboard — full-window board (e.g. coding interviews); units are CSS px
//   storyboard — framed panels with filmstrip, captions, aspect ratio, sheet export
const MODES = ['whiteboard', 'storyboard'];
const DEFAULT_MODE = 'whiteboard';

// Each tool uses one of the size "slots" below, so e.g. all shapes share a size
const TOOLS = {
    pen:     { size: 'pen' },
    eraser:  { size: 'eraser' },
    line:    { size: 'shape' },
    arrow:   { size: 'shape' },
    rect:    { size: 'shape', fillable: true },
    ellipse: { size: 'shape', fillable: true },
    text:    { size: 'text' },
};
const SIZE_RANGES = {
    pen:    { min: 1,  max: 50 },
    eraser: { min: 10, max: 300 },
    shape:  { min: 1,  max: 40 },
    text:   { min: 12, max: 200 },
};
// Sizes are remembered per mode: whiteboard units are screen px, while
// storyboard units are scaled down to fit a 1920-wide panel on screen
const DEFAULT_SIZES = {
    whiteboard: { pen: 4, eraser: 60, shape: 3, text: 28 },
    storyboard: { pen: 6, eraser: 80, shape: 6, text: 56 },
};
const TOOL_KEYS = { p: 'pen', b: 'pen', e: 'eraser', l: 'line', a: 'arrow', r: 'rect', o: 'ellipse', t: 'text' };

const CAPTION_FIELDS = [
    { key: 'action', label: 'Action' },
    { key: 'dialogue', label: 'Dialogue' },
    { key: 'notes', label: 'Notes' },
];

const THUMB_HEIGHT = 52; // Filmstrip thumbnail height, CSS px

// Multi-finger tap gestures (only once a pen is in use, so touch is free)
const TAP_MAX_MS = 350;
const TAP_MAX_MOVE = 20;

// localStorage keys
const DOC_KEY = 'whiteboard.doc.v1'; // Storyboard document (key predates modes)
const BOARD_KEY = 'whiteboard.board.v1'; // Whiteboard-mode board
const SETTINGS_KEY = 'whiteboard.settings.v1';
const THEME_KEY = 'whiteboard.theme';

// =====================================================================
// DOM references
// =====================================================================

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const panelEl = $('panel');
const canvas = $('board');
const ctx = canvas.getContext('2d');
const overlay = $('overlay');
const octx = overlay.getContext('2d');
const textEditor = $('textEditor');
const captionsEl = $('captions');
const captionInputs = document.querySelectorAll('[data-caption]');
const panelBadge = $('panelBadge');
const thumbsEl = $('thumbs');
const toolButtons = document.querySelectorAll('[data-tool]');
const modeButtons = document.querySelectorAll('[data-mode]');
const exportBtn = $('exportBtn');
const colorBtn = $('colorBtn');
const colorDot = $('colorDot');
const swatchesEl = $('swatches');
const customSwatch = $('customSwatch');
const customColor = $('customColor');
const sizeSlider = $('sizeSlider');
const sizeValue = $('sizeValue');
const fillBtn = $('fillBtn');
const fontGroup = $('fontGroup');
const stabilizerBtn = $('stabilizerBtn');
const stabilizerLevelLabel = $('stabilizerLevel');
const stabilizerPopover = $('stabilizerPopover');
const undoBtn = $('undoBtn');
const redoBtn = $('redoBtn');
const clearBtn = $('clearBtn');
const canvasSizeBtn = $('canvasSizeBtn');
const canvasSizeLabel = $('canvasSizeLabel');
const canvasSizePopover = $('canvasSizePopover');
const themeBtn = $('themeBtn');
const addPanelBtn = $('addPanelBtn');
const duplicatePanelBtn = $('duplicatePanelBtn');
const deletePanelBtn = $('deletePanelBtn');
const movePanelLeftBtn = $('movePanelLeftBtn');
const movePanelRightBtn = $('movePanelRightBtn');
const eraserCursor = $('eraserCursor');
const toast = $('toast');

// Offscreen context used only for measuring text
const measureCtx = document.createElement('canvas').getContext('2d');

// =====================================================================
// Small helpers
// =====================================================================

function storageGet(key) {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        return null; // Private mode / blocked storage
    }
}

function storageSet(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (e) {
        return false; // Full or unavailable
    }
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const round1 = (v) => Math.round(v * 10) / 10; // Keeps saved documents compact

let toastTimer = null;
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// =====================================================================
// Document model
// =====================================================================
//
// doc = { version: 3, size: { w, h }, width, height, panels: [panel, ...] }
//   size = canvas size in output pixels (export resolution)
//   width/height = panel units (derived from size; long edge = LONG_EDGE)
// panel = { objects: [...bottom to top], captions: { action, dialogue, notes } }
//
// Objects (all coordinates in panel units):
//   { type: 'stroke', mode: 'draw'|'erase', color, size, points: [x, y, pressure, ...] }
//   { type: 'line', arrow: bool, x1, y1, x2, y2, color, size }
//   { type: 'rect' | 'ellipse', x, y, w, h, fill: bool, color, size }
//   { type: 'text', x, y, text, color, size }      (x, y = top-left; size = font size)
//
// Erase strokes render with 'destination-out', cutting through everything
// below them (undo brings it back).

function createPanel() {
    return { objects: [], captions: { action: '', dialogue: '', notes: '' } };
}

function isValidCanvasSize(s) {
    return !!s && [s.w, s.h].every((v) => Number.isInteger(v) && v > 0 && v <= MAX_CANVAS_EDGE);
}

// Derive panel units from the canvas size's aspect ratio
function applyCanvasSize(d) {
    const ratio = d.size.w / d.size.h;
    if (ratio >= 1) {
        d.width = LONG_EDGE;
        d.height = Math.round(LONG_EDGE / ratio);
    } else {
        d.height = LONG_EDGE;
        d.width = Math.round(LONG_EDGE * ratio);
    }
}

function createDoc() {
    const d = { version: 3, size: { ...DEFAULT_CANVAS_SIZE }, panels: [createPanel()] };
    applyCanvasSize(d);
    return d;
}

// Accepts v1 (single 16:9 panel, no captions), v2 (aspect ratio) and v3 documents
function normalizeDoc(d) {
    if (!d || !Array.isArray(d.panels) || d.panels.length === 0) return null;
    if (!isValidCanvasSize(d.size)) {
        d.size = { ...(LEGACY_ASPECT_SIZES[d.aspect] || DEFAULT_CANVAS_SIZE) };
    }
    delete d.aspect;
    applyCanvasSize(d);
    d.panels = d.panels.map((p) => ({
        objects: Array.isArray(p && p.objects) ? p.objects : [],
        captions: { ...createPanel().captions, ...(p && p.captions) },
    }));
    d.version = 3;
    return d;
}

function loadDoc() {
    const raw = storageGet(DOC_KEY);
    if (!raw) return null;
    try {
        return normalizeDoc(JSON.parse(raw));
    } catch (e) {
        console.warn('Saved storyboard could not be read; starting fresh.', e);
        return null;
    }
}

const doc = loadDoc() || createDoc();
let currentPanelIndex = 0;

// Whiteboard mode has a single unframed page: { objects }
function loadWhiteboard() {
    try {
        const d = JSON.parse(storageGet(BOARD_KEY));
        if (d && Array.isArray(d.objects)) return { objects: d.objects };
    } catch (e) {
        console.warn('Saved whiteboard could not be read; starting fresh.', e);
    }
    return { objects: [] };
}

const whiteboardPage = loadWhiteboard();

function isStoryboard() {
    return settings.mode === 'storyboard';
}

// The page being drawn on: the whiteboard, or the selected storyboard panel
function currentPanel() {
    return isStoryboard() ? doc.panels[currentPanelIndex] : whiteboardPage;
}

// --- Autosave (debounced) ---
let saveTimer = null;
let saveFailedNotified = false;

function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDoc, 400);
}

function saveDoc() {
    saveTimer = null;
    const ok = storageSet(DOC_KEY, JSON.stringify(doc)) &&
        storageSet(BOARD_KEY, JSON.stringify({ version: 1, objects: whiteboardPage.objects }));
    if (ok) {
        saveFailedNotified = false;
    } else if (!saveFailedNotified) {
        saveFailedNotified = true;
        showToast('Autosave failed: browser storage is full or unavailable');
    }
}

function flushSave() {
    commitText();
    if (saveTimer) {
        clearTimeout(saveTimer);
        saveDoc();
    }
}

window.addEventListener('pagehide', flushSave);
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSave();
});

// =====================================================================
// Settings — saved in localStorage
// =====================================================================

// v2: stabilizer defaults to on. Older saved settings always contained
// `stabilizer: false` (settings are saved on startup, not only when
// changed), so their value is ignored once in favor of the new default.
const SETTINGS_VERSION = 2;

const settings = {
    version: SETTINGS_VERSION,
    mode: DEFAULT_MODE,
    tool: 'pen',
    color: INK,
    fill: false,
    stabilizer: true,
    // Kept while the stabilizer is off, so turning it back on restores it
    stabilizerLevel: DEFAULT_STABILIZER_LEVEL,
    font: DEFAULT_TEXT_FONT,
    exportTheme: 'light', // Export background: 'light' | 'dark'
    sizes: structuredClone(DEFAULT_SIZES), // { [mode]: { [slot]: size } }
};

function isValidColor(c) {
    return c === INK || /^#[0-9a-f]{6}$/i.test(c);
}

function clampSize(slot, v) {
    const r = SIZE_RANGES[slot];
    return clamp(Math.round(v), r.min, r.max);
}

(function loadSettings() {
    try {
        const s = JSON.parse(storageGet(SETTINGS_KEY));
        if (!s) return;
        if (MODES.includes(s.mode)) settings.mode = s.mode;
        if (s.tool in TOOLS) settings.tool = s.tool;
        if (isValidColor(s.color)) settings.color = s.color;
        settings.fill = !!s.fill;
        if (s.version >= 2) settings.stabilizer = !!s.stabilizer;
        if (s.stabilizerLevel in STABILIZER_LEVELS) settings.stabilizerLevel = s.stabilizerLevel;
        if (s.font in TEXT_FONTS) settings.font = s.font;
        if (s.exportTheme === 'light' || s.exportTheme === 'dark') settings.exportTheme = s.exportTheme;
        const sizes = s.sizes || {};
        for (const mode of MODES) {
            // Settings saved before modes existed had one flat set of sizes,
            // which were storyboard-panel sizes
            const saved = sizes[mode] || (mode === 'storyboard' ? sizes : {});
            for (const slot in SIZE_RANGES) {
                if (typeof saved[slot] === 'number') settings.sizes[mode][slot] = clampSize(slot, saved[slot]);
            }
        }
    } catch (e) { /* Ignore bad settings, keep defaults */ }
})();

function saveSettings() {
    storageSet(SETTINGS_KEY, JSON.stringify(settings));
}

function sizeSlot(tool = settings.tool) {
    return TOOLS[tool].size;
}

// Tool sizes for the current mode
function modeSizes() {
    return settings.sizes[settings.mode];
}

// =====================================================================
// History (undo / redo)
// =====================================================================
//
// Actions:
//   { type: 'add',    panel, obj, index? }      index is filled in on undo
//   { type: 'remove', panel, obj, index }
//   { type: 'edit',   panel, obj, before, after }
//   { type: 'clear',  panel, objects }
//   { type: 'addPanel',    panel, index }
//   { type: 'removePanel', panel, index }
//   { type: 'movePanel',   panel, from, to }

// Each mode has its own history; undoStack/redoStack point at the current one
const histories = Object.fromEntries(MODES.map((m) => [m, { undo: [], redo: [] }]));
let undoStack = histories[settings.mode].undo;
let redoStack = histories[settings.mode].redo;

function pushHistory(action) {
    undoStack.push(action);
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack.length = 0;
    updateButtons();
}

function movePanelTo(panel, to) {
    const from = doc.panels.indexOf(panel);
    doc.panels.splice(from, 1);
    doc.panels.splice(to, 0, panel);
}

// Each returns the panel (or panel index) to show afterwards
function revertAction(a) {
    switch (a.type) {
        case 'add': {
            a.index = a.panel.objects.indexOf(a.obj);
            if (a.index !== -1) a.panel.objects.splice(a.index, 1);
            return a.panel;
        }
        case 'remove':
            a.panel.objects.splice(Math.min(a.index, a.panel.objects.length), 0, a.obj);
            return a.panel;
        case 'edit':
            Object.assign(a.obj, a.before);
            return a.panel;
        case 'clear':
            a.panel.objects = a.objects;
            return a.panel;
        case 'addPanel': {
            const i = doc.panels.indexOf(a.panel);
            doc.panels.splice(i, 1);
            a.index = i;
            return Math.max(0, i - 1);
        }
        case 'removePanel':
            doc.panels.splice(a.index, 0, a.panel);
            return a.panel;
        case 'movePanel':
            movePanelTo(a.panel, a.from);
            return a.panel;
    }
}

function reapplyAction(a) {
    switch (a.type) {
        case 'add': {
            const objects = a.panel.objects;
            objects.splice(a.index >= 0 ? a.index : objects.length, 0, a.obj);
            return a.panel;
        }
        case 'remove': {
            const i = a.panel.objects.indexOf(a.obj);
            if (i !== -1) a.panel.objects.splice(i, 1);
            return a.panel;
        }
        case 'edit':
            Object.assign(a.obj, a.after);
            return a.panel;
        case 'clear':
            a.panel.objects = [];
            return a.panel;
        case 'addPanel':
            doc.panels.splice(a.index, 0, a.panel);
            return a.panel;
        case 'removePanel': {
            const i = doc.panels.indexOf(a.panel);
            doc.panels.splice(i, 1);
            a.index = i;
            return Math.min(i, doc.panels.length - 1);
        }
        case 'movePanel':
            movePanelTo(a.panel, a.to);
            return a.panel;
    }
}

function undo() {
    commitText();
    if (isDrawing() || undoStack.length === 0) return;
    const action = undoStack.pop();
    const target = revertAction(action);
    redoStack.push(action);
    afterHistory(target);
}

function redo() {
    commitText();
    if (isDrawing() || redoStack.length === 0) return;
    const action = redoStack.pop();
    const target = reapplyAction(action);
    undoStack.push(action);
    afterHistory(target);
}

// Show whichever panel the undone/redone change affected
function afterHistory(target) {
    if (!isStoryboard()) {
        render();
        updateButtons();
        scheduleSave();
        return;
    }
    const index = typeof target === 'number' ? target : doc.panels.indexOf(target);
    currentPanelIndex = clamp(index, 0, doc.panels.length - 1);
    rebuildFilmstrip();
    showPanel(currentPanelIndex);
    scheduleSave();
}

// Call after the current panel's objects change
function contentChanged() {
    updateButtons();
    scheduleSave();
    scheduleThumb(currentPanel());
}

function updateButtons() {
    const last = doc.panels.length - 1;
    undoBtn.disabled = undoStack.length === 0;
    redoBtn.disabled = redoStack.length === 0;
    clearBtn.disabled = currentPanel().objects.length === 0;
    deletePanelBtn.disabled = doc.panels.length === 1;
    movePanelLeftBtn.disabled = currentPanelIndex === 0;
    movePanelRightBtn.disabled = currentPanelIndex === last;
}

// =====================================================================
// Rendering
// =====================================================================

const view = { scale: 1, dpr: 1 }; // CSS px per panel unit, device px per CSS px

function currentTheme() {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function resolveColor(color, theme) {
    return color === INK ? THEME_INK[theme] : color;
}

function textFont(size, family = FONT_FAMILY) {
    return `${size}px ${family}`;
}

function fontStack(key) {
    return (TEXT_FONTS[key] || TEXT_FONTS[DEFAULT_TEXT_FONT]).stack;
}

// Canvas font for a text object
function objFont(obj) {
    return textFont(obj.size, fontStack(obj.font));
}

// Map panel units -> device pixels
function applyView(c) {
    const s = view.scale * view.dpr;
    c.setTransform(s, 0, 0, s, 0, 0);
}

function setPaint(c, obj, theme) {
    c.lineCap = 'round';
    c.lineJoin = 'round';
    if (obj.mode === 'erase') {
        c.globalCompositeOperation = 'destination-out';
        c.strokeStyle = c.fillStyle = '#000';
    } else {
        c.globalCompositeOperation = 'source-over';
        c.strokeStyle = c.fillStyle = resolveColor(obj.color, theme);
    }
}

// --- Freehand strokes ---
function strokeWidthAt(obj, i) {
    return Math.max(obj.size * obj.points[i * 3 + 2], 0.5); // Never fully disappear
}

// Dot at the first point, so a single tap leaves a mark
function drawStrokeStart(c, obj) {
    const p = obj.points;
    c.beginPath();
    c.arc(p[0], p[1], strokeWidthAt(obj, 0) / 2, 0, Math.PI * 2);
    c.fill();
}

// Strokes are drawn as smooth curves rather than straight point-to-point
// segments: each sample point i is the control point of a quadratic curve
// running from the midpoint before it to the midpoint after it. The curve
// passes near (not through) the samples, which removes the polygon look of
// fast strokes without the lag of the stabilizer. Each piece is stroked on
// its own so pressure can vary the width along the stroke.
//
//   p0 ──curve(1)── mid(1,2) ──curve(2)── mid(2,3) ... mid(n-2,n-1) ──tail── p(n-1)
//
// Curve i needs point i+1, so while drawing, the last piece (the "tail")
// is previewed on the overlay and only committed when the stroke ends.

// Where curve i starts: the first point, or the midpoint between i-1 and i
function curveStart(p, i) {
    if (i === 1) return [p[0], p[1]];
    const a = (i - 1) * 3;
    const b = i * 3;
    return [(p[a] + p[b]) / 2, (p[a + 1] + p[b + 1]) / 2];
}

// Curve controlled by point i; requires point i+1 to exist
function drawStrokeCurve(c, obj, i) {
    const p = obj.points;
    const b = i * 3;
    const n = (i + 1) * 3;
    const [sx, sy] = curveStart(p, i);
    c.lineWidth = strokeWidthAt(obj, i);
    c.beginPath();
    c.moveTo(sx, sy);
    c.quadraticCurveTo(p[b], p[b + 1], (p[b] + p[n]) / 2, (p[b + 1] + p[n + 1]) / 2);
    c.stroke();
}

// Final piece: from the end of the last curve to the last point
function drawStrokeTail(c, obj) {
    const p = obj.points;
    const last = p.length / 3 - 1;
    if (last < 1) return;
    const [sx, sy] = curveStart(p, last);
    c.lineWidth = strokeWidthAt(obj, last);
    c.beginPath();
    c.moveTo(sx, sy);
    c.lineTo(p[last * 3], p[last * 3 + 1]);
    c.stroke();
}

function drawStroke(c, obj) {
    if (obj.points.length < 3) return;
    drawStrokeStart(c, obj);
    const count = obj.points.length / 3;
    for (let i = 1; i < count - 1; i++) drawStrokeCurve(c, obj, i);
    drawStrokeTail(c, obj);
}

// --- Lines & arrows ---
function drawLine(c, obj) {
    const { x1, y1, x2, y2, size } = obj;
    const length = Math.hypot(x2 - x1, y2 - y1);
    if (length < 0.5) return;

    let endX = x2;
    let endY = y2;
    if (obj.arrow) {
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const head = Math.min(Math.max(size * 4, 20), length * 0.6);
        const spread = Math.PI / 7;
        c.beginPath();
        c.moveTo(x2, y2);
        c.lineTo(x2 - head * Math.cos(angle - spread), y2 - head * Math.sin(angle - spread));
        c.lineTo(x2 - head * Math.cos(angle + spread), y2 - head * Math.sin(angle + spread));
        c.closePath();
        c.fill();
        // Stop the shaft inside the head so its round cap doesn't poke through the tip
        endX = x2 - Math.cos(angle) * head * 0.6;
        endY = y2 - Math.sin(angle) * head * 0.6;
    }

    c.lineWidth = size;
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(endX, endY);
    c.stroke();
}

// --- Rectangles & ellipses ---
function drawBox(c, obj) {
    const { x, y, w, h } = obj;
    c.beginPath();
    if (obj.type === 'rect') c.rect(x, y, w, h);
    else c.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    if (obj.fill) c.fill();
    c.lineWidth = obj.size;
    c.stroke();
}

// --- Text ---
// Text must land exactly where the HTML editor showed it. CSS places each
// line's baseline using the font's ascent/descent: the "content area"
// (ascent + descent) is centered in the line box, and the baseline sits
// `ascent` below its top. Canvas's 'middle'/'top' baselines use the em box
// instead, which is off by several % of the font size, so we compute the
// baseline the CSS way and draw with 'alphabetic'.
function textBaselineOffset(obj) {
    measureCtx.font = objFont(obj);
    const m = measureCtx.measureText('Hg');
    const lineHeight = obj.size * LINE_HEIGHT;
    const ascent = m.fontBoundingBoxAscent;
    const descent = m.fontBoundingBoxDescent;
    if (!Number.isFinite(ascent) || !Number.isFinite(descent)) {
        return lineHeight / 2 + obj.size * 0.35; // Old browsers: close approximation
    }
    return (lineHeight - (ascent + descent)) / 2 + ascent;
}

function drawText(c, obj) {
    const lineHeight = obj.size * LINE_HEIGHT;
    const baseline = textBaselineOffset(obj);
    c.font = objFont(obj);
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    obj.text.split('\n').forEach((line, i) => {
        c.fillText(line, obj.x, obj.y + i * lineHeight + baseline);
    });
}

function textBounds(obj) {
    measureCtx.font = objFont(obj);
    const lines = obj.text.split('\n');
    const width = Math.max(...lines.map((l) => measureCtx.measureText(l).width));
    return { x: obj.x, y: obj.y, w: width, h: lines.length * obj.size * LINE_HEIGHT };
}

function renderObject(c, obj, theme) {
    setPaint(c, obj, theme);
    switch (obj.type) {
        case 'stroke': drawStroke(c, obj); break;
        case 'line': drawLine(c, obj); break;
        case 'rect':
        case 'ellipse': drawBox(c, obj); break;
        case 'text': drawText(c, obj); break;
    }
}

function renderObjects(c, objects, theme, skip = null) {
    for (const obj of objects) {
        if (obj !== skip) renderObject(c, obj, theme);
    }
    c.globalCompositeOperation = 'source-over';
}

// Full redraw of the current panel
function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    applyView(ctx);
    // Text being edited is shown by the editor instead
    renderObjects(ctx, currentPanel().objects, currentTheme(), textEdit && textEdit.obj);
}

// --- Overlay: live previews of lines/shapes being dragged ---
let overlayQueued = false;

function requestOverlay() {
    if (overlayQueued) return;
    overlayQueued = true;
    requestAnimationFrame(drawOverlay);
}

function drawOverlay() {
    overlayQueued = false;
    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.clearRect(0, 0, overlay.width, overlay.height);
    applyView(octx);
    for (const state of activePointers.values()) {
        if (state.kind === 'shape' && state.obj) {
            renderObject(octx, state.obj, currentTheme());
        } else if (state.kind === 'stroke' && state.obj.mode !== 'erase') {
            // Uncommitted tail of a stroke in progress (erasers can't preview
            // on a separate layer; their tail is applied when the stroke ends)
            setPaint(octx, state.obj, currentTheme());
            drawStrokeTail(octx, state.obj);
        }
    }
    octx.globalCompositeOperation = 'source-over';
}

// --- Layout ---
// Storyboard: fit the panel into the stage at the board's aspect ratio.
// Whiteboard: fill the stage at 1 unit = 1 CSS px; resizing reveals or
// hides space but never moves or loses drawings.
function layout() {
    const style = getComputedStyle(stage);
    const availW = stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const availH = stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    if (availW <= 0 || availH <= 0) return;

    let w = availW;
    let h = availH;
    if (isStoryboard()) {
        const aspect = doc.width / doc.height;
        h = w / aspect;
        if (h > availH) {
            h = availH;
            w = h * aspect;
        }
    }
    w = Math.floor(w);
    h = Math.floor(h);

    panelEl.style.width = w + 'px';
    panelEl.style.height = h + 'px';
    // Captions line up with the panel, but stay usable under narrow (e.g. 9:16) panels
    captionsEl.style.width = Math.min(availW, Math.max(w, 420)) + 'px';

    // Back the canvases with device pixels so strokes stay sharp on hi-DPI tablets
    view.dpr = window.devicePixelRatio || 1;
    view.scale = isStoryboard() ? w / doc.width : 1;
    for (const c of [canvas, overlay]) {
        c.width = Math.round(w * view.dpr);
        c.height = Math.round(h * view.dpr);
    }

    render();
    drawOverlay();
    if (textEdit) styleTextEditor();
}

new ResizeObserver(layout).observe(stage);

// =====================================================================
// Pointer input on the panel
// =====================================================================
//
// activePointers: pointerId -> state, where state.kind is
//   'stroke' { obj, smoothX, smoothY, smoothP }
//   'shape'  { tool, sx, sy, obj }        obj = current preview (or null)
//   'text'   { x, y, skip }               text is placed on pointerup

const activePointers = new Map();
let penDetected = false;

function isDrawing() {
    return activePointers.size > 0;
}

// Palm rejection: once a pen has been used, touches no longer draw
function isRejected(e) {
    return e.pointerType === 'touch' && penDetected;
}

function pressureOf(e) {
    // Mouse and touch report a fixed 0.5 (or 0); only pens give real pressure.
    // Using 1 for them means the size slider is the exact line width.
    return e.pointerType === 'pen' ? (e.pressure || 0.5) : 1;
}

function toPanelCoords(e, rect) {
    return {
        x: (e.clientX - rect.left) / view.scale,
        y: (e.clientY - rect.top) / view.scale,
    };
}

function addPoint(obj, x, y, p) {
    x = round1(x);
    y = round1(y);
    p = Math.round(p * 100) / 100;
    const pts = obj.points;
    const n = pts.length;
    if (n >= 3 && pts[n - 3] === x && pts[n - 2] === y) return; // Skip zero-length moves
    pts.push(x, y, p);
}

// Build a line/arrow/rect/ellipse from a drag. Shift snaps lines to 45°
// and makes shapes square/circular.
function shapeFromDrag(tool, sx, sy, x, y, constrain) {
    const style = { color: settings.color, size: modeSizes().shape };

    if (tool === 'line' || tool === 'arrow') {
        if (constrain) {
            const step = Math.PI / 4;
            const angle = Math.round(Math.atan2(y - sy, x - sx) / step) * step;
            const length = Math.hypot(x - sx, y - sy);
            x = sx + Math.cos(angle) * length;
            y = sy + Math.sin(angle) * length;
        }
        if (Math.hypot(x - sx, y - sy) < MIN_SHAPE) return null;
        return {
            type: 'line', arrow: tool === 'arrow',
            x1: round1(sx), y1: round1(sy), x2: round1(x), y2: round1(y), ...style,
        };
    }

    let w = x - sx;
    let h = y - sy;
    if (constrain) {
        const side = Math.max(Math.abs(w), Math.abs(h));
        w = Math.sign(w || 1) * side;
        h = Math.sign(h || 1) * side;
    }
    if (Math.abs(w) < MIN_SHAPE && Math.abs(h) < MIN_SHAPE) return null;
    return {
        type: tool,
        x: round1(Math.min(sx, sx + w)), y: round1(Math.min(sy, sy + h)),
        w: round1(Math.abs(w)), h: round1(Math.abs(h)),
        fill: settings.fill, ...style,
    };
}

function onPointerDown(e) {
    if (e.pointerType === 'pen') penDetected = true;
    if (isRejected(e)) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    e.preventDefault();
    closePopovers();
    const wasEditingText = commitText();

    canvas.setPointerCapture(e.pointerId); // Keep tracking even if the pointer leaves the canvas
    updateEraserCursor(e);

    // Pen eraser end (e.g. Surface Pen) erases regardless of selected tool
    const penEraser = e.pointerType === 'pen' && (e.buttons & 32);
    const tool = penEraser ? 'eraser' : settings.tool;
    const { x, y } = toPanelCoords(e, canvas.getBoundingClientRect());

    if (tool === 'text') {
        // Tapping away from a text box only closes it; the next tap places text
        activePointers.set(e.pointerId, { kind: 'text', x, y, skip: wasEditingText });
        return;
    }

    if (tool !== 'pen' && tool !== 'eraser') {
        activePointers.set(e.pointerId, { kind: 'shape', tool, sx: x, sy: y, obj: null });
        return;
    }

    const erasing = tool === 'eraser';
    const p = erasing ? 1 : pressureOf(e); // Eraser width is fixed so it matches its cursor
    const obj = {
        type: 'stroke',
        mode: erasing ? 'erase' : 'draw',
        color: settings.color,
        size: modeSizes()[sizeSlot(tool)],
        points: [],
    };
    addPoint(obj, x, y, p);

    // Added to the panel immediately so stacking order follows start time
    // and a mid-stroke redraw (e.g. resize) includes it
    currentPanel().objects.push(obj);
    activePointers.set(e.pointerId, {
        kind: 'stroke', obj,
        smoothX: x, smoothY: y, smoothP: p, // Stabilized position/pressure
        rawX: x, rawY: y, rawP: p,          // Latest actual pen position/pressure
        // Stabilizer strength for this stroke (0 = off), fixed at pen-down
        stabilizerK: settings.stabilizer ? STABILIZER_LEVELS[settings.stabilizerLevel].factor : 0,
    });

    applyView(ctx);
    setPaint(ctx, obj, currentTheme());
    drawStrokeStart(ctx, obj);
    ctx.globalCompositeOperation = 'source-over';
}

function onPointerMove(e) {
    updateEraserCursor(e);

    const state = activePointers.get(e.pointerId);
    if (!state) return;
    const rect = canvas.getBoundingClientRect();

    if (state.kind === 'shape') {
        const { x, y } = toPanelCoords(e, rect);
        state.obj = shapeFromDrag(state.tool, state.sx, state.sy, x, y, e.shiftKey);
        requestOverlay();
        return;
    }
    if (state.kind !== 'stroke') return;

    const obj = state.obj;
    const erasing = obj.mode === 'erase';
    const firstNew = obj.points.length / 3;

    if (state.stabilizerK) {
        // --- THE STABILIZER (Weighted Smoothing) ---
        // Move the "smooth" position only a fraction toward the real pointer.
        // Applied once per pointermove (not per coalesced event) so the
        // smoothing strength doesn't depend on the device's sample rate.
        const { x, y } = toPanelCoords(e, rect);
        const p = erasing ? 1 : pressureOf(e);
        state.rawX = x;
        state.rawY = y;
        state.rawP = p;
        stabilizeToward(state, x, y, p);
    } else {
        // Use every sample the pen reported since the last frame. Position is
        // used as-is (the curves smooth it with no lag); pressure gets light
        // smoothing so sensor noise doesn't make the width wobble.
        const samples = (e.getCoalescedEvents && e.getCoalescedEvents()) || [];
        for (const ev of samples.length ? samples : [e]) {
            const { x, y } = toPanelCoords(ev, rect);
            const p = erasing ? 1 : pressureOf(ev);
            state.smoothP += (p - state.smoothP) * PRESSURE_SMOOTHING;
            addPoint(obj, x, y, state.smoothP);
        }
    }

    drawNewCurves(obj, firstNew);
    if (!erasing) requestOverlay();
}

// One stabilizer step: move the smoothed point a fraction toward (x, y, p)
function stabilizeToward(state, x, y, p) {
    const k = state.stabilizerK;
    state.smoothX += (x - state.smoothX) * k;
    state.smoothY += (y - state.smoothY) * k;
    state.smoothP += (p - state.smoothP) * k;
    addPoint(state.obj, state.smoothX, state.smoothY, state.smoothP);
}

// Stabilized lines trail the pen, so on release they'd stop short of where
// the pen lifted. Keep stepping the stabilizer toward the final position
// (as if the pen had paused there) so the line eases in and ends exactly
// at the lift point.
function finishStabilizedStroke(state, e) {
    let x = state.rawX;
    let y = state.rawY;
    if (e.type !== 'pointercancel') {
        ({ x, y } = toPanelCoords(e, canvas.getBoundingClientRect()));
    }
    const firstNew = state.obj.points.length / 3;
    // Pen pressure reads ~0 at lift, so ease toward the last pressure while drawing
    for (let i = 0; i < 300 && Math.hypot(x - state.smoothX, y - state.smoothY) > 0.25; i++) {
        stabilizeToward(state, x, y, state.rawP);
    }
    addPoint(state.obj, x, y, state.smoothP);
    drawNewCurves(state.obj, firstNew);
}

// Draw only the newly completed curves of a stroke in progress (full redraws
// happen on undo/resize/theme). Curve i needs point i+1, so a curve
// completes one point late; the still-open tail is shown on the overlay.
function drawNewCurves(obj, firstNew) {
    const count = obj.points.length / 3;
    if (count <= firstNew) return;
    applyView(ctx);
    setPaint(ctx, obj, currentTheme());
    for (let i = Math.max(firstNew - 1, 1); i < count - 1; i++) drawStrokeCurve(ctx, obj, i);
    ctx.globalCompositeOperation = 'source-over';
}

function onPointerUp(e) {
    if (e.pointerType === 'touch') hideEraserCursor(); // Touch has no hover

    const state = activePointers.get(e.pointerId);
    if (!state) return;
    activePointers.delete(e.pointerId);
    const cancelled = e.type === 'pointercancel';
    const panel = currentPanel();

    if (state.kind === 'stroke') {
        if (state.stabilizerK) finishStabilizedStroke(state, e);
        // Commit the tail that was only previewed while drawing
        applyView(ctx);
        setPaint(ctx, state.obj, currentTheme());
        drawStrokeTail(ctx, state.obj);
        ctx.globalCompositeOperation = 'source-over';
        requestOverlay(); // Clears the tail preview
        pushHistory({ type: 'add', panel, obj: state.obj });
        contentChanged();
    } else if (state.kind === 'shape') {
        requestOverlay(); // Clears the preview
        if (cancelled || !state.obj) return;
        panel.objects.push(state.obj);
        applyView(ctx);
        renderObject(ctx, state.obj, currentTheme());
        ctx.globalCompositeOperation = 'source-over';
        pushHistory({ type: 'add', panel, obj: state.obj });
        contentChanged();
    } else if (state.kind === 'text') {
        if (!cancelled && !state.skip) startTextEdit(state.x, state.y);
    }
}

canvas.addEventListener('pointerdown', onPointerDown);
canvas.addEventListener('pointermove', onPointerMove);
canvas.addEventListener('pointerup', onPointerUp);
canvas.addEventListener('pointercancel', onPointerUp);
canvas.addEventListener('pointerleave', hideEraserCursor);
canvas.addEventListener('contextmenu', (e) => e.preventDefault()); // No long-press menu

// --- Eraser cursor (circle showing eraser size) ---
function updateEraserCursor(e) {
    if (settings.tool !== 'eraser' || isRejected(e)) return;
    // Eraser width is the stroke diameter; convert panel units to screen px
    const d = modeSizes().eraser * view.scale;
    eraserCursor.style.width = d + 'px';
    eraserCursor.style.height = d + 'px';
    eraserCursor.style.left = e.clientX + 'px';
    eraserCursor.style.top = e.clientY + 'px';
    eraserCursor.style.display = 'block';
}

function hideEraserCursor() {
    eraserCursor.style.display = 'none';
}

// --- Multi-finger taps: two fingers = undo, three = redo ---
// Only active once a pen is in use (before that, touch draws).
const touchTap = { pointers: new Map(), maxCount: 0, startTime: 0, moved: false };

stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch' || !penDetected) return;
    if (touchTap.pointers.size === 0) {
        touchTap.maxCount = 0;
        touchTap.startTime = performance.now();
        touchTap.moved = false;
    }
    touchTap.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    touchTap.maxCount = Math.max(touchTap.maxCount, touchTap.pointers.size);
});

stage.addEventListener('pointermove', (e) => {
    const start = touchTap.pointers.get(e.pointerId);
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > TAP_MAX_MOVE) {
        touchTap.moved = true;
    }
});

function onTouchTapEnd(e) {
    if (!touchTap.pointers.delete(e.pointerId) || touchTap.pointers.size > 0) return;
    const quick = performance.now() - touchTap.startTime < TAP_MAX_MS;
    if (!quick || touchTap.moved || e.type === 'pointercancel') return;
    if (touchTap.maxCount === 2) undo();
    else if (touchTap.maxCount === 3) redo();
}

stage.addEventListener('pointerup', onTouchTapEnd);
stage.addEventListener('pointercancel', onTouchTapEnd);

// =====================================================================
// Text editing
// =====================================================================
//
// A transparent <textarea> is placed over the panel while typing, so the
// tablet keyboard, selection and IME work natively. Committing turns it
// into a 'text' object (or updates/removes the one being edited).

let textEdit = null; // { obj, panel, isNew, original }

// Everything about a text object that can change while it's being edited
const TEXT_EDIT_KEYS = ['text', 'color', 'size', 'font'];
const pickTextProps = (obj) => Object.fromEntries(TEXT_EDIT_KEYS.map((k) => [k, obj[k]]));

function hitTestText(x, y) {
    const pad = 10;
    const objects = currentPanel().objects;
    for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i];
        if (obj.type !== 'text') continue;
        const b = textBounds(obj);
        if (x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad) return obj;
    }
    return null;
}

function startTextEdit(x, y) {
    const hit = hitTestText(x, y);
    if (hit) {
        textEdit = { obj: hit, panel: currentPanel(), isNew: false, original: pickTextProps(hit) };
        textEditor.value = hit.text;
        render(); // Hide the committed copy while editing
    } else {
        const size = modeSizes().text;
        textEdit = {
            obj: {
                type: 'text',
                // Center the first line on the tap point
                x: round1(x), y: round1(y - (size * LINE_HEIGHT) / 2),
                text: '', color: settings.color, size, font: settings.font,
            },
            panel: currentPanel(),
            isNew: true,
        };
        textEditor.value = '';
    }
    textEditor.hidden = false;
    styleTextEditor();
    textEditor.focus({ preventScroll: true });
    textEditor.setSelectionRange(textEditor.value.length, textEditor.value.length);
}

function styleTextEditor() {
    const { obj } = textEdit;
    const s = view.scale;
    const lines = textEditor.value.split('\n');
    measureCtx.font = objFont(obj);
    const width = Math.max(...lines.map((l) => measureCtx.measureText(l).width));

    textEditor.style.left = obj.x * s + 'px';
    textEditor.style.top = obj.y * s + 'px';
    textEditor.style.font = `${obj.size * s}px/${LINE_HEIGHT} ${fontStack(obj.font)}`;
    textEditor.style.color = resolveColor(obj.color, currentTheme());
    // Extra width leaves room for the caret before the next measure
    textEditor.style.width = (width + obj.size * 0.75) * s + 'px';
    textEditor.style.height = lines.length * obj.size * LINE_HEIGHT * s + 'px';
}

// Returns true if a text box was open
function commitText() {
    if (!textEdit) return false;
    const { obj, panel, isNew, original } = textEdit;
    textEdit = null;
    const text = textEditor.value.replace(/\s+$/, '');
    textEditor.hidden = true;
    textEditor.blur();

    if (isNew) {
        if (text) {
            obj.text = text;
            panel.objects.push(obj);
            pushHistory({ type: 'add', panel, obj });
        }
    } else if (!text) {
        // Deleting: restore any color/size/font tweaks so undo brings back the original
        Object.assign(obj, original);
        const index = panel.objects.indexOf(obj);
        panel.objects.splice(index, 1);
        pushHistory({ type: 'remove', panel, obj, index });
    } else {
        obj.text = text;
        const after = pickTextProps(obj);
        if (TEXT_EDIT_KEYS.some((k) => after[k] !== original[k])) {
            pushHistory({ type: 'edit', panel, obj, before: original, after });
        }
    }
    // Re-render even with no change: the edited object was hidden while editing
    render();
    contentChanged();
    return true;
}

textEditor.addEventListener('input', styleTextEditor);
textEditor.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        commitText();
    }
});

// =====================================================================
// Panels, filmstrip & captions
// =====================================================================

const thumbCanvases = new Map(); // panel -> <canvas>

function thumbSize() {
    const h = THUMB_HEIGHT;
    return { w: Math.round((h * doc.width) / doc.height), h };
}

function drawThumb(panel) {
    const c = thumbCanvases.get(panel);
    if (!c) return;
    const { w, h } = thumbSize();
    const dpr = window.devicePixelRatio || 1;
    c.style.width = w + 'px';
    c.style.height = h + 'px';
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    const t = c.getContext('2d');
    const s = (w * dpr) / doc.width;
    t.setTransform(s, 0, 0, s, 0, 0);
    renderObjects(t, panel.objects, currentTheme());
}

const pendingThumbs = new Set();
let thumbTimer = null;

function scheduleThumb(panel) {
    pendingThumbs.add(panel);
    clearTimeout(thumbTimer);
    thumbTimer = setTimeout(() => {
        pendingThumbs.forEach(drawThumb);
        pendingThumbs.clear();
    }, 200);
}

function rebuildFilmstrip() {
    thumbCanvases.clear();
    thumbsEl.replaceChildren(...doc.panels.map((panel, i) => {
        const btn = document.createElement('button');
        btn.className = 'thumb';
        btn.setAttribute('aria-label', `Panel ${i + 1}`);
        btn.addEventListener('click', () => selectPanel(i));

        const c = document.createElement('canvas');
        const num = document.createElement('span');
        num.className = 'thumb-num';
        num.textContent = i + 1;
        btn.append(c, num);

        thumbCanvases.set(panel, c);
        drawThumb(panel);
        return btn;
    }));
    markCurrentThumb();
}

function markCurrentThumb() {
    [...thumbsEl.children].forEach((btn, i) => {
        btn.setAttribute('aria-current', String(i === currentPanelIndex));
    });
    const current = thumbsEl.children[currentPanelIndex];
    if (current) current.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

// Display a panel without touching history
function showPanel(index) {
    currentPanelIndex = clamp(index, 0, doc.panels.length - 1);
    render();
    loadCaptions();
    markCurrentThumb();
    updateButtons();
}

function selectPanel(index) {
    commitText();
    if (isDrawing() || index < 0 || index >= doc.panels.length) return;
    showPanel(index);
}

function insertPanel(panel, index) {
    commitText();
    if (isDrawing()) return;
    doc.panels.splice(index, 0, panel);
    pushHistory({ type: 'addPanel', panel, index });
    currentPanelIndex = index;
    rebuildFilmstrip();
    showPanel(index);
    scheduleSave();
}

function addPanel() {
    insertPanel(createPanel(), currentPanelIndex + 1);
}

function duplicatePanel() {
    commitText();
    insertPanel(structuredClone(currentPanel()), currentPanelIndex + 1);
}

function deletePanel() {
    commitText();
    if (isDrawing() || doc.panels.length === 1) return;
    const index = currentPanelIndex;
    const [panel] = doc.panels.splice(index, 1);
    // Re-point at a valid panel before pushHistory, which reads currentPanel()
    currentPanelIndex = Math.min(index, doc.panels.length - 1);
    pushHistory({ type: 'removePanel', panel, index });
    rebuildFilmstrip();
    showPanel(currentPanelIndex);
    scheduleSave();
    showToast(`Deleted panel ${index + 1} (undo to restore)`);
}

function movePanel(direction) {
    commitText();
    const from = currentPanelIndex;
    const to = from + direction;
    if (isDrawing() || to < 0 || to >= doc.panels.length) return;
    const panel = currentPanel();
    movePanelTo(panel, to);
    pushHistory({ type: 'movePanel', panel, from, to });
    currentPanelIndex = to;
    rebuildFilmstrip();
    showPanel(to);
    scheduleSave();
}

function clearPanel() {
    commitText();
    const panel = currentPanel();
    if (isDrawing() || panel.objects.length === 0) return;
    pushHistory({ type: 'clear', panel, objects: panel.objects });
    panel.objects = [];
    render();
    contentChanged();
}

function loadCaptions() {
    const { captions } = currentPanel();
    captionInputs.forEach((el) => { el.value = captions[el.dataset.caption] || ''; });
    panelBadge.textContent = currentPanelIndex + 1;
}

// Captions aren't in undo history; the text fields have their own native undo
captionInputs.forEach((el) => {
    el.addEventListener('input', () => {
        currentPanel().captions[el.dataset.caption] = el.value;
        scheduleSave();
    });
});

// --- Canvas size ---
const formatSize = (s) => `${s.w}×${s.h}`;

function setCanvasSize(w, h) {
    commitText();
    closePopovers();
    const size = { w, h };
    if (isDrawing() || !isValidCanvasSize(size)) return;
    // Non-destructive: drawings keep their panel-unit coordinates. Same aspect
    // ratio = identical on screen (export resolution changes); a different
    // ratio reframes, and anything outside the new frame comes back if you
    // switch back.
    doc.size = size;
    applyCanvasSize(doc);
    updateCanvasSizeUI();
    layout();
    rebuildFilmstrip();
    scheduleSave();
}

function updateCanvasSizeUI() {
    canvasSizeLabel.textContent = formatSize(doc.size);
    canvasSizeBtn.title = `Canvas size: ${formatSize(doc.size)}`;
    canvasSizePopover.querySelectorAll('[data-w]').forEach((item) => {
        const current = Number(item.dataset.w) === doc.size.w && Number(item.dataset.h) === doc.size.h;
        item.setAttribute('aria-pressed', String(current));
    });
}

function buildCanvasSizeMenu() {
    for (const { group, sizes } of CANVAS_SIZES) {
        const heading = document.createElement('div');
        heading.className = 'menu-heading';
        heading.textContent = group;
        canvasSizePopover.append(heading);
        for (const size of sizes) {
            const item = document.createElement('button');
            item.className = 'menu-item option-item size-item';
            item.dataset.w = size.w;
            item.dataset.h = size.h;
            const name = document.createElement('span');
            name.textContent = size.name;
            const dims = document.createElement('span');
            dims.className = 'menu-detail';
            dims.textContent = formatSize(size);
            item.append(name, dims);
            item.addEventListener('click', () => setCanvasSize(size.w, size.h));
            canvasSizePopover.append(item);
        }
    }
}

addPanelBtn.addEventListener('click', addPanel);
duplicatePanelBtn.addEventListener('click', duplicatePanel);
deletePanelBtn.addEventListener('click', deletePanel);
movePanelLeftBtn.addEventListener('click', () => movePanel(-1));
movePanelRightBtn.addEventListener('click', () => movePanel(1));

// =====================================================================
// Export
// =====================================================================

// Export colors per background. `paper` must match --paper in style.css so
// a dark export looks exactly like the board in dark mode; ink follows
// THEME_INK, other colors are unchanged (as on screen).
const EXPORT_THEMES = {
    light: { paper: '#ffffff', sheet: '#ffffff', title: '#111111', muted: '#6b7280', caption: '#333333', frame: '#222222' },
    dark:  { paper: '#232428', sheet: '#161719', title: '#f2f2f2', muted: '#9aa0a8', caption: '#d4d6da', frame: '#4a4c52' },
};

const exportSuffix = () => (settings.exportTheme === 'dark' ? '-dark' : '');

// Render a region of a page (panel units) into a w×h image on the export
// background. Exact output size, so exports hit the canvas size precisely
// even when panel units don't divide evenly into it.
function renderRegionImage(objects, region, w, h, theme = settings.exportTheme) {
    w = Math.max(1, Math.round(w));
    h = Math.max(1, Math.round(h));
    const sx = w / region.w;
    const sy = h / region.h;

    // Draw on a transparent layer first so erasers cut ink, not the paper
    const layer = document.createElement('canvas');
    layer.width = w;
    layer.height = h;
    const l = layer.getContext('2d');
    l.setTransform(sx, 0, 0, sy, -region.x * sx, -region.y * sy);
    renderObjects(l, objects, theme);

    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const o = out.getContext('2d');
    o.fillStyle = EXPORT_THEMES[theme].paper;
    o.fillRect(0, 0, w, h);
    o.drawImage(layer, 0, 0);
    return out;
}

function downloadCanvas(c, filename) {
    c.toBlob((blob) => {
        if (!blob) {
            showToast('Export failed: image too large for this device');
            return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        showToast(`Exported ${filename}`);
    }, 'image/png');
}

const pad2 = (n) => String(n).padStart(2, '0');

function localDateStamp() {
    const now = new Date(); // Local date, not UTC
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

// Defaults to the canvas size (export resolution)
function renderPanelImage(panel, w = doc.size.w, h = doc.size.h) {
    return renderRegionImage(panel.objects, { x: 0, y: 0, w: doc.width, h: doc.height }, w, h);
}

function exportCurrentPanel() {
    commitText();
    closePopovers();
    downloadCanvas(renderPanelImage(currentPanel()), `panel-${pad2(currentPanelIndex + 1)}${exportSuffix()}.png`);
}

// Bounding box of everything drawn (erase strokes only remove, so they don't count)
function contentBounds(objects) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const grow = (x0, y0, x1, y1) => {
        minX = Math.min(minX, x0);
        minY = Math.min(minY, y0);
        maxX = Math.max(maxX, x1);
        maxY = Math.max(maxY, y1);
    };
    for (const obj of objects) {
        if (obj.type === 'stroke' && obj.mode !== 'erase') {
            const r = obj.size / 2;
            for (let i = 0; i < obj.points.length; i += 3) {
                grow(obj.points[i] - r, obj.points[i + 1] - r, obj.points[i] + r, obj.points[i + 1] + r);
            }
        } else if (obj.type === 'line') {
            const r = obj.arrow ? Math.max(obj.size * 4, 20) : obj.size / 2;
            grow(Math.min(obj.x1, obj.x2) - r, Math.min(obj.y1, obj.y2) - r,
                Math.max(obj.x1, obj.x2) + r, Math.max(obj.y1, obj.y2) + r);
        } else if (obj.type === 'rect' || obj.type === 'ellipse') {
            const r = obj.size / 2;
            grow(obj.x - r, obj.y - r, obj.x + obj.w + r, obj.y + obj.h + r);
        } else if (obj.type === 'text') {
            const b = textBounds(obj);
            grow(b.x, b.y, b.x + b.w, b.y + b.h);
        }
    }
    return minX === Infinity ? null : { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// Whiteboard export: crop to the drawing plus a margin, at 2x for sharpness
function exportWhiteboard() {
    commitText();
    closePopovers();
    const bounds = contentBounds(whiteboardPage.objects);
    if (!bounds) {
        showToast('Nothing to export yet');
        return;
    }
    const margin = 40;
    const region = {
        x: bounds.x - margin, y: bounds.y - margin,
        w: bounds.w + margin * 2, h: bounds.h + margin * 2,
    };
    // Stay under mobile canvas limits (~16.7M pixels on iPad Safari)
    const scale = Math.min(2, Math.sqrt(16e6 / (region.w * region.h)));
    const image = renderRegionImage(whiteboardPage.objects, region, region.w * scale, region.h * scale);
    downloadCanvas(image, `whiteboard-${localDateStamp()}${exportSuffix()}.png`);
}

function wrapText(c, text, maxWidth) {
    const lines = [];
    for (const paragraph of text.split('\n')) {
        let line = '';
        for (const word of paragraph.split(/\s+/)) {
            const candidate = line ? line + ' ' + word : word;
            if (line && c.measureText(candidate).width > maxWidth) {
                lines.push(line);
                line = word;
            } else {
                line = candidate;
            }
        }
        lines.push(line);
    }
    return lines;
}

// All panels in a grid with numbers and captions, as one image
function exportStoryboardSheet() {
    commitText();
    closePopovers();

    const aspect = doc.width / doc.height;
    const cols = aspect >= 1.5 ? 3 : aspect >= 1 ? 4 : 5;
    const cellW = aspect >= 1 ? 520 : 360;
    const imgH = Math.round(cellW / aspect);
    const margin = 60;
    const gapX = 40;
    const gapY = 48;
    const headerH = 100;
    const numberH = 36;
    const captionFont = 20;
    const captionLH = 27;

    // Wrap captions first so each row can be sized to its tallest cell
    measureCtx.font = textFont(captionFont);
    const captionLines = doc.panels.map((panel) => CAPTION_FIELDS.flatMap(({ key, label }) => {
        const value = (panel.captions[key] || '').trim();
        return value ? wrapText(measureCtx, `${label}: ${value}`, cellW) : [];
    }));

    const rows = Math.ceil(doc.panels.length / cols);
    const rowHeights = [];
    for (let r = 0; r < rows; r++) {
        const lines = captionLines.slice(r * cols, (r + 1) * cols).map((l) => l.length);
        const captionH = Math.max(0, ...lines) * captionLH;
        rowHeights.push(numberH + imgH + (captionH ? 12 + captionH : 0));
    }

    const usedCols = Math.min(cols, doc.panels.length);
    const totalW = margin * 2 + usedCols * cellW + (usedCols - 1) * gapX;
    const totalH = margin * 2 + headerH + rowHeights.reduce((a, b) => a + b, 0) + (rows - 1) * gapY;

    // Stay under mobile canvas limits (~16.7M pixels on iPad Safari)
    const scale = Math.min(1, Math.sqrt(16e6 / (totalW * totalH)));
    const sheet = document.createElement('canvas');
    sheet.width = Math.round(totalW * scale);
    sheet.height = Math.round(totalH * scale);
    const s = sheet.getContext('2d');
    s.scale(scale, scale);

    const colors = EXPORT_THEMES[settings.exportTheme];
    s.fillStyle = colors.sheet;
    s.fillRect(0, 0, totalW, totalH);
    s.textBaseline = 'top';

    s.fillStyle = colors.title;
    s.font = `700 40px ${FONT_FAMILY}`;
    s.fillText('Storyboard', margin, margin);
    s.fillStyle = colors.muted;
    s.font = textFont(20);
    const count = doc.panels.length;
    s.fillText(`${count} panel${count === 1 ? '' : 's'} · ${formatSize(doc.size)} · ${new Date().toLocaleDateString()}`, margin, margin + 54);

    let y = margin + headerH;
    doc.panels.forEach((panel, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = margin + col * (cellW + gapX);

        s.fillStyle = colors.title;
        s.font = `700 22px ${FONT_FAMILY}`;
        s.fillText(String(i + 1), x, y + 4);

        const img = renderPanelImage(panel, cellW * scale, imgH * scale);
        s.drawImage(img, x, y + numberH, cellW, imgH);
        s.strokeStyle = colors.frame;
        s.lineWidth = 1.5;
        s.strokeRect(x, y + numberH, cellW, imgH);

        s.fillStyle = colors.caption;
        s.font = textFont(captionFont);
        captionLines[i].forEach((line, j) => {
            s.fillText(line, x, y + numberH + imgH + 12 + j * captionLH);
        });

        if (col === cols - 1 || i === count - 1) y += rowHeights[row] + gapY;
    });

    downloadCanvas(sheet, `storyboard-${localDateStamp()}${exportSuffix()}.png`);
}

function setExportTheme(theme) {
    if (!(theme in EXPORT_THEMES)) return;
    settings.exportTheme = theme;
    document.querySelectorAll('[data-export-theme]').forEach((btn) => {
        btn.setAttribute('aria-pressed', String(btn.dataset.exportTheme === theme));
    });
    saveSettings();
}

document.querySelectorAll('[data-export-theme]').forEach((btn) => {
    btn.addEventListener('click', () => setExportTheme(btn.dataset.exportTheme));
});
$('exportPanelBtn').addEventListener('click', exportCurrentPanel);
$('exportSheetBtn').addEventListener('click', exportStoryboardSheet);
$('exportBoardBtn').addEventListener('click', exportWhiteboard);

// =====================================================================
// Popovers
// =====================================================================

function closePopovers() {
    document.querySelectorAll('.popover').forEach((p) => { p.hidden = true; });
    document.querySelectorAll('[data-popover]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
}

function togglePopover(button) {
    const popover = $(button.dataset.popover);
    const wasOpen = !popover.hidden;
    closePopovers();
    if (wasOpen) return;

    popover.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    const r = button.getBoundingClientRect();
    const left = clamp(r.left + r.width / 2 - popover.offsetWidth / 2, 8, window.innerWidth - popover.offsetWidth - 8);
    popover.style.left = left + 'px';
    popover.style.top = r.bottom + 8 + 'px';
    // Long menus (canvas sizes) scroll instead of running off short screens
    popover.style.maxHeight = window.innerHeight - r.bottom - 16 + 'px';
}

document.querySelectorAll('[data-popover]').forEach((btn) => {
    btn.addEventListener('click', () => togglePopover(btn));
});

// Close when tapping anywhere outside a popover or its button
document.addEventListener('pointerdown', (e) => {
    if (!(e.target instanceof Element) || !e.target.closest('.popover, [data-popover]')) closePopovers();
});

// =====================================================================
// Toolbar
// =====================================================================

function setTool(tool) {
    if (tool !== settings.tool) commitText();
    settings.tool = tool;
    toolButtons.forEach((btn) => {
        btn.setAttribute('aria-pressed', String(btn.dataset.tool === tool));
    });

    const slot = sizeSlot(tool);
    const range = SIZE_RANGES[slot];
    sizeSlider.min = range.min;
    sizeSlider.max = range.max;
    sizeSlider.value = modeSizes()[slot];
    sizeValue.textContent = modeSizes()[slot];

    // Only show options that apply to this tool
    fillBtn.hidden = !TOOLS[tool].fillable;
    stabilizerBtn.hidden = !(tool === 'pen' || tool === 'eraser');
    fontGroup.hidden = tool !== 'text';

    canvas.dataset.tool = tool;
    if (tool !== 'eraser') hideEraserCursor();
    saveSettings();
}

function setSize(value) {
    const slot = sizeSlot();
    modeSizes()[slot] = clampSize(slot, value);
    sizeSlider.value = modeSizes()[slot];
    sizeValue.textContent = modeSizes()[slot];
    if (textEdit && slot === 'text') {
        textEdit.obj.size = modeSizes().text;
        styleTextEditor();
    }
    saveSettings();
}

function stepSize(direction) {
    const current = modeSizes()[sizeSlot()];
    const step = Math.max(1, Math.round(current * 0.15)); // Proportional steps
    setSize(current + direction * step);
}

function setColor(color) {
    if (!isValidColor(color)) return;
    settings.color = color;
    colorDot.style.setProperty('--dot', color === INK ? 'var(--text)' : color);
    const inPalette = PALETTE.some((p) => p.color === color);
    swatchesEl.querySelectorAll('.swatch').forEach((s) => {
        s.setAttribute('aria-pressed', String(s.dataset.color === color));
    });
    customSwatch.setAttribute('aria-pressed', String(!inPalette));
    if (!inPalette) customColor.value = color;
    // Recolor text that's being typed
    if (textEdit) {
        textEdit.obj.color = color;
        styleTextEditor();
    }
    saveSettings();
}

function setFill(on) {
    settings.fill = on;
    fillBtn.setAttribute('aria-pressed', String(on));
    saveSettings();
}

function setFont(font) {
    if (!(font in TEXT_FONTS)) return;
    settings.font = font;
    fontGroup.querySelectorAll('[data-font]').forEach((btn) => {
        btn.setAttribute('aria-pressed', String(btn.dataset.font === font));
    });
    // Restyle text that's being typed
    if (textEdit) {
        textEdit.obj.font = font;
        styleTextEditor();
    }
    saveSettings();
}

// Font buttons are labelled in their own font so they preview it
function buildFontButtons() {
    for (const [key, { label, name, stack }] of Object.entries(TEXT_FONTS)) {
        const btn = document.createElement('button');
        btn.className = 'seg-btn font-btn';
        btn.dataset.font = key;
        btn.style.fontFamily = stack;
        btn.title = name;
        btn.setAttribute('aria-label', name);
        // Full name on wide screens, "Aa" on narrow ones (see style.css)
        const full = document.createElement('span');
        full.className = 'font-label';
        full.textContent = label;
        const short = document.createElement('span');
        short.className = 'font-sample';
        short.textContent = 'Aa';
        btn.append(full, short);
        btn.addEventListener('click', () => setFont(key));
        fontGroup.append(btn);
    }
}

// on: boolean. level (optional): 'light' | 'medium' | 'heavy'; omitted keeps
// the last level, so toggling off and on again restores it.
function setStabilizer(on, level = settings.stabilizerLevel) {
    if (!(level in STABILIZER_LEVELS)) return;
    settings.stabilizer = on;
    settings.stabilizerLevel = level;

    const label = on ? STABILIZER_LEVELS[level].name : 'Off';
    stabilizerBtn.setAttribute('aria-pressed', String(on));
    stabilizerLevelLabel.textContent = label;
    stabilizerBtn.title = `Stabilizer: ${label} (S to toggle)`;
    stabilizerBtn.setAttribute('aria-label', `Stabilizer: ${label}`);
    stabilizerPopover.querySelectorAll('[data-level]').forEach((item) => {
        const current = on ? item.dataset.level === level : item.dataset.level === 'off';
        item.setAttribute('aria-pressed', String(current));
    });
    saveSettings();
}

function buildStabilizerMenu() {
    const options = [
        { key: 'off', name: 'Off', detail: 'Raw pen input' },
        ...Object.entries(STABILIZER_LEVELS).map(([key, l]) => ({ key, name: l.name, detail: l.detail })),
    ];
    for (const { key, name, detail } of options) {
        const item = document.createElement('button');
        item.className = 'menu-item option-item';
        item.dataset.level = key;
        const nameEl = document.createElement('span');
        nameEl.textContent = name;
        const detailEl = document.createElement('span');
        detailEl.className = 'menu-detail';
        detailEl.textContent = detail;
        item.append(nameEl, detailEl);
        item.addEventListener('click', () => {
            if (key === 'off') setStabilizer(false);
            else setStabilizer(true, key);
            closePopovers();
        });
        stabilizerPopover.append(item);
    }
}

// --- Mode: whiteboard <-> storyboard ---
// Each mode keeps its own page(s), undo history and tool sizes; tool,
// color, fill and stabilizer carry over.
function setMode(mode) {
    if (!MODES.includes(mode)) return;
    if (mode !== settings.mode) {
        commitText();
        if (isDrawing()) return;
    }
    closePopovers();
    settings.mode = mode;
    ({ undo: undoStack, redo: redoStack } = histories[mode]);

    // CSS hides storyboard-only UI (filmstrip, captions, canvas size) in whiteboard mode
    document.body.classList.toggle('mode-storyboard', mode === 'storyboard');
    modeButtons.forEach((btn) => {
        btn.setAttribute('aria-pressed', String(btn.dataset.mode === mode));
    });
    exportBtn.title = mode === 'storyboard' ? 'Export' : 'Export as PNG';

    setTool(settings.tool); // Refresh the size slider for this mode's sizes
    if (mode === 'storyboard') {
        rebuildFilmstrip();
        loadCaptions();
    }
    layout(); // Also re-renders the current page
    updateButtons();
    saveSettings();
}

modeButtons.forEach((btn) => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
});

function buildPalette() {
    for (const { color, name } of PALETTE) {
        const btn = document.createElement('button');
        btn.className = 'swatch';
        btn.dataset.color = color;
        btn.style.setProperty('--dot', color === INK ? 'var(--text)' : color);
        btn.setAttribute('aria-label', name);
        btn.title = name;
        btn.addEventListener('click', () => {
            setColor(color);
            closePopovers();
        });
        swatchesEl.append(btn);
    }
}

toolButtons.forEach((btn) => {
    btn.addEventListener('click', () => setTool(btn.dataset.tool));
});
customColor.addEventListener('input', () => setColor(customColor.value));
sizeSlider.addEventListener('input', () => setSize(Number(sizeSlider.value)));
fillBtn.addEventListener('click', () => setFill(!settings.fill));
// stabilizerBtn opens its level menu (data-popover); S toggles on/off
undoBtn.addEventListener('click', undo);
redoBtn.addEventListener('click', redo);
clearBtn.addEventListener('click', clearPanel); // Undoable, so no confirm prompt

// --- Theme (saved in localStorage; initial value applied in index.html) ---
function updateThemeButton() {
    const label = currentTheme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    themeBtn.setAttribute('aria-label', label);
    themeBtn.title = label;
}

themeBtn.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    storageSet(THEME_KEY, next);
    updateThemeButton();
    // Ink color depends on theme
    render();
    doc.panels.forEach(drawThumb);
    if (textEdit) styleTextEditor();
});

// --- Keyboard shortcuts ---
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePopovers();

    const target = e.target;
    if (target instanceof Element &&
        target.closest('textarea, select, input:not([type="range"]), [contenteditable]')) return;

    const key = e.key.toLowerCase();
    const mod = e.ctrlKey || e.metaKey;

    if (mod && key === 'z') {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
    } else if (mod && key === 'y') {
        e.preventDefault();
        redo();
    } else if (!mod && !e.altKey) {
        if (key in TOOL_KEYS) setTool(TOOL_KEYS[key]);
        else if (key === 's') setStabilizer(!settings.stabilizer);
        else if (key === 'f') setFill(!settings.fill);
        else if (key === '[') stepSize(-1);
        else if (key === ']') stepSize(1);
        else if (!isStoryboard()) return; // Panel shortcuts below are storyboard-only
        else if (key === 'n') addPanel();
        else if ((key === 'arrowleft' || key === 'arrowright') && target !== sizeSlider) {
            e.preventDefault();
            selectPanel(currentPanelIndex + (key === 'arrowleft' ? -1 : 1));
        }
    }
});

// =====================================================================
// Init
// =====================================================================

buildPalette();
setColor(settings.color);
setFill(settings.fill);
buildFontButtons();
setFont(settings.font);
setExportTheme(settings.exportTheme);
buildStabilizerMenu();
setStabilizer(settings.stabilizer);
buildCanvasSizeMenu();
updateCanvasSizeUI();
updateThemeButton();
setMode(settings.mode); // Also applies the tool, filmstrip/captions and layout
