from flask import Blueprint, jsonify, request
from models import db, Prediction, GradCam
from model_service import get_bounding_box_from_image_path
from .utils import handle_errors

bp = Blueprint('predictions', __name__)

@bp.get("/api/predictions/all")
@handle_errors
def get_all_predictions():
    predictions = Prediction.query.all()
    result = []
    for pred in predictions:
        display_disease = pred.corrected_disease.name if pred.corrected_disease else pred.disease.name
        result.append({
            'id': pred.id,
            'xray_id': pred.xray_id,
            'patient_id': pred.xray.patient_id,
            'patient_name': pred.xray.patient.name,
            'disease_name': pred.disease.name,
            'corrected_disease_name': pred.corrected_disease.name if pred.corrected_disease else None,
            'confidence': pred.confidence,
            'predicted_at': pred.predicted_at.isoformat(),
            'validated': pred.validated,
            'is_correct': pred.is_correct,
            'doctor_notes': pred.doctor_notes,
            'gradcam_id': pred.gradcam_id
        })
    return jsonify(result), 200

@bp.get("/api/predictions/<int:prediction_id>")
@handle_errors
def get_prediction_detail(prediction_id):
    prediction = Prediction.query.get(prediction_id)
    if not prediction: return jsonify({'error': 'Predicción no encontrada'}), 404
    
    bbox = None
    if prediction.gradcam_id:
        gradcam = GradCam.query.get(prediction.gradcam_id)
        if gradcam:
            bbox = get_bounding_box_from_image_path(gradcam.image_path)

    return jsonify({
        'id': prediction.id,
        'xray_id': prediction.xray_id,
        'patient_id': prediction.xray.patient_id,
        'patient_name': prediction.xray.patient.name,
        'disease_name': prediction.disease.name,
        'corrected_disease_name': prediction.corrected_disease.name if prediction.corrected_disease else None,
        'confidence': prediction.confidence,
        'predicted_at': prediction.predicted_at.isoformat(),
        'upload_date': prediction.xray.upload_date.isoformat(),
        'validated': prediction.validated,
        'is_correct': prediction.is_correct,
        'doctor_notes': prediction.doctor_notes,
        'gradcam_id': prediction.gradcam_id,
        'bounding_box': bbox
    }), 200

@bp.route('/api/predictions/<int:prediction_id>/validate', methods=['POST'])
@handle_errors
def validate_prediction(prediction_id):
    data = request.get_json()
    if not data: return jsonify({'error': 'No se recibieron datos'}), 400
    
    prediction = Prediction.query.get(prediction_id)
    if not prediction: return jsonify({'error': 'Predicción no encontrada'}), 404
    
    prediction.validated = data.get('validated', True)
    prediction.is_correct = data.get('is_correct', True)
    prediction.doctor_notes = data.get('doctor_notes', '')
    
    if not prediction.is_correct and data.get('corrected_disease_id'):
        prediction.corrected_disease_id = int(data.get('corrected_disease_id'))
    
    db.session.commit()
    return jsonify({'success': True, 'message': 'Predicción validada', 'prediction_id': prediction.id}), 200

@bp.put("/api/predictions/<int:prediction_id>")
@handle_errors
def update_prediction(prediction_id):
    prediction = Prediction.query.get(prediction_id)
    if not prediction: return jsonify({"error": "Predicción no encontrada"}), 404
    
    data = request.json
    if 'doctor_notes' in data: prediction.doctor_notes = data['doctor_notes']
    
    db.session.commit()
    return jsonify({"message": "Predicción actualizada"})

@bp.delete("/api/predictions/<int:prediction_id>")
@handle_errors
def delete_prediction(prediction_id):
    prediction = Prediction.query.get(prediction_id)
    if not prediction: return jsonify({"error": "Predicción no encontrada"}), 404
    
    db.session.delete(prediction)
    db.session.commit()
    return jsonify({"message": "Predicción eliminada"})
