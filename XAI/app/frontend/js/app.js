// Mock Data
const patients = [
    { id: 1, name: 'Juan Pérez', age: 45, gender: 'M', lastExam: '2023-10-15', status: 'Normal' },
    { id: 2, name: 'María García', age: 32, gender: 'F', lastExam: '2023-10-20', status: 'Revisión' },
    { id: 3, name: 'Carlos López', age: 58, gender: 'M', lastExam: '2023-10-22', status: 'Crítico' },
    { id: 4, name: 'Ana Martínez', age: 27, gender: 'F', lastExam: '2023-10-25', status: 'Normal' },
    { id: 5, name: 'Luis Rodríguez', age: 64, gender: 'M', lastExam: '2023-10-28', status: 'Revisión' },
];

const diseases = [
    { name: 'Neumonía', cases: 120, trend: 'up' },
    { name: 'Tuberculosis', cases: 45, trend: 'down' },
    { name: 'COVID-19', cases: 80, trend: 'stable' },
    { name: 'Fibrosis', cases: 30, trend: 'up' },
];

// State
let currentSection = 'patients';

// DOM Elements
const sidebar = document.getElementById('sidebar');
const toggleSidebarBtn = document.getElementById('toggle-sidebar');
const closeSidebarBtn = document.getElementById('close-sidebar');
const contentArea = document.getElementById('content-area');
const pageTitle = document.getElementById('page-title');
const navItems = document.querySelectorAll('.nav-item');

// Navigation Logic
function initNavigation() {
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.dataset.target;
            setActiveSection(target);
            
            // Close sidebar on mobile after selection
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
            }
        });
    });

    toggleSidebarBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    closeSidebarBtn.addEventListener('click', () => {
        sidebar.classList.remove('open');
    });
}

