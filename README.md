# 3Dify

3Dify turns a flat photo into a subtle 3D photo window. Upload an image, then move your mouse or use optional webcam-based eye tracking to shift the viewpoint and create a 2.5D parallax illusion.

## Features

- Photo upload with client-side display compression for large images.
- Three.js 2.5D photo viewer with mouse parallax.
- AI depth estimation using Transformers.js with a smooth fallback depth map.
- Adjustable Depth, View shift, and Zoom controls.
- Optional Manual controls using OrbitControls.
- Optional Eye tracking with MediaPipe Face Landmarker.
- No paid APIs and no API keys.

## Tech Stack

- Vite
- React
- TypeScript
- Three.js
- MediaPipe Tasks Vision
- Transformers.js

## Run Locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite, usually:

```text
http://127.0.0.1:5173/
```

## Build

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Notes

- The app runs in the browser and does not require API keys.
- AI depth model files are loaded by Transformers.js in the browser.
- Webcam/eye tracking asks for camera permission only when enabled.
- Camera access works on `localhost` during development. On phones or deployed sites, browsers usually require HTTPS for webcam access.
- Uploaded images are processed locally for display; no upload server is included.

## Publishing To GitHub

This folder is ready to publish as a source repo. Generated folders such as `node_modules/` and `dist/` are ignored by `.gitignore`.

If this folder is not already a git repository:

```bash
git init
git add .
git commit -m "Initial 3Dify app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Replace `YOUR_USERNAME/YOUR_REPO` with your GitHub repository path.
