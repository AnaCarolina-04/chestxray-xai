from flask import Flask, jsonify, request, send_file, send_from_directory, abort
from flask_cors import CORS
from model_service import process_xray
from models import db, User, Patient, Disease, Xray, Prediction, GradCam
from pathlib import Path
import io
import sys  # ✅ AGREGAR ESTA LÍNEA
from datetime import datetime

app = Flask(__name__)
CORS(app)

# ============================
#       CONFIGURACIÓN DB
# ============================
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "database.db"
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

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

# 📌 Obtener todos los pacientes
@app.get("/api/patients")
def get_patients():
    try:
        patients = Patient.query.all()
        return jsonify([{
            "id": p.id,
            "name": p.name,
            "age": p.age,
            "gender": p.gender,
            "created_at": p.created_at.isoformat() if p.created_at else None
        } for p in patients])
    except Exception as e:
        print(f"❌ Error en get_patients: {e}")
        return jsonify({"error": str(e)}), 500

# 📌 Crear nuevo paciente
@app.post("/api/patients")
def create_patient():
    try:
        data = request.json
        
        # Validar datos
        if not data.get('name'):
            return jsonify({"error": "El nombre es requerido"}), 400
        if not data.get('age'):
            return jsonify({"error": "La edad es requerida"}), 400
        
        patient = Patient(
            name=data.get('name'),
            age=int(data.get('age')),
            gender=data.get('gender', 'M')
        )
        db.session.add(patient)
        db.session.commit()
        
        print(f"✅ Paciente creado: {patient.name} (ID: {patient.id})")
        
        return jsonify({
            "id": patient.id,
            "name": patient.name,
            "message": "Paciente creado exitosamente"
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error al crear paciente: {e}")
        return jsonify({"error": str(e)}), 500

# 📌 Subir radiografía asociada a un paciente
@app.post("/api/upload-xray")
def upload_xray():
    try:
        if "file" not in request.files:
            return jsonify({"error": "No se envió archivo"}), 400
        
        patient_id = request.form.get('patient_id')
        if not patient_id:
            return jsonify({"error": "Se requiere patient_id"}), 400
        
        patient = Patient.query.get(patient_id)
        if not patient:
            return jsonify({"error": "Paciente no encontrado"}), 404
        
        file = request.files['file']
        image_bytes = file.read()
        
        # Guardar archivo físicamente
        filename = f"{patient_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
        filepath = UPLOADS_DIR / filename
        with open(filepath, 'wb') as f:
            f.write(image_bytes)
        
        # Guardar en base de datos
        xray = Xray(
            patient_id=patient_id,
            image_path=str(filepath),
            upload_date=datetime.now()
        )
        db.session.add(xray)
        db.session.commit()
        
        print(f"✅ Radiografía subida: {filename} para paciente {patient.name}")
        
        return jsonify({
            "xray_id": xray.id,
            "patient_name": patient.name,
            "filename": filename,
            "message": "Radiografía subida exitosamente"
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error al subir radiografía: {e}")
        return jsonify({"error": str(e)}), 500

# 📌 Obtener radiografías sin diagnóstico
@app.get("/api/xrays/pending")
def get_pending_xrays():
    try:
        xrays = Xray.query.filter(~Xray.predictions.any()).all()
        return jsonify([{
            "id": x.id,
            "patient_id": x.patient_id,
            "patient_name": x.patient.name if x.patient else "Desconocido",
            "upload_date": x.upload_date.isoformat() if x.upload_date else None,
            "image_path": x.image_path
        } for x in xrays])
    except Exception as e:
        print(f"❌ Error en get_pending_xrays: {e}")
        return jsonify({"error": str(e)}), 500

# 📌 Obtener todas las radiografías de un paciente
@app.get("/api/patients/<int:patient_id>/xrays")
def get_patient_xrays(patient_id):
    try:
        xrays = Xray.query.filter_by(patient_id=patient_id).all()
        return jsonify([{
            "id": x.id,
            "upload_date": x.upload_date.isoformat() if x.upload_date else None,
            "has_prediction": len(x.predictions) > 0,
            "prediction": x.predictions[0].disease.name if x.predictions else None
        } for x in xrays])
    except Exception as e:
        print(f"❌ Error en get_patient_xrays: {e}")
        return jsonify({"error": str(e)}), 500

# 📌 Procesar radiografía existente (CNN + Grad-CAM)
@app.post("/api/xrays/<int:xray_id>/process")
def process_existing_xray(xray_id):
    try:
        xray = Xray.query.get(xray_id)
        if not xray:
            return jsonify({"error": "Radiografía no encontrada"}), 404
        
        # Leer imagen del disco
        with open(xray.image_path, 'rb') as f:
            image_bytes = f.read()
        
        # Procesar con CNN
        result = process_xray(image_bytes)
        
        # Guardar predicción en BD
        disease = Disease.query.filter_by(name=result['prediction']).first()
        if not disease:
            disease = Disease(name=result['prediction'])
            db.session.add(disease)
            db.session.commit()
        
        # Guardar Grad-CAM
        gradcam_filename = f"gradcam_{xray_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
        gradcam_path = UPLOADS_DIR / gradcam_filename
        with open(gradcam_path, 'wb') as f:
            f.write(result['heatmap_image'])
        
        gradcam = GradCam(
            xray_id=xray_id,
            image_path=str(gradcam_path)
        )
        db.session.add(gradcam)
        
        # Crear predicción
        prediction = Prediction(
            xray_id=xray_id,
            disease_id=disease.id,
            confidence=result['probabilities'][result['prediction']],
            validated=False
        )
        db.session.add(prediction)
        db.session.commit()
        
        print(f"✅ Procesada radiografía {xray_id}: {result['prediction']}")
        
        return jsonify({
            "prediction": result['prediction'],
            "confidence": result['probabilities'][result['prediction']],
            "probabilities": result['probabilities'],
            "gradcam_id": gradcam.id,
            "xray_id": xray_id
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error al procesar radiografía: {e}")
        return jsonify({"error": str(e)}), 500

# 📌 Obtener imagen de radiografía original
@app.get("/api/xrays/<int:xray_id>/image")
def get_xray_image(xray_id):
    try:
        xray = Xray.query.get(xray_id)
        if not xray:
            return jsonify({"error": "Radiografía no encontrada"}), 404
        
        return send_file(xray.image_path, mimetype='image/jpeg')
    except Exception as e:
        print(f"❌ Error al obtener imagen: {e}")
        return jsonify({"error": str(e)}), 500

# 📌 Obtener imagen Grad-CAM
@app.get("/api/gradcam/<int:gradcam_id>/image")
def get_gradcam_image(gradcam_id):
    try:
        gradcam = GradCam.query.get(gradcam_id)
        if not gradcam:
            return jsonify({"error": "Grad-CAM no encontrado"}), 404
        
        return send_file(gradcam.image_path, mimetype='image/jpeg')
    except Exception as e:
        print(f"❌ Error al obtener Grad-CAM: {e}")
        return jsonify({"error": str(e)}), 500

# 📌 Validar diagnóstico
@app.post("/api/predictions/<int:prediction_id>/validate")
def validate_prediction(prediction_id):
    try:
        prediction = Prediction.query.get(prediction_id)
        if not prediction:
            return jsonify({"error": "Predicción no encontrada"}), 404
        
        data = request.json
        prediction.validated = data.get('validated', True)
        prediction.doctor_notes = data.get('notes', '')
        db.session.commit()
        
        print(f"✅ Validación guardada para predicción {prediction_id}")
        
        return jsonify({"message": "Validación guardada exitosamente"})
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error al validar: {e}")
        return jsonify({"error": str(e)}), 500

# 📌 Ruta para obtener predicción (LEGACY - mantener compatibilidad)
@app.post("/api/predict")
def predict():
    try:
        if "file" not in request.files:
            return jsonify({"error": "Debes enviar una imagen con el campo 'file'"}), 400
        
        image_bytes = request.files['file'].read()
        result = process_xray(image_bytes)

        return jsonify({
            "prediction": result["prediction"],
            "probabilities": result["probabilities"]
        })
    except Exception as e:
        print(f"❌ Error en predict: {e}")
        return jsonify({"error": str(e)}), 500

# 📌 Ruta para obtener la imagen Grad-CAM (LEGACY)
@app.post("/api/gradcam")
def gradcam():
    try:
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
    except Exception as e:
        print(f"❌ Error en gradcam: {e}")
        return jsonify({"error": str(e)}), 500

# ============================
#      SERVICIO FRONTEND
# ============================

FRONTEND_DIR = BASE_DIR.parent / "frontend"

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if path and (FRONTEND_DIR / path).exists():
        return send_from_directory(FRONTEND_DIR, path)
    return send_from_directory(FRONTEND_DIR, "index.html")

# ============================
#       EJECUCIÓN
# ============================

if __name__ == "__main__":
    print(f"📁 Serviendo frontend desde: {FRONTEND_DIR}")
    print(f"📁 Base de datos SQLite: {DB_PATH}")
    print(f"📁 Carpeta de uploads: {UPLOADS_DIR}")
    app.run(debug=True, host="0.0.0.0", port=5000)
