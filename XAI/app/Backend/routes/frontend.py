from flask import Blueprint, send_from_directory
from pathlib import Path

bp = Blueprint('frontend', __name__)
# __file__ is Backend/routes/frontend.py -> parents[1] is Backend.
from config import FRONTEND_DIR

@bp.route("/css/<path:filename>")
def serve_css(filename):
    return send_from_directory(FRONTEND_DIR / "css", filename, mimetype='text/css')

@bp.route("/js/<path:filename>")
def serve_js(filename):
    return send_from_directory(FRONTEND_DIR / "js", filename, mimetype='application/javascript')

@bp.route("/assets/<path:filename>")
def serve_assets(filename):
    return send_from_directory(FRONTEND_DIR / "assets", filename)

@bp.route("/", defaults={"path": ""})
@bp.route("/<path:path>")
def serve_frontend(path):
    # Fallback to index.html for SPA if file doesn't exist, but here it seems simple serving.
    # The original logic was: if exists serve it, else index.html
    target_path = FRONTEND_DIR / path
    if path and target_path.exists() and target_path.is_file():
        return send_from_directory(FRONTEND_DIR, path)
    return send_from_directory(FRONTEND_DIR, "index.html")
