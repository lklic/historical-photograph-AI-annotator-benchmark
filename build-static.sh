#!/bin/bash

# Create static directory structure
echo "Creating static directory structure..."
mkdir -p static/data

# Run analysis script to generate fresh data
echo "Running analysis script..."
python3 analysis_script.py

# Copy analysis data to static directory
echo "Copying analysis data..."
cp analysis.json static/data/

# Create temporary build directory
echo "Setting up build environment..."
rm -rf temp-build
mkdir -p temp-build/src
mkdir -p temp-build/public/data

# Create package.json for the build
cat > temp-build/package.json << 'EOL'
{
  "name": "model-analysis-viewer-static",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "vite build --config ../vite.static.config.js"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "recharts": "^2.12.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.1.0"
  }
}
EOL

# Create index.html
cat > temp-build/index.html << 'EOL'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Model Analysis Results</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="./src/main.jsx"></script>
</body>
</html>
EOL

# Create main.jsx
cat > temp-build/src/main.jsx << 'EOL'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
EOL

# Copy the static App component
cp App.static.jsx temp-build/src/App.jsx

# Copy analysis data to the build directory
cp analysis.json temp-build/public/data/

# Install dependencies and build
echo "Installing dependencies and building..."
cd temp-build
npm install
npm run build

# No need to copy files as they are already built directly to the static directory
echo "Build complete. Files are in the 'static' directory."

# Clean up
echo "Cleaning up..."
cd ..
rm -rf temp-build

echo "Static build complete! Files are in the 'static' directory."
echo "To deploy to GitHub Pages:"
echo "1. Create a GitHub repository"
echo "2. Push the contents of the 'static' directory to the repository"
echo "3. Enable GitHub Pages in the repository settings"
