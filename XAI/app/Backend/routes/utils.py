from functools import wraps
from flask import jsonify

from models import db

def handle_errors(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error in {f.__name__}: {e}")
            return jsonify({"error": str(e)}), 500
    return wrapper
