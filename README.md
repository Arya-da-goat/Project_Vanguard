# PROJECT VANGUARD — Operation: Blackout

A browser-based, Three.js first-person shooter with desktop and touch controls. It uses procedural 3D geometry, generated material textures, real raycast shooting, enemy AI states, collision checks, weapon switching, pickups, audio synthesis, and a mission objective chain.

## Run locally (VS Code)
1. Extract the ZIP.
2. Open the `Project_Vanguard` folder in VS Code.
3. Use the **Live Server** extension and click **Go Live** on `index.html`.
4. Keep an internet connection for the Three.js ES module and optional Google Fonts CDN. No API key or backend is needed.

Do not open `index.html` with `file://`; browsers generally block JavaScript module imports from local files.

## GitHub Pages
1. Create a GitHub repository.
2. Upload `index.html`, `style.css`, and `game.js` to the repository root.
3. Open **Settings → Pages**.
4. Select **Deploy from a branch**, choose `main` and `/ (root)`, then save.
5. Open the published Pages URL. The first load needs a network connection to retrieve Three.js from jsDelivr.

## Android
Open the hosted Pages URL in Chrome, rotate to landscape, and tap **DEPLOY**. Touch controls appear automatically on touch devices. The left pad moves; drag in the central-right view area to look; the right buttons fire, aim, jump, crouch, reload, and switch weapons. Audio starts after you deploy due to browser autoplay restrictions.

## Controls
- WASD: move; mouse: look; left mouse: fire; right mouse: aim.
- Shift: sprint; Space: jump; C: crouch; R: reload; 1–5: switch weapon; Esc: pause.
- Mission: eliminate the required hostiles, walk to the central uplink, then return to the southern extraction area.

## Implemented
- Three.js 3D scene, fog, directional/hemi lighting, tone mapping, material texture variation, optional shadows, cover props, buildings, industrial dressing.
- Five distinct weapon configurations, magazine/reserve ammo, reload timing, recoil, raycast damage, hit feedback and tracers.
- Enemy patrol/attack/search states, distance and line-of-sight checks against solid world geometry, four archetypes, enemy fire and health bars.
- Player movement, gravity/jump, crouch/sprint, wall collision, armor/health, pickups, mission progression, pause/restart/menu and difficulty choice.
- Synthesized Web Audio effects and ambient drone; volume and quality controls.
- Responsive HUD and touch controls.

## Known limitations
This is a compact, self-contained browser game rather than a studio-scale AAA production. Models and textures are procedurally generated; there is no imported motion-capture animation, full skeletal animation, true volumetric lighting, ray tracing, destructible building system, or learned AI. The map is an arena-style mission rather than a hand-authored campaign. Three.js is fetched from a CDN, so the initial load is not fully offline. Test on your target browser/GPU; the Low preset is intended for weaker devices.
