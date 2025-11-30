<<<<<<< HEAD
# ChestXray-XAI
Sistema de Inteligencia Artificial Explicable para Radiografías de Tórax

Este proyecto implementa un sistema para anali
zar radiografías de tórax mediante redes neuronales convolucionales (CNN) y técnicas de Inteligencia Artificial Explicable (XAI).
El modelo genera predicciones y mapas Grad-CAM para interpretar visualmente las regiones más relevantes de la imagen.
El proyecto también incluye funciones básicas para validar diagnósticos y gestionar pacientes.

Instalación del Entorno Virtual y Dependencias
1. Crear el entorno virtual

Ubicarse en la carpeta del backend y ejecutar:

Windows (PowerShell):
python -m venv venv


Activar el entorno:

.\venv\Scripts\activate

Linux / Mac:
python3 -m venv venv
source venv/bin/activate

2. Instalar las dependencias

Con el entorno virtual activado:

pip install -r requirements.txt


Si se necesita actualizar el archivo con las librerías instaladas:

pip freeze > requirements.txt

Ejecución del Backend

Una vez instalado todo y estando dentro de la carpeta del backend:

python run.py


El servidor se ejecutará en:

http://127.0.0.1:5000/


Desde allí, el frontend HTML puede realizar las solicitudes necesarias al backend.
=======
# chestxray-xai
>>>>>>> 7ae2c0461985f72d157a7a2321cd5c4f4b5f7577
