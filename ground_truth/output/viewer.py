from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
import json
from pathlib import Path
import uvicorn

app = FastAPI()
templates = Jinja2Templates(directory=".")

def get_image_urls(image_id: str) -> tuple[str, str]:
    base_url = "https://iiif.itatti.harvard.edu/iiif/2/digiteca!{}_{}.jpg/full/!1024,1024/0/default.jpg"
    return base_url.format(image_id, 1), base_url.format(image_id, 2)

def flatten_dict(d: dict, prefix='') -> list[tuple[str, list | str]]:
    items = []
    for k, v in d.items():
        new_key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key))
        elif isinstance(v, list):
            items.append((new_key, v))
        else:
            items.append((new_key, str(v)))
    return sorted(items)

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request, page: int = 0):
    json_files = sorted(Path(".").glob("*.json"))
    if not json_files:
        return "No JSON files found"
        
    current_file = json_files[page]
    with open(current_file) as f:
        data = json.load(f)
    
    image_id = current_file.stem
    front_url, back_url = get_image_urls(image_id)
    
    return templates.TemplateResponse("viewer.html", {
        "request": request,
        "image_id": image_id,
        "front_url": front_url,
        "back_url": back_url,
        "data": data,
        "flatten_dict": flatten_dict,
        "current_page": page,
        "total_pages": len(json_files),
        "isinstance": isinstance,
        "list": list
    })

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)