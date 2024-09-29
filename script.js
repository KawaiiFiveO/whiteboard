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
let drawing = false;
let isErasing = false;
let baseDrawLineWidth = parseInt(strokeSizeSlider.value); // Base drawing line width from slider
let baseEraseLineWidth = 100; // Base erasing line width
let strokeStyle = '#000000';
let lastX = 0;
let lastY = 0;
let points = []; // For storing points for smoothing

// Update stroke size text display
strokeSizeValue.textContent = baseDrawLineWidth;

// Event listeners for pointer (better for tablet support)
canvas.addEventListener('pointerdown', startDrawing);
canvas.addEventListener('pointermove', draw);
canvas.addEventListener('pointerup', stopDrawing);
canvas.addEventListener('pointerout', stopDrawing);

// Event listener for stroke size slider
strokeSizeSlider.addEventListener('input', function () {
    baseDrawLineWidth = parseInt(this.value); // Update base drawing line width
    strokeSizeValue.textContent = this.value; // Update the displayed stroke size
});

function startDrawing(e) {
    drawing = true;
    points = []; // Reset points for smoothing
    [lastX, lastY] = [e.clientX, e.clientY - 50]; // Adjust for toolbar height
    points.push({ x: lastX, y: lastY }); // Start tracking points
}

function draw(e) {
    if (!drawing) return;

    const pressure = e.pressure || 0.5; // Default to 0.5 if no pressure is available
    const lineWidth = isErasing ? baseEraseLineWidth * pressure : baseDrawLineWidth * pressure;
    const color = isErasing ? '#ffffff' : strokeStyle;
    
    // Add current point to the points array for smoothing
    let currentX = e.clientX;
    let currentY = e.clientY - 50; // Adjust for toolbar height
    points.push({ x: currentX, y: currentY });

    if (stabilizerCheckbox.checked) {
        // Stabilizer ON: Draw smooth lines using quadratic curves
        if (points.length > 2) {
            // Use the last two points and the current one for smoothing
            const [prevPoint, curPoint] = [points[points.length - 2], points[points.length - 1]];
            const midPoint = { x: (prevPoint.x + curPoint.x) / 2, y: (prevPoint.y + curPoint.y) / 2 };

            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, midPoint.x, midPoint.y);
            ctx.lineWidth = lineWidth;
            ctx.strokeStyle = color;
            ctx.lineCap = 'round';
            ctx.stroke();
            ctx.closePath();

            [lastX, lastY] = [midPoint.x, midPoint.y];
        }
    } else {
        // Stabilizer OFF: Draw normal lines
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(currentX, currentY);
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = color;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.closePath();

        [lastX, lastY] = [currentX, currentY];
    }
}

function stopDrawing() {
    drawing = false;
    points = []; // Reset points
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
