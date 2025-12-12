# Try to import ML libraries - they're optional for running the web server
try:
    import tensorflow as tf
    from tensorflow import keras
    import numpy as np
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False
    tf = None
    keras = None
    np = None

from PIL import Image
import warnings
import os

# Suppress TensorFlow warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
warnings.filterwarnings('ignore', category=FutureWarning)

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False

import io
import sys
import hashlib
from pathlib import Path

# ==========================================
# CONFIGURATION & UTILS
# ==========================================

from config import MODELS_DIR
LABELS = ['Atelectasis', 'Effusion', 'Infiltration', 'Cardiomegaly', 'Nodule']

_cache = {}

def _get_image_hash(image_bytes):
    return hashlib.md5(image_bytes).hexdigest()

def preprocess_image_for_model(image_pil):
    """Preprocess PIL image for TensorFlow model."""
    if not ML_AVAILABLE:
        return None
    
    # Resize to 224x224
    img_resized = image_pil.resize((224, 224))
    
    # Convert to array and normalize
    img_array = np.array(img_resized, dtype=np.float32)
    
    # If grayscale, convert to 3 channels
    if len(img_array.shape) == 2:
        img_array = np.stack([img_array] * 3, axis=-1)
    elif img_array.shape[-1] == 1:
        img_array = np.repeat(img_array, 3, axis=-1)
    
    # Normalize to [0, 1]
    img_array = img_array / 255.0
    
    # Apply ImageNet normalization
    mean = np.array([0.485, 0.456, 0.406])
    std = np.array([0.229, 0.224, 0.225])
    img_array = (img_array - mean) / std
    
    # Add batch dimension
    img_array = np.expand_dims(img_array, axis=0)
    
    return img_array

# ==========================================
# MODEL INITIALIZATION
# ==========================================

# Main Model
# Lazy Loading Storage
_main_model = None
_models_map = {}

def load_keras_model(path):
    """Loads a Keras model from .h5 file."""
    path_obj = Path(path)
    
    if not path_obj.exists():
        print(f"WARNING: Model not found at {path_obj.absolute()}")
        return None
    
    try:
        # Load the Keras model
        model = keras.models.load_model(path, compile=False)
        print(f"Successfully loaded model from {path_obj.name}")
        print(f"Model input shape: {model.input_shape}")
        print(f"Model output shape: {model.output_shape}")
        return model
    except Exception as e:
        print(f"ERROR loading model {path_obj.name}: {e}")
        import traceback
        traceback.print_exc()
        return None

def get_main_model():
    global _main_model
    if _main_model is None:
        _main_model = load_keras_model(MODELS_DIR / "best_model.h5")
    return _main_model

def get_single_label_model(disease_type):
    """
    Note: Single-label models are still PyTorch-based.
    This function maintains compatibility with existing single-label models.
    """
    global _models_map
    
    # Check if already loaded
    if _models_map.get(disease_type) is not None:
        return _models_map[disease_type]

    # Memory Management: Unload other single label models
    keys_to_remove = [k for k in _models_map.keys() if k != disease_type]
    for k in keys_to_remove:
        if _models_map[k] is not None:
            del _models_map[k]
            _models_map[k] = None
    
    import gc
    gc.collect()
    
    # Try to import PyTorch for single-label models
    try:
        import torch
        from torchvision import models as torch_models
        TORCH_AVAILABLE = True
    except ImportError:
        TORCH_AVAILABLE = False
        print(f"PyTorch not available for single-label model: {disease_type}")
        return None
    
    path = None
    if disease_type == 'Cardiomegaly':
        path = MODELS_DIR / "densenet_Cardiomegaly_singlelabel.pth"
    elif disease_type == 'Nodule':
        path = MODELS_DIR / "densenet_Nodule_best.pth"
    elif disease_type == 'Atelectasis':
        path = MODELS_DIR / "densenet_Atelectasis_best.pth"
    elif disease_type == 'Effusion':
        path = MODELS_DIR / "densenet_Effusion_best.pth"
        
    if path and TORCH_AVAILABLE:
        model = load_densenet_model_pytorch(path, is_single_label=True)
        if model:
            _models_map[disease_type] = model
            return model
    
    print(f"Failed to load model for {disease_type}")
    _models_map[disease_type] = None
    return None

