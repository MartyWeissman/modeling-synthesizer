# Contributing to Modeling Synthesizer

This document covers development setup, project structure, and guidelines for contributors.

## Development Setup

### Prerequisites
- Node.js 22 (the version CI uses; 20 or later should work)
- npm

### Running Locally

```bash
# Clone the repository (SSH)
git clone git@github.com:MartyWeissman/modeling-synthesizer.git
cd modeling-synthesizer

# Install dependencies
npm install

# Start development server
npm run dev
```

The development server runs at `http://localhost:5173/modeling-synthesizer/`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production (first regenerates `public/sitemap.xml` from `src/data/tools.js`)
- `npm run preview` - Preview production build locally
- `npm test` - Run the unit tests (Vitest, in `tests/`)
- `npm run lint` - Run ESLint

There is no manual deploy script: pushing to `main` deploys (see below).

## Quick Git Workflow

```bash
# 1. Make your changes, then check what's modified
git status

# 2. Stage specific files (avoid git add -A)
git add src/tools/YourTool.jsx

# 3. Commit
git commit -m "Short description of changes"

# 4. Push to main (auto-deploys to GitHub Pages)
git push
```

Pushing to `main` triggers GitHub Actions to build and deploy to GitHub Pages automatically. No manual deploy step needed.

## Project Structure

```
modeling-synthesizer/
├── src/
│   ├── AppWithMenu.jsx    # App shell: menu, theme selector, open tool
│   ├── components/
│   │   ├── grid/          # Grid-based UI components (GridGraph, GridButton, ...)
│   │   ├── ui/            # ToolContainer, ToolMenu, HelpModal, ThemeProvider, Footer
│   │   └── dev/           # Development-only helpers (grid debug overlay)
│   ├── tools/             # Individual simulation tools (one component each)
│   ├── data/tools.js      # Tool registry: names, descriptions, categories, labs
│   ├── hooks/             # React hooks (useTheme, useAnimationLoop, ...)
│   ├── utils/             # Shared math and drawing helpers (ticks, canvas, stability, parser)
│   ├── themes/            # Theme definitions and textures
│   ├── contexts/          # React contexts (theme)
│   └── equations/         # MathML equation files
├── public/
│   └── help/              # Tool help documentation (Markdown)
├── tests/                 # Vitest unit tests (npm test)
├── scripts/               # Build scripts (sitemap generator)
├── docs/                  # Screenshots and developer guides
├── .github/workflows/     # GitHub Actions: build, test, deploy
└── CLAUDE.md              # AI assistant instructions for tool development
```

## Development Mode

The application has two modes:

### Student Mode (Default)
- Accessible at the main URL
- Shows only student-facing modeling tools

### Development Mode
- Accessible by adding `?dev=true` to the URL
- Shows all tools, including those with `visibility: "dev"`:
  - Component Test
  - Grid Label Test
  - Visual Tool Builder
  - Matrix & Vector Calculator (hidden from students for now)
- Development tools open only with `?dev=true` (or on the local
  `npm run dev` server); for students, `?tool=component-test` shows
  "Tool not found"
- Useful for testing new components

## Creating New Tools

See `CLAUDE.md` for detailed guidelines on creating new simulation tools, including:
- Grid system and component placement
- Architecture patterns (Canvas animation, Static visualization, Interactive simulation, Study aide)
- Theme integration
- Tool registration in `src/data/tools.js`

To register a tool, add an entry to `toolDefinitions` in `src/data/tools.js`,
loading the component lazily so it gets its own JS chunk:

```js
const MyTool = lazy(() => import("../tools/MyTool.jsx"));

"my-tool": {
  name: "My Tool",
  description: "One or two sentences for the menu card.",
  component: MyTool,
  categories: {
    topics: ["ecology"],      // one or more topic keys
    toolType: "simulation",   // exactly one
    labs: ["lab1", "lab4"],   // or `lab: "lab3"` for a single lab, or `lab: null`
  },
  visibility: "student",      // "student", "dev", or "both"
},
```

The menu, the sitemap and the lab/topic filters are all generated from this
registry. Keep `src/data/tools.js` free of JSX and `import.meta.env`: the
sitemap script imports it in Node.

## GitHub Pages Deployment

### Automatic Deployment
The project uses GitHub Actions (`.github/workflows/deploy.yml`, Node 22).
Every pull request and push runs `npm ci`, lint (not yet blocking), `npm test`
and `npm run build`. A push to `main` then deploys the build to GitHub Pages.

### Initial Setup (One-time)
1. Create repository on GitHub named `modeling-synthesizer`
2. Push code to the repository
3. Go to repository Settings > Pages
4. Under "Source", select "GitHub Actions"
5. Site will be available at `https://YOUR_USERNAME.github.io/modeling-synthesizer/`

## Tech Stack

- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling (compiled at build time)
- **math.js** - Equation parsing for the calculators
- **Vitest** - Unit tests
- **ESLint** - Code linting

## Code Style

- Use functional components with hooks
- Follow existing patterns in the codebase
- Use the grid system for consistent layouts
- Support both light and dark themes
- Test on multiple screen sizes

## Questions?

Open an issue on GitHub for bugs, feature requests, or questions.
