from flask import Blueprint, jsonify, send_file, render_template_string
from pathlib import Path
import io
import base64
import numpy as np

bp = Blueprint('visualizer_v2', __name__)
print("--> CARGANDO VISUALIZER V2 (con soporte EfficientNet/DenseNet)")

# Import model service functions
# Import last_image functions from model_service (consolidated)
from model_service import get_main_model, ML_AVAILABLE, LABELS, get_last_image
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


@bp.route('/visualizer')
def visualizer_page():
    """Serve the CNN visualizer page."""
    template_path = FRONTEND_DIR / 'visualizer.html'
    
    if not template_path.exists():
        return jsonify({"error": "Visualizer template not found"}), 404
    
    with open(template_path, 'r', encoding='utf-8') as f:
        template_content = f.read()
    
    return render_template_string(template_content)


def group_layers_intelligently(layers):
    """
    Group layers into functional blocks for better visualization.
    
    Groups:
    - Conv2D + BatchNorm + Activation → "Conv Block"
    - DepthwiseConv2D + BN + Activation → "Depthwise Block"
    - Dense + Dropout → "Dense Block"
    """
    blocks = []
    i = 0
    
    while i < len(layers):
        layer = layers[i]
        layer_type = layer.get('type', '')
        
        # Check for Conv Block pattern (Conv2D + BN + Act) or (Conv2D + BN)
        if layer_type == 'Conv2D' and i + 1 < len(layers):
            next1 = layers[i + 1].get('type', '')
            
            # Check for Conv2D + BatchNorm + Activation pattern
            if 'BatchNormalization' in next1 and i + 2 < len(layers):
                next2 = layers[i + 2].get('type', '')
                if 'Activation' in next2 or 'ReLU' in next2:
                    block = {
                        'id': f'block_{len(blocks)}',
                        'type': 'ConvBlock',
                        'name': f'Conv Block {len(blocks) + 1}',
                        'layers': [layers[i], layers[i + 1], layers[i + 2]],
                        'input_shape': layer.get('input_shape', 'N/A'),
                        'output_shape': layers[i + 2].get('output_shape', 'N/A'),
                        'params': sum(l.get('params', 0) for l in [layers[i], layers[i + 1], layers[i + 2]]),
                        'expanded': False
                    }
                    blocks.append(block)
                    i += 3
                    continue
            
            # Check for Conv2D + BatchNorm pattern (without separate activation)
            if 'BatchNormalization' in next1:
                block = {
                    'id': f'block_{len(blocks)}',
                    'type': 'ConvBlock',
                    'name': f'Conv Block {len(blocks) + 1}',
                    'layers': [layers[i], layers[i + 1]],
                    'input_shape': layer.get('input_shape', 'N/A'),
                    'output_shape': layers[i + 1].get('output_shape', 'N/A'),
                    'params': sum(l.get('params', 0) for l in [layers[i], layers[i + 1]]),
                    'expanded': False
                }
                blocks.append(block)
                i += 2
                continue
        
        # Check for DepthwiseConv pattern
        if 'DepthwiseConv' in layer_type and i + 1 < len(layers):
            next1 = layers[i + 1].get('type', '')
            
            if 'BatchNormalization' in next1 and i + 2 < len(layers):
                next2 = layers[i + 2].get('type', '')
                if 'Activation' in next2 or 'ReLU' in next2:
                    block = {
                        'id': f'block_{len(blocks)}',
                        'type': 'DepthwiseBlock',
                        'name': f'Depthwise Block {len(blocks) + 1}',
                        'layers': [layers[i], layers[i + 1], layers[i + 2]],
                        'input_shape': layer.get('input_shape', 'N/A'),
                        'output_shape': layers[i + 2].get('output_shape', 'N/A'),
                        'params': sum(l.get('params', 0) for l in [layers[i], layers[i + 1], layers[i + 2]]),
                        'expanded': False
                    }
                    blocks.append(block)
                    i += 3
                    continue
            
            # DepthwiseConv + BatchNorm only
            if 'BatchNormalization' in next1:
                block = {
                    'id': f'block_{len(blocks)}',
                    'type': 'DepthwiseBlock',
                    'name': f'Depthwise Block {len(blocks) + 1}',
                    'layers': [layers[i], layers[i + 1]],
                    'input_shape': layer.get('input_shape', 'N/A'),
                    'output_shape': layers[i + 1].get('output_shape', 'N/A'),
                    'params': sum(l.get('params', 0) for l in [layers[i], layers[i + 1]]),
                    'expanded': False
                }
                blocks.append(block)
                i += 2
                continue
        
        # Check for Dense + Dropout pattern
        if layer_type == 'Dense' and i + 1 < len(layers):
            next1 = layers[i + 1].get('type', '')
            
            if 'Dropout' in next1:
                block = {
                    'id': f'block_{len(blocks)}',
                    'type': 'DenseBlock',
                    'name': f'Dense Block {len(blocks) + 1}',
                    'layers': [layers[i], layers[i + 1]],
                    'input_shape': layer.get('input_shape', 'N/A'),
                    'output_shape': layers[i + 1].get('output_shape', 'N/A'),
                    'params': sum(l.get('params', 0) for l in [layers[i], layers[i + 1]]),
                    'expanded': False
                }
                blocks.append(block)
                i += 2
                continue
        
        # Single layer block (no grouping)
        block = {
            'id': f'block_{len(blocks)}',
            'type': layer_type,
            'name': layer.get('name', f'Layer {i}'),
            'layers': [layer],
            'input_shape': layer.get('input_shape', 'N/A'),
            'output_shape': layer.get('output_shape', 'N/A'),
            'params': layer.get('params', 0),
            'expanded': False
        }
        blocks.append(block)
        i += 1
    
    return blocks


