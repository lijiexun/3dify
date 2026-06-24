# 3Dify

3Dify is a browser-based 3D photo window. Upload a photo, then move your mouse or enable eye tracking to view it with subtle 2.5D parallax.

## Features

- Upload JPG, PNG, or WebP images
- Try bundled demo photos
- Browser-based 2.5D rendering with Three.js
- AI depth estimation with a smooth fallback depth map
- Mouse parallax, manual controls, and optional eye tracking
- Adjustable depth, view shift, and zoom
- No API keys or paid services

## Tech Stack

- React
- TypeScript
- Vite
- Three.js
- Transformers.js
- MediaPipe Tasks Vision

## Getting Started

```bash
npm install
npm run dev
```

Then open the local URL shown by Vite.

## Build

```bash
npm run build
```

To preview the production build:

```bash
npm run preview
```

## Notes

3Dify runs in the browser. Uploaded photos are processed locally for display, and webcam access is only requested when eye tracking is enabled.

Demo photos:

- [Person holding grapes](https://unsplash.com/photos/person-holding-grapes-vGQ49l9I4EE)
- [Cityscape during daytime](https://unsplash.com/photos/cityscape-during-daytime-IA8FR0RyJDE)
