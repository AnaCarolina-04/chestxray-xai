from flask import Blueprint, jsonify, request
from models import db, Diagnosis, Patient, Disease
from .utils import handle_errors

bp = Blueprint('diagnoses', __name__)

@bp.get("/api/diagnoses")
@handle_errors
def get_diagnoses():
    diagnoses = Diagnosis.query.order_by(Diagnosis.diagnosed_at.desc()).all()
    return jsonify([{
        "id": d.id,
        "patient_id": d.patient_id,
        "patient_name": d.patient.name if d.patient else "Desconocido",
        "xray_id": d.xray_id,
        "disease_id": d.disease_id,
        "disease_name": d.disease.name if d.disease else "Desconocido",
        "notes": d.notes,
        "diagnosed_at": d.diagnosed_at.isoformat() if d.diagnosed_at else None
    } for d in diagnoses])

@bp.post("/api/diagnoses")
@handle_errors
def create_diagnosis():
    data = request.json
    if not data.get('patient_id') or not data.get('disease_id'):
        return jsonify({"error": "Faltan datos requeridos"}), 400
        
    patient = Patient.query.get(data.get('patient_id'))
    if not patient: return jsonify({"error": "Paciente no encontrado"}), 404
    
    disease = Disease.query.get(data.get('disease_id'))
    if not disease: return jsonify({"error": "Enfermedad no encontrada"}), 404
    
    diagnosis = Diagnosis(
        patient_id=data.get('patient_id'),
        xray_id=data.get('xray_id'),
        disease_id=data.get('disease_id'),
        notes=data.get('notes', '')
    )
    db.session.add(diagnosis)
    db.session.commit()
    
    return jsonify({
        "id": diagnosis.id,
        "message": "Diagnóstico creado exitosamente",
        "patient_name": patient.name,
        "disease_name": disease.name
    }), 201

@bp.put("/api/diagnoses/<int:diagnosis_id>")
@handle_errors
def update_diagnosis(diagnosis_id):
    diagnosis = Diagnosis.query.get(diagnosis_id)
    if not diagnosis: return jsonify({"error": "Diagnóstico no encontrado"}), 404
    
    data = request.json
    if 'disease_id' in data:
        disease = Disease.query.get(data['disease_id'])
        if not disease: return jsonify({"error": "Enfermedad no encontrada"}), 404
        diagnosis.disease_id = data['disease_id']
    
    if 'notes' in data: diagnosis.notes = data['notes']
    
    db.session.commit()
    return jsonify({"id": diagnosis.id, "message": "Diagnóstico actualizado exitosamente"})

@bp.delete("/api/diagnoses/<int:diagnosis_id>")
@handle_errors
def delete_diagnosis(diagnosis_id):
    diagnosis = Diagnosis.query.get(diagnosis_id)
    if not diagnosis: return jsonify({"error": "Diagnóstico no encontrado"}), 404
    
    db.session.delete(diagnosis)
    db.session.commit()
    return jsonify({"message": "Diagnóstico eliminado exitosamente"})