@bp.route('/model/layers_grouped')
def get_model_layers_grouped():
    """
    Get grouped layers information for better visualization.
    Returns JSON with intelligent grouping of layers.
    """
    if not ML_AVAILABLE or not TF_AVAILABLE:
        return jsonify({"error": "TensorFlow not available"}), 500
    
    model = get_main_model()
    if model is None:
        return jsonify({"error": "Model not loaded"}), 500
    
    layers_info = []
    
    for idx, layer in enumerate(model.layers):
        try:
            layer_type = layer.__class__.__name__
            
            # Get activation if exists
            activation = 'none'
            try:
                config = layer.get_config()
                activation = config.get('activation', 'none')
                if hasattr(layer, 'activation') and hasattr(layer.activation, '__name__'):
                    activation = layer.activation.__name__
            except:
                pass
            
            # Get input shape - try multiple methods
            input_shape = "N/A"
            try:
                # Method 1: Use layer.input tensor
                if hasattr(layer, 'input') and layer.input is not None:
                    inp_tensor = layer.input
                    if hasattr(inp_tensor, 'shape'):
                        shape = tuple(d if d is not None else 'None' for d in inp_tensor.shape)
                        input_shape = str(shape)
                # Method 2: Use input_shape attribute
                elif hasattr(layer, 'input_shape'):
                    input_shape = str(layer.input_shape)
            except Exception:
                pass
            
            # Get output shape - try multiple methods
            output_shape = "N/A"
            try:
                # Method 1: Use layer.output tensor
                if hasattr(layer, 'output') and layer.output is not None:
                    out_tensor = layer.output
                    if hasattr(out_tensor, 'shape'):
                        shape = tuple(d if d is not None else 'None' for d in out_tensor.shape)
                        output_shape = str(shape)
                # Method 2: Use output_shape attribute
                elif hasattr(layer, 'output_shape'):
                    output_shape = str(layer.output_shape)
            except Exception:
                pass
            
            # Get parameters count
            params = 0
            try:
                params = layer.count_params()
            except Exception:
                # Layer not built - try weights
                try:
                    if hasattr(layer, 'weights'):
                        for w in layer.weights:
                            params += np.prod(w.shape)
                except:
                    pass
            
            layer_info = {
                "index": idx,
                "name": layer.name,
                "type": layer_type,
                "input_shape": input_shape,
                "output_shape": output_shape,
                "shape": output_shape,  # backwards compat
                "activation": activation,
                "trainable": layer.trainable if hasattr(layer, 'trainable') else False,
                "params": int(params) if params else 0
            }
            
            layers_info.append(layer_info)
            
        except Exception as e:
            # Fallback for problematic layers
            layers_info.append({
                "index": idx,
                "name": getattr(layer, 'name', f'layer_{idx}'),
                "type": layer.__class__.__name__,
                "input_shape": "N/A",
                "output_shape": "N/A",
                "shape": "N/A",
                "activation": "N/A",
                "trainable": False,
                "params": 0
            })
    
    # Group layers intelligently
    grouped_blocks = group_layers_intelligently(layers_info)
    
    # Calculate total params
    total_params = sum(b.get('params', 0) for b in grouped_blocks)
    
    return jsonify({
        "total_layers": len(layers_info),
        "total_blocks": len(grouped_blocks),
        "total_params": total_params,
        "blocks": grouped_blocks,
        "model_name": model.name if hasattr(model, 'name') else "CNN Model"
    })


