from flask import Blueprint, jsonify, request
from models import db, Patient, Xray, Diagnosis, Prediction
from .utils import handle_errors

bp = Blueprint('patients', __name__)

@bp.get("/api/patients")
@handle_errors
def get_patients():
    patients = Patient.query.all()
    result = []
    for p in patients:
        result.append({
            "id": p.id,
            "name": p.name,
            "age": p.age,
            "gender": p.gender,
            "created_at": p.created_at.isoformat() if p.created_at else None
        })
    return jsonify(result), 200

@bp.post("/api/patients")
@handle_errors
def create_patient():
    data = request.json
    if not data or not data.get('name') or not data.get('age'):
        return jsonify({"error": "Datos incompletos"}), 400
        
    try:
        age = int(data.get('age'))
        if age <= 0 or age > 150: return jsonify({"error": "Edad inválida"}), 400
    except ValueError:
        return jsonify({"error": "La edad debe ser un número"}), 400
    
    gender = data.get('gender', 'M')
    if gender not in ['M', 'F', 'O']: gender = 'M'
    
    patient = Patient(name=str(data.get('name')).strip(), age=age, gender=gender)
    db.session.add(patient)
    db.session.commit()
    db.session.refresh(patient)
    
    return jsonify({
        "id": patient.id,
        "name": patient.name,
        "age": patient.age,
        "gender": patient.gender,
        "created_at": patient.created_at.isoformat() if patient.created_at else None,
        "message": "Paciente creado exitosamente"
    }), 201

@bp.get("/api/patients/<int:patient_id>")
@handle_errors
def get_patient_detail(patient_id):
    patient = Patient.query.get(patient_id)
    if not patient: return jsonify({"error": "Paciente no encontrado"}), 404
    
    xrays_count = Xray.query.filter_by(patient_id=patient_id).count()
    diagnoses_count = Diagnosis.query.filter_by(patient_id=patient_id).count()
    predictions_count = Prediction.query.join(Xray).filter(Xray.patient_id == patient_id).count()
    
    result = {
        "id": patient.id,
        "name": patient.name,
        "age": patient.age,
        "gender": patient.gender,
        "created_at": patient.created_at.isoformat() if patient.created_at else None,
        "xrays_count": xrays_count,
        "diagnoses_count": diagnoses_count,
        "predictions_count": predictions_count
    }
    return jsonify(result)

@bp.get("/api/patients/<int:patient_id>/xrays")
@handle_errors
def get_patient_xrays(patient_id):
    xrays = Xray.query.filter_by(patient_id=patient_id).all()
    return jsonify([{
        "id": x.id,
        "upload_date": x.upload_date.isoformat() if x.upload_date else None,
        "has_prediction": len(x.predictions) > 0,
        "prediction": x.predictions[0].disease.name if x.predictions else None
    } for x in xrays])

@bp.get("/api/patients/<int:patient_id>/diagnoses")
@handle_errors
def get_patient_diagnoses(patient_id):
    patient = Patient.query.get(patient_id)
    if not patient: return jsonify({"error": "Paciente no encontrado"}), 404
    
    diagnoses = Diagnosis.query.filter_by(patient_id=patient_id).order_by(Diagnosis.diagnosed_at.desc()).all()
    
    result = []
    for d in diagnoses:
        result.append({
            "id": d.id,
            "disease_name": d.disease.name if d.disease else "Desconocido",
            "notes": d.notes,
            "diagnosed_at": d.diagnosed_at.isoformat() if d.diagnosed_at else None,
            "has_xray": d.xray_id is not None
        })
    return jsonify(result), 200

@bp.put("/api/patients/<int:patient_id>")
@handle_errors
def update_patient(patient_id):
    patient = Patient.query.get(patient_id)
    if not patient: return jsonify({"error": "Paciente no encontrado"}), 404
    
    data = request.json
    if 'name' in data: patient.name = str(data['name']).strip()
    if 'age' in data:
        try:
            age = int(data['age'])
            if 0 < age <= 150: patient.age = age
        except: pass
    if 'gender' in data:
        if data['gender'] in ['M', 'F', 'O']: patient.gender = data['gender']
    
    db.session.commit()
    return jsonify({"id": patient.id, "message": "Paciente actualizado exitosamente"})

@bp.delete("/api/patients/<int:patient_id>")
@handle_errors
def delete_patient(patient_id):
    patient = Patient.query.get(patient_id)
    if not patient: return jsonify({"error": "Paciente no encontrado"}), 404
    
    name = patient.name
    db.session.delete(patient)
    db.session.commit()
    return jsonify({"message": f"Paciente {name} eliminado exitosamente"}), 200
