from flask import Flask
from flask_cors import CORS
from sqlalchemy import inspect
from models import db
import sys
import os
import warnings

# Suppress TensorFlow/Keras warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # FATAL
warnings.filterwarnings('ignore', category=UserWarning, module='keras')
warnings.filterwarnings('ignore', category=UserWarning, module='tensorflow')

# Add the project root to sys.path
# BASE_DIR is already imported from config, so this line is commented out or removed if it conflicts.
# BASE_DIR = os.path.dirname(os.path.abspath(__file__))

from routes.general import bp as general_bp
from routes.patients import bp as patients_bp
from routes.xrays import bp as xrays_bp
from routes.diagnoses import bp as diagnoses_bp
from routes.predictions import bp as predictions_bp
from routes.frontend import bp as frontend_bp
from routes.visualizer import bp as visualizer_bp
from routes.visualizer_v2 import bp as visualizer_v2_bp

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
app.register_blueprint(visualizer_bp)
app.register_blueprint(visualizer_v2_bp)
app.register_blueprint(frontend_bp)

# ============================
#       INIT DATABASE
# ============================
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    import os
    import logging
    
    # Silenciar logs de Werkzeug (servidor Flask)
    log = logging.getLogger('werkzeug')
    log.setLevel(logging.ERROR)
    
    # Silenciar warnings de TensorFlow/PyTorch si están presentes
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
    
    # Mensaje simple de inicio
    print("Servidor iniciado en http://localhost:5000")
    print("Presiona CTRL+C para detener\n")
    
    # Ejecutar sin debug para evitar mensajes de reinicio
    app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)