@bp.route('/api/v2/model/activation/<layer_name>')
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


@bp.route('/api/v2/model/structure')
def get_model_structure():
    """
    Returns the hierarchical structure of the model layers grouped by blocks.
    Auto-detects EfficientNet or DenseNet patterns.
    """
    model = get_main_model()
    if model is None:
        return jsonify({"error": "Model not loaded"}), 500
        
    structure = []
    current_block = {"name": "Input/Stem", "layers": []}
    
    # 1. Detect Architecture Type
    is_efficientnet = any('block1a_' in l.name for l in model.layers)
    is_densenet = any('dense_block' in l.name or 'conv2_block' in l.name for l in model.layers)
    

    
    # helper to clean user-friendly names
    def get_friendly_name(layer_name):
        return layer_name.split('/')[-1]

    last_block_id = None
    
    for layer in model.layers:
        # Check if layer is interesting (skip utility layers unless critical)
        if isinstance(layer, (keras.layers.InputLayer, keras.layers.Dropout)):
            continue
            
        # Safely get output shape with fallback
        try:
            out_shape = str(layer.output_shape)
        except AttributeError:
            try:
                # Fallback: try to get shape from output tensor
                if hasattr(layer, 'output') and hasattr(layer.output, 'shape'):
                     out_shape = str(layer.output.shape)
                else:
                     out_shape = "N/A"
            except:
                out_shape = "N/A"
            
        layer_info = {
            "name": layer.name,
            "type": layer.__class__.__name__,
            "output_shape": out_shape
        }
        
        # LOGIC FOR EFFICIENTNET
        if is_efficientnet:
            # EfficientNet layers: block1a_dwconv, block2b_project_conv, etc.
            if 'block' in layer.name:
                # Extract block ID e.g. "1a" from "block1a_..."
                import re
                match = re.search(r'block(\d+[a-z]?)', layer.name)
                if match:
                    block_id = match.group(1)
                    if block_id != last_block_id:
                        if current_block["layers"]:
                            structure.append(current_block)
                        current_block = {"name": f"Block {block_id.upper()}", "layers": []}
                        last_block_id = block_id
            elif 'top_' in layer.name:
                if current_block["layers"] and current_block["name"] != "Top Layers":
                    structure.append(current_block)
                    current_block = {"name": "Top Layers", "layers": []}

        # LOGIC FOR DENSENET (Keras Standard)
        elif is_densenet:
            # Examples: conv2_block1_1_conv, pool2_pool, etc.
            # Groups: conv2 (Dense Block 1), conv3 (Dense Block 2), etc.
            if 'conv' in layer.name and '_block' in layer.name:
                import re
                # Extract "2_block1" or similar
                match = re.search(r'conv(\d+)_block(\d+)', layer.name)
                if match:
                    major_block = match.group(1) # 2, 3, 4, 5
                    sub_block = match.group(2)   # 1, 2, ...
                    
                    block_name = f"Dense Block {int(major_block)-1}" 
                    # Keras DenseNet: conv2=Block1, conv3=Block2...
                    
                    if block_name != current_block["name"]:
                        if current_block["layers"]:
                            structure.append(current_block)
                        current_block = {"name": block_name, "layers": []}
            
            elif 'pool' in layer.name and 'pool' in layer.name.replace('pool','',1): # transition pool
                # Transition layers
                if current_block["layers"]:
                    structure.append(current_block)
                current_block = {"name": "Transition Block", "layers": []}

        # GENERIC FALLBACK
        else:
            pass # Keep adding to current block (Input/Stem or Classifier)

        # Output Head
        if 'predictions' in layer.name or 'probs' in layer.name or isinstance(layer, keras.layers.Dense):
             if current_block["name"] != "Classification Head":
                if current_block["layers"]:
                    structure.append(current_block)
                current_block = {"name": "Classification Head", "layers": []}

        current_block["layers"].append(layer_info)

    # Append valid last block
    if current_block["layers"]:
        structure.append(current_block)
        
    # Filter out empty blocks just in case
    structure = [b for b in structure if b["layers"]]
    
    return jsonify({
        "architecture": model.name,
        "is_efficientnet": is_efficientnet,
        "is_densenet": is_densenet,
        "blocks": structure
    })


