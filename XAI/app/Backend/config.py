from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "database.db"
UPLOADS_DIR = BASE_DIR / "uploads"
MODELS_DIR = BASE_DIR.parent / "models"
FRONTEND_DIR = BASE_DIR.parent / "frontend"

# Ensure directories exist
UPLOADS_DIR.mkdir(exist_ok=True)
