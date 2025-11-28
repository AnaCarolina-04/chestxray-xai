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
    
    # Relación: un usuario puede tener varios pacientes
    patients = db.relationship("Patient", backref="doctor", lazy=True)


# ===============================
# Tabla de Pacientes
# ===============================
class Patient(db.Model):
    __tablename__ = "patients"
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)
    age = db.Column(db.Integer)
    gender = db.Column(db.String)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relación: un paciente puede tener varias radiografías
    xrays = db.relationship("Xray", backref="patient", lazy=True)


# ===============================
# Tabla de Enfermedades
# ===============================
class Disease(db.Model):
    __tablename__ = "diseases"
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)


# ===============================
# Tabla de Radiografías
# ===============================
class Xray(db.Model):
    __tablename__ = "xrays"
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("patients.id"), nullable=False)
    filename = db.Column(db.String, nullable=False)  # nombre o ruta de archivo
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relación: una radiografía puede tener varias predicciones
    predictions = db.relationship("Prediction", backref="xray", lazy=True)


# ===============================
# Tabla de Predicciones
# ===============================
class Prediction(db.Model):
    __tablename__ = "predictions"
    
    id = db.Column(db.Integer, primary_key=True)
    xray_id = db.Column(db.Integer, db.ForeignKey("xrays.id"), nullable=False)
    disease_id = db.Column(db.Integer, db.ForeignKey("diseases.id"), nullable=False)
    predicted_at = db.Column(db.DateTime, default=datetime.utcnow)
    validated = db.Column(db.Boolean, default=False)
    corrected_disease_id = db.Column(db.Integer, db.ForeignKey("diseases.id"))
    
    # Relación: una predicción puede tener varias imágenes Grad-CAM
    gradcams = db.relationship("GradCam", backref="prediction", lazy=True)


# ===============================
# Tabla de Grad-CAM
# ===============================
class GradCam(db.Model):
    __tablename__ = "gradcam"
    
    id = db.Column(db.Integer, primary_key=True)
    prediction_id = db.Column(db.Integer, db.ForeignKey("predictions.id"), nullable=False)
    filename = db.Column(db.String, nullable=False)  # ruta de imagen Grad-CAM
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)

class Diagnosis(db.Model):
    __tablename__ = "diagnosis"
    id = db.Column(db.Integer, primary_key=True)

    patient_id = db.Column(db.Integer, db.ForeignKey("patients.id"), nullable=False)
    xray_id = db.Column(db.Integer, db.ForeignKey("xrays.id"), nullable=True)
    disease_id = db.Column(db.Integer, db.ForeignKey("diseases.id"), nullable=False)

    severity = db.Column(db.String, nullable=True)  # leve, moderado, severo
    notes = db.Column(db.Text, nullable=True)

    diagnosed_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relaciones
    patient = db.relationship("Patient", backref="diagnoses")
    xray = db.relationship("Xray", backref="diagnoses")
    disease = db.relationship("Disease", backref="diagnoses")

