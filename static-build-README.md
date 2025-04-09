# Static Build for Model Analysis Viewer

This directory contains scripts and configuration files to create a static version of the Model Analysis Viewer for deployment to GitHub Pages.

## Files

- `vite.static.config.js` - Vite configuration for static builds
- `App.static.jsx` - Modified React component for static deployment
- `build-static.sh` - Script to generate the static build

## How to Build

1. Make sure you have Node.js and npm installed
2. Run the build script:

```bash
./build-static.sh
```

This will:
- Run the analysis script to generate fresh data
- Create a temporary build environment
- Build the React application with the static configuration
- Copy the built files to the `/static` directory

## How to Deploy to GitHub Pages

1. Create a new GitHub repository (or use an existing one)
2. Push the contents of the `/static` directory to the repository:

```bash
cd static
git init
git add .
git commit -m "Initial commit of static site"
git remote add origin https://github.com/yourusername/your-repo-name.git
git push -u origin main
```

3. Enable GitHub Pages in the repository settings:
   - Go to the repository on GitHub
   - Click on "Settings"
   - Scroll down to the "GitHub Pages" section
   - Select the branch you pushed to (e.g., `main`)
   - Click "Save"

4. Your site will be published at `https://yourusername.github.io/your-repo-name/`

## Notes

- This is a read-only version of the application
- All server-dependent features have been removed
- The application loads data directly from the static JSON file
- The image URLs still point to the original IIIF server