def load_densenet_model_pytorch(path, num_classes=None, is_single_label=False):
    """Loads a DenseNet121 PyTorch model (for single-label compatibility)."""
    try:
        import torch
        from torchvision import models as torch_models
    except ImportError:
        return None
    
    path_obj = Path(path)
    
    if not path_obj.exists():
        print(f"WARNING: Model not found at {path_obj.absolute()}")
        return None

    try:
        # Load state_dict
        state_dict = torch.load(path, map_location='cpu')
        
        # Initialize base model
        with torch.no_grad():
            model = torch_models.densenet121(weights=None)
            in_features = model.classifier.in_features
            
            # 1. Determine Classifier Structure (Sequential vs Linear)
            has_sequential = 'classifier.1.weight' in state_dict or 'classifier.1.bias' in state_dict
            
            # 2. Determine Output Features (num_classes)
            out_features = 1
            if num_classes:
                out_features = num_classes
            else:
                # Inference from weight shape
                if has_sequential and 'classifier.1.weight' in state_dict:
                    out_features = state_dict['classifier.1.weight'].shape[0]
                elif 'classifier.weight' in state_dict:
                    out_features = state_dict['classifier.weight'].shape[0]
            
            # 3. Build Classifier
            if has_sequential:
                model.classifier = torch.nn.Sequential(
                    torch.nn.Dropout(0.5),
                    torch.nn.Linear(in_features, out_features)
                )
            else:
                model.classifier = torch.nn.Linear(in_features, out_features)
                
            # 4. Load Weights
            model.load_state_dict(state_dict, strict=False)
            model.eval()
            
        return model

    except Exception as e:
        print(f"ERROR loading PyTorch model {path_obj.name}: {e}")
        return None

# ==========================================
# CORE PROCESSING LOGIC
# ==========================================

def get_gradcam_keras(model, img_array, pred_index=None):
    """
    Computes Grad-CAM for a Keras model using TensorFlow GradientTape.
    
    Args:
        model: Keras model
        img_array: Preprocessed image array (batch_size, height, width, channels)
        pred_index: Index of the class to compute Grad-CAM for (None = max prediction)
    
    Returns:
        cam: Grad-CAM heatmap (normalized)
        probs: Prediction probabilities
        prediction_idx: Index of predicted class
    """
    if not ML_AVAILABLE:
        return None, None, None
    
    # Find the last convolutional layer
    last_conv_layer = None
    for layer in reversed(model.layers):
        if isinstance(layer, keras.layers.Conv2D):
            last_conv_layer = layer
            break
    
    if last_conv_layer is None:
        print("Could not find convolutional layer in model")
        return None, None, None
    
    # Create a model that maps the input image to the activations of the last conv layer
    grad_model = keras.models.Model(
        inputs=[model.input],
        outputs=[last_conv_layer.output, model.output]
    )
    
    # Compute gradient of the top predicted class with regard to the output feature map
    with tf.GradientTape() as tape:
        conv_outputs, predictions = grad_model(img_array)
        
        # Get probabilities using sigmoid (multi-label classification)
        probs = tf.sigmoid(predictions).numpy()[0]
        
        # Determine which class to compute Grad-CAM for
        if pred_index is None:
            pred_index = int(np.argmax(probs))
        
        # Get the score for the predicted class
        class_channel = predictions[:, pred_index]
    
    # Gradient of the output neuron with regard to the output feature map
    grads = tape.gradient(class_channel, conv_outputs)
    
    # Mean intensity of the gradient over a specific feature map channel
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
    
    # Multiply each channel by its importance
    conv_outputs = conv_outputs[0]
    pooled_grads_value = pooled_grads.numpy()
    for i in range(pooled_grads_value.shape[0]):
        conv_outputs = conv_outputs[:, :, i] * pooled_grads_value[i] if i == 0 else \
                       conv_outputs + conv_outputs[:, :, i] * pooled_grads_value[i]
    
    # Average of the weighted feature maps
    heatmap = tf.reduce_mean(conv_outputs, axis=-1) if len(conv_outputs.shape) > 2 else conv_outputs
    
    # Normalize the heatmap
    heatmap = np.maximum(heatmap, 0)
    max_val = np.max(heatmap)
    if max_val > 0:
        heatmap = heatmap / max_val
    
    # Resize heatmap to match input image size
    heatmap = cv2.resize(heatmap.numpy() if hasattr(heatmap, 'numpy') else heatmap, (224, 224))
    
    return heatmap, probs, pred_index

