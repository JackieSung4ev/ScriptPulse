# ScriptPulse

Estimate voice-over duration, frame counts, and subtitle rhythm for creator scripts.

ScriptPulse is a browser-only productivity tool for video creators. Paste a voice-over script, choose the video frame rate and speaking speed, then get an estimated duration, total frames, subtitle segmentation, and per-line timing table.

## Features

- Mixed Chinese and English estimation with weighted speech units for CJK characters, Latin words, and numbers.
- Pause-aware timing for comma-like punctuation, sentence endings, and line breaks.
- Frame count conversion for 24, 25, 30, 50, and 60 fps.
- Speaking speed presets for slow, normal, fast, and custom 120-520 units per minute.
- Subtitle timeline with timecodes, frame ranges, duration share bars, and rhythm labels.
- Copyable estimate summary and subtitle timeline.
- Local draft autosave with a clear action.
- Bilingual UI with browser-language detection and manual Chinese / English switching.
- GitHub Pages deployment configured for the `/ScriptPulse/` project path.

## Tech Stack

- React
- Vite
- TypeScript
- Tailwind CSS
- lucide-react
- Vitest
- oxlint
- GitHub Actions
- GitHub Pages

## Getting Started

```bash
npm install
npm run dev
```

The Vite dev server will print the local preview URL in the terminal.

## Quality Checks

```bash
npm test
npm run lint
npm run build
```

## Deployment

The project is configured as a GitHub Pages project site with Vite `base: "/ScriptPulse/"`.

Pushing to `main` runs `.github/workflows/deploy.yml`, which installs dependencies, runs tests, builds the production bundle, and publishes `dist` to GitHub Pages.

Expected deployment URL:

```text
https://<username>.github.io/ScriptPulse/
```

## Repository Description

Estimate voice-over duration, frame counts, and subtitle rhythm for creator scripts.

## License

MIT License. See [LICENSE](./LICENSE).
