from flask import Blueprint, jsonify, request, send_file
from models import db, Patient, Xray, Prediction, GradCam, Disease
from model_service import process_xray, process_single_label_analysis, get_bounding_box_from_image_path
from datetime import datetime
from pathlib import Path
import base64

from config import UPLOADS_DIR
from .utils import handle_errors

bp = Blueprint('xrays', __name__)

@bp.post("/api/upload-xray")
@handle_errors
def upload_xray():
    if "file" not in request.files: return jsonify({"error": "No se envió archivo"}), 400
    patient_id = request.form.get('patient_id')
    if not patient_id: return jsonify({"error": "Se requiere patient_id"}), 400
    
    patient = Patient.query.get(patient_id)
    if not patient: return jsonify({"error": "Paciente no encontrado"}), 404
    
    file = request.files['file']
    if file.filename == '': return jsonify({"error": "Nombre de archivo vacío"}), 400
    
    image_bytes = file.read()
    filename = f"{patient_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
    filepath = UPLOADS_DIR / filename
    
    with open(filepath, 'wb') as f:
        f.write(image_bytes)
    
    xray = Xray(patient_id=patient_id, image_path=str(filepath), upload_date=datetime.now())
    db.session.add(xray)
    db.session.commit()
    
    return jsonify({
        "xray_id": xray.id,
        "patient_name": patient.name,
        "filename": filename,
        "message": "Radiografía subida exitosamente"
    }), 201

@bp.get("/api/xrays/all")
@handle_errors
def get_all_xrays():
    xrays = Xray.query.all()
    result = []
    for x in xrays:
        has_prediction = len(x.predictions) > 0
        prediction_name = x.predictions[0].disease.name if has_prediction else None
        result.append({
            "id": x.id,
            "patient_id": x.patient_id,
            "patient_name": x.patient.name if x.patient else "Desconocido",
            "upload_date": x.upload_date.isoformat() if x.upload_date else None,
            "has_prediction": has_prediction,
            "prediction": prediction_name
        })
    return jsonify(result), 200

@bp.get("/api/xrays/pending")
@handle_errors
def get_pending_xrays():
    xrays = Xray.query.filter(~Xray.predictions.any()).all()
    return jsonify([{
        "id": x.id,
        "patient_id": x.patient_id,
        "patient_name": x.patient.name if x.patient else "Desconocido",
        "upload_date": x.upload_date.isoformat() if x.upload_date else None,
        "image_path": x.image_path
    } for x in xrays])

@bp.post("/api/xrays/<int:xray_id>/process")
@handle_errors
def process_existing_xray(xray_id):
    xray = Xray.query.get(xray_id)
    if not xray: return jsonify({"error": "Radiografía no encontrada"}), 404
    
    with open(xray.image_path, 'rb') as f:
        image_bytes = f.read()
    
    result = process_xray(image_bytes)
    if "error" in result: return jsonify(result), 500

    disease = Disease.query.filter_by(name=result['prediction']).first()
    if not disease:
        disease = Disease(name=result['prediction'])
        db.session.add(disease)
        db.session.flush()
    
    gradcam_filename = f"gradcam_{xray_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
    gradcam_path = UPLOADS_DIR / gradcam_filename
    with open(gradcam_path, 'wb') as f:
        f.write(result['heatmap_image'])
    
    gradcam = GradCam(xray_id=xray_id, image_path=str(gradcam_path))
    db.session.add(gradcam)
    db.session.flush()
    
    prediction = Prediction(
        xray_id=xray_id,
        disease_id=disease.id,
        gradcam_id=gradcam.id,
        confidence=result['probabilities'][result['prediction']],
        validated=False
    )
    db.session.add(prediction)
    db.session.commit()
    
    return jsonify({
        "prediction_id": prediction.id,
        "xray_id": xray_id,
        "patient_name": xray.patient.name,
        "disease_name": disease.name,
        "confidence": prediction.confidence,
        "probabilities": result['probabilities'],
        "gradcam_id": gradcam.id,
        "predicted_at": prediction.predicted_at.isoformat(),
        "bounding_box": result.get('bounding_box')
    })

@bp.get("/api/xrays/<int:xray_id>/image")
@handle_errors
def get_xray_image(xray_id):
    xray = Xray.query.get(xray_id)
    if not xray or not Path(xray.image_path).exists():
        return jsonify({"error": "Imagen no encontrada"}), 404
    return send_file(xray.image_path, mimetype='image/jpeg')

@bp.get("/api/gradcam/<int:gradcam_id>/image")
@handle_errors
def get_gradcam_image(gradcam_id):
    gradcam = GradCam.query.get(gradcam_id)
    if not gradcam: return jsonify({"error": "Grad-CAM no encontrado"}), 404
    return send_file(gradcam.image_path, mimetype='image/jpeg')

@bp.post("/api/xrays/<int:xray_id>/analyze/<string:disease_type>")
@handle_errors
def analyze_specific_disease(xray_id, disease_type):
    xray = Xray.query.get(xray_id)
    if not xray: return jsonify({"error": "Radiografía no encontrada"}), 404
        
    with open(xray.image_path, 'rb') as f:
        image_bytes = f.read()
        
    result = process_single_label_analysis(image_bytes, disease_type)
    if "error" in result: return jsonify(result), 500
            
    heatmap_b64 = base64.b64encode(result['heatmap_image']).decode('utf-8')
    
    return jsonify({
        "disease": result['disease'],
        "probability": result['probability'],
        "heatmap_image": heatmap_b64,
        "bounding_box": result['bounding_box']
    })
