# Chest X-Ray Classification with Explainable AI

A comprehensive web application for automated chest X-ray analysis using deep learning with explainable AI (XAI) techniques. This system provides accurate pathology detection while offering visual explanations through Grad-CAM heatmaps, making AI decisions transparent and interpretable for medical professionals.

![Python](https://img.shields.io/badge/Python-3.12-blue)
![TensorFlow](https://img.shields.io/badge/TensorFlow-2.18-orange)
![Flask](https://img.shields.io/badge/Flask-3.1-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 🌟 Features

### Core Functionality
- **Multi-Label Classification**: Simultaneous detection of 14 thoracic pathologies using DenseNet121
- **Binary Classification**: Specialized models for specific conditions (Atelectasis, Cardiomegaly, Infiltration, etc.)
- **Explainable AI**: Grad-CAM heatmap visualization showing which regions influenced the diagnosis
- **Patient Management**: Complete CRUD operations for patients and follow-up records
- **Diagnosis Tracking**: Comprehensive diagnosis history with validation workflow
- **Interactive Dashboard**: Real-time statistics and data visualization

### Technical Highlights
- **Deep Learning Models**: Pre-trained DenseNet121 architecture fine-tuned on chest X-ray datasets
- **RESTful API**: Clean, well-documented backend API with Flask
- **Modern Frontend**: Responsive single-page application with vanilla JavaScript
- **Database Management**: SQLite with SQLAlchemy ORM for efficient data handling
- **Image Processing**: Automated preprocessing pipeline for X-ray normalization

## 📋 Table of Contents

- [Installation](#-installation)
- [Usage](#-usage)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Model Architecture](#-model-architecture)
- [Dataset](#-dataset)
- [Training](#-training)
- [Contributing](#-contributing)
- [License](#-license)

## 🚀 Installation

### Prerequisites

- Python 3.12 or higher
- pip package manager
- Git
- (Optional) CUDA-compatible GPU for model training

### Step 1: Clone the Repository

```bash
git clone https://github.com/AnaCarolina-04/chestxray-xai.git
cd chestxray-xai
```

### Step 2: Create Virtual Environment

```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# Linux/macOS
python3 -m venv .venv
source .venv/bin/activate
```

### Step 3: Install Dependencies

```bash
cd XAI/app/Backend
pip install -r requirements.txt
```

### Step 4: Initialize Database

The database will be automatically created when you first run the application. Alternatively, you can initialize it manually:

```bash
python -c "from run import app, db; app.app_context().push(); db.create_all()"
```

### Step 5: Run the Application

```bash
python run.py
```

The application will be available at `http://localhost:5000`

## 💻 Usage

### Starting the Server

```bash
cd XAI/app/Backend
python run.py
```

### Accessing the Application

1. Open your web browser and navigate to `http://localhost:5000`
2. The frontend interface will load automatically
3. Navigate through the sections using the sidebar menu

### Basic Workflow

1. **Add a Patient**: Click on "Pacientes" → "Nuevo Paciente"
2. **Create Follow-up**: Select a patient and add a follow-up record
3. **Upload X-Ray**: Upload a chest X-ray image (with optional automatic AI processing)
4. **View Analysis**: Check the diagnosis results and Grad-CAM visualizations
5. **Validate Diagnosis**: Medical professionals can validate or modify AI predictions

### Database Reset

To completely reset the database (useful for development):

```bash
python reset_database.py
```

⚠️ **Warning**: This will delete all data including patients, diagnoses, and uploaded files.

## 📁 Project Structure

```
chestxray-xai/
├── XAI/
│   └── app/
│       ├── Backend/
│       │   ├── routes/              # API endpoint blueprints
│       │   │   ├── general.py       # Health check endpoints
│       │   │   ├── patients.py      # Patient CRUD operations
│       │   │   ├── xrays.py         # X-ray upload and management
│       │   │   ├── diagnoses.py     # Diagnosis operations
│       │   │   ├── predictions.py   # AI prediction endpoints
│       │   │   └── frontend.py      # Static file serving
│       │   ├── models.py            # SQLAlchemy database models
│       │   ├── model_service.py     # ML model loading and inference
│       │   ├── data_structures.py   # Data transfer objects
│       │   ├── config.py            # Application configuration
│       │   ├── run.py               # Flask application entry point
│       │   └── requirements.txt     # Python dependencies
│       ├── frontend/
│       │   ├── index.html           # Main HTML file
│       │   ├── css/
│       │   │   └── styles.css       # Application styles
│       │   └── js/
│       │       └── app.js           # Frontend application logic
│       ├── models/                  # Pre-trained model weights
│       │   ├── densenet_best.pth    # Multi-label DenseNet121
│       │   └── densenet_*.pth       # Binary classification models
│       ├── notebooks/               # Jupyter notebooks
│       │   └── X_rays.ipynb         # Data exploration and preprocessing
│       └── Static/
│           └── Uploads/             # Uploaded X-ray images
└── reset_database.py                # Database reset utility
```

## 🔌 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Endpoints

#### Health Check
```http
GET /api/health
```
Returns server status and configuration.

#### Patients

```http
GET    /api/patients           # List all patients
GET    /api/patients/:id       # Get patient details
POST   /api/patients           # Create new patient
PUT    /api/patients/:id       # Update patient
DELETE /api/patients/:id       # Delete patient
```

**Create Patient Request Body:**
```json
{
  "nombre": "John Doe",
  "edad": 45,
  "sexo": "M"
}
```

#### X-Rays

```http
GET    /api/xrays              # List all X-rays
GET    /api/xrays/:id          # Get X-ray details
POST   /api/xrays              # Upload X-ray
PUT    /api/xrays/:id          # Update X-ray
DELETE /api/xrays/:id          # Delete X-ray
```

**Upload X-Ray (multipart/form-data):**
- `file`: Image file (required)
- `followup_id`: Follow-up ID (required)
- `auto_process`: Boolean, auto-run AI analysis (optional)

#### Diagnoses

```http
GET    /api/diagnoses          # List all diagnoses
GET    /api/diagnoses/:id      # Get diagnosis details
POST   /api/diagnoses          # Create manual diagnosis
PUT    /api/diagnoses/:id      # Update diagnosis
DELETE /api/diagnoses/:id      # Delete diagnosis
```

#### Predictions

```http
POST   /api/predict            # Run AI prediction on X-ray
```

**Prediction Request Body:**
```json
{
  "xray_id": 1,
  "model_type": "multi"  // or "single"
}
```

**Prediction Response:**
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

## 🧠 Model Architecture

### Multi-Label Model (DenseNet121)

- **Architecture**: DenseNet121 pre-trained on ImageNet
- **Input Size**: 224x224 pixels, grayscale converted to 3-channel
- **Output**: 14 pathology probabilities (sigmoid activation)
- **Training Strategy**: 
  - Phase 1: Feature extraction (frozen backbone)
  - Phase 2: Fine-tuning (unfrozen last layers)
- **Optimization**: Adam optimizer with learning rate scheduling
- **Loss Function**: Binary cross-entropy with class weighting

### Detected Pathologies

1. Atelectasis
2. Cardiomegaly
3. Effusion
4. Infiltration
5. Mass
6. Nodule
7. Pneumonia
8. Pneumothorax
9. Consolidation
10. Edema
11. Emphysema
12. Fibrosis
13. Pleural Thickening
14. Hernia

### Binary Classification Models

Specialized models trained for individual pathologies with higher precision:
- `densenet_Atelectasis_best.pth`
- `densenet_Cardiomegaly_best.pth`
- `densenet_Infiltration_best.pth`

### Explainable AI (Grad-CAM)

Gradient-weighted Class Activation Mapping (Grad-CAM) generates visual explanations by:
1. Computing gradients of the target class with respect to feature maps
2. Weighting feature maps by gradient importance
3. Creating a heatmap overlay on the original X-ray
4. Highlighting regions that influenced the prediction

## 📊 Dataset

The models were trained on the **NIH Chest X-ray Dataset**:
- **Size**: 112,120 frontal-view X-ray images
- **Patients**: 30,805 unique patients
- **Labels**: 14 disease categories (multi-label)
- **Format**: PNG images, various resolutions
- **Source**: [NIH Clinical Center](https://www.nih.gov/news-events/news-releases/nih-clinical-center-provides-one-largest-publicly-available-chest-x-ray-datasets-scientific-community)

### Preprocessing Pipeline

1. **Resize**: Scale to 224x224 pixels
2. **Normalization**: Pixel values normalized to [0, 1]
3. **Augmentation** (training only):
   - Random rotation (±10 degrees)
   - Random horizontal flip
   - Random zoom (±10%)
   - Brightness adjustment

## 🏋️ Training

### Training Scripts

Located in `XAI/app/training/` (if included):
- `train_optimized.py`: Multi-label model training with Optuna hyperparameter optimization
- `train_infiltration.py`: Binary classification model training

### Training Configuration

```python
# Example hyperparameters
BATCH_SIZE = 32
LEARNING_RATE = 0.0001
EPOCHS_PHASE1 = 10  # Feature extraction
EPOCHS_PHASE2 = 20  # Fine-tuning
EARLY_STOPPING_PATIENCE = 5
```

### Running Training

```bash
# Ensure you have the dataset downloaded
python XAI/app/training/train_optimized.py
```

### Evaluation Metrics

- **ROC-AUC**: Area under the receiver operating characteristic curve
- **Precision**: True positives / (True positives + False positives)
- **Recall**: True positives / (True positives + False negatives)
- **F1-Score**: Harmonic mean of precision and recall

## 🛠️ Technologies Used

### Backend
- **Flask 3.1**: Web framework
- **SQLAlchemy 2.0**: ORM for database operations
- **Flask-CORS**: Cross-origin resource sharing
- **Pillow**: Image processing

### Machine Learning
- **TensorFlow 2.18**: Deep learning framework
- **PyTorch 2.6**: Alternative ML framework
- **NumPy**: Numerical computations
- **Optuna**: Hyperparameter optimization

### Frontend
- **Vanilla JavaScript**: No framework dependencies
- **HTML5/CSS3**: Modern web standards
- **Chart.js** (if used): Data visualization

### Database
- **SQLite**: Lightweight relational database

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Ana Carolina** - [@AnaCarolina-04](https://github.com/AnaCarolina-04)

## 🙏 Acknowledgments

- NIH Clinical Center for providing the chest X-ray dataset
- TensorFlow and PyTorch communities for excellent documentation
- DenseNet authors for the model architecture
- Grad-CAM authors for the explainability technique

## 📞 Contact

For questions or support, please open an issue on GitHub or contact the maintainers.

---

**Note**: This application is intended for research and educational purposes. It should not be used as a substitute for professional medical diagnosis. Always consult qualified healthcare professionals for medical decisions.
