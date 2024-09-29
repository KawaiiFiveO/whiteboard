// Getting references to DOM elements
const canvas = document.getElementById('whiteboard');
const ctx = canvas.getContext('2d');
const drawBtn = document.getElementById('drawBtn');
const eraseBtn = document.getElementById('eraseBtn');
const clearBtn = document.getElementById('clearBtn');
const strokeSizeSlider = document.getElementById('strokeSize');
const strokeSizeValue = document.getElementById('strokeSizeValue');
const stabilizerCheckbox = document.getElementById('stabilizerCheckbox');

// Set canvas size to full window size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight - 50; // Adjusting for toolbar height

// Default settings
let isErasing = false;
let baseDrawLineWidth = parseInt(strokeSizeSlider.value); // Base drawing line width from slider
let baseEraseLineWidth = 100; // Base erasing line width
let strokeStyle = '#000000';

// Keep track of active pointers (for multi-touch support)
const activePointers = {}; // Each pointerId will have its own state

// Update stroke size text display
strokeSizeValue.textContent = baseDrawLineWidth;

// Event listeners for pointer (better for tablet and multi-touch support)
canvas.addEventListener('pointerdown', startDrawing);
canvas.addEventListener('pointermove', draw);
canvas.addEventListener('pointerup', stopDrawing);
canvas.addEventListener('pointercancel', stopDrawing);
canvas.addEventListener('pointerout', stopDrawing);

// Event listener for stroke size slider
strokeSizeSlider.addEventListener('input', function () {
    baseDrawLineWidth = parseInt(this.value); // Update base drawing line width
    strokeSizeValue.textContent = this.value; // Update the displayed stroke size
});

function startDrawing(e) {
    // Prevents unwanted interactions like scrolling
    e.preventDefault();

    const pointerId = e.pointerId; // Get the unique pointerId for this touch event
    const { x, y } = getCanvasCoordinates(e);

    // Initialize drawing state for this pointer
    activePointers[pointerId] = {
        drawing: true,
        lastX: x,
        lastY: y,
        points: [{ x, y }] // Store points for potential smoothing
    };
}

function draw(e) {
    const pointerId = e.pointerId; // Get the unique pointerId for this touch event

    if (!activePointers[pointerId] || !activePointers[pointerId].drawing) return; // Check if this pointer is drawing

    const { x: currentX, y: currentY } = getCanvasCoordinates(e);
    const pressure = e.pressure || 0.5; // Default to 0.5 if no pressure is available
    const lineWidth = isErasing ? baseEraseLineWidth * pressure : baseDrawLineWidth * pressure;
    const color = isErasing ? '#ffffff' : strokeStyle;

    // Add the current point to the points array
    activePointers[pointerId].points.push({ x: currentX, y: currentY });

    if (stabilizerCheckbox.checked) {
        // Stabilizer ON: Draw smooth lines using quadratic curves
        if (activePointers[pointerId].points.length > 2) {
            const [prevPoint, curPoint] = [
                activePointers[pointerId].points[activePointers[pointerId].points.length - 2],
                activePointers[pointerId].points[activePointers[pointerId].points.length - 1]
            ];
            const midPoint = {
                x: (prevPoint.x + curPoint.x) / 2,
                y: (prevPoint.y + curPoint.y) / 2
            };

            ctx.beginPath();
            ctx.moveTo(activePointers[pointerId].lastX, activePointers[pointerId].lastY);
            ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, midPoint.x, midPoint.y);
            ctx.lineWidth = lineWidth;
            ctx.strokeStyle = color;
            ctx.lineCap = 'round';
            ctx.stroke();
            ctx.closePath();

            activePointers[pointerId].lastX = midPoint.x;
            activePointers[pointerId].lastY = midPoint.y;
        }
    } else {
        // Stabilizer OFF: Draw normal lines
        ctx.beginPath();
        ctx.moveTo(activePointers[pointerId].lastX, activePointers[pointerId].lastY);
        ctx.lineTo(currentX, currentY);
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = color;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.closePath();

        activePointers[pointerId].lastX = currentX;
        activePointers[pointerId].lastY = currentY;
    }
}

function stopDrawing(e) {
    const pointerId = e.pointerId; // Get the unique pointerId for this touch event

    if (activePointers[pointerId]) {
        activePointers[pointerId].drawing = false; // Stop drawing for this pointer
        activePointers[pointerId].points = []; // Clear points
    }
}

// Get the mouse or stylus coordinates relative to the canvas
function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect(); // Get canvas bounds
    return {
        x: e.clientX - rect.left, // Adjust X relative to canvas
        y: e.clientY - rect.top   // Adjust Y relative to canvas
    };
}

// Button to enable drawing mode
drawBtn.addEventListener('click', () => {
    isErasing = false;
    strokeStyle = '#000000'; // Default drawing color
});

// Button to enable erasing mode
eraseBtn.addEventListener('click', () => {
    isErasing = true;
});

// Button to clear the canvas
clearBtn.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// Handle window resize
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 50;
});
