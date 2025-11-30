from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

# ===============================
# Tabla de Usuarios (Médicos / Admin)
# ===============================
class User(db.Model):
    __tablename__ = "users"
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)
    email = db.Column(db.String, unique=True)
    role = db.Column(db.String)  # Ej: "Radiólogo", "Administrador"
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relación: un usuario puede validar varias predicciones
    validations = db.relationship("Prediction", backref="validator", lazy=True, foreign_keys="Prediction.validated_by")


# ===============================
# Tabla de Pacientes
# ===============================
class Patient(db.Model):
    __tablename__ = "patients"
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    age = db.Column(db.Integer)
    gender = db.Column(db.String(1))  # 'M' o 'F'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relaciones
    xrays = db.relationship("Xray", backref="patient", lazy=True)


# ===============================
# Tabla de Enfermedades
# ===============================
class Disease(db.Model):
    __tablename__ = "diseases"
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    description = db.Column(db.Text)
    
    # ✅ CORREGIDO: Especificar foreign_keys para cada relación
    predictions = db.relationship("Prediction", backref="disease", lazy=True, foreign_keys="Prediction.disease_id")
    corrections = db.relationship("Prediction", backref="corrected_disease", lazy=True, foreign_keys="Prediction.corrected_disease_id")


# ===============================
# Tabla de Radiografías
# ===============================
class Xray(db.Model):
    __tablename__ = "xrays"
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("patients.id"), nullable=False)
    image_path = db.Column(db.String(500), nullable=False)
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relaciones
    predictions = db.relationship("Prediction", backref="xray", lazy=True)
    gradcams = db.relationship("GradCam", backref="xray", lazy=True)


# ===============================
# Tabla de Predicciones
# ===============================
class Prediction(db.Model):
    __tablename__ = "predictions"
    
    id = db.Column(db.Integer, primary_key=True)
    xray_id = db.Column(db.Integer, db.ForeignKey("xrays.id"), nullable=False)
    disease_id = db.Column(db.Integer, db.ForeignKey("diseases.id"), nullable=False)
    confidence = db.Column(db.Float, nullable=False)
    predicted_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Validación médica
    validated = db.Column(db.Boolean, default=False)
    validated_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    doctor_notes = db.Column(db.Text)
    corrected_disease_id = db.Column(db.Integer, db.ForeignKey("diseases.id"))


# ===============================
# Tabla de Grad-CAM
# ===============================
class GradCam(db.Model):
    __tablename__ = "gradcam"
    
    id = db.Column(db.Integer, primary_key=True)
    xray_id = db.Column(db.Integer, db.ForeignKey("xrays.id"), nullable=False)
    image_path = db.Column(db.String(500), nullable=False)
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)


# ===============================
# Tabla de Diagnósticos (Opcional - para historial médico)
# ===============================
class Diagnosis(db.Model):
    __tablename__ = "diagnosis"
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("patients.id"), nullable=False)
    xray_id = db.Column(db.Integer, db.ForeignKey("xrays.id"), nullable=True)
    disease_id = db.Column(db.Integer, db.ForeignKey("diseases.id"), nullable=False)
    
    severity = db.Column(db.String(20))  # leve, moderado, severo
    notes = db.Column(db.Text)
    diagnosed_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relaciones
    patient = db.relationship("Patient", backref="diagnoses")
    xray = db.relationship("Xray", backref="diagnoses")
    disease = db.relationship("Disease", backref="diagnoses", foreign_keys=[disease_id])

