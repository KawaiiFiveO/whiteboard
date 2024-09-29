# Whiteboard Application

This is a simple whiteboard application built using HTML, CSS, and JavaScript. It allows users to draw, erase, and clear the canvas using mouse, touch, or stylus input. The app is designed to work on both desktop and mobile devices with multi-touch support and includes features like a drawing stabilizer and adjustable stroke size.

## Features

- **Drawing and Erasing**: 
  - Switch between drawing and erasing modes using toolbar buttons.
  - Use a stylus, mouse, or touch input to interact with the canvas.

- **Stroke Size Control**: 
  - Adjust the stroke size using a slider in the toolbar. 
  - The size of the stroke can also dynamically change based on the pressure of a stylus if supported.

- **Drawing Stabilizer**: 
  - A stabilizer feature smooths out strokes when enabled. 
  - This can be toggled on or off using a checkbox in the toolbar.

- **Multi-Touch Support**: 
  - The application supports drawing with multiple touch points simultaneously.
  - You can use multiple fingers or styluses without interference between touches.

- **Mobile-Friendly Display**: 
  - The toolbar layout adjusts automatically for mobile devices, stacking vertically to ensure proper display.
  - The canvas adapts to the screen size for an optimal experience on phones and tablets.

- **Clear Canvas**: 
  - Clear the entire canvas using the "Clear" button in the toolbar.

## Demo

You can try the whiteboard by opening the `index.html` file in any modern browser.

## Installation

To run the whiteboard app locally, follow these steps:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/whiteboard-app.git
   cd whiteboard-app
   ```

2. **Open the app**:
   - Simply open `index.html` in your browser.

No additional libraries or frameworks are required.

## Usage

1. **Drawing**: 
   - Click the "Draw" button to activate drawing mode.
   - Adjust the stroke size using the slider.
   - Use a mouse, touch, or stylus to draw on the canvas.

2. **Erasing**: 
   - Click the "Erase" button to activate erasing mode.
   - The eraser size is fixed, but its effectiveness can vary with stylus pressure.

3. **Stroke Size Slider**: 
   - Drag the slider to adjust the stroke size in drawing mode. 
   - The current size is displayed next to the slider.

4. **Stabilizer**: 
   - Check or uncheck the "Stabilizer" option to toggle smooth strokes.
   - When enabled, drawing with a smoother curve is applied to your strokes, which can be useful for freehand drawing.

5. **Clear**: 
   - Click the "Clear" button to erase everything on the canvas.

## File Structure

```
whiteboard-app/
│
├── index.html         # The main HTML file that defines the structure of the app
├── style.css          # The CSS file for styling the whiteboard and toolbar
└── script.js          # The JavaScript file that contains the logic for drawing, erasing, and handling UI events
```

## Technologies Used

- **HTML5 Canvas**: Used to create the drawing surface.
- **CSS**: For styling the toolbar and canvas.
- **JavaScript**: Handles the drawing, erasing, and UI interactions.

## Future Enhancements

Here are some potential features to be added in the future:

- **Color Picker**: Allow users to choose different colors for drawing.
- **Undo/Redo Functionality**: Add undo and redo options for better control over the drawing process.
- **Save as Image**: Allow users to save their drawings as an image file.

## License

This project is licensed under the Tumbolia License.

---

### This entire project, including the README.md, was created by ChatGPT-4o.