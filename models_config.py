from dataclasses import dataclass
from typing import List

@dataclass
class ProcessingConfig:
    api_type: str  
    model: str
    input_cost_per_million: float
    output_cost_per_million: float

MODEL_CONFIGS = {
    'gpt-4o': ProcessingConfig(
        api_type='openai',
        model='gpt-4o',
        input_cost_per_million=2.5,
        output_cost_per_million=10.0
    ),
    'gpt-4.5': ProcessingConfig(
        api_type='openai',
        model='gpt-4.5-preview-2025-02-27',
        input_cost_per_million=75,
        output_cost_per_million=150.0
    ),
#    'gpt-4o-mini': ProcessingConfig(
#        api_type='openai',
#        model='gpt-4o-mini',
#        input_cost_per_million=3.0,
#        output_cost_per_million=12.0
#    ),
    'claude3.5': ProcessingConfig(
        api_type='claude',
        model='claude-3-5-sonnet-20241022',
        input_cost_per_million=3.0,
        output_cost_per_million=15.0
    ),
    'claude3.7': ProcessingConfig(
        api_type='claude',
        model='claude-3-7-sonnet-20250219',
        input_cost_per_million=3.0,
        output_cost_per_million=15.0
    )
}

# Export model names as a list for easy access
MODEL_NAMES: List[str] = list(MODEL_CONFIGS.keys())
