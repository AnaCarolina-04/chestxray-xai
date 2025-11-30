from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

# ===============================
# Tabla de Usuarios (Médicos / Admin)
# ===============================
class User(db.Model):
    __tablename__ = "users"
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    role = db.Column(db.String(20), default='viewer')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


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
    xrays = db.relationship("Xray", back_populates="patient", lazy=True, cascade="all, delete-orphan")
    diagnoses = db.relationship("Diagnosis", back_populates="patient", lazy=True, cascade="all, delete-orphan")


# ===============================
# Tabla de Enfermedades
# ===============================
class Disease(db.Model):
    __tablename__ = "diseases"
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ===============================
# Tabla de Radiografías
# ===============================
class Xray(db.Model):
    __tablename__ = "xrays"
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("patients.id"), nullable=False)
    image_path = db.Column(db.String(255), nullable=False)
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relaciones
    patient = db.relationship("Patient", back_populates="xrays")
    predictions = db.relationship("Prediction", back_populates="xray", lazy=True, cascade="all, delete-orphan")
    gradcams = db.relationship("GradCam", back_populates="xray", lazy=True, cascade="all, delete-orphan")
    diagnoses = db.relationship("Diagnosis", back_populates="xray", lazy=True)


# ===============================
# Tabla de Grad-CAM
# ===============================
class GradCam(db.Model):
    __tablename__ = "gradcam_images"
    
    id = db.Column(db.Integer, primary_key=True)
    xray_id = db.Column(db.Integer, db.ForeignKey("xrays.id"), nullable=False)
    image_path = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relaciones
    xray = db.relationship("Xray", back_populates="gradcams")


# ===============================
# Tabla de Predicciones
# ===============================
class Prediction(db.Model):
    __tablename__ = 'predictions'
    
    id = db.Column(db.Integer, primary_key=True)
    xray_id = db.Column(db.Integer, db.ForeignKey('xrays.id'), nullable=False)
    disease_id = db.Column(db.Integer, db.ForeignKey('diseases.id'), nullable=False)
    gradcam_id = db.Column(db.Integer, db.ForeignKey('gradcam_images.id'))
    confidence = db.Column(db.Float)
    predicted_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Campos de validación
    validated = db.Column(db.Boolean, default=False)
    is_correct = db.Column(db.Boolean, nullable=True)
    corrected_disease_id = db.Column(db.Integer, db.ForeignKey('diseases.id'), nullable=True)
    doctor_notes = db.Column(db.Text, nullable=True)
    
    # Relaciones
    xray = db.relationship('Xray', back_populates='predictions')
    disease = db.relationship('Disease', foreign_keys=[disease_id])
    corrected_disease = db.relationship('Disease', foreign_keys=[corrected_disease_id])
    gradcam = db.relationship('GradCam')


# ===============================
# Tabla de Diagnósticos (Opcional - para historial médico)
# ===============================
class Diagnosis(db.Model):
    __tablename__ = "diagnoses"
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("patients.id"), nullable=False)
    xray_id = db.Column(db.Integer, db.ForeignKey("xrays.id"))
    disease_id = db.Column(db.Integer, db.ForeignKey("diseases.id"), nullable=False)
    notes = db.Column(db.Text)
    diagnosed_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relaciones
    patient = db.relationship('Patient', back_populates='diagnoses')
    xray = db.relationship('Xray', back_populates='diagnoses')
    disease = db.relationship('Disease')

