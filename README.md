# Modeling Synthesizer

A React + Vite application with Tailwind CSS for styling and mathematical modeling tools.

## Development

To run the project locally:

```bash
npm install
npm run dev
```

## GitHub Pages Deployment

This project is configured for automatic deployment to GitHub Pages. Here's how to set it up:

### 1. Create a GitHub Repository

1. Go to [GitHub](https://github.com) and create a new repository named `modeling-synthesizer`
2. Make sure the repository is public (required for GitHub Pages on free accounts)

### 2. Initialize Git and Push to GitHub

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit"

# Add remote origin (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/modeling-synthesizer.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 3. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on "Settings" tab
3. Scroll down to "Pages" in the left sidebar
4. Under "Source", select "GitHub Actions"
5. The workflow will automatically deploy your site when you push to the main branch

### 4. Install Dependencies (if not already done)

```bash
npm install
```

### 5. Manual Deployment (Alternative)

If you prefer to deploy manually:

```bash
npm run deploy
```

This will build the project and deploy it to the `gh-pages` branch.

### 6. Access Your Site

After deployment, your site will be available at:
`https://YOUR_USERNAME.github.io/modeling-synthesizer/`

## Project Structure

- `src/` - Source code
- `public/` - Public assets
- `dist/` - Built files (generated)
- `.github/workflows/` - GitHub Actions workflow for automatic deployment

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run deploy` - Deploy to GitHub Pages (manual)

## Tech Stack

- React 19
- Vite
- Tailwind CSS
- ESLint
