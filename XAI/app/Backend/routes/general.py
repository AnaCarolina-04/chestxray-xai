from flask import Blueprint, jsonify, request
from sqlalchemy import inspect
from models import db, Patient, Xray, Prediction, Diagnosis, Disease
from pathlib import Path

bp = Blueprint('general', __name__)
# Adjust BASE_DIR calculation: __file__ is Backend/routes/general.py. parents[1] is Backend.
from config import DB_PATH
from .utils import handle_errors

@bp.route("/api/saludo")
def saludo():
    return jsonify({"mensaje": "Hola desde Flask! Backend funcionando!"})

@bp.get("/api/db/status")
@handle_errors
def db_status():
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    
    table_info = {}
    for table in tables:
        columns = inspector.get_columns(table)
        count = db.session.execute(db.text(f"SELECT COUNT(*) FROM {table}")).scalar()
        table_info[table] = {
            "columns": [col['name'] for col in columns],
            "row_count": count
        }
    
    return jsonify({
        "status": "OK",
        "database_path": str(DB_PATH),
        "tables": table_info,
        "patients_count": Patient.query.count(),
        "xrays_count": Xray.query.count(),
        "predictions_count": Prediction.query.count(),
        "diagnoses_count": Diagnosis.query.count()
    }), 200

@bp.get("/api/diseases")
@handle_errors
def get_diseases():
    diseases = Disease.query.all()
    result = [{
        "id": d.id,
        "name": d.name,
        "description": d.description,
        "created_at": d.created_at.isoformat() if d.created_at else None
    } for d in diseases]
    return jsonify(result), 200

@bp.post("/api/diseases")
@handle_errors
def create_disease():
    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({"error": "El nombre de la enfermedad es requerido"}), 400
    
    # Verificar si ya existe
    existing = Disease.query.filter_by(name=data['name']).first()
    if existing:
        return jsonify({"error": "Ya existe una enfermedad con ese nombre"}), 400
    
    disease = Disease(
        name=data['name'],
        description=data.get('description', '')
    )
    db.session.add(disease)
    db.session.commit()
    
    return jsonify({
        "id": disease.id,
        "name": disease.name,
        "description": disease.description,
        "message": "Enfermedad creada exitosamente"
    }), 201

@bp.put("/api/diseases/<int:disease_id>")
@handle_errors
def update_disease(disease_id):
    disease = Disease.query.get(disease_id)
    if not disease:
        return jsonify({"error": "Enfermedad no encontrada"}), 404
    
    data = request.get_json()
    if not data:
        return jsonify({"error": "No se recibieron datos"}), 400
    
    # Verificar si el nuevo nombre ya existe (en otra enfermedad)
    if 'name' in data and data['name'] != disease.name:
        existing = Disease.query.filter_by(name=data['name']).first()
        if existing:
            return jsonify({"error": "Ya existe una enfermedad con ese nombre"}), 400
        disease.name = data['name']
    
    if 'description' in data:
        disease.description = data['description']
    
    db.session.commit()
    
    return jsonify({
        "id": disease.id,
        "name": disease.name,
        "description": disease.description,
        "message": "Enfermedad actualizada exitosamente"
    }), 200

@bp.delete("/api/diseases/<int:disease_id>")
@handle_errors
def delete_disease(disease_id):
    disease = Disease.query.get(disease_id)
    if not disease:
        return jsonify({"error": "Enfermedad no encontrada"}), 404
    
    # Verificar si tiene predicciones asociadas
    predictions_count = Prediction.query.filter_by(disease_id=disease_id).count()
    if predictions_count > 0:
        return jsonify({
            "error": f"No se puede eliminar. Hay {predictions_count} predicción(es) asociada(s) a esta enfermedad"
        }), 400
    
    db.session.delete(disease)
    db.session.commit()
    
    return jsonify({"message": "Enfermedad eliminada exitosamente"}), 200
