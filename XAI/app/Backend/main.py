try:
    from fastapi import FastAPI, File, UploadFile
except Exception as e:
    raise ImportError(
        "No se pudo importar FastAPI. Instala con: pip install fastapi uvicorn\n"
        "Error original: " + str(e)
    ) from e

from PIL import Image
import io
import sys
import os
import base64

app = FastAPI()

# Asegurar que la carpeta 'app' (y su submódulo services) esté en sys.path
_current_dir = os.path.dirname(os.path.abspath(__file__))          # ...\XAI\app\Static
_app_dir = os.path.dirname(_current_dir)                           # ...\XAI\app
if _app_dir not in sys.path:
    sys.path.insert(0, _app_dir)

# Intentar importar el servicio desde distintas rutas (robusto en distintos layouts)
process_xray = None
_import_candidates = [
    "services.model_service",
    "app.services.model_service",
    "model_service",
    "app.model_service",
]
for mod in _import_candidates:
    try:
        module = __import__(mod, fromlist=["process_xray"])
        process_xray = getattr(module, "process_xray")
        break
    except Exception:
        process_xray = None

@app.post("/process-xray")
async def analyze_xray(file: UploadFile = File(...)):
    if process_xray is None:
        return {"error": "process_xray not available. Check service import paths."}

    # Leer imagen recibida
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")

    # Procesar con tu función (debe devolver (PIL.Image, resultado))
    processed_image, result = process_xray(image)

    # Convertimos resultado a base64 para enviarlo al frontend
    img_byte_arr = io.BytesIO()
    processed_image.save(img_byte_arr, format="PNG")
    encoded_img_b64 = base64.b64encode(img_byte_arr.getvalue()).decode("ascii")

    return {
        "diagnosis": result,
        "processed_image_b64": encoded_img_b64
    }
