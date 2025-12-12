from flask import Blueprint, jsonify, send_file, render_template_string
from pathlib import Path
import io
import base64
import numpy as np

bp = Blueprint('visualizer', __name__)

# Import model service functions
from model_service import get_main_model, ML_AVAILABLE
from config import FRONTEND_DIR

# Attempt to import TensorFlow
try:
    import tensorflow as tf
    from tensorflow import keras
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False
    tf = None
    keras = None

# Store last processed image globally
_last_image_array = None
_last_image_path = None

def set_last_image(img_array, img_path=None):
    """Store the last processed image for activation visualization."""
    global _last_image_array, _last_image_path
    _last_image_array = img_array
    _last_image_path = img_path

def get_last_image():
    """Get the last processed image."""
    return _last_image_array, _last_image_path


@bp.route('/visualizer')
def visualizer_page():
    """Serve the CNN visualizer page."""
    template_path = FRONTEND_DIR / 'visualizer.html'
    
    if not template_path.exists():
        return jsonify({"error": "Visualizer template not found"}), 404
    
    with open(template_path, 'r', encoding='utf-8') as f:
        template_content = f.read()
    
    return render_template_string(template_content)


@bp.route('/model/layers')
def get_model_layers():
    """
    Get information about all layers in the model.
    Returns JSON with layer details.
    """
    if not ML_AVAILABLE or not TF_AVAILABLE:
        return jsonify({"error": "TensorFlow not available"}), 500
    
    model = get_main_model()
    if model is None:
        return jsonify({"error": "Model not loaded"}), 500
    
    layers_info = []
    
    for idx, layer in enumerate(model.layers):
        try:
            # Get layer configuration
            config = layer.get_config()
            layer_type = layer.__class__.__name__
            
            # Get activation if exists
            activation = config.get('activation', 'none')
            if hasattr(layer, 'activation'):
                if hasattr(layer.activation, '__name__'):
                    activation = layer.activation.__name__
            
            # Get output shape
            output_shape = layer.output_shape
            if isinstance(output_shape, list):
                # Multiple outputs
                output_shape = output_shape[0] if output_shape else None
            
            # Format shape as string
            shape_str = str(output_shape) if output_shape else "Unknown"
            
            layer_info = {
                "index": idx,
                "name": layer.name,
                "type": layer_type,
                "shape": shape_str,
                "activation": activation,
                "trainable": layer.trainable,
                "params": layer.count_params()
            }
            
            layers_info.append(layer_info)
            
        except Exception as e:
            # Fallback for problematic layers
            layers_info.append({
                "index": idx,
                "name": layer.name,
                "type": layer.__class__.__name__,
                "shape": "N/A",
                "activation": "N/A",
                "trainable": False,
                "params": 0
            })
    
    return jsonify({
        "total_layers": len(layers_info),
        "layers": layers_info,
        "model_name": model.name if hasattr(model, 'name') else "CNN Model"
    })


@bp.route('/model/activation/<layer_name>')
def get_layer_activation(layer_name):
    """
    Get activation visualization for a specific layer.
    Returns a base64-encoded PNG image.
    """
    if not ML_AVAILABLE or not TF_AVAILABLE:
        return jsonify({"error": "TensorFlow not available"}), 500
    
    model = get_main_model()
    if model is None:
        return jsonify({"error": "Model not loaded"}), 500
    
    # Get the last processed image
    img_array, _ = get_last_image()
    
    if img_array is None:
        return jsonify({
            "error": "No image available",
            "message": "Please analyze an X-ray image first before visualizing activations"
        }), 400
    
    try:
        # Find the layer by name
        layer = None
        for l in model.layers:
            if l.name == layer_name:
                layer = l
                break
        
        if layer is None:
            return jsonify({"error": f"Layer '{layer_name}' not found"}), 404
        
        # Create intermediate model
        intermediate_model = keras.models.Model(
            inputs=model.input,
            outputs=layer.output
        )
        
        # Get activations
        activations = intermediate_model.predict(img_array, verbose=0)
        
        # Generate visualization
        img_base64 = visualize_activations(activations, layer_name)
        
        return jsonify({
            "layer_name": layer_name,
            "activation_shape": str(activations.shape),
            "image": img_base64
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to compute activations: {str(e)}"}), 500


def visualize_activations(activations, layer_name):
    """
    Visualize activations as a grid of feature maps.
    Returns base64-encoded PNG image.
    """
    try:
        import matplotlib
        matplotlib.use('Agg')  # Non-interactive backend
        import matplotlib.pyplot as plt
    except ImportError:
        return ""
    
    # Handle different activation shapes
    if len(activations.shape) == 4:  # Conv layer: (batch, height, width, channels)
        batch, height, width, channels = activations.shape
        
        # Limit number of channels to display (max 64)
        max_channels = min(64, channels)
        
        # Calculate grid size
        grid_size = int(np.ceil(np.sqrt(max_channels)))
        
        # Create figure
        fig, axes = plt.subplots(grid_size, grid_size, figsize=(12, 12))
        fig.suptitle(f'Activations: {layer_name}', fontsize=14, fontweight='bold')
        
        for i in range(grid_size * grid_size):
            row = i // grid_size
            col = i % grid_size
            ax = axes[row, col] if grid_size > 1 else axes
            
            if i < max_channels:
                # Display feature map
                feature_map = activations[0, :, :, i]
                ax.imshow(feature_map, cmap='viridis', aspect='auto')
                ax.axis('off')
                ax.set_title(f'Ch {i}', fontsize=8)
            else:
                ax.axis('off')
        
        plt.tight_layout()
        
    elif len(activations.shape) == 2:  # Dense layer: (batch, units)
        batch, units = activations.shape
        
        # Visualize as bar chart
        fig, ax = plt.subplots(figsize=(12, 6))
        ax.bar(range(min(100, units)), activations[0][:100])
        ax.set_title(f'Activations: {layer_name} (first 100 units)', fontsize=14, fontweight='bold')
        ax.set_xlabel('Unit Index')
        ax.set_ylabel('Activation Value')
        ax.grid(alpha=0.3)
        plt.tight_layout()
        
    else:
        # Fallback: show text
        fig, ax = plt.subplots(figsize=(8, 4))
        ax.text(0.5, 0.5, f'Shape: {activations.shape}\nCannot visualize this layer type',
                ha='center', va='center', fontsize=12)
        ax.axis('off')
    
    # Convert to base64
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode('utf-8')
    plt.close(fig)
    
    return img_base64