def visualize_activations(activations, layer_name):
    """
    Visualize activations as a grid of feature maps.
    Returns base64-encoded PNG image.
    """
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
    except ImportError:
        return ""
    
    # Handle different activation shapes
    if len(activations.shape) == 4:  # Conv layer
        batch, height, width, channels = activations.shape
        max_channels = min(64, channels)
        grid_size = int(np.ceil(np.sqrt(max_channels)))
        
        fig, axes = plt.subplots(grid_size, grid_size, figsize=(12, 12))
        fig.suptitle(f'Activations: {layer_name}', fontsize=14, fontweight='bold')
        
        for i in range(grid_size * grid_size):
            row = i // grid_size
            col = i % grid_size
            ax = axes[row, col] if grid_size > 1 else axes
            
            if i < max_channels:
                # Normalize for better visualization
                fmap = activations[0, :, :, i]
                fmap = (fmap - np.min(fmap)) / (np.max(fmap) - np.min(fmap) + 1e-5)
                
                ax.imshow(fmap, cmap='viridis', aspect='auto')
                ax.axis('off')
                ax.set_title(f'Ch {i}', fontsize=8)
            else:
                ax.axis('off')
        
        plt.tight_layout()
        
    elif len(activations.shape) == 2:  # Dense layer
        batch, units = activations.shape
        fig, ax = plt.subplots(figsize=(12, 6))
        ax.bar(range(min(100, units)), activations[0][:100])
        ax.set_title(f'Activations: {layer_name}', fontsize=14, fontweight='bold')
        ax.set_xlabel('Unit Index')
        ax.set_ylabel('Activation Value')
        ax.grid(alpha=0.3)
        plt.tight_layout()
        
    else:
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




@bp.route('/api/v2/model/hyperparameters')
def get_model_hyperparameters():
    """
    Return the hyperparameters used to train the model.
    Based on the training script configuration.
    """
    hyperparameters = {
        "model": {
            "base_architecture": "EfficientNetB0",
            "input_shape": "224×224×3",
            "output_classes": 6,
            "output_activation": "sigmoid (multi-label)",
            "loss_function": "binary_crossentropy"
        },
        "training": {
            "optimizer": "Adam",
            "learning_rate": 0.0003123,
            "batch_size": 64,
            "epochs": 10,
            "early_stopping_patience": 7,
            "reduce_lr_patience": 4
        },
        "architecture": {
            "dense_units": 512,
            "dropout_rate": 0.307,
            "fine_tune_layers": 100,
            "extra_dense_layer": True,
            "extra_layer_units": 256,
            "extra_layer_dropout": 0.246
        },
        "regularization": {
            "batch_normalization": True,
            "dropout": True,
            "data_augmentation": True
        },
        "augmentation": {
            "brightness_range": "±20%",
            "contrast_range": "0.8-1.2",
            "horizontal_flip": True,
            "vertical_flip": True,
            "saturation_range": "0.8-1.2"
        },
        "classes": LABELS
    }
    
    return jsonify(hyperparameters)


