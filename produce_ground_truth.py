import sys
import json
from pathlib import Path
from jinja2 import Template
import subprocess

def get_image_urls(image_id: str) -> tuple[str, str]:
    photo_id = image_id.split('!')[1]
    base_url = "https://iiif.itatti.harvard.edu/iiif/2/digiteca!{}_{:d}.jpg/full/1024,1024/0/default.jpg"
    return base_url.format(image_id, 1), base_url.format(image_id, 2)

def process_image(image_id: str) -> dict:
    result = subprocess.run(
        ["python3", "process_images.py", "claude3.5", image_id, "prompt.md"],
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        raise Exception(f"Process failed: {result.stderr}")
    return json.loads(result.stdout)

def generate_html(results: list[dict]) -> str:
    template = Template("""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            .image-pair { display: flex; margin-bottom: 20px; }
            .image-pair img { max-width: 45%; margin: 10px; }
            .fields { margin: 20px; }
            .field { margin-bottom: 10px; }
            .field-name { font-weight: bold; }
        </style>
    </head>
    <body>
        {% for result in results %}
        <div class="result">
            <h2>{{ result.photo_id }}</h2>
            <div class="image-pair">
                <img src="{{ result.urls.front }}" alt="Front">
                <img src="{{ result.urls.back }}" alt="Back">
            </div>
            <div class="fields">
                {% for path, value in result.fields %}
                <div class="field">
                    <span class="field-name">{{ path }}:</span>
                    <span class="field-value">{{ value }}</span>
                </div>
                {% endfor %}
            </div>
            <hr>
        </div>
        {% endfor %}
    </body>
    </html>
    """)
    
    return template.render(results=results)

def flatten_dict(d: dict, prefix='') -> list[tuple[str, str]]:
    items = []
    for k, v in d.items():
        new_key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key))
        else:
            items.append((new_key, v))
    return items

def main():
    output_dir = Path("ground_truth/output")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    with open("test-images.md") as f:
        image_ids = [line.strip() for line in f if line.strip()]
    
    results = []
    for image_id in image_ids:
        front_url, back_url = get_image_urls(image_id)
        result = process_image(image_id)
        
        # Save individual JSON
        with open(output_dir / f"{image_id}.json", 'w') as f:
            json.dump(result['annotations'], f, indent=2)
            
        # Prepare for HTML
        results.append({
            'photo_id': image_id,
            'urls': {'front': front_url, 'back': back_url},
            'fields': flatten_dict(result['annotations'])
        })
    
    # Generate HTML
    html = generate_html(results)
    with open(output_dir / 'review.html', 'w') as f:
        f.write(html)

if __name__ == "__main__":
    main()