import json
from pathlib import Path
from typing import Dict, List, Any, Tuple
from dataclasses import dataclass
import difflib

@dataclass
class FieldAnalysis:
    field_path: str
    ground_truth: Any
    model_values: Dict[str, Any]
    status: Dict[str, str]

@dataclass
class ImageAnalysis:
    image_id: str
    front_url: str
    back_url: str
    fields: List[FieldAnalysis]
    metrics: Dict[str, Dict[str, float]]

def normalize_value(value: Any) -> Any:
    """Normalize values for comparison, handling various formats"""
    if value is None:
        return None
    
    # Handle strings
    if isinstance(value, str):
        value = value.strip()
        if value in ['', '""', '[]', 'null', '""', '[]']:
            return None
        # Remove surrounding quotes if present
        if (value.startswith('"') and value.endswith('"')) or \
           (value.startswith("'") and value.endswith("'")):
            value = value[1:-1]
        return value.strip()
    
    # Handle empty lists or lists with empty/null values
    if isinstance(value, list):
        if len(value) == 0:
            return None
        normalized = [normalize_value(item) for item in value]
        normalized = [item for item in normalized if item is not None]
        return normalized if normalized else None
        
    return value

def are_values_equal(ground_truth: Any, model_value: Any) -> bool:
    """Compare two values after normalization"""
    gt = normalize_value(ground_truth)
    mv = normalize_value(model_value)
    
    # If both are None/empty, they're equal
    if gt is None and mv is None:
        return True
        
    # If only one is None/empty, they're not equal
    if gt is None or mv is None:
        return False
        
    # Handle strings with some flexibility
    if isinstance(gt, str) and isinstance(mv, str):
        return gt.lower().strip() == mv.lower().strip()
        
    # Handle lists
    if isinstance(gt, list) and isinstance(mv, list):
        if len(gt) != len(mv):
            return False
        gt_sorted = sorted([str(x).lower().strip() for x in gt])
        mv_sorted = sorted([str(x).lower().strip() for x in mv])
        return gt_sorted == mv_sorted
        
    # Direct comparison for other types
    return gt == mv

def get_image_urls(image_id: str) -> Tuple[str, str]:
    """Get front and back image URLs"""
    base_url = "https://iiif.itatti.harvard.edu/iiif/2/digiteca!{}_{:d}.jpg/full/full/0/default.jpg"
    return base_url.format(image_id, 1), base_url.format(image_id, 2)

def get_field_value(data: dict, field_path: str) -> Tuple[Any, bool]:
    """Get value and existence status for a field path"""
    keys = field_path.split('.')
    current = data
    
    try:
        for key in keys:
            current = current[key]
        return current, True
    except (KeyError, TypeError):
        return None, False

def flatten_dict(d: dict, prefix='') -> List[str]:
    """Get all field paths from a dictionary"""
    paths = []
    for k, v in d.items():
        new_key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            paths.extend(flatten_dict(v, new_key))
        else:
            paths.append(new_key)
    return paths

def analyze_images() -> Dict[str, Any]:
    """Process all images and return analysis results"""
    # Get list of images
    ground_truth_dir = Path('ground_truth/output')
    results = {}
    
    for gt_file in ground_truth_dir.glob('*.json'):
        image_id = gt_file.stem
        
        # Load ground truth
        with open(gt_file) as f:
            ground_truth = json.load(f)
            
        # Get all possible fields from ground truth
        field_paths = flatten_dict(ground_truth)
        
        # Load results for each model
        model_results = {}
        for model in ['gpt-4o', 'o1', 'gpt-4o-mini', 'claude3.5']:
            try:
                with open(f"benchmark_data/{model}/{image_id}.json") as f:
                    data = json.load(f)
                    model_results[model] = data['annotations']
                    field_paths.extend(flatten_dict(data['annotations']))
            except (FileNotFoundError, KeyError):
                continue
                
        # Remove duplicates and sort
        field_paths = sorted(set(field_paths))
        
        # Analyze each field
        fields = []
        metrics = {model: {'correct': 0, 'incorrect_field': 0, 'incorrect_transcription': 0, 'missing': 0} 
                  for model in model_results}
                  
        for field_path in field_paths:
            gt_value, gt_exists = get_field_value(ground_truth, field_path)
            model_values = {}
            statuses = {}
            
            for model, result in model_results.items():
                model_value, model_exists = get_field_value(result, field_path)
                model_values[model] = model_value
                
                # Determine status
                if not gt_exists and not model_exists:
                    statuses[model] = 'correct'
                elif gt_exists and not model_exists:
                    statuses[model] = 'missing'
                elif not gt_exists and model_exists:
                    statuses[model] = 'incorrect_field'
                else:
                    statuses[model] = 'correct' if are_values_equal(gt_value, model_value) else 'incorrect_transcription'
                
                metrics[model][statuses[model]] += 1
            
            fields.append(FieldAnalysis(
                field_path=field_path,
                ground_truth=gt_value,
                model_values=model_values,
                status=statuses
            ))
            
        front_url, back_url = get_image_urls(image_id)
        results[image_id] = ImageAnalysis(
            image_id=image_id,
            front_url=front_url,
            back_url=back_url,
            fields=fields,
            metrics=metrics
        )
            
    return results

def generate_summary() -> Dict[str, Any]:
    """Generate final summary with metrics"""
    print("Starting analysis...")
    
    # Load benchmark info
    with open('benchmark_data/benchmark_summary.json') as f:
        benchmark_summary = json.load(f)
        
    # Get analysis results
    analyses = analyze_images()
    
    # Calculate overall metrics
    overall_metrics = {}
    for model in benchmark_summary.keys():
        total_correct = 0
        total_incorrect_field = 0
        total_incorrect_transcription = 0
        total_missing = 0
        total_fields = 0
        
        # Sum up metrics across all images
        for analysis in analyses.values():
            if model in analysis.metrics:
                metrics = analysis.metrics[model]
                total_correct += metrics['correct']
                total_incorrect_field += metrics['incorrect_field']
                total_incorrect_transcription += metrics['incorrect_transcription']
                total_missing += metrics['missing']
                total_fields += sum(metrics.values())
        
        # Calculate rates
        if total_fields > 0:
            overall_metrics[model] = {
                "accuracy": total_correct / total_fields,
                "incorrect_field_rate": total_incorrect_field / total_fields,
                "incorrect_transcription_rate": total_incorrect_transcription / total_fields,
                "missing_rate": total_missing / total_fields,
                "cost_per_image": benchmark_summary[model]["average_cost_per_image"],
                "time_per_image": benchmark_summary[model]["average_time_per_image"],
                "total_cost": benchmark_summary[model]["total_cost"],
                "total_time": benchmark_summary[model]["total_time"]
            }
    
    return {
        "overall_metrics": overall_metrics,
        "analyses": {
            image_id: {
                "image_id": analysis.image_id,
                "front_url": analysis.front_url,
                "back_url": analysis.back_url,
                "fields": [
                    {
                        "field_path": field.field_path,
                        "ground_truth": field.ground_truth,
                        "model_values": field.model_values,
                        "status": field.status
                    }
                    for field in analysis.fields
                ],
                "metrics": analysis.metrics
            }
            for image_id, analysis in analyses.items()
        }
    }

if __name__ == "__main__":
    # Generate analysis and save to file
    summary = generate_summary()
    print("Writing results...")
    with open("analysis.json", 'w') as f:
        json.dump(summary, f, indent=2)
    print("Analysis complete!")