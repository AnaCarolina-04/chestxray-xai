# Clasificación de Rayos X de Tórax con IA Explicable

Una aplicación web completa para el análisis automatizado de radiografías de tórax utilizando aprendizaje profundo con técnicas de IA explicable (XAI). Este sistema proporciona detección precisa de patologías mientras ofrece explicaciones visuales a través de mapas de calor Grad-CAM, haciendo que las decisiones de la IA sean transparentes e interpretables para profesionales médicos.

![Python](https://img.shields.io/badge/Python-3.12-blue)
![TensorFlow](https://img.shields.io/badge/TensorFlow-2.18-orange)
![Flask](https://img.shields.io/badge/Flask-3.1-green)

## 🌟 Características

### Funcionalidad Principal
- **Clasificación Multi-etiqueta**: Detección simultánea de 6 patologías torácicas usando EfficientNetB0
- **Clasificación Binaria**: Modelos especializados para condiciones específicas (Atelectasia, Cardiomegalia, Infiltración, etc.)
- **IA Explicable**: Visualización de mapas de calor Grad-CAM que muestran qué regiones influyeron en el diagnóstico
- **Visualizador CNN Interactivo**: Exploración visual 2D de la arquitectura completa del modelo con activaciones de capas en tiempo real
- **Gestión de Pacientes**: Operaciones CRUD completas para pacientes y registros de seguimiento
- **Seguimiento de Diagnósticos**: Historial completo de diagnósticos con flujo de validación
- **Dashboard Interactivo**: Estadísticas en tiempo real y visualización de datos

### Aspectos Técnicos Destacados
- **Modelos de Aprendizaje Profundo**: Arquitectura EfficientNetB0 pre-entrenada y ajustada en datasets de rayos X de tórax
- **Visualizador CNN**: Diagrama interactivo 2D con D3.js para explorar la arquitectura del modelo y activaciones por capa
- **API RESTful**: API backend limpia y bien documentada con Flask
- **Frontend Moderno**: Aplicación de página única responsive con JavaScript vanilla
- **Gestión de Base de Datos**: SQLite con SQLAlchemy ORM para manejo eficiente de datos
- **Procesamiento de Imágenes**: Pipeline automatizado de preprocesamiento para normalización de rayos X

## 📋 Tabla de Contenidos

- [Instalación](#-instalación)
- [Uso](#-uso)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Documentación de la API](#-documentación-de-la-api)
- [Arquitectura del Modelo](#-arquitectura-del-modelo)
- [Dataset](#-dataset)
- [Entrenamiento](#-entrenamiento)
- [Tecnologías Utilizadas](#-tecnologías-utilizadas)

## 🚀 Instalación

### Requisitos Previos

- Python 3.12 o superior
- Gestor de paquetes pip
- Git
- (Opcional) GPU compatible con CUDA para entrenamiento de modelos

### Paso 1: Clonar el Repositorio

```bash
git clone https://github.com/AnaCarolina-04/chestxray-xai.git
cd chestxray-xai
```

### Paso 2: Crear Entorno Virtual

```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# Linux/macOS
python3 -m venv .venv
source .venv/bin/activate
```

### Paso 3: Instalar Dependencias

```bash
cd XAI/app/Backend
pip install -r requirements.txt
```

### Paso 4: Inicializar Base de Datos

La base de datos se creará automáticamente cuando ejecutes la aplicación por primera vez. Alternativamente, puedes inicializarla manualmente:

```bash
python -c "from run import app, db; app.app_context().push(); db.create_all()"
```

### Paso 5: Ejecutar la Aplicación

```bash
python run.py
```

La aplicación estará disponible en `http://localhost:5000`

## 💻 Uso

### Iniciar el Servidor

```bash
cd XAI/app/Backend
python run.py
```

### Acceder a la Aplicación

1. Abre tu navegador web y navega a `http://localhost:5000`
2. La interfaz frontend se cargará automáticamente
3. Navega por las secciones usando el menú lateral

### Flujo de Trabajo Básico

1. **Agregar un Paciente**: Haz clic en "Pacientes" → "Nuevo Paciente"
2. **Crear Seguimiento**: Selecciona un paciente y agrega un registro de seguimiento
3. **Subir Radiografía**: Sube una imagen de radiografía de tórax (con procesamiento automático de IA opcional)
4. **Ver Análisis**: Revisa los resultados del diagnóstico y las visualizaciones Grad-CAM
5. **Validar Diagnóstico**: Los profesionales médicos pueden validar o modificar las predicciones de la IA

### Reiniciar Base de Datos

Para reiniciar completamente la base de datos (útil para desarrollo):

```bash
python reset_database.py
```

⚠️ **Advertencia**: Esto eliminará todos los datos incluyendo pacientes, diagnósticos y archivos subidos.


## Visualizador CNN Interactivo
 
 ### Acceder al Visualizador
 
 1. Navega a `http://localhost:5000/visualizer` o
 2. Haz clic en el Dashboard, botón "Visualizador CNN" (si disponible en el análisis)
 
 ### Exploración de Arquitectura y Activaciones
 
 El visualizador permite una inspección profunda del modelo EfficientNetB0:
 
 ### Características
 - **Visualización completa** de las capas del modelo
 - **Bloques coloreados** por tipo de capa (Conv2D, Dense, BatchNorm, Dropout, etc.)
 - **Visualización de Activaciones**: Analiza cómo cada capa transforma la radiografía.
 - **Diseño moderno** con tema oscuro.


#### 🔍 Exploración de Capas
- **Clic en cualquier capa** para seleccionarla y ver información detallada:
  - Nombre de la capa
  - Tipo (Conv2D, Dense, Activation, etc.)
  - Shape de salida
  - Función de activación
  - Número de parámetros
  - Estado trainable/frozen
- **Resaltado visual** de la capa seleccionada con animaciones

#### 🎨 Visualización de Activaciones
1. **Analiza primero una radiografía** desde el módulo principal
2. **Selecciona cualquier capa** en el visualizador
3. **Haz clic en "Get Layer Activations"** para ver:
   - Mapas de características de capas convolucionales (hasta 64 canales)
   - Gráficos de activación de capas densas
   - Información del shape de activación

### Uso Práctico

```bash
# 1. Inicia el servidor Flask
python XAI/app/Backend/run.py

# 2. En tu navegador, ve a:
http://localhost:5000/visualizer

# 3. Explora el modelo:
- Haz scroll para ver todas las capas
- Haz clic en una capa para ver detalles
- Analiza una imagen primero para ver activaciones
```

### Colores de Capas

| Tipo de Capa | Color |
|--------------|-------|
| InputLayer | 🟢 Verde |
| Conv2D | 🔵 Azul |
| BatchNormalization | 🟣 Púrpura |
| Dense | 🔴 Rosa |
| Dropout | 🟤 Marrón |
| GlobalAveragePooling2D | 🔷 Teal |
| Activation | 🟠 Naranja |

### Endpoints del Visualizador

```http
GET /visualizer
# Renderiza la página del visualizador

GET /model/layers
# Retorna JSON con todas las capas del modelo
{
  "total_layers": 240,
  "model_name": "efficientnetb0",
  "layers": [...]
}

GET /model/activation/<layer_name>
# Retorna imagen base64 con activaciones
{
  "layer_name": "conv2d_50",
  "activation_shape": "(1, 7, 7, 1280)",
  "image": "iVBORw0KGgoAAAANSUhEU..."
}
```

## 📁 Estructura del Proyecto

```
chestxray-xai/
├── XAI/
│   └── app/
│       ├── Backend/
│       │   ├── routes/              # Blueprints de endpoints de la API
│       │   │   ├── general.py       # Endpoints de verificación de salud
│       │   │   ├── patients.py      # Operaciones CRUD de pacientes
│       │   │   ├── xrays.py         # Carga y gestión de rayos X
│       │   │   ├── diagnoses.py     # Operaciones de diagnósticos
│       │   │   ├── predictions.py   # Endpoints de predicción de IA
│       │   │   ├── visualizer.py    # Endpoints de visualización CNN
│       │   │   └── frontend.py      # Servicio de archivos estáticos
│       │   ├── models.py            # Modelos de base de datos SQLAlchemy
│       │   ├── model_service.py     # Carga e inferencia de modelos ML
│       │   ├── data_structures.py   # Objetos de transferencia de datos
│       │   ├── config.py            # Configuración de la aplicación
│       │   ├── run.py               # Punto de entrada de la aplicación Flask
│       │   └── requirements.txt     # Dependencias de Python
│       ├── frontend/
│       │   ├── index.html           # Archivo HTML principal
│       │   ├── visualizer.html      # Página del visualizador CNN
│       │   ├── css/
│       │   │   └── styles.css       # Estilos de la aplicación
│       │   └── js/
│       │       ├── app.js           # Lógica de la aplicación frontend
│       │       └── visualizer.js    # Lógica del visualizador CNN (D3.js)
│       ├── models/                  # Pesos de modelos pre-entrenados
│       │   ├── best_model.h5        # EfficientNetB0 multi-etiqueta
│       │   └── densenet_*.pth       # Modelos de clasificación binaria
│       ├── notebooks/               # Notebooks de Jupyter
│       │   └── X_rays.ipynb         # Exploración y preprocesamiento de datos
│       └── Static/
│           └── Uploads/             # Imágenes de rayos X subidas
└── reset_database.py                # Utilidad de reinicio de base de datos
```

## 🔌 Documentación de la API

### URL Base
```
http://localhost:5000/api
```

### Endpoints

#### Verificación de Salud
```http
GET /api/health
```
Retorna el estado del servidor y la configuración.

#### Pacientes

```http
GET    /api/patients           # Listar todos los pacientes
GET    /api/patients/:id       # Obtener detalles de un paciente
POST   /api/patients           # Crear nuevo paciente
PUT    /api/patients/:id       # Actualizar paciente
DELETE /api/patients/:id       # Eliminar paciente
```

**Cuerpo de Solicitud para Crear Paciente:**
```json
{
  "nombre": "Juan Pérez",
  "edad": 45,
  "sexo": "M"
}
```

#### Rayos X

```http
GET    /api/xrays              # Listar todos los rayos X
GET    /api/xrays/:id          # Obtener detalles de un rayo X
POST   /api/xrays              # Subir rayo X
PUT    /api/xrays/:id          # Actualizar rayo X
DELETE /api/xrays/:id          # Eliminar rayo X
```

**Subir Rayo X (multipart/form-data):**
- `file`: Archivo de imagen (requerido)
- `followup_id`: ID de seguimiento (requerido)
- `auto_process`: Booleano, ejecutar análisis de IA automáticamente (opcional)

#### Diagnósticos

```http
GET    /api/diagnoses          # Listar todos los diagnósticos
GET    /api/diagnoses/:id      # Obtener detalles de un diagnóstico
POST   /api/diagnoses          # Crear diagnóstico manual
PUT    /api/diagnoses/:id      # Actualizar diagnóstico
DELETE /api/diagnoses/:id      # Eliminar diagnóstico
```

#### Predicciones

```http
POST   /api/predict            # Ejecutar predicción de IA en rayo X
```

**Cuerpo de Solicitud de Predicción:**
```json
{
  "xray_id": 1,
  "model_type": "multi"  // o "single"
}
```

**Respuesta de Predicción:**
```json
{
  "predictions": {
    "Atelectasis": 0.85,
    "Cardiomegaly": 0.12,
    ...
  },
  "gradcam_path": "/static/gradcam_123.png",
  "diagnosis_id": 5
}
```

## 🧠 Arquitectura del Modelo

### Modelo Multi-etiqueta (EfficientNetB0)

- **Arquitectura**: EfficientNetB0 pre-entrenado en ImageNet
- **Tamaño de Entrada**: 224x224 píxeles, 3 canales RGB
- **Salida**: 6 probabilidades de patologías (activación sigmoide)
- **Estrategia de Entrenamiento**: 
  - Transfer Learning con fine-tuning de últimas 100 capas
  - Aumento de datos (flip, brillo, contraste, saturación)
- **Optimización**: Optimizador Adam con learning rate 0.00031
- **Función de Pérdida**: Binary crossentropy con ponderación de clases
- **Regularización**: Dropout (0.31), BatchNormalization
- **Callbacks**: EarlyStopping, ReduceLROnPlateau, ModelCheckpoint

### Patologías Detectadas (Multi-label)

1. **Other Disease** (Otras enfermedades)
2. **Infiltration** (Infiltración)
3. **Atelectasis** (Atelectasia)
4. **Effusion** (Derrame pleural)
5. **Nodule** (Nódulo)
6. **Cardiomegaly** (Cardiomegalia)

### Modelos de Clasificación Binaria

Modelos especializados entrenados para patologías individuales con mayor precisión:
- `densenet_Atelectasis_best.pth`
- `densenet_Cardiomegaly_best.pth`
- `densenet_Infiltration_best.pth`

### IA Explicable (Grad-CAM)

El Mapeo de Activación de Clase Ponderado por Gradiente (Grad-CAM) genera explicaciones visuales mediante:
1. Cálculo de gradientes de la clase objetivo con respecto a los mapas de características
2. Ponderación de mapas de características por importancia de gradiente
3. Creación de un mapa de calor superpuesto en el rayo X original
4. Resaltado de regiones que influyeron en la predicción

## 📊 Dataset

Los modelos fueron entrenados en el **NIH Chest X-ray Dataset**:
- **Tamaño**: 112,120 imágenes de rayos X de vista frontal
- **Pacientes**: 30,805 pacientes únicos
- **Etiquetas**: 14 categorías de enfermedades (multi-etiqueta)
- **Formato**: Imágenes PNG, varias resoluciones
- **Fuente**: [NIH Clinical Center](https://www.nih.gov/news-events/news-releases/nih-clinical-center-provides-one-largest-publicly-available-chest-x-ray-datasets-scientific-community)

### Pipeline de Preprocesamiento

1. **Redimensionar**: Escalar a 224x224 píxeles
2. **Normalización**: Valores de píxeles normalizados a [0, 1]
3. **Aumento** (solo entrenamiento):
   - Rotación aleatoria (±10 grados)
   - Volteo horizontal aleatorio
   - Zoom aleatorio (±10%)
   - Ajuste de brillo

## 🏋️ Entrenamiento

### Scripts de Entrenamiento

Ubicados en `XAI/app/training/` (si están incluidos):
- `train_optimized.py`: Entrenamiento de modelo multi-etiqueta con optimización de hiperparámetros Optuna
- `train_infiltration.py`: Entrenamiento de modelo de clasificación binaria

### Configuración de Entrenamiento

```python
# Ejemplo de hiperparámetros
BATCH_SIZE = 32
LEARNING_RATE = 0.0001
EPOCHS_PHASE1 = 10  # Extracción de características
EPOCHS_PHASE2 = 20  # Ajuste fino
EARLY_STOPPING_PATIENCE = 5
```

### Ejecutar Entrenamiento

```bash
# Asegúrate de tener el dataset descargado
python XAI/app/training/train_optimized.py
```

### Métricas de Evaluación

- **ROC-AUC**: Área bajo la curva característica operativa del receptor
- **Precisión**: Verdaderos positivos / (Verdaderos positivos + Falsos positivos)
- **Recall**: Verdaderos positivos / (Verdaderos positivos + Falsos negativos)
- **F1-Score**: Media armónica de precisión y recall

## 🛠️ Tecnologías Utilizadas

### Backend
- **Flask 3.1**: Framework web
- **SQLAlchemy 2.0**: ORM para operaciones de base de datos
- **Flask-CORS**: Compartición de recursos de origen cruzado
- **Pillow**: Procesamiento de imágenes

### Aprendizaje Automático
- **TensorFlow 2.15+**: Framework de aprendizaje profundo principal
- **PyTorch 2.0+**: Framework ML para modelos legacy  
- **NumPy**: Computaciones numéricas
- **Matplotlib**: Visualización de activaciones de capas
- **Optuna**: Optimización de hiperparámetros

### Frontend
- **JavaScript Vanilla**: Sin dependencias de frameworks
- **D3.js v7**: Visualización de datos y diagramas interactivos
- **HTML5/CSS3**: Estándares web modernos
- **Font Awesome**: Iconografía

### Base de Datos
- **SQLite**: Base de datos relacional ligera

---

**Nota**: Esta aplicación está destinada a fines de investigación y educación. No debe utilizarse como sustituto del diagnóstico médico profesional. Siempre consulta a profesionales de la salud calificados para decisiones médicas.
