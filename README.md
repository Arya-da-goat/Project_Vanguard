# PROJECT VANGUARD — Arena Protocol

A browser-based, Three.js FPS prototype upgraded around free-for-all last-person-standing deathmatch. The project uses a **flat root directory**: all source files are directly in this directory and no project subdirectories are required.

## Files
- `index.html` — menus, HUD, armory, and game screens
- `style.css` — responsive tactical UI and touch controls
- `game.js` — game loop, player controls, combat, bots, and deathmatch lifecycle
- `arena.js` — procedural Blacksite arena, lighting, and collision bounds
- `weapon-models.js` — procedural first-person and bot weapon models
- `config.js` — weapon tuning and defaults
- `audio.js` — synthesized Web Audio sound effects
- `ui.js` — HUD, kill feed, results, and scoreboard

## Run locally
Three.js is imported from jsDelivr, so an internet connection is required. Because JavaScript ES modules are used, serve the files over HTTP instead of opening `index.html` directly.

**VS Code + Live Server**
1. Extract the ZIP.
2. Open the extracted folder in VS Code.
3. Install the `Live Server` extension if needed.
4. Right-click `index.html` and choose **Open with Live Server**.

Any static server works. Do not move files into subfolders; imports expect the flat root layout.

## Controls
- `W A S D` — move
- Mouse — aim
- Left mouse — fire (hold for automatic weapons)
- Right mouse — aim/steady view
- `Space` — jump
- `Shift` — sprint
- `R` — reload
- `1`–`5` — switch weapon
- `Tab` or the scoreboard button — scoreboard
- `Esc` — pause/resume

On touch devices, use the left virtual joystick, right look area, and on-screen buttons.

## Game mode
Free-for-all, one life per operator. Eliminate the seven AI opponents and be the last operator standing. No mission objectives or extraction sequences.

## GitHub Pages
Upload all files in this directory directly to the repository root. In GitHub, open **Settings → Pages**, choose the deployment branch and `/ (root)`, then save. The Three.js module is CDN-hosted, so internet access is needed.

## Notes
This is a procedural browser-game build, not a commercial AAA asset pack. Character and weapon models are generated from geometry, and sounds are synthesized. The game has not been validated across every browser/device combination; treat it as a playable prototype and report any console errors or control issues for further fixes.
