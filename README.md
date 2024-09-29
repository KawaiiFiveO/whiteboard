# Whiteboard Application

This is a simple whiteboard application built with **HTML**, **CSS**, and **JavaScript**. The app allows users to draw, erase, and adjust the stroke size dynamically. It supports pressure-sensitive drawing for tablets and has a responsive canvas that fits the entire screen.

## Features

- **Drawing and Erasing**: Switch between drawing and erasing modes.
- **Pressure Sensitivity**: If using a tablet, the stroke size adjusts dynamically based on the pressure applied.
- **Adjustable Stroke Size**: A slider allows the user to change the stroke size from 1px to 50px.
- **Clear Canvas**: A button to clear the entire canvas.
- **Responsive Canvas**: The canvas adjusts its size automatically to fit the window.

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

## How to Use

1. **Drawing**: 
   - Click the **Draw** button and use your mouse or tablet stylus to draw on the canvas.
   
2. **Erasing**: 
   - Click the **Erase** button to switch to eraser mode. You can erase parts of your drawing by dragging over it.

3. **Change Stroke Size**: 
   - Use the slider labeled **"Stroke Size"** to adjust the width of the stroke for drawing or erasing.

4. **Clear the Canvas**: 
   - Click the **Clear** button to remove all drawings and reset the canvas.

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