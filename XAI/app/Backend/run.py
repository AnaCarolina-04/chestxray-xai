from flask import Flask
from flask_cors import CORS
from sqlalchemy import inspect
from models import db

from routes.general import bp as general_bp
from routes.patients import bp as patients_bp
from routes.xrays import bp as xrays_bp
from routes.diagnoses import bp as diagnoses_bp
from routes.predictions import bp as predictions_bp
from routes.frontend import bp as frontend_bp

app = Flask(__name__)
CORS(app)

# ============================
#       CONFIGURACIÓN DB
# ============================
from config import DB_PATH, UPLOADS_DIR, BASE_DIR

app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{DB_PATH}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# ============================
#     REGISTER BLUEPRINTS
# ============================
app.register_blueprint(general_bp)
app.register_blueprint(patients_bp)
app.register_blueprint(xrays_bp)
app.register_blueprint(diagnoses_bp)
app.register_blueprint(predictions_bp)
app.register_blueprint(frontend_bp)

# ============================
#       INIT DATABASE
# ============================
with app.app_context():
    db.create_all()
    print("✅ database.db inicializado")
    
    # Verificar tablas creadas
    try:
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        print(f"📋 Tablas en la base de datos: {tables}")
    except Exception as e:
        print(f"⚠️ Error inspeccionando BD: {e}")

if __name__ == '__main__':
    print(f"📁 Backend ejecutándose en: {BASE_DIR}")
    print(f"📁 Base de datos: {DB_PATH}")
    app.run(debug=True, host="0.0.0.0", port=5000)
