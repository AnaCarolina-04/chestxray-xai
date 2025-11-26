from flask import Flask, jsonify, request, send_file, send_from_directory, abort
from flask_cors import CORS
from model_service import process_xray  # Importamos tu función IA
import io
import os
from pathlib import Path
import sys

app = Flask(__name__)
CORS(app)

@app.route("/api/saludo")
def saludo():
    return jsonify({"mensaje": "Hola desde Flask! Backend funcionando!"})

@app.route("/api/create-react-app")
def create_react_app_instructions():
    return jsonify({
        "descripcion": "Instrucciones para crear un proyecto React en la carpeta frontend (ejecútalas localmente).",
        "recomendacion": "Asegúrate de tener Node.js y npm instalados antes de ejecutar los comandos.",
        "comandos_windows": [
            "cd C:\\\\Users\\\\anaca\\\\Desktop\\\\XAI",
            "npx create-react-app frontend",
            "cd frontend",
            "npm install react-router-dom",
            "npm start"
        ],
        "nota": "Si ya existe la carpeta 'frontend', muévela o elimínala antes de crear el proyecto con npx."
    })

# 📌 Ruta para obtener predicción + probabilidades
@app.post("/api/predict")
def predict():
    if "file" not in request.files:
        return jsonify({"error": "Debes enviar una imagen con el campo 'file'"}), 400
    
    image_bytes = request.files['file'].read()
    result = process_xray(image_bytes)

    return jsonify({
        "prediction": result["prediction"],
        "probabilities": result["probabilities"]
    })

# 📌 Ruta para obtener la imagen Grad-CAM
@app.post("/api/gradcam")
def gradcam():
    if "file" not in request.files:
        return jsonify({"error": "Debes enviar una imagen con el campo 'file'"}), 400
    
    image_bytes = request.files['file'].read()
    result = process_xray(image_bytes)

    return send_file(
        io.BytesIO(result["heatmap_image"]),
        mimetype="image/jpeg",
        as_attachment=False,
        download_name="gradcam.jpg"
    )

# Servir frontend estático desde app/frontend
BASE_DIR = Path(__file__).resolve().parents[1]  # -> ...\XAI\app
STATIC_DIR = BASE_DIR / "frontend"               # -> ...\XAI\app\frontend

if not STATIC_DIR.is_dir():
    sys.stderr.write(f"AVISO: no existe el frontend en {STATIC_DIR}. Usando carpeta del backend.\n")
    STATIC_DIR = Path(__file__).resolve().parent
else:
    sys.stderr.write(f"Sirviendo frontend estático desde: {STATIC_DIR}\n")

STATIC_DIR = str(STATIC_DIR)

@app.route("/", defaults={"path": "index.html"})
@app.route("/<path:path>")
def serve_frontend(path):
    # No manejamos rutas /api con este endpoint
    if request.path.startswith("/api") or path.startswith("api/"):
        abort(404)
    # Archivo solicitado o fallback a index.html (SPA)
    full_path = os.path.join(STATIC_DIR, path)
    if not os.path.isfile(full_path):
        index_path = os.path.join(STATIC_DIR, "index.html")
        if os.path.isfile(index_path):
            return send_from_directory(STATIC_DIR, "index.html")
        abort(404)
    return send_from_directory(STATIC_DIR, path)

if __name__ == "__main__":
    app.run(debug=True)
