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
            case 'upload-xray':
                title = 'Subir Radiografía';
                content = loadUploadXray();
                break;
            case 'all-xrays':
                title = 'Todas las Radiografías';
                content = renderAllXrays();
                break;
            case 'pending-xrays':
                title = 'Radiografías Pendientes';
                content = renderPendingXrays(); // ✅ CORRECTO
                break;
            case 'analysis': // ✅ NUEVA SECCIÓN UNIFICADA
                title = 'Análisis de Radiografía';
                content = renderAnalysis();
                break;
            case 'diagnoses':
                title = 'Gestión de Diagnósticos';
                content = renderDiagnoses();
                break;
            case 'diseases':
                title = 'Enfermedades';
                content = renderDiseases();
                break;
            case 'explainable-ai':
                title = 'IA Explicable';
                content = renderExplainableAI();
                break;
            default:
                title = 'Pacientes';
                content = renderPatients();
        }

        pageTitle.textContent = title;
        contentArea.innerHTML = content;
        
        attachDynamicListeners();
    }, 300);
}

// Render Functions
function renderPatients() {
    const content = `
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2><i class="fa-solid fa-users"></i> Lista de Pacientes</h2>
                <button class="btn btn-primary" onclick="setActiveSection('upload-xray')">
                    <i class="fa-solid fa-plus"></i> Nuevo Paciente
                </button>
            </div>
            <div id="patients-table-container"></div>
        </div>
    `;
    
    setTimeout(async () => {
        const container = document.getElementById('patients-table-container');
        container.innerHTML = '<p>Cargando pacientes...</p>';
        
        try {
            const response = await fetch('/api/patients');
            const patients = await response.json();
            
            if (patients.length === 0) {
                container.innerHTML = '<p style="text-align:center; color: var(--text-secondary);">No hay pacientes registrados</p>';
                return;
            }
            
            const rows = patients.map(p => {
                return `
                    <tr>
                        <td>${p.id}</td>
                        <td>${p.name}</td>
                        <td>${p.age}</td>
                        <td>${p.gender === 'M' ? 'Masculino' : 'Femenino'}</td>
                        <td>${new Date(p.created_at).toLocaleDateString()}</td>
                        <td>
                            <button class="btn btn-outline btn-sm" onclick="viewPatientXrays(${p.id}, '${p.name}')">
                                <i class="fa-solid fa-image"></i> Ver Radiografías
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

            container.innerHTML = `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nombre</th>
                                <th>Edad</th>
                                <th>Género</th>
                                <th>Fecha de Registro</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>
            `;
            
        } catch (error) {
            console.error(error);
            container.innerHTML = '<p style="color: var(--danger-color);">Error al cargar pacientes</p>';
        }
    }, 100);
    
    return content;
}

// 📌 NUEVA: Ver radiografías de un paciente
async function viewPatientXrays(patientId, patientName) {
    try {
        const response = await fetch(`/api/patients/${patientId}/xrays`);
        const xrays = await response.json();
        
        sessionStorage.setItem('patient_filter', JSON.stringify({ id: patientId, name: patientName }));
        setActiveSection('all-xrays');
        
    } catch (error) {
        console.error(error);
        alert('❌ Error al cargar radiografías del paciente');
    }
}

// 📌 CORREGIDO: Subir Radiografía con Paciente
function loadUploadXray() {
    const content = `
        <div class="card" style="max-width: 700px; margin: 0 auto;">
            <h2><i class="fa-solid fa-upload"></i> Subir Nueva Radiografía</h2>
            <p style="color: var(--text-secondary); margin-bottom: 2rem;">
                Asocia la radiografía a un paciente existente o crea uno nuevo.
            </p>
            
            <!-- Seleccionar/Crear Paciente -->
            <div class="form-group">
                <label class="form-label">
                    <i class="fa-solid fa-user"></i> Paciente
                </label>
                <div style="display: flex; gap: 1rem;">
                    <select id="patient-select" class="form-control" style="flex: 1;">
                        <option value="">Cargando pacientes...</option>
                    </select>
                    <button class="btn btn-outline" type="button" id="new-patient-btn">
                        <i class="fa-solid fa-plus"></i> Nuevo
                    </button>
                </div>
            </div>

            <!-- Upload Zone -->
            <div class="upload-zone" id="upload-zone-new">
                <i class="fa-solid fa-cloud-arrow-up"></i>
                <p>Arrastra la radiografía aquí o haz clic para seleccionar</p>
                <input type="file" id="file-input-new" accept="image/*" style="display:none;">
                <button class="btn-primary" type="button" id="select-file-btn">
                    Seleccionar Archivo
                </button>
            </div>
            <div id="file-name-new" class="file-name"></div>

            <button id="upload-btn" class="btn btn-primary" style="width: 100%; margin-top: 1.5rem;" disabled>
                <i class="fa-solid fa-upload"></i> Subir Radiografía
            </button>
        </div>

        <!-- Modal Crear Paciente -->
        <div id="create-patient-modal" class="modal" style="display:none;">
            <div class="modal-content">
                <h3>Crear Nuevo Paciente</h3>
                <div class="form-group">
                    <label class="form-label">Nombre Completo</label>
                    <input type="text" id="patient-name" class="form-control" placeholder="Ej: Juan Pérez">
                </div>
                <div class="form-group">
                    <label class="form-label">Edad</label>
                    <input type="number" id="patient-age" class="form-control" placeholder="Ej: 45">
                </div>
                <div class="form-group">
                    <label class="form-label">Género</label>
                    <select id="patient-gender" class="form-control">
                        <option value="M">Masculino</option>
                        <option value="F">Femenino</option>
                    </select>
                </div>
                <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                    <button class="btn btn-outline" type="button" id="cancel-patient-btn">Cancelar</button>
                    <button class="btn btn-primary" type="button" id="create-patient-btn">Crear Paciente</button>
                </div>
            </div>
        </div>
    `;
    
    setTimeout(() => {
        initUploadXrayListeners();
        loadPatients();
    }, 100);
    
    return content;
}

// ✅ CORREGIDO: Event listeners sin duplicación
function initUploadXrayListeners() {
    const fileInput = document.getElementById('file-input-new');
    const uploadZone = document.getElementById('upload-zone-new');
    const uploadBtn = document.getElementById('upload-btn');
    const patientSelect = document.getElementById('patient-select');
    const fileNameDiv = document.getElementById('file-name-new');
    const selectFileBtn = document.getElementById('select-file-btn');
    const newPatientBtn = document.getElementById('new-patient-btn');
    const cancelPatientBtn = document.getElementById('cancel-patient-btn');
    const createPatientBtn = document.getElementById('create-patient-btn');
    
    if (!fileInput || !uploadZone) {
        console.error('❌ Elementos de upload no encontrados');
        return;
    }
    
    let selectedFile = null;

    // ✅ SOLO UN LISTENER: Botón seleccionar archivo
    selectFileBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // ✅ Drag & Drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('drag-over');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('drag-over');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            selectedFile = file;
            fileNameDiv.textContent = `Archivo: ${file.name}`;
            fileNameDiv.style.display = 'block';
            checkUploadReady();
        }
    });

    // ✅ File Input Change
    fileInput.addEventListener('change', (e) => {
        selectedFile = e.target.files[0];
        if (selectedFile) {
            console.log('✅ Archivo seleccionado:', selectedFile.name);
            fileNameDiv.textContent = `Archivo: ${selectedFile.name}`;
            fileNameDiv.style.display = 'block';
            checkUploadReady();
        }
    });

    patientSelect.addEventListener('change', checkUploadReady);

    function checkUploadReady() {
        const isReady = selectedFile && patientSelect.value;
        uploadBtn.disabled = !isReady;
        console.log('📋 Upload ready:', isReady, '| File:', selectedFile?.name, '| Patient:', patientSelect.value);
    }

    // ✅ Subir radiografía
    uploadBtn.addEventListener('click', async () => {
        if (!selectedFile || !patientSelect.value) {
            alert('⚠️ Por favor selecciona un archivo y un paciente');
            return;
        }

        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Subiendo...';

        try {
            console.log('📤 Iniciando upload...');
            console.log('  - Archivo:', selectedFile.name);
            console.log('  - Paciente ID:', patientSelect.value);
            
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('patient_id', patientSelect.value);

            console.log('📡 Enviando a /api/upload-xray...');
            
            const response = await fetch('/api/upload-xray', {
                method: 'POST',
                body: formData
            });

            console.log('📡 Respuesta:', response.status, response.statusText);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Error del servidor:', errorData);
                throw new Error(errorData.error || 'Error desconocido');
            }

            const data = await response.json();
            console.log('✅ Upload exitoso:', data);
            
            alert(`✅ Radiografía subida exitosamente para ${data.patient_name}`);
            
            // Limpiar y redirigir
            selectedFile = null;
            fileNameDiv.style.display = 'none';
            fileInput.value = '';
            patientSelect.value = '';
            
            setActiveSection('all-xrays');

        } catch (error) {
            console.error('❌ Error completo:', error);
            alert(`❌ Error al subir la radiografía: ${error.message}`);
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fa-solid fa-upload"></i> Subir Radiografía';
        }
    });

    // ✅ Botón nuevo paciente
    newPatientBtn.addEventListener('click', () => {
        document.getElementById('create-patient-modal').style.display = 'flex';
    });

    // ✅ Cancelar modal
    cancelPatientBtn.addEventListener('click', () => {
        document.getElementById('create-patient-modal').style.display = 'none';
    });

    // ✅ Crear paciente
    createPatientBtn.addEventListener('click', async () => {
        const name = document.getElementById('patient-name').value;
        const age = document.getElementById('patient-age').value;
        const gender = document.getElementById('patient-gender').value;

        if (!name || !age) {
            alert('Por favor completa todos los campos');
            return;
        }

        try {
            const response = await fetch('/api/patients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, age: parseInt(age), gender })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error desconocido');
            }

            const data = await response.json();
            alert(`✅ Paciente creado: ${data.name}`);
            
            // Limpiar formulario
            document.getElementById('patient-name').value = '';
            document.getElementById('patient-age').value = '';
            document.getElementById('patient-gender').value = 'M';
            
            document.getElementById('create-patient-modal').style.display = 'none';
            loadPatients();
            
        } catch (error) {
            console.error('Error completo:', error);
            alert(`❌ Error al crear paciente: ${error.message}`);
        }
    });
}

async function loadPatients() {
    const select = document.getElementById('patient-select');
    if (!select) return;
    
    try {
        const response = await fetch('/api/patients');
        const patients = await response.json();
        
        select.innerHTML = '<option value="">-- Seleccionar paciente --</option>';
        patients.forEach(p => {
            select.innerHTML += `<option value="${p.id}">${p.name} (${p.age} años)</option>`;
        });
    } catch (error) {
        console.error(error);
        select.innerHTML = '<option value="">Error al cargar pacientes</option>';
    }
}

// ============================
//    SECCIÓN: TODAS LAS RADIOGRAFÍAS
// ============================

function renderAllXrays() {
    const content = `
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2><i class="fa-solid fa-images"></i> Todas las Radiografías</h2>
                <div style="display: flex; gap: 1rem;">
                    <select id="filter-patient" class="form-control" style="width: 250px;">
                        <option value="">Todos los pacientes</option>
                    </select>
                    <button class="btn btn-primary" onclick="setActiveSection('upload-xray')">
                        <i class="fa-solid fa-upload"></i> Subir Nueva
                    </button>
                </div>
            </div>
            <div id="all-xrays-list"></div>
        </div>
    `;
    
    setTimeout(async () => {
        await loadAllXraysData();
        await populatePatientFilter();
        
        const filterSelect = document.getElementById('filter-patient');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                filterXraysByPatient(e.target.value);
            });
        }
    }, 100);
    
    return content;
}

async function loadAllXraysData() {
    const listDiv = document.getElementById('all-xrays-list');
    listDiv.innerHTML = '<p>Cargando radiografías...</p>';
    
    try {
        const response = await fetch('/api/xrays/all');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const xrays = await response.json();
        window.allXraysData = xrays;
        
        if (xrays.length === 0) {
            listDiv.innerHTML = '<p style="text-align:center; color: var(--text-secondary);">No hay radiografías subidas. <a href="#" onclick="setActiveSection(\'upload-xray\'); return false;">Subir una ahora</a></p>';
            return;
        }
        
        displayXrays(xrays);
        
    } catch (error) {
        console.error('❌ Error completo:', error);
        listDiv.innerHTML = `
            <div style="padding: 2rem; text-align: center;">
                <p style="color: var(--danger-color); margin-bottom: 1rem;">Error al cargar radiografías: ${error.message}</p>
                <button class="btn btn-primary" onclick="loadAllXraysData()">
                    <i class="fa-solid fa-refresh"></i> Reintentar
                </button>
            </div>
        `;
    }
}

function displayXrays(xrays) {
    const listDiv = document.getElementById('all-xrays-list');
    
    if (!xrays || xrays.length === 0) {
        listDiv.innerHTML = '<p style="text-align:center; color: var(--text-secondary);">No hay radiografías para mostrar</p>';
        return;
    }
    
    listDiv.innerHTML = `
        <div class="grid-3">
            ${xrays.map(x => `
                <div class="xray-card" style="border: 1px solid var(--border-color); border-radius: 0.75rem; overflow: hidden; transition: transform 0.2s;">
                    <img src="/api/xrays/${x.id}/image" 
                         alt="Radiografía ${x.id}" 
                         style="width: 100%; height: 200px; object-fit: cover; cursor: pointer; background: #f0f0f0;" 
                         onclick="viewXrayDetail(${x.id})"
                         onerror="this.style.background='#fee'; this.alt='Error al cargar imagen';">
                    <div style="padding: 1rem;">
                        <h4 style="margin-bottom: 0.5rem;">${x.patient_name}</h4>
                        <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.75rem;">
                            <i class="fa-solid fa-calendar"></i> ${new Date(x.upload_date).toLocaleDateString()}
                        </p>
                        ${x.has_prediction ? `
                            <div style="padding: 0.5rem; background: #eff6ff; border-radius: 0.5rem; margin-bottom: 0.75rem;">
                                <strong style="color: var(--primary-color);">${x.prediction}</strong>
                            </div>
                            <button class="btn btn-outline btn-sm" style="width: 100%;" onclick="viewXrayDetail(${x.id})">
                                <i class="fa-solid fa-eye"></i> Ver Detalles
                            </button>
                        ` : `
                            <button class="btn btn-primary btn-sm" style="width: 100%;" onclick="processXray(${x.id})">
                                <i class="fa-solid fa-brain"></i> Procesar CNN
                            </button>
                        `}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

async function populatePatientFilter() {
    const select = document.getElementById('filter-patient');
    if (!select) return;
    
    try {
        const response = await fetch('/api/patients');
        const patients = await response.json();
        
        patients.forEach(p => {
            select.innerHTML += `<option value="${p.id}">${p.name}</option>`;
        });
        
        // Aplicar filtro si viene de ver paciente
        const patientFilter = sessionStorage.getItem('patient_filter');
        if (patientFilter) {
            const filter = JSON.parse(patientFilter);
            select.value = filter.id;
            filterXraysByPatient(filter.id);
            sessionStorage.removeItem('patient_filter');
        }
        
    } catch (error) {
        console.error('Error al cargar pacientes:', error);
    }
}

function filterXraysByPatient(patientId) {
    if (!window.allXraysData) return;
    
    if (patientId === "") {
        displayXrays(window.allXraysData);
    } else {
        const filtered = window.allXraysData.filter(x => x.patient_id == patientId);
        displayXrays(filtered);
    }
}

function viewXrayDetail(xrayId) {
    sessionStorage.setItem('current_xray_id', xrayId);
    setActiveSection('analysis');
}

// ============================
//    SECCIÓN: SUBIR RADIOGRAFÍA
// ============================

function renderUploadXray() {
    const content = `
        <div class="card" style="max-width: 700px; margin: 0 auto;">
            <h2><i class="fa-solid fa-upload"></i> Subir Nueva Radiografía</h2>
            <p style="color: var(--text-secondary); margin-bottom: 2rem;">
                Asocia la radiografía a un paciente existente o crea uno nuevo.
            </p>
            
            <div class="form-group">
                <label class="form-label">
                    <i class="fa-solid fa-user"></i> Paciente
                </label>
                <div style="display: flex; gap: 1rem;">
                    <select id="patient-select" class="form-control" style="flex: 1;">
                        <option value="">Cargando pacientes...</option>
                    </select>
                    <button class="btn btn-outline" type="button" id="new-patient-btn">
                        <i class="fa-solid fa-plus"></i> Nuevo
                    </button>
                </div>
            </div>

            <div class="upload-area" id="upload-area-xray" style="border: 2px dashed var(--border-color); border-radius: 0.75rem; padding: 3rem; text-align: center; cursor: pointer; transition: all 0.2s; margin-bottom: 1rem;">
                <i class="fa-solid fa-cloud-arrow-up" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 1rem;"></i>
                <p style="margin-bottom: 0.5rem;">Arrastra la radiografía aquí o haz clic para seleccionar</p>
                <p style="font-size: 0.875rem; color: var(--text-secondary);">PNG, JPG hasta 10MB</p>
                <input type="file" id="file-input-xray" accept="image/*" style="display:none;">
            </div>
            <div id="file-preview-xray" style="display: none; margin-bottom: 1rem;">
                <p style="font-weight: 600; margin-bottom: 0.5rem;"><i class="fa-solid fa-file-image"></i> Archivo seleccionado:</p>
                <p id="file-name-display" style="color: var(--primary-color);"></p>
            </div>

            <button id="upload-btn-xray" class="btn btn-primary" style="width: 100%;" disabled>
                <i class="fa-solid fa-upload"></i> Subir Radiografía
            </button>
        </div>

        <div id="create-patient-modal" class="modal" style="display:none;">
            <div class="modal-content">
                <h3>Crear Nuevo Paciente</h3>
                <div class="form-group">
                    <label class="form-label">Nombre Completo</label>
                    <input type="text" id="patient-name" class="form-control" placeholder="Ej: Juan Pérez">
                </div>
                <div class="form-group">
                    <label class="form-label">Edad</label>
                    <input type="number" id="patient-age" class="form-control" placeholder="Ej: 45">
                </div>
                <div class="form-group">
                    <label class="form-label">Género</label>
                    <select id="patient-gender" class="form-control">
                        <option value="M">Masculino</option>
                        <option value="F">Femenino</option>
                    </select>
                </div>
                <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                    <button class="btn btn-outline" type="button" id="cancel-patient-btn">Cancelar</button>
                    <button class="btn btn-primary" type="button" id="create-patient-btn">Crear Paciente</button>
                </div>
            </div>
        </div>
    `;
    
    setTimeout(() => {
        initUploadXrayListeners();
        loadPatientsForUpload();
    }, 100);
    
    return content;
}

function initUploadXrayListeners() {
    const fileInput = document.getElementById('file-input-xray');
    const uploadArea = document.getElementById('upload-area-xray');
    const uploadBtn = document.getElementById('upload-btn-xray');
    const patientSelect = document.getElementById('patient-select');
    const filePreview = document.getElementById('file-preview-xray');
    const fileNameDisplay = document.getElementById('file-name-display');
    const newPatientBtn = document.getElementById('new-patient-btn');
    const cancelPatientBtn = document.getElementById('cancel-patient-btn');
    const createPatientBtn = document.getElementById('create-patient-btn');
    
    let selectedFile = null;

    // Click en área de upload
    uploadArea.addEventListener('click', () => fileInput.click());

    // Drag & Drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--primary-color)';
        uploadArea.style.background = '#eff6ff';
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = 'var(--border-color)';
        uploadArea.style.background = 'transparent';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--border-color)';
        uploadArea.style.background = 'transparent';
        
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            selectedFile = file;
            fileNameDisplay.textContent = file.name;
            filePreview.style.display = 'block';
            checkUploadReady();
        }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        selectedFile = e.target.files[0];
        if (selectedFile) {
            fileNameDisplay.textContent = selectedFile.name;
            filePreview.style.display = 'block';
            checkUploadReady();
        }
    });

    patientSelect.addEventListener('change', checkUploadReady);

    function checkUploadReady() {
        const isReady = selectedFile && patientSelect.value;
        uploadBtn.disabled = !isReady;
    }

    // Subir radiografía
    uploadBtn.addEventListener('click', async () => {
        if (!selectedFile || !patientSelect.value) {
            alert('⚠️ Por favor selecciona un archivo y un paciente');
            return;
        }

        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Subiendo...';

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('patient_id', patientSelect.value);

            const response = await fetch('/api/upload-xray', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error desconocido');
            }

            const data = await response.json();
            alert(`✅ Radiografía subida exitosamente`);
            
            setActiveSection('all-xrays');

        } catch (error) {
            console.error(error);
            alert(`❌ Error: ${error.message}`);
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fa-solid fa-upload"></i> Subir Radiografía';
        }
    });

    // Modal paciente
    newPatientBtn.addEventListener('click', () => {
        document.getElementById('create-patient-modal').style.display = 'flex';
    });

    cancelPatientBtn.addEventListener('click', () => {
        document.getElementById('create-patient-modal').style.display = 'none';
    });

    createPatientBtn.addEventListener('click', async () => {
        const name = document.getElementById('patient-name').value;
        const age = document.getElementById('patient-age').value;
        const gender = document.getElementById('patient-gender').value;

        if (!name || !age) {
            alert('Por favor completa todos los campos');
            return;
        }

        try {
            const response = await fetch('/api/patients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, age: parseInt(age), gender })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error desconocido');
            }

            const data = await response.json();
            alert(`✅ Paciente creado: ${data.name}`);
            
            document.getElementById('patient-name').value = '';
            document.getElementById('patient-age').value = '';
            document.getElementById('create-patient-modal').style.display = 'none';
            
            loadPatientsForUpload();
            
        } catch (error) {
            alert(`❌ Error: ${error.message}`);
        }
    });
}

async function loadPatientsForUpload() {
    const select = document.getElementById('patient-select');
    if (!select) return;
    
    try {
        const response = await fetch('/api/patients');
        const patients = await response.json();
        
        select.innerHTML = '<option value="">-- Seleccionar paciente --</option>';
        patients.forEach(p => {
            select.innerHTML += `<option value="${p.id}">${p.name} (${p.age} años)</option>`;
        });
    } catch (error) {
        console.error(error);
        select.innerHTML = '<option value="">Error al cargar pacientes</option>';
    }
}

// ============================
//    SECCIÓN: PENDIENTES
// ============================

function renderPendingXrays() {
    const content = `
        <div class="card">
            <h2><i class="fa-solid fa-clock"></i> Radiografías Sin Diagnóstico</h2>
            <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
                Selecciona una radiografía para procesarla con la CNN.
            </p>
            <div id="pending-list"></div>
        </div>
    `;
    
    setTimeout(async () => {
        const listDiv = document.getElementById('pending-list');
        listDiv.innerHTML = '<p>Cargando...</p>';
        
        try {
            const response = await fetch('/api/xrays/pending');
            const xrays = await response.json();
            
            if (xrays.length === 0) {
                listDiv.innerHTML = '<p style="text-align:center; color: var(--text-secondary);">No hay radiografías pendientes</p>';
                return;
            }
            
            listDiv.innerHTML = xrays.map(x => `
                <div class="xray-item" style="border: 1px solid var(--border-color); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h4>${x.patient_name}</h4>
                        <p style="color: var(--text-secondary); font-size: 0.875rem;">Subida: ${new Date(x.upload_date).toLocaleDateString()}</p>
                    </div>
                    <button class="btn btn-primary" onclick="processXray(${x.id})">
                        <i class="fa-solid fa-brain"></i> Procesar
                    </button>
                </div>
            `).join('');
            
        } catch (error) {
            console.error(error);
            listDiv.innerHTML = '<p style="color: var(--danger-color);">Error al cargar radiografías</p>';
        }
    }, 100);
    
    return content;
}

// 📌 ACTUALIZAR: processXray - Redirigir a análisis unificado
async function processXray(xrayId) {
    try {
        const btn = event.target;
        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando...';

        const response = await fetch(`/api/xrays/${xrayId}/process`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        // Guardar en sessionStorage
        sessionStorage.setItem('current_xray_id', xrayId);
        sessionStorage.setItem('current_prediction', JSON.stringify(data));
        
        // Redirigir a análisis unificado
        setActiveSection('analysis');
        
    } catch (error) {
        console.error(error);
        alert('❌ Error al procesar la radiografía');
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

// 📌 NUEVA: Sección unificada de Análisis (CNN + Grad-CAM + Validación)
function renderAnalysis() {
    // Verificar si viene desde diagnósticos (predicción) o desde procesar radiografía
    const validatePredictionId = sessionStorage.getItem('validate_prediction_id');
    const validatePredictionData = sessionStorage.getItem('validate_prediction_data');
    const currentXrayId = sessionStorage.getItem('current_xray_id');
    const predictionData = sessionStorage.getItem('current_prediction');
    
    let data, xrayId, predictionId;
    
    if (validatePredictionId && validatePredictionData) {
        // Viene desde la tabla de diagnósticos
        data = JSON.parse(validatePredictionData);
        xrayId = data.xray_id;
        predictionId = validatePredictionId;
    } else if (currentXrayId && predictionData) {
        // Viene después de procesar una radiografía
        data = JSON.parse(predictionData);
        xrayId = currentXrayId;
        predictionId = data.prediction_id;
    } else {
        return `
            <div class="card" style="text-align: center; padding: 3rem;">
                <i class="fa-solid fa-microscope" style="font-size: 4rem; color: var(--primary-color); margin-bottom: 1.5rem; opacity: 0.5;"></i>
                <h3>No hay radiografía seleccionada</h3>
                <p style="color: var(--text-secondary); margin-bottom: 2rem;">
                    Selecciona una radiografía pendiente o procesa una nueva para ver el análisis completo.
                </p>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button class="btn btn-primary" onclick="setActiveSection('pending-xrays')">
                        <i class="fa-solid fa-clock"></i> Ver Pendientes
                    </button>
                    <button class="btn btn-outline" onclick="setActiveSection('upload-xray')">
                        <i class="fa-solid fa-upload"></i> Subir Nueva
                    </button>
                </div>
            </div>
        `;
    }
    
    const isValidated = data.validated || false;
    const displayDisease = data.corrected_disease_name || data.disease_name || data.prediction;
    const wasCorrected = data.corrected_disease_name !== null;
    
    const content = `
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h2><i class="fa-solid fa-microscope"></i> Análisis Completo de Radiografía</h2>
                <div style="display: flex; gap: 1rem; align-items: center;">
                    ${isValidated ? `
                        <span style="padding: 0.5rem 1rem; background: #10b98120; color: #10b981; border-radius: 0.5rem; font-weight: 600;">
                            <i class="fa-solid fa-check-circle"></i> Validado
                        </span>
                    ` : `
                        <span style="padding: 0.5rem 1rem; background: #f59e0b20; color: #f59e0b; border-radius: 0.5rem; font-weight: 600;">
                            <i class="fa-solid fa-clock"></i> Pendiente de Validar
                        </span>
                    `}
                </div>
            </div>

            <!-- Información del Paciente -->
            <div class="info-box" style="margin-bottom: 2rem; padding: 1.5rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 0.75rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h3 style="margin-bottom: 0.5rem; color: white;"><i class="fa-solid fa-user"></i> ${data.patient_name}</h3>
                        <p style="opacity: 0.9; margin: 0;">
                            <i class="fa-solid fa-calendar"></i> Fecha: ${new Date(data.predicted_at || data.upload_date).toLocaleDateString()}
                        </p>
                    </div>
                    <button class="btn" style="background: rgba(255,255,255,0.2); color: white; border: none;" onclick="setActiveSection('all-xrays')">
                        <i class="fa-solid fa-arrow-left"></i> Volver
                    </button>
                </div>
            </div>

            <!-- Grid Principal: Imágenes + Resultados -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
                
                <!-- Imagen Original -->
                <div class="analysis-panel">
                    <h3 style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fa-solid fa-image"></i> Radiografía Original
                    </h3>
                    <div style="position: relative; border-radius: 0.75rem; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                        <img src="/api/xrays/${xrayId}/image" 
                             alt="Radiografía Original" 
                             style="width: 100%; display: block; background: #f0f0f0;">
                    </div>
                </div>

                <!-- Grad-CAM -->
                <div class="analysis-panel">
                    <h3 style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fa-solid fa-fire"></i> Mapa de Calor (Grad-CAM)
                    </h3>
                    <div style="position: relative; border-radius: 0.75rem; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                        <img src="/api/gradcam/${data.gradcam_id}/image" 
                             alt="Grad-CAM" 
                             style="width: 100%; display: block; background: #f0f0f0;">
                    </div>
                    <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.75rem; text-align: center;">
                        <i class="fa-solid fa-info-circle"></i> Las zonas rojas indican áreas de mayor atención del modelo
                    </p>
                </div>

                <!-- Resultado CNN -->
                <div class="analysis-panel">
                    <h3 style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fa-solid fa-brain"></i> Resultado del Análisis
                    </h3>
                    
                    <div class="diagnosis-result-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 2rem; border-radius: 0.75rem; color: white; text-align: center; margin-bottom: 1rem;">
                        <div style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.5rem;">
                            ${wasCorrected ? 'Diagnóstico Corregido' : 'La CNN detectó'}
                        </div>
                        <div style="font-size: 1.75rem; font-weight: 700; margin-bottom: 0.5rem;">
                            ${displayDisease}
                        </div>
                        ${wasCorrected ? `
                            <div style="margin-top: 1rem; padding: 0.75rem; background: rgba(255,255,255,0.2); border-radius: 0.375rem; font-size: 0.9rem;">
                                <div style="opacity: 0.9; margin-bottom: 0.25rem;">
                                    <i class="fa-solid fa-brain"></i> CNN original: <span style="text-decoration: line-through;">${data.disease_name}</span>
                                </div>
                                <div style="opacity: 0.9;">
                                    <i class="fa-solid fa-user-md"></i> Corregido por el médico
                                </div>
                            </div>
                        ` : `
                            <div style="margin-top: 0.75rem; font-size: 0.85rem; opacity: 0.85;">
                                <i class="fa-solid fa-robot"></i> Diagnóstico automático por CNN
                            </div>
                        `}
                    </div>

                    ${data.doctor_notes ? `
                        <div style="background: #f8fafc; padding: 1rem; border-radius: 0.5rem; border-left: 3px solid var(--primary-color);">
                            <h4 style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                                <i class="fa-solid fa-notes-medical"></i> Notas del Médico
                            </h4>
                            <p style="margin: 0; font-size: 0.9rem;">${data.doctor_notes}</p>
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- Panel de Validación (solo si no está validado) -->
            ${!isValidated ? `
                <div class="validation-panel" style="background: #f8fafc; padding: 2rem; border-radius: 0.75rem; border: 2px dashed var(--primary-color);">
                    <h3 style="margin-bottom: 1.5rem;">
                        <i class="fa-solid fa-stethoscope"></i> Validación Médica
                    </h3>
                    
                    <form id="validation-form">
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fa-solid fa-circle-check"></i> ¿El diagnóstico de la CNN es correcto?
                            </label>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 0.75rem;">
                                <label class="radio-option" style="padding: 1.5rem; border: 2px solid #e5e7eb; border-radius: 0.5rem; cursor: pointer; text-align: center; transition: all 0.2s;">
                                    <input type="radio" name="validation" value="correct" checked style="display: none;">
                                    <i class="fa-solid fa-check-circle" style="font-size: 2.5rem; color: var(--success-color); display: block; margin-bottom: 0.75rem;"></i>
                                    <span style="font-weight: 600; display: block; font-size: 1.1rem;">Correcto</span>
                                    <small style="color: var(--text-secondary); display: block; margin-top: 0.25rem;">El diagnóstico es acertado</small>
                                </label>
                                <label class="radio-option" style="padding: 1.5rem; border: 2px solid #e5e7eb; border-radius: 0.5rem; cursor: pointer; text-align: center; transition: all 0.2s;">
                                    <input type="radio" name="validation" value="incorrect" style="display: none;">
                                    <i class="fa-solid fa-times-circle" style="font-size: 2.5rem; color: var(--danger-color); display: block; margin-bottom: 0.75rem;"></i>
                                    <span style="font-weight: 600; display: block; font-size: 1.1rem;">Incorrecto</span>
                                    <small style="color: var(--text-secondary); display: block; margin-top: 0.25rem;">Necesita corrección</small>
                                </label>
                            </div>
                        </div>
                        
                        <div id="correction-section" style="display: none;">
                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fa-solid fa-virus"></i> Selecciona el diagnóstico correcto
                                </label>
                                <select id="corrected-disease" class="form-control">
                                    <option value="">Seleccionar enfermedad...</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fa-solid fa-notes-medical"></i> Observaciones Médicas
                            </label>
                            <textarea id="validation-notes" class="form-control" rows="4" placeholder="Añade tus observaciones profesionales sobre este caso..." style="resize: vertical;"></textarea>
                        </div>
                        
                        <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                            <button type="button" class="btn btn-outline" style="flex: 1;" onclick="cancelValidation()">
                                <i class="fa-solid fa-times"></i> Cancelar
                            </button>
                            <button type="button" class="btn btn-primary" style="flex: 2;" onclick="submitValidationForm('${predictionId}')">
                                <i class="fa-solid fa-check"></i> Guardar Validación
                            </button>
                        </div>
                    </form>
                </div>
            ` : `
                <div style="background: #10b98120; padding: 1.5rem; border-radius: 0.75rem; border-left: 4px solid #10b981;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <i class="fa-solid fa-check-circle" style="font-size: 2rem; color: #10b981;"></i>
                        <div>
                            <h4 style="margin: 0 0 0.25rem 0; color: #10b981;">Diagnóstico Validado</h4>
                            <p style="margin: 0; color: var(--text-secondary); font-size: 0.875rem;">
                                Este caso ya ha sido revisado y validado por un médico.
                            </p>
                        </div>
                    </div>
                </div>
            `}
        </div>
    `;
    
    setTimeout(() => {
        if (!isValidated) {
            initValidationForm();
            loadDiseasesForValidation();
        }
    }, 100);
    
    return content;
}

function initValidationForm() {
    const radioOptions = document.querySelectorAll('.radio-option');
    const correctionSection = document.getElementById('correction-section');
    
    radioOptions.forEach(option => {
        option.addEventListener('click', function() {
            const radio = this.querySelector('input[type="radio"]');
            radio.checked = true;
            
            // Actualizar estilos
            radioOptions.forEach(opt => {
                opt.style.borderColor = '#e5e7eb';
                opt.style.background = 'white';
            });
            this.style.borderColor = 'var(--primary-color)';
            this.style.background = '#eff6ff';
            
            // Mostrar/ocultar sección de corrección
            correctionSection.style.display = radio.value === 'incorrect' ? 'block' : 'none';
        });
    });
    
    // Trigger inicial
    document.querySelector('.radio-option').click();
}

async function loadDiseasesForValidation() {
    const select = document.getElementById('corrected-disease');
    if (!select) return;
    
    try {
        const response = await fetch('/api/diseases');
        const diseases = await response.json();
        
        select.innerHTML = '<option value="">Seleccionar enfermedad...</option>';
        diseases.forEach(d => {
            select.innerHTML += `<option value="${d.id}">${d.name}</option>`;
        });
    } catch (error) {
        console.error(error);
    }
}

async function submitValidationForm(predictionId) {
    const isCorrect = document.querySelector('input[name="validation"]:checked').value === 'correct';
    const correctedDiseaseId = document.getElementById('corrected-disease')?.value;
    const notes = document.getElementById('validation-notes').value;
    
    if (!isCorrect && !correctedDiseaseId) {
        alert('⚠️ Por favor selecciona el diagnóstico correcto');
        return;
    }
    
    const payload = {
        validated: true,
        is_correct: isCorrect,
        corrected_disease_id: !isCorrect ? parseInt(correctedDiseaseId) : null,
        doctor_notes: notes
    };
    
    console.log('📤 Enviando validación:', payload);
    console.log('📤 Prediction ID:', predictionId);
    
    try {
        const response = await fetch(`/api/predictions/${predictionId}/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        console.log('📡 Respuesta status:', response.status);
        console.log('📡 Content-Type:', response.headers.get('Content-Type'));
        
        const responseText = await response.text();
        console.log('📡 Respuesta raw:', responseText);
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error('❌ Error parseando JSON:', e);
            console.error('❌ Respuesta recibida:', responseText);
            throw new Error('El servidor devolvió una respuesta inválida');
        }
        
        if (!response.ok) {
            throw new Error(data.error || 'Error al validar');
        }
        
        alert('✅ Diagnóstico validado exitosamente');
        
        // Limpiar sessionStorage
        sessionStorage.removeItem('validate_prediction_id');
        sessionStorage.removeItem('validate_prediction_data');
        sessionStorage.removeItem('current_xray_id');
        sessionStorage.removeItem('current_prediction');
        
        // Redirigir a diagnósticos
        setActiveSection('diagnoses');
        
    } catch (error) {
        console.error('❌ Error completo:', error);
        alert(`❌ Error al validar: ${error.message}`);
    }
}

function cancelValidation() {
    // Limpiar sessionStorage
    sessionStorage.removeItem('validate_prediction_id');
    sessionStorage.removeItem('validate_prediction_data');
    
    // Redirigir a diagnósticos
    setActiveSection('diagnoses');
}

// ============================
//    CRUD DE DIAGNÓSTICOS
// ============================

// 📌 SIMPLIFICADO: Gestión de Diagnósticos
function renderDiagnoses() {
    const content = `
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2><i class="fa-solid fa-notes-medical"></i> Gestión de Diagnósticos</h2>
            </div>
            
            <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
                <select id="filter-patient-diagnosis" class="form-control" style="max-width: 300px;">
                    <option value="">Todos los pacientes</option>
                </select>
                <select id="filter-status" class="form-control" style="max-width: 200px;">
                    <option value="">Todos los estados</option>
                    <option value="validated">Validados</option>
                    <option value="pending">Pendientes</option>
                </select>
            </div>
            
            <div id="diagnoses-list"></div>
        </div>
    `;
    
    setTimeout(async () => {
        await loadAllDiagnosesAndPredictions();
        await loadDiagnosisFilters();
        
        // Event listeners para filtros
        document.getElementById('filter-patient-diagnosis').addEventListener('change', filterDiagnoses);
        document.getElementById('filter-status').addEventListener('change', filterDiagnoses);
    }, 100);
    
    return content;
}

// 📌 Cargar predicciones y diagnósticos
async function loadAllDiagnosesAndPredictions() {
    const listDiv = document.getElementById('diagnoses-list');
    listDiv.innerHTML = '<p>Cargando diagnósticos...</p>';
    
    try {
        // Cargar predicciones de la CNN
        const predictionsResponse = await fetch('/api/predictions/all');
        const predictions = await predictionsResponse.json();
        
        // Combinar solo predicciones
        const combined = predictions.map(p => ({
            ...p,
            type: 'prediction',
            status: p.validated ? 'validated' : 'pending'
        }));
        
        // Ordenar por fecha
        combined.sort((a, b) => {
            const dateA = new Date(a.predicted_at);
            const dateB = new Date(b.predicted_at);
            return dateB - dateA;
        });
        
        window.allDiagnosesData = combined;
        
        if (combined.length === 0) {
            listDiv.innerHTML = `
                <p style="text-align:center; color: var(--text-secondary); padding: 2rem;">
                    No hay diagnósticos registrados<br>
                    <small>Sube una radiografía y procésala con la CNN para comenzar</small>
                </p>
            `;
            return;
        }
        
        displayDiagnosesAndPredictions(combined);
        
    } catch (error) {
        console.error(error);
        listDiv.innerHTML = '<p style="color: var(--danger-color);">Error al cargar diagnósticos</p>';
    }
}

function displayDiagnosesAndPredictions(items) {
    const listDiv = document.getElementById('diagnoses-list');
    
    const rows = items.map(item => {
        const isValidated = item.status === 'validated';
        const displayDisease = item.corrected_disease_name || item.disease_name;
        const wasCorrected = item.corrected_disease_name !== null;
        
        return `
            <tr>
                <td>
                    ${item.patient_name}
                    <span style="font-size: 0.75rem; color: var(--primary-color); margin-left: 0.5rem;">
                        <i class="fa-solid fa-brain"></i> CNN
                    </span>
                </td>
                <td>
                    <strong>${displayDisease}</strong>
                    ${wasCorrected ? `
                        <br><small style="color: var(--text-secondary); text-decoration: line-through;">${item.disease_name}</small>
                        <span style="font-size: 0.75rem; color: var(--warning-color); margin-left: 0.5rem;">
                            (Corregido)
                        </span>
                    ` : ''}
                </td>
                <td>
                    <span style="display: inline-block; padding: 0.25rem 0.75rem; border-radius: 0.375rem; background: ${isValidated ? '#10b98120' : '#f59e0b20'}; color: ${isValidated ? '#10b981' : '#f59e0b'}; font-weight: 600;">
                        ${isValidated ? '<i class="fa-solid fa-check-circle"></i> Validado' : '<i class="fa-solid fa-clock"></i> Pendiente'}
                    </span>
                </td>
                <td>${new Date(item.predicted_at).toLocaleDateString()}</td>
                <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${item.doctor_notes || '-'}
                </td>
                <td>
                    ${!isValidated ? `
                        <button class="btn btn-primary btn-sm" onclick="validatePrediction(${item.id})">
                            <i class="fa-solid fa-check"></i> Validar
                        </button>
                    ` : `
                        <button class="btn btn-outline btn-sm" onclick="viewPredictionDetails(${item.id})">
                            <i class="fa-solid fa-eye"></i> Ver
                        </button>
                    `}
                </td>
            </tr>
        `;
    }).join('');
    
    listDiv.innerHTML = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Paciente</th>
                        <th>Diagnóstico</th>
                        <th>Estado</th>
                        <th>Fecha</th>
                        <th>Notas</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}

function filterDiagnoses() {
    if (!window.allDiagnosesData) return;
    
    const patientId = document.getElementById('filter-patient-diagnosis').value;
    const status = document.getElementById('filter-status').value;
    
    let filtered = window.allDiagnosesData;
    
    if (patientId) {
        filtered = filtered.filter(d => d.patient_id == patientId);
    }
    
    if (status) {
        filtered = filtered.filter(d => d.status === status);
    }
    
    displayDiagnosesAndPredictions(filtered);
}

// 📌 Validar predicción con modal simplificado
async function validatePrediction(predictionId) {
    try {
        const response = await fetch(`/api/predictions/${predictionId}`);
        const prediction = await response.json();
        
        // Guardar datos en sessionStorage
        sessionStorage.setItem('validate_prediction_id', predictionId);
        sessionStorage.setItem('validate_prediction_data', JSON.stringify(prediction));
        
        // Redirigir a sección de validación
        setActiveSection('validation');
        
    } catch (error) {
        console.error(error);
        alert('❌ Error al cargar la predicción');
    }
}

function viewPredictionDetails(predictionId) {
    // Redirigir a la vista de detalles de la radiografía
    sessionStorage.setItem('view_prediction_id', predictionId);
    setActiveSection('apply-cnn');
}

async function loadDiagnosisFilters() {
    const select = document.getElementById('filter-patient-diagnosis');
    if (!select) return;
    
    try {
        const response = await fetch('/api/patients');
        const patients = await response.json();
        
        patients.forEach(p => {
            select.innerHTML += `<option value="${p.id}">${p.name}</option>`;
        });
    } catch (error) {
        console.error(error);
    }
}

// ============================
//    NAVEGACIÓN PRINCIPAL
// ============================

document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggle-sidebar');
    const closeBtn = document.getElementById('close-sidebar');
    const navItems = document.querySelectorAll('.nav-item a');

    // Toggle sidebar mobile
    toggleBtn?.addEventListener('click', () => {
        sidebar.classList.add('open');
    });

    closeBtn?.addEventListener('click', () => {
        sidebar.classList.remove('open');
    });

    // Navigation items
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all
            document.querySelectorAll('.nav-item').forEach(nav => {
                nav.classList.remove('active');
            });
            
            // Add active class to clicked item's parent
            this.parentElement.classList.add('active');
            
            // Get target section
            const target = this.getAttribute('data-target');
            
            // Close sidebar on mobile
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
            }
            
            // Render content
            renderContent(target);
        });
    });

    // Initial render
    renderContent('patients');
});

// ============================
//    RENDER CONTENT PRINCIPAL
// ============================

function renderContent(sectionId) {
    const contentArea = document.getElementById('content-area');
    const pageTitle = document.getElementById('page-title');
    
    contentArea.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Cargando...</div>';
    
    setTimeout(() => {
        let content = '';
        let title = '';

        switch(sectionId) {
            case 'patients':
                title = 'Pacientes';
                content = renderPatients();
                break;
            case 'upload-xray':
                title = 'Subir Radiografía';
                content = renderUploadXray();
                break;
            case 'all-xrays':
                title = 'Todas las Radiografías';
                content = renderAllXrays();
                break;
            case 'pending-xrays':
                title = 'Radiografías Pendientes';
                content = renderPendingXrays(); // ✅ CORRECTO
                break;
            case 'analysis':
                title = 'Análisis de Radiografía';
                content = renderAnalysis();
                break;
            case 'diagnoses':
                title = 'Gestión de Diagnósticos';
                content = renderDiagnoses();
                break;
            case 'diseases':
                title = 'Enfermedades';
                content = renderDiseases();
                break;
            case 'explainable-ai':
                title = 'IA Explicable';
                content = renderExplainableAI();
                break;
            default:
                title = 'Pacientes';
                content = renderPatients();
        }

        pageTitle.textContent = title;
        contentArea.innerHTML = content;
    }, 300);
}

// Helper function para cambiar sección programáticamente
function setActiveSection(sectionId) {
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
    });
    
    const targetNav = document.querySelector(`.nav-item a[data-target="${sectionId}"]`);
    if (targetNav) {
        targetNav.parentElement.classList.add('active');
    }

    currentSection = sectionId;
    renderContent(sectionId);
}

// ============================
//    SECCIONES FALTANTES
// ============================

function renderDiseases() {
    const content = `
        <div class="card">
            <h2><i class="fa-solid fa-virus"></i> Enfermedades Registradas</h2>
            <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
                Listado de enfermedades que puede detectar el sistema
            </p>
            <div id="diseases-list"></div>
        </div>
    `;
    
    setTimeout(async () => {
        const listDiv = document.getElementById('diseases-list');
        listDiv.innerHTML = '<p>Cargando enfermedades...</p>';
        
        try {
            const response = await fetch('/api/diseases');
            const diseases = await response.json();
            
            if (diseases.length === 0) {
                listDiv.innerHTML = `
                    <p style="text-align:center; color: var(--text-secondary); padding: 2rem;">
                        No hay enfermedades registradas<br>
                        <small>Las enfermedades se registran automáticamente al procesar radiografías</small>
                    </p>
                `;
                return;
            }
            
            const rows = diseases.map(d => `
                <tr>
                    <td>${d.id}</td>
                    <td><strong>${d.name}</strong></td>
                    <td>${d.description || '-'}</td>
                    <td>${new Date(d.created_at).toLocaleDateString()}</td>
                </tr>
            `).join('');
            
            listDiv.innerHTML = `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nombre</th>
                                <th>Descripción</th>
                                <th>Fecha de Registro</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>
            `;
            
        } catch (error) {
            console.error(error);
            listDiv.innerHTML = '<p style="color: var(--danger-color);">Error al cargar enfermedades</p>';
        }
    }, 100);
    
    return content;
}

function renderExplainableAI() {
    const content = `
        <div class="card">
            <h2><i class="fa-solid fa-brain"></i> Inteligencia Artificial Explicable</h2>
            <p style="color: var(--text-secondary); margin-bottom: 2rem;">
                Comprende cómo funciona el sistema de diagnóstico por IA
            </p>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                <div class="info-card" style="padding: 1.5rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 0.75rem;">
                    <i class="fa-solid fa-brain" style="font-size: 2.5rem; margin-bottom: 1rem; display: block;"></i>
                    <h3 style="margin-bottom: 0.75rem; color: white;">Red Neuronal Convolucional</h3>
                    <p style="opacity: 0.9; font-size: 0.9rem; margin: 0;">
                        Utilizamos una CNN entrenada específicamente en radiografías de tórax para detectar patologías pulmonares con alta precisión.
                    </p>
                </div>
                
                <div class="info-card" style="padding: 1.5rem; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border-radius: 0.75rem;">
                    <i class="fa-solid fa-fire" style="font-size: 2.5rem; margin-bottom: 1rem; display: block;"></i>
                    <h3 style="margin-bottom: 0.75rem; color: white;">Grad-CAM</h3>
                    <p style="opacity: 0.9; font-size: 0.9rem; margin: 0;">
                        Gradient-weighted Class Activation Mapping muestra las áreas de la imagen que más influyen en la decisión del modelo.
                    </p>
                </div>
                
                <div class="info-card" style="padding: 1.5rem; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; border-radius: 0.75rem;">
                    <i class="fa-solid fa-user-md" style="font-size: 2.5rem; margin-bottom: 1rem; display: block;"></i>
                    <h3 style="margin-bottom: 0.75rem; color: white;">Validación Médica</h3>
                    <p style="opacity: 0.9; font-size: 0.9rem; margin: 0;">
                        Todos los diagnósticos son revisados por profesionales médicos, mejorando continuamente la precisión del sistema.
                    </p>
                </div>
            </div>
            
            <div style="background: #f8fafc; padding: 2rem; border-radius: 0.75rem; border-left: 4px solid var(--primary-color);">
                <h3 style="margin-bottom: 1rem;"><i class="fa-solid fa-lightbulb"></i> ¿Cómo interpretar los mapas de calor?</h3>
                <ul style="line-height: 1.8; color: var(--text-secondary);">
                    <li><strong style="color: #ef4444;">Rojo intenso:</strong> Áreas que la IA considera más relevantes para el diagnóstico</li>
                    <li><strong style="color: #f59e0b;">Amarillo/Naranja:</strong> Zonas de importancia moderada</li>
                    <li><strong style="color: #3b82f6;">Azul:</strong> Áreas que no influyen significativamente en la decisión</li>
                </ul>
                <p style="margin-top: 1rem; color: var(--text-secondary); font-size: 0.9rem;">
                    💡 <strong>Importante:</strong> Los mapas de calor son una herramienta de apoyo. El diagnóstico final siempre debe ser realizado por un profesional médico.
                </p>
            </div>
        </div>
    `;
    
    return content;
}

function attachDynamicListeners() {
    // Placeholder para listeners dinámicos si son necesarios
    console.log('✅ Dynamic listeners attached');
}
