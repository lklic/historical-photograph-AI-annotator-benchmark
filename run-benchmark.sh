#!/bin/bash

# Clean up existing web directory
echo "Cleaning up..."
rm -rf web
mkdir -p web/src
mkdir -p web/public/data

# Create package.json
echo "Creating package.json..."
cat > web/package.json << 'EOL'
{
  "name": "model-analysis-viewer",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "build": "vite build",
    "serve": "vite preview"
  },
  "dependencies": {
    "express": "^4.18.2",
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

# Create vite.config.js
echo "Creating vite.config.js..."
cat > web/vite.config.js << 'EOL'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()]
})
EOL

# Create index.html
echo "Creating index.html..."
cat > web/index.html << 'EOL'
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
    <script type="module" src="/src/main.jsx"></script>
</body>
</html>
EOL

# Create main.jsx
echo "Creating main.jsx..."
cat > web/src/main.jsx << 'EOL'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
EOL

# Run analysis script
echo "Running analysis..."
python3 analysis_script.py

# Move analysis results and app file
echo "Moving files..."
mv analysis.json web/public/data/
cp App.jsx web/src/
cp server.js web/

# Install dependencies and start server
echo "Setting up and starting web server..."
cd web
npm install
npm start
