# Try to import ML libraries - they're optional for running the web server
try:
    import torch
    import torch.nn.functional as F
    from torchvision import models, transforms
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False
    print("⚠️  WARNING: PyTorch not installed. ML features will be disabled.")
    print("   To enable ML features, install: pip install -r requirements-ml.txt")

from PIL import Image
import numpy as np
import cv2
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

# Only initialize transform if ML libraries are available
if ML_AVAILABLE:
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])
    ])
else:
    transform = None

def _get_image_hash(image_bytes):
    return hashlib.md5(image_bytes).hexdigest()

def load_densenet_model(path, num_classes=None, is_single_label=False):
    """Loads a DenseNet121 model with specified weights, adapting structure to state_dict."""
    path_obj = Path(path)
    print(f"DEBUG: Checking model path: {path_obj.absolute()}")
    
    if not path_obj.exists():
        print(f"WARNING: Model not found at {path_obj.absolute()}")
        return None

    try:
        # Load state_dict with memory optimization
        state_dict = torch.load(path, map_location='cpu', weights_only=False)
        
        # Initialize base model with memory efficiency
        with torch.no_grad():
            model = models.densenet121(weights=None)
            in_features = model.classifier.in_features
            
            # Check architecture type from keys
            has_sequential = 'classifier.1.weight' in state_dict or 'classifier.1.bias' in state_dict
            
            # Determine output features
            out_features = 1
            if num_classes:
                out_features = num_classes
            
            # Configure classifier
            if has_sequential:
                # Sequential(Dropout, Linear)
                model.classifier = torch.nn.Sequential(
                    torch.nn.Dropout(0.5),
                    torch.nn.Linear(in_features, out_features)
                )
            else:
                # Simple Linear
                model.classifier = torch.nn.Linear(in_features, out_features)
                
            # Load weights
            model.load_state_dict(state_dict, strict=True)
            model.eval()
            
        # Clear state_dict from memory
        del state_dict
        torch.cuda.empty_cache() if torch.cuda.is_available() else None
        
        structure_type = "Sequential" if has_sequential else "Linear"
        print(f"DEBUG: Model loaded from {path_obj.name} (Structure: {structure_type}, Output: {out_features})")
        return model

    except Exception as e:
        print(f"ERROR loading model {path_obj.name}: {e}")
        import traceback
        traceback.print_exc()
        return None

# ==========================================
# MODEL INITIALIZATION
# ==========================================

# Main Model
# Lazy Loading Storage
_main_model = None
_models_map = {}

def get_main_model():
    global _main_model
    if _main_model is None:
        print("⏳ Loading Main DenseNet Model...")
        _main_model = load_densenet_model(MODELS_DIR / "best_densenet.pth", num_classes=5)
    return _main_model

def get_single_label_model(disease_type):
    global _models_map
    
    # Check if already loaded
    if _models_map.get(disease_type) is not None:
        return _models_map[disease_type]

    # Memory Management: Unload other single label models
    print(f"🧹 Clearing memory for {disease_type} model...")
    keys_to_remove = [k for k in _models_map.keys() if k != disease_type]
    for k in keys_to_remove:
        if _models_map[k] is not None:
            del _models_map[k]
            _models_map[k] = None
    
    import gc
    gc.collect()
    
    print(f"⏳ Loading Model for {disease_type}...")
    path = None
    if disease_type == 'Cardiomegaly':
        path = MODELS_DIR / "densenet_Cardiomegaly_singlelabel.pth"
    elif disease_type == 'Nodule':
        path = MODELS_DIR / "densenet_Nodule_best.pth"
    elif disease_type == 'Atelectasis':
        path = MODELS_DIR / "densenet_Atelectasis_best.pth"
        
    if path:
        model = load_densenet_model(path, is_single_label=True)
        if model:
            _models_map[disease_type] = model
            return model
    
    print(f"❌ Failed to load model for {disease_type}")
    _models_map[disease_type] = None
    return None

# ==========================================
# CORE PROCESSING LOGIC
# ==========================================

def get_gradcam_and_bbox(model, input_tensor, target_class_idx=None, is_multi_label=True):
    """
    Computes Grad-CAM and Bounding Box.
    If target_class_idx is None, assumes binary classification or uses 0.
    """
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
            prediction_idx = 0 # Only one output

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
        heatmap_thresh = np.uint8(255 * cam)
        _, binary_map = cv2.threshold(heatmap_thresh, 200, 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(binary_map, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        bbox = None
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

def create_overlay(original_img_pil, cam):
    img_cv = cv2.cvtColor(np.array(original_img_pil.resize((224,224))), cv2.COLOR_RGB2BGR)
    heatmap = cv2.applyColorMap(np.uint8(255 * cam), cv2.COLORMAP_JET)
    superimposed_img = cv2.addWeighted(img_cv, 0.6, heatmap, 0.4, 0)
    _, encoded_img = cv2.imencode('.jpg', superimposed_img)
    return encoded_img.tobytes()

# ==========================================
# PUBLIC API
# ==========================================

def process_xray(image_bytes):
    """Main entry point for general analysis."""
    if not ML_AVAILABLE:
        return {
            "error": "ML libraries not installed",
            "message": "Please install PyTorch: pip install -r requirements-ml.txt"
        }
    
    img_hash = _get_image_hash(image_bytes)
    if img_hash in _cache:
        print(f"✅ Using cached result for {img_hash[:8]}")
        return _cache[img_hash]

    model = get_main_model()
    if not model:
        return {"error": "Main model not loaded"}

    # Load image
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    input_tensor = transform(img).unsqueeze(0)

    # Process
    cam, probs, target_class, bbox = get_gradcam_and_bbox(model, input_tensor, is_multi_label=True)
    
    # Result
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
    """Entry point for specific disease analysis."""
    if not ML_AVAILABLE:
        return {
            "error": "ML libraries not installed",
            "message": "Please install PyTorch: pip install -r requirements-ml.txt"
        }
    
    model = get_single_label_model(disease_type)
    if not model:
        return {"error": f"Model for {disease_type} not found"}

    try:
        # Load and preprocess image
        img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        input_tensor = transform(img).unsqueeze(0)

        print(f"✅ Model loaded. Starting inference for {disease_type}...")
        
        # Process (gradients needed for Grad-CAM)
        cam, prob, _, bbox = get_gradcam_and_bbox(model, input_tensor, is_multi_label=False)
        
        print(f"✅ Inference complete for {disease_type}. Probability: {prob}")
        
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