def get_gradcam_and_bbox_pytorch(model, input_tensor, target_class_idx=None, is_multi_label=True):
    """
    Computes Grad-CAM and Bounding Box for PyTorch models (single-label compatibility).
    """
    try:
        import torch
        import torch.nn.functional as F
    except ImportError:
        return None, None, None, None
    
    gradients = []
    activations = []

    def save_grad(module, grad_input, grad_output):
        gradients.append(grad_output[0].detach().cpu())

    def save_activation(module, input, output):
        activations.append(output.detach().cpu())

    # Hook registration (last conv layer of features)
    target_layer = model.features[-1]
    hook_a = target_layer.register_forward_hook(save_activation)
    hook_g = target_layer.register_backward_hook(save_grad)

    try:
        # Forward
        output = model(input_tensor)
        
        probs = None
        prediction_idx = 0
        score = None

        if is_multi_label:
            probs = torch.sigmoid(output).detach().cpu().numpy()[0]
            prediction_idx = int(np.argmax(probs)) if target_class_idx is None else target_class_idx
            score = output[0, prediction_idx]
        else:
            # Single label (binary)
            probs = torch.sigmoid(output).detach().cpu().item()
            score = output.squeeze()
            prediction_idx = 0

        # Backward
        model.zero_grad()
        score.backward()

        # Get gradients and activations
        grads = gradients[0]
        acts = activations[0]
        
        # Calculate weights and CAM
        weights = grads.mean(dim=[2,3], keepdim=True)
        cam = F.relu((weights * acts).sum(dim=1, keepdim=True))
        cam = F.interpolate(cam, size=(224,224), mode='bilinear', align_corners=False)
        cam = cam.squeeze().numpy()
        
        # Normalize CAM
        mn, mx = cam.min(), cam.max()
        if mx - mn > 0:
            cam = (cam - mn) / (mx - mn)
        
        # Bbox calculation
        bbox = None
        if CV2_AVAILABLE:
            heatmap_thresh = np.uint8(255 * cam)
            _, binary_map = cv2.threshold(heatmap_thresh, 200, 255, cv2.THRESH_BINARY)
            contours, _ = cv2.findContours(binary_map, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            if contours:
                largest_contour = max(contours, key=cv2.contourArea)
                x, y, w, h = cv2.boundingRect(largest_contour)
                bbox = {"x": int(x), "y": int(y), "width": int(w), "height": int(h)}

        # Clear memory
        del grads, acts, weights, output
        gradients.clear()
        activations.clear()
        
        return cam, probs, prediction_idx, bbox
        
    finally:
        # Always cleanup hooks
        hook_a.remove()
        hook_g.remove()

def get_bounding_box_from_heatmap(cam):
    """Calculate bounding box from Grad-CAM heatmap."""
    if not CV2_AVAILABLE:
        return None
    
    try:
        heatmap_thresh = np.uint8(255 * cam)
        _, binary_map = cv2.threshold(heatmap_thresh, 200, 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(binary_map, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            largest_contour = max(contours, key=cv2.contourArea)
            x, y, w, h = cv2.boundingRect(largest_contour)
            return {"x": int(x), "y": int(y), "width": int(w), "height": int(h)}
    except Exception as e:
        print(f"Error calculating bounding box: {e}")
    
    return None

def create_overlay(original_img_pil, cam):
    if not CV2_AVAILABLE:
        # Return empty bytes if CV2 not available
        return b''
    
    img_cv = cv2.cvtColor(np.array(original_img_pil.resize((224,224))), cv2.COLOR_RGB2BGR)
    heatmap = cv2.applyColorMap(np.uint8(255 * cam), cv2.COLORMAP_JET)
    superimposed_img = cv2.addWeighted(img_cv, 0.6, heatmap, 0.4, 0)
    _, encoded_img = cv2.imencode('.jpg', superimposed_img)
    return encoded_img.tobytes()

# ==========================================
# PUBLIC API
# ==========================================

def process_xray(image_bytes):
    """Main entry point for general analysis using TensorFlow model."""
    if not ML_AVAILABLE:
        return {
            "error": "ML libraries not installed",
            "message": "Please install TensorFlow: pip install -r requirements.txt"
        }
    
    img_hash = _get_image_hash(image_bytes)
    if img_hash in _cache:
        return _cache[img_hash]

    model = get_main_model()
    if not model:
        return {"error": "Main model not loaded"}

    # Load image
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    
    # Preprocess for TensorFlow model
    img_array = preprocess_image_for_model(img)
    if img_array is None:
        return {"error": "Failed to preprocess image"}

    # Process with Grad-CAM
    cam, probs, target_class = get_gradcam_keras(model, img_array)
    
    if cam is None:
        return {"error": "Failed to compute Grad-CAM"}
    
    # Calculate bounding box
    bbox = get_bounding_box_from_heatmap(cam)
    
    # Create overlay image
    encoded_img = create_overlay(img, cam)
    
    result = {
        "prediction": LABELS[target_class],
        "probabilities": dict(zip(LABELS, [float(p) for p in probs])),
        "heatmap_image": encoded_img,
        "bounding_box": bbox
    }
    
    # Cache management
    if len(_cache) > 10:
        _cache.pop(next(iter(_cache)))
    _cache[img_hash] = result
    
    return result

def process_single_label_analysis(image_bytes, disease_type):
    """Entry point for specific disease analysis using PyTorch models."""
    if not ML_AVAILABLE:
        return {
            "error": "ML libraries not installed",
            "message": "Please install required libraries: pip install -r requirements.txt"
        }
    
    model = get_single_label_model(disease_type)
    if not model:
        return {"error": f"Model for {disease_type} not found"}

    try:
        # Import PyTorch for single-label processing
        import torch
        from torchvision import transforms
    except ImportError:
        return {"error": "PyTorch not available for single-label models"}
    
    # Define PyTorch transform
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])
    ])
    
    try:
        # Load and preprocess image
        img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        input_tensor = transform(img).unsqueeze(0)
        
        # Process (gradients needed for Grad-CAM)
        cam, prob, _, bbox = get_gradcam_and_bbox_pytorch(model, input_tensor, is_multi_label=False)
        
        encoded_img = create_overlay(img, cam)
        
        # Clear tensors and gradients from memory
        del input_tensor
        if hasattr(model, 'zero_grad'):
            model.zero_grad()
        torch.cuda.empty_cache() if torch.cuda.is_available() else None
        
        return {
            "disease": disease_type,
            "probability": float(prob) if isinstance(prob, (np.ndarray, torch.Tensor)) else prob,
            "heatmap_image": encoded_img,
            "bounding_box": bbox
        }
    except Exception as e:
        print(f"Error in single label analysis for {disease_type}: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}

def get_bounding_box_from_image_path(image_path):
    """Legacy helper for calculating bbox from saved gradcam image."""
    if not CV2_AVAILABLE:
        return None
    
    try:
        img = cv2.imread(str(image_path))
        if img is None: return None
        
        red_channel = img[:,:,2]
        _, binary = cv2.threshold(red_channel, 180, 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            largest_contour = max(contours, key=cv2.contourArea)
            x, y, w, h = cv2.boundingRect(largest_contour)
            return {"x": int(x), "y": int(y), "width": int(w), "height": int(h)}
    except Exception as e:
        print(f"Error calculating bbox from file: {e}")
    return None
