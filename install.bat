@echo off
echo ========================================
echo Instalando dependencias del proyecto
echo ========================================
echo.

REM Activar entorno virtual
call .venv\Scripts\activate.bat

REM Actualizar pip
echo Actualizando pip...
python -m pip install --upgrade pip

REM Instalar dependencias core
echo.
echo Instalando dependencias core...
pip install Flask Flask-CORS SQLAlchemy Flask-SQLAlchemy Pillow numpy

REM Instalar frameworks de ML
echo.
echo Instalando TensorFlow y PyTorch...
pip install tensorflow torch torchvision --index-url https://download.pytorch.org/whl/cpu

REM Instalar utilidades adicionales
echo.
echo Instalando utilidades adicionales...
pip install opencv-python pandas scikit-learn optuna matplotlib tqdm requests

echo.
echo ========================================
echo Instalacion completada!
echo ========================================
echo.
echo Para ejecutar la aplicacion:
echo   1. cd XAI\app\Backend
echo   2. python run.py
echo.
pause