@bp.route('/api/v2/model/gradcam')
def get_gradcam_visualization():
    """
    Generate Grad-CAM visualization for the last analyzed image.
    Shows which regions of the image contributed most to the prediction.
    Query param 'class_name' can be used to visualize a specific class.
    """
    if not ML_AVAILABLE or not TF_AVAILABLE:
        return jsonify({"error": "TensorFlow not available"}), 500
    
    model = get_main_model()
    if model is None:
        return jsonify({"error": "Model not loaded"}), 500
    
    # Get target class from query params
    from flask import request
    target_class_name = request.args.get('class_name')
    
    # Get the last processed image
    img_array, _ = get_last_image()
    
    if img_array is None:
        return jsonify({
            "error": "No image available",
            "message": "Please analyze an X-ray image first"
        }), 400
    
    try:
        # Find the last convolutional layer
        last_conv_layer = None
        for layer in reversed(model.layers):
            if 'conv' in layer.name.lower() and hasattr(layer, 'output'):
                last_conv_layer = layer
                break
        
        if last_conv_layer is None:
            # Fallback specifically for EfficientNet
            for layer in reversed(model.layers):
                if 'top_activation' in layer.name or 'top_conv' in layer.name:
                    last_conv_layer = layer
                    break
                    
        if last_conv_layer is None:
            return jsonify({"error": "Could not find convolutional layer"}), 500
        
        # Create gradient model
        grad_model = keras.models.Model(
            inputs=[model.input],
            outputs=[last_conv_layer.output, model.output]
        )
        
        # Compute gradient
        with tf.GradientTape() as tape:
            conv_outputs, predictions = grad_model(img_array)
            
            # Check if model already has activation
            # Most Keras models loaded from h5 with activation='sigmoid' output probabilities directly.
            # We assume predictions ARE the probabilities.
            probs = predictions[0].numpy()
            
            # Helper to check if we need sigmoid (if values are outside [0,1] or vary widely)
            # But relying on model definition is safer. The user's training script used activation='sigmoid'.
            
            # Determine target index
            if target_class_name and target_class_name in LABELS:
                pred_index = LABELS.index(target_class_name)
            else:
                pred_index = int(np.argmax(probs))
            
            # Use safe indexing
            safe_index = pred_index
            if safe_index >= predictions.shape[1]:
                safe_index = 0 
                
            class_channel = predictions[:, safe_index]
        
        # Get gradients
        grads = tape.gradient(class_channel, conv_outputs)
        
        if grads is None:
            return jsonify({"error": "Could not compute gradients"}), 500
        
        # Pool gradients
        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
        
        # Weight the feature maps
        conv_outputs_value = conv_outputs[0].numpy()
        pooled_grads_value = pooled_grads.numpy()
        
        for i in range(pooled_grads_value.shape[0]):
            conv_outputs_value[:, :, i] *= pooled_grads_value[i]
        
        # Create heatmap
        heatmap = np.mean(conv_outputs_value, axis=-1)
        heatmap = np.maximum(heatmap, 0) # ReLU
        
        # Normalize heatmap
        max_val = np.max(heatmap)
        if max_val > 0:
            heatmap /= max_val
            
        # Refine visualization: Apply a threshold to remove noise if needed, 
        # but standard Grad-CAM keeps all positive values.
        
        # Resize heatmap
        heatmap = np.uint8(255 * heatmap)
        
        try:
            import cv2
            # Use INTER_CUBIC for smoother resize of small feature maps
            heatmap = cv2.resize(heatmap, (224, 224), interpolation=cv2.INTER_CUBIC)
            
            # Create colored heatmap with JET colormap
            heatmap_colored = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
            
            # Superimpose
            original = (img_array[0] * 255).astype(np.uint8)
            if len(original.shape) == 2:
                original = cv2.cvtColor(original, cv2.COLOR_GRAY2RGB)
            elif original.shape[-1] == 1:
                original = cv2.cvtColor(original[:, :, 0], cv2.COLOR_GRAY2RGB)
            
            # Overlay
            superimposed = cv2.addWeighted(original, 0.6, heatmap_colored, 0.4, 0)
            
            # Encode
            _, buffer = cv2.imencode('.png', superimposed)
            img_base64 = base64.b64encode(buffer).decode('utf-8')
            
        except ImportError:
            # Fallback
            import matplotlib
            matplotlib.use('Agg')
            import matplotlib.pyplot as plt
            fig, ax = plt.subplots(figsize=(6, 6))
            ax.imshow(img_array[0])
            ax.imshow(heatmap, cmap='jet', alpha=0.4) 
            ax.axis('off')
            
            buf = io.BytesIO()
            plt.savefig(buf, format='png', bbox_inches='tight', dpi=100)
            buf.seek(0)
            img_base64 = base64.b64encode(buf.read()).decode('utf-8')
            plt.close(fig)
        
        # Prepare probabilities
        probabilities_dict = {}
        for i, label in enumerate(LABELS):
            if i < len(probs):
                probabilities_dict[label] = float(probs[i])

        
        # Get class name safely
        predicted_class_name = LABELS[pred_index] if pred_index < len(LABELS) else f"Class {pred_index}"
        
        return jsonify({
            "image": img_base64,
            "predicted_class": predicted_class_name,
            "confidence": float(probs[pred_index]),
            "all_probabilities": probabilities_dict,
            "conv_layer_used": last_conv_layer.name,
            "available_classes": LABELS
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to generate Grad-CAM: {str(e)}"}), 500

