import express from 'express';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));

async function createServer() {
  const app = express();
  
  // Parse JSON request body
  app.use(express.json());
  
  // Log all requests
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
  
  // Add a route to check if the server is running
  app.get('/api/health', async (req, res) => {
    try {
      // Check if ground_truth directory exists
      const groundTruthDir = resolve(__dirname, '..', 'ground_truth/output');
      try {
        await fs.access(groundTruthDir);
        console.log(`Ground truth directory exists: ${groundTruthDir}`);
        
        // List files in the directory
        const files = await fs.readdir(groundTruthDir);
        console.log(`Files in ground truth directory: ${files.join(', ')}`);
        
        res.json({ 
          status: 'ok',
          groundTruthDir,
          files
        });
      } catch (error) {
        console.error(`Error accessing ground truth directory: ${error.message}`);
        res.json({ 
          status: 'error',
          error: `Error accessing ground truth directory: ${error.message}`,
          groundTruthDir
        });
      }
    } catch (error) {
      console.error(`Health check error: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Add a test endpoint to check if the API is working
  app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working' });
  });
  
  // API endpoint to update ground truth
  app.post('/api/update-ground-truth', async (req, res) => {
    console.log('Received update request');
    console.log('Current directory:', __dirname);
    
    try {
      const { updates, validate } = req.body;
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      // Check if updates is empty
      if (!updates || Object.keys(updates).length === 0) {
        console.error('No updates provided');
        return res.status(400).json({ error: 'No updates provided' });
      }
      
      // Process each image's updates
      for (const [imageId, fieldUpdates] of Object.entries(updates)) {
        console.log(`Processing updates for image ${imageId}`);
        
        // Read the ground truth file
        // Since we're running from the web directory, we need to go up one level
        const groundTruthPath = resolve(__dirname, '..', 'ground_truth/output', `${imageId}.json`);
        console.log(`Reading ground truth file: ${groundTruthPath}`);
        
        // Check if the file exists
        try {
          await fs.access(groundTruthPath);
        } catch (error) {
          console.error(`Ground truth file does not exist: ${groundTruthPath}`);
          return res.status(404).json({ error: `Ground truth file not found: ${imageId}.json` });
        }
        
        let groundTruthData;
        try {
          const fileContent = await fs.readFile(groundTruthPath, 'utf-8');
          groundTruthData = JSON.parse(fileContent);
        } catch (error) {
          console.error(`Error reading ground truth file: ${error.message}`);
          return res.status(500).json({ error: `Error reading ground truth file: ${error.message}` });
        }
        
        // Apply updates
        for (const [fieldPath, newValue] of Object.entries(fieldUpdates)) {
          console.log(`Updating field: ${fieldPath} with value: ${newValue}`);
          
          // Process the new value - handle empty strings and null values
          let processedValue = newValue;
          if (newValue === 'null' || newValue === '') {
            processedValue = null;
          }
          
          // Handle field paths with array indices
          if (fieldPath.includes('[') && fieldPath.includes(']')) {
            // Extract the array path and index
            const match = fieldPath.match(/(.*)\[(\d+)\]$/);
            if (match) {
              const arrayPath = match[1];
              const index = parseInt(match[2]);
              
              console.log(`Array path: ${arrayPath}, index: ${index}`);
              
              // Navigate to the array
              const pathParts = arrayPath.split('.');
              let current = groundTruthData;
              
              for (let i = 0; i < pathParts.length; i++) {
                const part = pathParts[i];
                if (!(part in current)) {
                  current[part] = i === pathParts.length - 1 ? [] : {};
                }
                current = current[part];
              }
              
              // Ensure the array exists and has enough elements
              if (!Array.isArray(current)) {
                current = [];
              }
              
              while (current.length <= index) {
                current.push('');
              }
              
              // Update the value
              current[index] = processedValue;
            }
          } else {
            // Handle regular nested paths
            const pathParts = fieldPath.split('.');
            let current = groundTruthData;
            
            for (let i = 0; i < pathParts.length - 1; i++) {
              const part = pathParts[i];
              if (!(part in current)) {
                current[part] = {};
              }
              current = current[part];
            }
            
            // Update the value
            current[pathParts[pathParts.length - 1]] = processedValue;
          }
        }
        
        // Validate the updated ground truth if required
        if (validate) {
          console.log('Validating updated ground truth');
          try {
            // Simple validation: ensure it's valid JSON
            JSON.stringify(groundTruthData);
            
            // Additional validation could be added here
          } catch (error) {
            console.error(`Validation error: ${error.message}`);
            return res.status(400).json({ error: `Validation error: ${error.message}` });
          }
        }
        
        // Write updated ground truth back to file
        try {
          await fs.writeFile(groundTruthPath, JSON.stringify(groundTruthData, null, 2));
          console.log(`Updated ground truth file saved: ${groundTruthPath}`);
        } catch (error) {
          console.error(`Error writing ground truth file: ${error.message}`);
          return res.status(500).json({ error: `Error writing ground truth file: ${error.message}` });
        }
      }
      
      // Regenerate analysis.json
      console.log('Regenerating analysis.json');
      try {
        // Run the analysis script from the parent directory
        console.log('Executing analysis script...');
        const { stdout, stderr } = await execAsync('cd .. && python3 analysis_script.py');
        console.log('Analysis script executed successfully');
        console.log('stdout:', stdout);
        if (stderr) console.error('stderr:', stderr);
        
        // Copy the new analysis.json to the public directory
        try {
          await fs.copyFile(
            resolve(__dirname, '..', 'analysis.json'),
            resolve(__dirname, 'public/data/analysis.json')
          );
          console.log('Analysis.json copied to public directory');
        } catch (copyError) {
          console.error(`Error copying analysis.json: ${copyError.message}`);
          // Continue execution even if copy fails
        }
      } catch (error) {
        console.error(`Error regenerating analysis.json: ${error.message}`);
        if (error.stdout) console.log('stdout:', error.stdout);
        if (error.stderr) console.error('stderr:', error.stderr);
        return res.status(500).json({ error: `Error regenerating analysis.json: ${error.message}` });
      }
      
      // Always return a valid JSON response
      console.log('Sending success response');
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error updating ground truth:', error);
      return res.status(500).json({ error: error.message || 'Unknown server error' });
    }
  });
  
  // Serve static files from public directory
  app.use(express.static('public'));
  
  // Create Vite server in middleware mode and use it as the last middleware
  // This ensures that API routes are handled first
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });
  
  // Use vite's connect instance as middleware
  app.use(vite.middlewares);
  
  // Start server
  const port = 3000;
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

createServer().catch(console.error);
