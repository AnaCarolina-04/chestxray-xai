from flask import Flask, jsonify, request, send_file, send_from_directory, abort
from flask_cors import CORS
from model_service import process_xray
from models import db, User, Patient, Disease, Xray, Prediction, GradCam
import io
import os
from pathlib import Path

app = Flask(__name__)
CORS(app)

# ============================
#       CONFIGURACIÓN DB
# ============================
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "database.db"

app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{DB_PATH}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# Crear las tablas automáticamente
with app.app_context():
    db.create_all()
    print("✅ database.db creado con todas las tablas")

# ============================
#         API ENDPOINTS
# ============================

@app.route("/api/saludo")
def saludo():
    return jsonify({"mensaje": "Hola desde Flask! Backend funcionando!"})

@app.route("/api/create-react-app")
def create_react_app_instructions():
    return jsonify({
        "descripcion": "Instrucciones para crear un proyecto React en la carpeta frontend.",
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

# 📌 Ruta para obtener predicción
@app.post("/api/predict")
def predict():
    if "file" not in request.files:
        return jsonify({"error": "Debes enviar una imagen con el campo 'file'"}), 400
    
    image_bytes = request.files['file'].read()
    result = process_xray(image_bytes)

    return jsonify({
        "prediction": result["prediction"]  # Solo la enfermedad
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

# ============================
#      SERVICIO FRONTEND
# ============================

FRONTEND_DIR = BASE_DIR.parent / "frontend"

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if path.startswith("api"):
        abort(404)

    # Si no se indica archivo → enviar index.html
    if path == "" or path == "/":
        return send_from_directory(FRONTEND_DIR, "index.html")

    file_path = FRONTEND_DIR / path

    if file_path.exists() and file_path.is_file():
        return send_from_directory(FRONTEND_DIR, path)

    # SPA fallback
    return send_from_directory(FRONTEND_DIR, "index.html")

# ============================
#       EJECUCIÓN
# ============================

if __name__ == "__main__":
    print(f"📁 Serviendo frontend desde: {FRONTEND_DIR}")
    print(f"📁 Base de datos SQLite: {DB_PATH}")
    app.run(debug=True, host="0.0.0.0", port=5000)
