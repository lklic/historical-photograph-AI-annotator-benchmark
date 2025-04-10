# Historical Photograph annotation extraction model benchmark

## [Preview of results](https://lklic.github.io/historical-photograph-AI-annotator-benchmark/static/)


This project provides a framework for evaluating different AI models' performance in analyzing automated transcriptions from historical art photographs. It includes tools for processing images, comparing model outputs, and visualizing results through an interactive web interface.

Repository: [historical-photograph-AI-annotator-benchmark](https://github.com/lklic/historical-photograph-AI-annotator-benchmark)

## Project Overview

The system analyzes photographs of pre-1700 artworks, processing both front and back images to extract detailed metadata including:
- Artwork details (title, artist, date, inscriptions)
- Repository information
- Dimensions
- Material information
- Historical data (exhibitions, provenance, literature)
- Photographer details

The benchmark compares different AI models including:
- gpt-4o
- gpt-4o-mini
- o1
- Claude 3.5 Sonnet

## Prerequisites

- Python 3.8+
- Node.js 18+
- npm
- API keys for:
  - OpenAI (for GPT-4 Vision models)
  - Anthropic (for Claude)

## Installation

1. Clone the repository:
```bash
git clone git@github.com:lklic/historical-photograph-AI-annotator-benchmark.git
cd historical-photograph-AI-annotator-benchmark
```

2. Create and set up API key files:
```bash
# For OpenAI API key
echo "your-openai-key" > key.secret

# For Anthropic API key
echo "your-anthropic-key" > claudekey.secret
```

3. Install Python dependencies:
```bash
pip install anthropic openai httpx
```

## Project Structure

```
.
├── analysis_script.py      # Main analysis script
├── process_images.py       # Image processing script
├── prompt.txt              # Prompt template for models
├── test-images.md         # List of test image IDs
├── App.jsx               # React frontend application
├── package.json          # Node.js dependencies
├── vite.config.js        # Vite configuration
└── run-benchmark.sh      # Benchmark runner script
```

## Usage

The workflow consists of three main steps:

1. Generate ground truth files:
```bash
python produce_ground_truth.py
```
This will create ground truth annotations for the test images using Claude 3.5 Sonnet.

2. Process images with different models:
```bash
python process_images.py benchmark prompt.txt
```
This will process all images in test-images.md with each configured model.

3. Run the benchmark and start the visualization server:
```bash
./run-benchmark.sh
```
This will:
- Set up the web application structure
- Run the analysis comparing all model outputs
- Start a local development server

### Alternative: Processing Individual Images

For processing individual images:
```bash
python process_images.py single <model> <image_id> <prompt_file>
```

Example:
```bash
python process_images.py single claude3.5 "32044103326807!32044156028839" prompt.txt
```

## Output Format

The analysis generates:
- Individual JSON files for each image analysis
- A comprehensive analysis.json file with comparative metrics
- A web interface for visualizing results

### Web Interface Features

The web interface provides:
- Model comparison summary with accuracy and cost metrics
- Detailed view of individual image analyses
- Side-by-side comparison of model outputs
- Interactive image viewer with zoom capability

## Configuration

### Model Configurations

Models can be configured in `process_images.py`:

```python
MODEL_CONFIGS = {
    'gpt-4o': ProcessingConfig(
        api_type='openai',
        model='gpt-4o',
        input_cost_per_million=2.5,
        output_cost_per_million=10.0
    ),
    'claude3.5': ProcessingConfig(
        api_type='claude',
        model='claude-3-5-sonnet-20241022',
        input_cost_per_million=3.0,
        output_cost_per_million=15.0
    )
    # ... other models
}
```

### Analysis Parameters

The analysis script (`analysis_script.py`) includes configurable parameters for:
- Field comparison logic
- Metrics calculation
- Output formatting
