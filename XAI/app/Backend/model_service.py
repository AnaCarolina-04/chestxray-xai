import torch
import torch.nn.functional as F
from torchvision import models, transforms
from PIL import Image
import numpy as np
import cv2
import io
from pathlib import Path
import sys
import hashlib

# -----------------------------------------------------
# 🔹 1. Cargar modelo automáticamente
# -----------------------------------------------------
# MODEL_PATH = "models/best_densenet.pth"  
MODEL_PATH = str(Path(__file__).resolve().parents[1] / "models" / "best_densenet.pth")
if not Path(MODEL_PATH).exists():
    sys.stderr.write(f"ERROR: modelo no encontrado en {MODEL_PATH}\n")
    raise FileNotFoundError(f"Modelo no encontrado: {MODEL_PATH}")

model = models.densenet121(weights=None)
in_features = model.classifier.in_features
model.classifier = torch.nn.Sequential(
    torch.nn.Dropout(0.5),
    torch.nn.Linear(in_features, 5)  
)

model.load_state_dict(torch.load(MODEL_PATH, map_location='cpu'))
model.eval()

LABELS = ['Atelectasis', 'Effusion', 'Pneumonia', 'Cardiomegaly', 'Nodule']

# -----------------------------------------------------
# 🔹 2. Transformación de imágenes
# -----------------------------------------------------
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])
])

# -----------------------------------------------------
# 🔹 2.5. Sistema de caché
# -----------------------------------------------------
_cache = {}

def _get_image_hash(image_bytes):
    """Genera un hash único para la imagen"""
    return hashlib.md5(image_bytes).hexdigest()

# -----------------------------------------------------
# 🔹 3. Función principal: clasificación + Grad-CAM
# -----------------------------------------------------
def process_xray(image_bytes):
    # Verificar si ya procesamos esta imagen
    img_hash = _get_image_hash(image_bytes)
    if img_hash in _cache:
        print(f"✅ Usando resultado cacheado para imagen {img_hash[:8]}...")
        return _cache[img_hash]
    
    print(f"🔄 Procesando nueva imagen {img_hash[:8]}...")
    
    # convertir bytes en imagen PIL
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    input_tensor = transform(img).unsqueeze(0)

    # Grad-CAM
    gradients = []
    activations = []

    def save_grad(module, grad_input, grad_output):
        gradients.append(grad_output[0])

    def save_activation(module, input, output):
        activations.append(output)

    target_layer = model.features[-1]
    target_layer.register_forward_hook(save_activation)
    target_layer.register_backward_hook(save_grad)

    # forward + backward
    output = model(input_tensor)
    probs = torch.sigmoid(output).detach().numpy()[0]

    # 🔹 DEBUG (opcional, puedes eliminarlo después)
    print(f"📊 Probabilidades: {dict(zip(LABELS, [f'{p:.2%}' for p in probs]))}")
    
    target_class = int(np.argmax(probs))  # clase más probable
    
    # 🔹 DEBUG (opcional)
    print(f"✅ Predicción: {LABELS[target_class]} ({probs[target_class]:.2%})")
    
    score = output[0, target_class]
    model.zero_grad()
    score.backward()

    grads = gradients[0].detach()
    acts = activations[0].detach()
    weights = grads.mean(dim=[2,3], keepdim=True)
    cam = F.relu((weights * acts).sum(dim=1, keepdim=True))
    cam = F.interpolate(cam, size=(224,224), mode='bilinear', align_corners=False)
    cam = cam.squeeze().numpy()
    cam = (cam - cam.min()) / (cam.max() - cam.min())

    # Superposición de Grad-CAM
    img_cv = cv2.cvtColor(np.array(img.resize((224,224))), cv2.COLOR_RGB2BGR)
    heatmap = cv2.applyColorMap(np.uint8(255 * cam), cv2.COLORMAP_JET)
    superimposed_img = cv2.addWeighted(img_cv, 0.6, heatmap, 0.4, 0)

    # Convertir a bytes para enviar al frontend
    _, encoded_img = cv2.imencode('.jpg', superimposed_img)

    result = {
        "prediction": LABELS[target_class],
        "probabilities": dict(zip(LABELS, [float(p) for p in probs])),
        "heatmap_image": encoded_img.tobytes()
    }
    
    # Guardar en cache (limitar tamaño del cache a 10 imágenes)
    if len(_cache) > 10:
        _cache.pop(next(iter(_cache)))  # Eliminar la más antigua
    _cache[img_hash] = result
    
    return result
