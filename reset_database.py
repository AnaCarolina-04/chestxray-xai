#!/usr/bin/env python3
"""
Script para limpiar todos los datos de la base de datos
Mantiene la estructura de las tablas pero elimina todos los registros
"""

import sys
from pathlib import Path

# Añadir el directorio del backend al path
backend_dir = Path(__file__).parent / "XAI" / "app" / "Backend"
sys.path.insert(0, str(backend_dir))

from run import app, db, Patient, Xray, Prediction, Diagnosis, Disease, GradCam

def reset_database():
    """Elimina todos los datos de la base de datos"""
    with app.app_context():
        print("🗑️ Limpiando base de datos...")
        
        # Contar registros antes
        patients_count = Patient.query.count()
        xrays_count = Xray.query.count()
        predictions_count = Prediction.query.count()
        diagnoses_count = Diagnosis.query.count()
        gradcams_count = GradCam.query.count()
        
        print(f"\n📊 Registros actuales:")
        print(f"  - Pacientes: {patients_count}")
        print(f"  - Radiografías: {xrays_count}")
        print(f"  - Predicciones: {predictions_count}")
        print(f"  - Diagnósticos: {diagnoses_count}")
        print(f"  - Grad-CAMs: {gradcams_count}")
        
        # Eliminar en orden correcto (respetando foreign keys)
        print("\n🗑️ Eliminando registros...")
        
        # 1. Eliminar Grad-CAMs
        GradCam.query.delete()
        print("  ✅ Grad-CAMs eliminados")
        
        # 2. Eliminar Diagnósticos
        Diagnosis.query.delete()
        print("  ✅ Diagnósticos eliminados")
        
        # 3. Eliminar Predicciones
        Prediction.query.delete()
        print("  ✅ Predicciones eliminadas")
        
        # 4. Eliminar Radiografías
        Xray.query.delete()
        print("  ✅ Radiografías eliminadas")
        
        # 5. Eliminar Pacientes
        Patient.query.delete()
        print("  ✅ Pacientes eliminados")
        
        # Commit de los cambios
        db.session.commit()
        
        print("\n✅ Base de datos limpiada exitosamente!")
        print("\n📊 Registros finales:")
        print(f"  - Pacientes: {Patient.query.count()}")
        print(f"  - Radiografías: {Xray.query.count()}")
        print(f"  - Predicciones: {Prediction.query.count()}")
        print(f"  - Diagnósticos: {Diagnosis.query.count()}")
        print(f"  - Grad-CAMs: {GradCam.query.count()}")
        
        # Verificar enfermedades (no se eliminan)
        diseases_count = Disease.query.count()
        print(f"  - Enfermedades: {diseases_count} (mantenidas)")
        
        if diseases_count > 0:
            print("\n📋 Enfermedades disponibles:")
            for disease in Disease.query.all():
                print(f"  - {disease.name}")

if __name__ == '__main__':
    print("=" * 60)
    print("  RESET DE BASE DE DATOS - ChestXAI")
    print("=" * 60)
    
    confirm = input("\n⚠️  ¿Estás seguro de que quieres eliminar TODOS los datos? (sí/no): ")
    
    if confirm.lower() in ['sí', 'si', 'yes', 's', 'y']:
        reset_database()
    else:
        print("\n❌ Operación cancelada")
