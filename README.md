# Simple Whiteboard

A whiteboard for tablets with a pressure-sensitive pen (mouse and touch work too), with a storyboard mode. Plain HTML/CSS/JS, no build step: open `index.html`.

## Modes

Switch with the **Whiteboard | Storyboard** control at the left of the toolbar. Each mode keeps its own drawing, undo history and tool sizes.

- **Whiteboard** (default): a full-window board, e.g. for coding interviews. Export saves a PNG cropped to what you've drawn, on a light or dark background.
- **Storyboard:** one large panel at a time, plus:
  - a filmstrip to add, duplicate, reorder and delete panels
  - Action, Dialogue and Camera/notes captions for each panel
  - canvas sizes for different screens; the size sets the frame shape and the export resolution.
  - export the current panel as a PNG at the canvas size, or the whole board as a storyboard sheet with captions

## Drawing tools (both modes)

- **Pen:** pressure-sensitive, drawn as smooth curves with steadied pressure, with no lag. The stabilizer adds extra smoothing for steadier lines.
- **Eraser:** with a size-preview cursor. The pen's eraser end works too.
- **Shapes:** lines, arrows, rectangles and ellipses, with a live preview and optional fill. Shift snaps lines to 45° and makes squares/circles.
- **Text:** tap to place; tap existing text to edit it. Press Esc or Ctrl+Enter to finish.
- **Colors:** theme-adaptive ink, grays for tone, note colors, and a custom picker
- **Undo / redo:** covers drawing, text edits, Clear and panel changes
- **Palm rejection:** once a pen is used, touches stop drawing and become gestures
- **Autosave:** to browser localStorage
- **Light / dark mode:** the app theme and the export background are set separately. Choose Light or Dark in the Export menu; dark exports match the board in dark mode and get a `-dark` filename suffix.

## Shortcuts

| Input | Action |
|---|---|
| `P` / `B` | Pen |
| `E` | Eraser |
| `L` / `A` | Line / Arrow |
| `R` / `O` | Rectangle / Ellipse |
| `T` | Text |
| `F` | Toggle fill |
| `S` | Toggle stabilizer (keeps its level) |
| `[` / `]` | Smaller / larger |
| `Ctrl+Z`, two-finger tap | Undo |
| `Ctrl+Shift+Z` / `Ctrl+Y`, three-finger tap | Redo |
| `←` / `→` | Previous / next panel (storyboard) |
| `N` | New panel (storyboard) |

## License

This project is licensed under the Tumbolia License.
