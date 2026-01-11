# Contributing to Modeling Synthesizer

This document covers development setup, project structure, and guidelines for contributors.

## Development Setup

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

### Running Locally

```bash
# Clone the repository
git clone https://github.com/MartyWeissman/modeling-synthesizer.git
cd modeling-synthesizer

# Install dependencies
npm install

# Start development server
npm run dev
```

The development server runs at `http://localhost:5173/modeling-synthesizer/`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm run deploy` - Manual deploy to GitHub Pages

## Project Structure

```
modeling-synthesizer/
├── src/
│   ├── components/
│   │   ├── grid/          # Grid-based UI components
│   │   └── ui/            # General UI components
│   ├── tools/             # Individual simulation tools
│   ├── data/              # Tool definitions and metadata
│   ├── hooks/             # React hooks (useTheme, etc.)
│   ├── themes/            # Theme definitions
│   └── equations/         # MathML equation files
├── public/
│   └── help/              # Tool help documentation (Markdown)
├── .github/workflows/     # GitHub Actions for deployment
└── CLAUDE.md              # AI assistant instructions for tool development
```

## Development Mode

The application has two modes:

### Student Mode (Default)
- Accessible at the main URL
- Shows only student-facing modeling tools

### Development Mode
- Accessible by adding `?dev=true` to the URL
- Shows all tools including development utilities:
  - Component Test Tool
  - GridLabel Test
  - Visual Tool Builder
- Useful for testing new components

## Creating New Tools

See `CLAUDE.md` for detailed guidelines on creating new simulation tools, including:
- Grid system and component placement
- Architecture patterns (Canvas animation, Static visualization, Interactive simulation)
- Theme integration
- Tool registration in `src/data/tools.js`

## GitHub Pages Deployment

### Automatic Deployment
The project uses GitHub Actions for automatic deployment. Any push to the `main` branch triggers a build and deploy to GitHub Pages.

### Initial Setup (One-time)
1. Create repository on GitHub named `modeling-synthesizer`
2. Push code to the repository
3. Go to repository Settings > Pages
4. Under "Source", select "GitHub Actions"
5. Site will be available at `https://YOUR_USERNAME.github.io/modeling-synthesizer/`

### Manual Deployment
```bash
npm run deploy
```

## Tech Stack

- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **ESLint** - Code linting

## Code Style

- Use functional components with hooks
- Follow existing patterns in the codebase
- Use the grid system for consistent layouts
- Support both light and dark themes
- Test on multiple screen sizes

## Questions?

Open an issue on GitHub for bugs, feature requests, or questions.
