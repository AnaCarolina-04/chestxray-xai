"""
Script para probar la carga y funcionamiento del modelo best_model.h5
"""
import sys
sys.path.insert(0, 'c:/Users/anaca/OneDrive/Escritorio/chestxray-xai/XAI/app/Backend')

from model_service import get_main_model, process_xray
from pathlib import Path
import numpy as np
from PIL import Image

print("=" * 60)
print("Probando carga del modelo best_model.h5")
print("=" * 60)

# 1. Probar carga del modelo
print("\n1. Cargando modelo...")
model = get_main_model()

if model is None:
    print("ERROR: El modelo no se pudo cargar")
    sys.exit(1)

print(f"✓ Modelo cargado exitosamente")
print(f"  - Tipo: {type(model)}")
print(f"  - Input shape: {model.input_shape}")
print(f"  - Output shape: {model.output_shape}")

# 2. Crear una imagen de prueba
print("\n2. Creando imagen de prueba...")
test_image = Image.new('RGB', (224, 224), color=(128, 128, 128))
import io
img_bytes = io.BytesIO()
test_image.save(img_bytes, format='JPEG')
img_bytes = img_bytes.getvalue()
print(f"✓ Imagen de prueba creada ({len(img_bytes)} bytes)")

# 3. Probar predicción
print("\n3. Probando predicción...")
try:
    result = process_xray(img_bytes)
    
    if "error" in result:
        print(f"ERROR en predicción: {result['error']}")
        sys.exit(1)
    
    print("✓ Predicción exitosa!")
    print(f"  - Predicción: {result['prediction']}")
    print(f"  - Probabilidades:")
    for label, prob in result['probabilities'].items():
        print(f"    {label}: {prob:.4f}")
    print(f"  - Bounding Box: {result.get('bounding_box', 'N/A')}")
    print(f"  - Heatmap generado: {len(result['heatmap_image'])} bytes")
    
except Exception as e:
    print(f"ERROR durante predicción: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 60)
print("TODAS LAS PRUEBAS PASARON EXITOSAMENTE ✓")
print("=" * 60)