function setActiveSection(sectionId) {
    // Update Nav UI
    navItems.forEach(item => {
        if (item.dataset.target === sectionId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    currentSection = sectionId;
    renderContent(sectionId);
}

// Content Rendering
function renderContent(sectionId) {
    contentArea.innerHTML = '<div class="loading-spinner">Cargando...</div>';
    
    setTimeout(() => {
        let content = '';
        let title = '';

        switch(sectionId) {
            case 'patients':
                title = 'Pacientes';
                content = renderPatients();
                break;
            case 'diseases':
                title = 'Enfermedades';
                content = renderDiseases();
                break;
            case 'explainable-ai':
                title = 'IA Explicable';
                content = renderExplainableAI();
                break;
            case 'apply-cnn':
                title = 'Aplicar CNN';
                content = renderApplyCNN();
                break;
            case 'grad-cam':
                title = 'Grad-CAM';
                content = renderGradCAM();
                break;
            case 'validation':
                title = 'Validación de Diagnóstico';
                content = renderValidation();
                break;
            case 'view-by-disease':
                title = 'Vista por Enfermedad';
                content = renderViewByDisease();
                break;
            default:
                title = 'Pacientes';
                content = renderPatients();
        }

        pageTitle.textContent = title;
        contentArea.innerHTML = content;
        
        // Re-attach event listeners for dynamic content if needed
        attachDynamicListeners();
    }, 300); // Fake loading delay
}

// Render Functions
function renderPatients() {
    const rows = patients.map(p => {
        let badgeClass = 'badge-success';
        if (p.status === 'Revisión') badgeClass = 'badge-warning';
        if (p.status === 'Crítico') badgeClass = 'badge-danger';

        return `
            <tr>
                <td>${p.id}</td>
                <td>${p.name}</td>
                <td>${p.age}</td>
                <td>${p.gender}</td>
                <td>${p.lastExam}</td>
                <td><span class="badge ${badgeClass}">${p.status}</span></td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="alert('Ver detalles de ${p.name}')">Ver</button>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <div class="card">
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Edad</th>
                            <th>Género</th>
                            <th>Última Radiografía</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderDiseases() {
    const cards = diseases.map(d => {
        let icon = 'fa-minus';
        let color = 'text-secondary';
        if (d.trend === 'up') { icon = 'fa-arrow-up'; color = 'danger-color'; }
        if (d.trend === 'down') { icon = 'fa-arrow-down'; color = 'success-color'; }

        return `
            <div class="card">
                <h3>${d.name}</h3>
                <div style="font-size: 2rem; font-weight: 700; margin: 1rem 0;">${d.cases}</div>
                <div style="color: var(--text-secondary);">
                    <i class="fa-solid ${icon}" style="color: var(--${color})"></i> Casos activos
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="grid-2">
            ${cards}
        </div>
        <div class="card" style="margin-top: 1.5rem;">
            <h3>Evolución Mensual</h3>
            <div style="height: 300px; background: #f8fafc; display: flex; align-items: center; justify-content: center; border-radius: 0.5rem; margin-top: 1rem;">
                <p style="color: var(--text-secondary);">Gráfico de evolución (Placeholder)</p>
            </div>
        </div>
    `;
}

function renderExplainableAI() {
    return `
        <div class="card">
            <h2>¿Cómo funciona la CNN?</h2>
            <p style="margin-top: 1rem; line-height: 1.6;">
                Las Redes Neuronales Convolucionales (CNN) son un tipo de Inteligencia Artificial diseñada para procesar datos con estructura de rejilla, como las imágenes.
                Funcionan imitando la forma en que el cerebro humano procesa la visión.
            </p>
            
            <div style="margin-top: 2rem; display: flex; flex-direction: column; gap: 2rem;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="width: 60px; height: 60px; background: #eff6ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--primary-color); font-size: 1.5rem;">1</div>
                    <div>
                        <h4>Entrada</h4>
                        <p>La radiografía se introduce en el sistema como una matriz de píxeles.</p>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="width: 60px; height: 60px; background: #eff6ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--primary-color); font-size: 1.5rem;">2</div>
                    <div>
                        <h4>Extracción de Características</h4>
                        <p>La red aplica filtros para detectar bordes, texturas y patrones específicos de enfermedades.</p>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="width: 60px; height: 60px; background: #eff6ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--primary-color); font-size: 1.5rem;">3</div>
                    <div>
                        <h4>Clasificación</h4>
                        <p>Las capas finales deciden qué enfermedad es más probable basándose en las características encontradas.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderApplyCNN() {
    return `
        <div class="grid-2">
            <div class="card">
                <h3>Subir Radiografía</h3>
                <div class="upload-area" id="upload-dropzone">
                    <i class="fa-solid fa-cloud-arrow-up upload-icon"></i>
                    <p>Arrastra tu imagen aquí o haz clic para seleccionar</p>
                    <input type="file" id="file-input" hidden accept="image/*">
                </div>
                <button class="btn btn-primary" style="width: 100%; margin-top: 1rem;" id="analyze-btn">Analizar Imagen</button>
            </div>
            
            <div class="card" id="results-panel" style="display: none;">
                <h3>Resultados del Análisis</h3>
                <div style="margin-top: 1rem; text-align: center;">
                    <img src="https://via.placeholder.com/300x300?text=X-Ray+Preview" alt="Preview" style="max-width: 100%; border-radius: 0.5rem; margin-bottom: 1rem;">
                    
                    <div style="text-align: left;">
                        <div style="margin-bottom: 1rem;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                <span>Neumonía</span>
                                <span style="font-weight: 700;">92%</span>
                            </div>
                            <div style="height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                                <div style="height: 100%; width: 92%; background: var(--danger-color);"></div>
                            </div>
                        </div>
                        <div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                <span>Normal</span>
                                <span style="font-weight: 700;">8%</span>
                            </div>
                            <div style="height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                                <div style="height: 100%; width: 8%; background: var(--success-color);"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderGradCAM() {
    return `
        <div class="card">
            <h3>Visualización Grad-CAM</h3>
            <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
                El mapa de calor muestra las regiones de la imagen que más influyeron en la decisión del modelo.
            </p>
            
            <div class="grid-2">
                <div>
                    <h4 style="margin-bottom: 1rem;">Original</h4>
                    <img src="https://via.placeholder.com/400x400?text=Original+X-Ray" style="width: 100%; border-radius: 0.5rem;">
                </div>
                <div>
                    <h4 style="margin-bottom: 1rem;">Mapa de Activación</h4>
                    <div style="position: relative;">
                        <img src="https://via.placeholder.com/400x400?text=Original+X-Ray" style="width: 100%; border-radius: 0.5rem;">
                        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(circle, rgba(255,0,0,0.5) 0%, rgba(0,0,0,0) 70%); border-radius: 0.5rem;"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderValidation() {
    return `
        <div class="card">
            <h3>Validación de Diagnóstico</h3>
            <div class="grid-2" style="margin-top: 1.5rem;">
                <div>
                    <img src="https://via.placeholder.com/400x400?text=X-Ray+Case+123" style="width: 100%; border-radius: 0.5rem;">
                </div>
                <div>
                    <div style="background: #eff6ff; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem;">
                        <h4 style="color: var(--primary-color);">Predicción del Modelo</h4>
                        <p style="font-size: 1.25rem; font-weight: 700; margin-top: 0.5rem;">Neumonía (92%)</p>
                    </div>
                    
                    <form>
                        <div class="form-group">
                            <label class="form-label">¿Es correcto el diagnóstico?</label>
                            <div style="display: flex; gap: 1rem;">
                                <button type="button" class="btn btn-primary" style="flex: 1; background-color: var(--success-color);">
                                    <i class="fa-solid fa-check"></i> Correcto
                                </button>
                                <button type="button" class="btn btn-primary" style="flex: 1; background-color: var(--danger-color);">
                                    <i class="fa-solid fa-times"></i> Incorrecto
                                </button>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Notas del Doctor</label>
                            <textarea class="form-control" rows="4" placeholder="Añada sus observaciones..."></textarea>
                        </div>
                        
                        <button type="button" class="btn btn-primary" style="width: 100%;">Guardar Validación</button>
                    </form>
                </div>
            </div>
        </div>
    `;
}

function renderViewByDisease() {
    return `
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h3>Filtrar por Enfermedad</h3>
                <select class="form-control" style="width: 200px;">
                    <option>Todas</option>
                    <option>Neumonía</option>
                    <option>Tuberculosis</option>
                    <option>COVID-19</option>
                </select>
            </div>
            
            <div class="grid-3">
                ${[1, 2, 3, 4, 5, 6].map(i => `
                    <div style="border: 1px solid var(--border-color); border-radius: 0.5rem; overflow: hidden;">
                        <img src="https://via.placeholder.com/300x200?text=Case+${i}" style="width: 100%; height: 150px; object-fit: cover;">
                        <div style="padding: 1rem;">
                            <h4 style="margin-bottom: 0.5rem;">Caso #${202300 + i}</h4>
                            <span class="badge badge-danger">Neumonía</span>
                            <button class="btn btn-outline btn-sm" style="width: 100%; margin-top: 1rem;">Ver Detalles</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function attachDynamicListeners() {
    // Listeners for Apply CNN section
    const uploadArea = document.getElementById('upload-dropzone');
    const fileInput = document.getElementById('file-input');
    const analyzeBtn = document.getElementById('analyze-btn');
    const resultsPanel = document.getElementById('results-panel');

    if (uploadArea) {
        uploadArea.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                uploadArea.innerHTML = `<p>Archivo seleccionado: <strong>${e.target.files[0].name}</strong></p>`;
            }
        });
    }

    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', () => {
            analyzeBtn.textContent = 'Analizando...';
            analyzeBtn.disabled = true;
            
            setTimeout(() => {
                analyzeBtn.textContent = 'Analizar Imagen';
                analyzeBtn.disabled = false;
                resultsPanel.style.display = 'block';
                resultsPanel.scrollIntoView({ behavior: 'smooth' });
            }, 1500);
        });
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    renderContent('patients'); // Initial load
});
