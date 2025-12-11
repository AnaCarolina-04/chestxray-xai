// Mock Data
/* ==================== NOTIFICATIONS ==================== */
function showNotification(message, type = 'success') {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        document.body.appendChild(container);
    }
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    const icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : '⚠️');
    notification.innerHTML = `<span class="notification-icon">${icon}</span><span class="notification-message">${message}</span>`;
    container.appendChild(notification);
    setTimeout(() => {
        notification.classList.add('hide');
        notification.addEventListener('transitionend', () => notification.remove());
    }, 3000);
}

// Mock Data removed (unused)

// State
let currentSection = 'patients';

// DOM Elements
// DOM Elements logic moved to DOMContentLoaded to avoid null references
// Navigation logic unified in DOMContentLoaded


// Content Rendering
function renderContent(sectionId) {
    contentArea.innerHTML = '<div class="loading-spinner">Cargando...</div>';

    setTimeout(() => {
        let content = '';
        let title = '';

        switch (sectionId) {
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
// 📌 Render Patients with Modal
function renderPatients() {
    const content = `
        <div id="patients-stats-container"></div>

        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2><i class="fa-solid fa-users"></i> Lista de Pacientes</h2>
                <button class="btn btn-primary" id="btn-new-patient-main">
                    <i class="fa-solid fa-plus"></i> Nuevo Paciente
                </button>
            </div>
            <div id="patients-table-container"></div>
        </div>

        <!-- Shared Patient Modal -->
        <div id="patient-modal-main" class="modal" style="display:none;">
            <div class="modal-content">
                <h3 id="patient-modal-title">Crear Nuevo Paciente</h3>
                <input type="hidden" id="patient-modal-id">
                <div class="form-group">
                    <label class="form-label">Nombre Completo</label>
                    <input type="text" id="patient-modal-name" class="form-control" placeholder="Ej: Juan Pérez">
                </div>
                <div class="form-group">
                    <label class="form-label">Edad</label>
                    <input type="number" id="patient-modal-age" class="form-control" placeholder="Ej: 45">
                </div>
                <div class="form-group">
                    <label class="form-label">Género</label>
                    <select id="patient-modal-gender" class="form-control">
                        <option value="M">Masculino</option>
                        <option value="F">Femenino</option>
                    </select>
                </div>
                <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                    <button class="btn btn-outline" type="button" id="patient-modal-cancel">Cancelar</button>
                    <button class="btn btn-primary" type="button" id="patient-modal-save">Guardar</button>
                </div>
            </div>
        </div>

        <!-- Delete Confirmation Modal -->
        <div id="delete-patient-modal" class="modal" style="display:none;">
            <div class="modal-content" style="max-width: 450px; text-align: center;">
                <div style="font-size: 3rem; color: var(--danger-color); margin-bottom: 1rem;">
                    <i class="fa-solid fa-circle-exclamation"></i>
                </div>
                <h3 style="margin-bottom: 1rem;">¿Estás seguro?</h3>
                <p style="color: var(--text-secondary); margin-bottom: 1.5rem;" id="delete-modal-msg">
                    Estás a punto de eliminar a este paciente. Esta acción no se puede deshacer.
                </p>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button class="btn btn-outline" type="button" onclick="closeDeleteModal()">Cancelar</button>
                    <button class="btn btn-danger" type="button" id="btn-confirm-delete" style="background: var(--danger-color); color: white;">Eliminar</button>
                </div>
            </div>
        </div>
    `;

    setTimeout(async () => {
        const container = document.getElementById('patients-table-container');
        container.innerHTML = '<p>Cargando pacientes...</p>';

        // Init Modal Listeners
        initPatientModalListeners();

        try {
            const response = await fetch('/api/patients');
            const patients = await response.json();

            if (patients.length === 0) {
                container.innerHTML = '<p style="text-align:center; color: var(--text-secondary);">No hay pacientes registrados</p>';
                return;
            }

            // Stats Calculation
            const totalPatients = patients.length;
            const newThisMonth = patients.filter(p => {
                const d = new Date(p.created_at);
                const now = new Date();
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length;
            const maleCount = patients.filter(p => p.gender === 'M').length;
            const femaleCount = patients.filter(p => p.gender === 'F').length;

            // Updated HTML content with Stats
            const statsHTML = `
                <div class="status-summary-grid">
                    <div class="status-card">
                        <div class="status-info">
                            <h4>Total Pacientes</h4>
                            <div class="count">${totalPatients}</div>
                        </div>
                        <div class="status-icon blue">
                            <i class="fa-solid fa-users"></i>
                        </div>
                    </div>
                    <div class="status-card">
                        <div class="status-info">
                            <h4>Nuevos (Mes)</h4>
                            <div class="count">${newThisMonth}</div>
                        </div>
                        <div class="status-icon green">
                            <i class="fa-solid fa-user-plus"></i>
                        </div>
                    </div>
                    <div class="status-card">
                        <div class="status-info">
                            <h4>Hombres / Mujeres</h4>
                            <div class="count" style="font-size: 1.1rem;">${maleCount} / ${femaleCount}</div>
                        </div>
                        <div class="status-icon yellow">
                            <i class="fa-solid fa-venus-mars"></i>
                        </div>
                    </div>
                </div>
            `;

            // Insert Stats
            const statsContainer = document.getElementById('patients-stats-container');
            if (statsContainer) statsContainer.innerHTML = statsHTML;

            const rows = patients.map(p => {
                return `
                    <tr>
                        <td>
                            <div style="font-weight: 500;">${p.name}</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">ID: ${p.id}</div>
                        </td>
                        <td>${p.age} años</td>
                        <td>
                            <span class="badge" style="background: ${p.gender === 'M' ? '#eff6ff' : '#fdf2f8'}; color: ${p.gender === 'M' ? '#1d4ed8' : '#be185d'};">
                                ${p.gender === 'M' ? 'Masculino' : 'Femenino'}
                            </span>
                        </td>
                        <td>${new Date(p.created_at).toLocaleDateString()}</td>
                        <td>
                            <div style="display: flex; gap: 0.5rem;">
                                <button class="action-btn view" onclick="viewPatientXrays(${p.id}, '${p.name}')" title="Ver Radiografías">
                                    <i class="fa-solid fa-image"></i>
                                </button>
                                <button class="action-btn edit" onclick="openEditPatientModal(${p.id}, '${p.name}', ${p.age}, '${p.gender}')" title="Editar">
                                    <i class="fa-solid fa-pen"></i>
                                </button>
                                <button class="action-btn delete" onclick="openDeletePatientModal(${p.id}, '${p.name}')" title="Eliminar">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            container.innerHTML = `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Paciente</th>
                                <th>Edad</th>
                                <th>Género</th>
                                <th>Registro</th>
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

// 📌 Modal Logic
function initPatientModalListeners() {
    const modal = document.getElementById('patient-modal-main');
    const btnNew = document.getElementById('btn-new-patient-main');
    const btnCancel = document.getElementById('patient-modal-cancel');
    const btnSave = document.getElementById('patient-modal-save');

    if (!modal) return;

    // Open Create
    btnNew.addEventListener('click', () => {
        document.getElementById('patient-modal-title').textContent = 'Crear Nuevo Paciente';
        document.getElementById('patient-modal-id').value = '';
        document.getElementById('patient-modal-name').value = '';
        document.getElementById('patient-modal-age').value = '';
        document.getElementById('patient-modal-gender').value = 'M';
        document.getElementById('patient-modal-save').textContent = 'Crear Paciente';
        modal.style.display = 'flex';
    });

    // Cancel
    btnCancel.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Save (Create or Update)
    btnSave.addEventListener('click', async () => {
        const id = document.getElementById('patient-modal-id').value;
        const name = document.getElementById('patient-modal-name').value;
        const age = document.getElementById('patient-modal-age').value;
        const gender = document.getElementById('patient-modal-gender').value;

        if (!name || !age) {
            showNotification('Por favor completa todos los campos', 'warning');
            return;
        }

        const isEdit = !!id;
        const url = isEdit ? `/api/patients/${id}` : '/api/patients';
        const method = isEdit ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, age: parseInt(age), gender })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error desconocido');
            }

            const data = await response.json();
            showNotification(isEdit ? 'Paciente actualizado' : `Paciente creado: ${data.name}`, 'success');

            modal.style.display = 'none';
            renderContent('patients'); // Refresh list

        } catch (error) {
            console.error(error);
            showNotification(`Error: ${error.message}`, 'error');
        }
    });
}

// 📌 Open Edit Modal (Global access)
window.openEditPatientModal = function (id, name, age, gender) {
    const modal = document.getElementById('patient-modal-main');
    if (!modal) return;

    document.getElementById('patient-modal-title').textContent = 'Editar Paciente';
    document.getElementById('patient-modal-id').value = id;
    document.getElementById('patient-modal-name').value = name;
    document.getElementById('patient-modal-age').value = age;
    document.getElementById('patient-modal-gender').value = gender;
    document.getElementById('patient-modal-save').textContent = 'Guardar Cambios';

    modal.style.display = 'flex';
};

// 📌 DELETE MODAL LOGIC

let patientToDeleteId = null;

window.openDeletePatientModal = function (id, name) {
    patientToDeleteId = id;
    const modal = document.getElementById('delete-patient-modal');
    const msg = document.getElementById('delete-modal-msg');

    // Configurar mensaje
    msg.innerHTML = `Estás a punto de eliminar al paciente <strong>${name}</strong>. <br>Se borrarán todas sus radiografías y diagnósticos.`;

    // Mostrar modal
    modal.style.display = 'flex';

    // Configurar botón de confirmación
    const confirmBtn = document.getElementById('btn-confirm-delete');

    // Limpiar listeners anteriores para evitar múltiples llamadas
    const newBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

    newBtn.addEventListener('click', () => {
        executeDeletePatient(id);
    });
};

window.closeDeleteModal = function () {
    document.getElementById('delete-patient-modal').style.display = 'none';
};

function executeDeletePatient(id) {
    const confirmBtn = document.getElementById('btn-confirm-delete');
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Eliminando...';

    fetch(`/api/patients/${id}`, {
        method: 'DELETE'
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) throw new Error(data.error);

            showNotification('Paciente eliminado correctamente', 'success');
            closeDeleteModal();
            renderContent('patients'); // Recargar tabla
        })
        .catch(error => {
            console.error(error);
            showNotification(`Error al eliminar: ${error.message}`, 'error');
        })
        .finally(() => {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = 'Eliminar';
        });
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
        showNotification('Error al cargar radiografías del paciente', 'error');
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
            showNotification('Por favor selecciona un archivo y un paciente', 'warning');
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

            showNotification(`Radiografía subida exitosamente para ${data.patient_name}`, 'success');

            // Limpiar y redirigir
            selectedFile = null;
            fileNameDiv.style.display = 'none';
            fileInput.value = '';
            patientSelect.value = '';

            setActiveSection('all-xrays');

        } catch (error) {
            console.error('❌ Error completo:', error);
            showNotification(`Error al subir la radiografía: ${error.message}`, 'error');
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
            showNotification('Por favor completa todos los campos', 'warning');
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
            showNotification(`Paciente creado: ${data.name}`, 'success');

            // Limpiar formulario
            document.getElementById('patient-name').value = '';
            document.getElementById('patient-age').value = '';
            document.getElementById('patient-gender').value = 'M';

            document.getElementById('create-patient-modal').style.display = 'none';
            loadPatients();

        } catch (error) {
            console.error('Error completo:', error);
            showNotification(`Error al crear paciente: ${error.message}`, 'error');
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
    sessionStorage.setItem('analysis_previous_section', currentSection);
    setActiveSection('xray-detail');
}

// ============================
//    SECCIÓN: DETALLES DE RADIOGRAFÍA
// ============================

function renderXrayDetail() {
    const xrayId = sessionStorage.getItem('current_xray_id');

    if (!xrayId) {
        return `
            <div class="card">
                <p style="color: var(--danger-color);">No se especificó una radiografía para ver.</p>
                <button class="btn btn-primary" onclick="setActiveSection('all-xrays')">
                    <i class="fa-solid fa-arrow-left"></i> Volver a Radiografías
                </button>
            </div>
        `;
    }

    const content = `
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <button class="btn btn-outline" onclick="goBackFromXrayDetail()">
                    <i class="fa-solid fa-arrow-left"></i> Volver
                </button>
                <h2><i class="fa-solid fa-file-medical"></i> Detalles de Radiografía</h2>
                <div></div>
            </div>

            <div id="xray-detail-content">
                <div style="text-align: center; padding: 2rem;">
                    <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-color);"></i>
                    <p style="margin-top: 1rem; color: var(--text-secondary);">Cargando información...</p>
                </div>
            </div>
        </div>
    `;

    setTimeout(async () => {
        await loadXrayDetailData(xrayId);
    }, 100);

    return content;
}

async function loadXrayDetailData(xrayId) {
    const container = document.getElementById('xray-detail-content');

    try {
        const response = await fetch(`/api/xrays/${xrayId}`);
        if (!response.ok) throw new Error('Error al cargar la radiografía');

        const xray = await response.json();

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                <div>
                    <h3 style="margin-bottom: 1rem;">
                        <i class="fa-solid fa-image"></i> Imagen de Radiografía
                    </h3>
                    <div style="border: 2px solid var(--border-color); border-radius: 0.75rem; overflow: hidden; background: #f9fafb;">
                        <img 
                            src="/api/xrays/${xray.id}/image" 
                            alt="Radiografía" 
                            style="width: 100%; height: auto; display: block;"
                            onerror="this.style.background='#fee2e2'; this.alt='Error al cargar imagen';"
                        >
                    </div>
                    
                    <div style="margin-top: 1.5rem; padding: 1.5rem; background: #f9fafb; border-radius: 0.75rem; border: 1px solid var(--border-color);">
                        <h4 style="margin-bottom: 1rem;">
                            <i class="fa-solid fa-edit"></i> Reemplazar Imagen
                        </h4>
                        <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 1rem;">
                            Selecciona un nuevo archivo para reemplazar la radiografía actual.
                        </p>
                        <input type="file" id="replace-xray-input" accept="image/*" style="display: none;">
                        <div id="replace-preview" style="display: none; margin-bottom: 1rem;">
                            <p style="font-weight: 600; margin-bottom: 0.5rem;">
                                <i class="fa-solid fa-file-image"></i> Archivo seleccionado:
                            </p>
                            <p id="replace-file-name" style="color: var(--primary-color);"></p>
                        </div>
                        <div style="display: flex; gap: 1rem;">
                            <button class="btn btn-outline" onclick="document.getElementById('replace-xray-input').click()" style="flex: 1;">
                                <i class="fa-solid fa-folder-open"></i> Seleccionar Archivo
                            </button>
                            <button id="btn-save-replacement" class="btn btn-primary" onclick="saveReplacedXray(${xray.id})" style="flex: 1;" disabled>
                                <i class="fa-solid fa-save"></i> Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 style="margin-bottom: 1rem;">
                        <i class="fa-solid fa-info-circle"></i> Información
                    </h3>
                    
                    <div style="background: #f9fafb; padding: 1.5rem; border-radius: 0.75rem; border: 1px solid var(--border-color); margin-bottom: 1.5rem;">
                        <div style="margin-bottom: 1rem;">
                            <label style="font-weight: 600; color: var(--text-secondary); font-size: 0.875rem; display: block; margin-bottom: 0.25rem;">
                                <i class="fa-solid fa-hashtag"></i> ID de Radiografía
                            </label>
                            <p style="font-size: 1.1rem;">${xray.id}</p>
                        </div>
                        
                        <div style="margin-bottom: 1rem;">
                            <label style="font-weight: 600; color: var(--text-secondary); font-size: 0.875rem; display: block; margin-bottom: 0.25rem;">
                                <i class="fa-solid fa-user"></i> Paciente
                            </label>
                            <p style="font-size: 1.1rem;">${xray.patient_name}</p>
                        </div>
                        
                        <div style="margin-bottom: 1rem;">
                            <label style="font-weight: 600; color: var(--text-secondary); font-size: 0.875rem; display: block; margin-bottom: 0.25rem;">
                                <i class="fa-solid fa-calendar"></i> Fecha de Subida
                            </label>
                            <p style="font-size: 1.1rem;">${new Date(xray.upload_date).toLocaleString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}</p>
                        </div>

                        ${xray.has_prediction ? `
                            <div style="margin-bottom: 1rem;">
                                <label style="font-weight: 600; color: var(--text-secondary); font-size: 0.875rem; display: block; margin-bottom: 0.25rem;">
                                    <i class="fa-solid fa-stethoscope"></i> Diagnóstico CNN
                                </label>
                                <p style="font-size: 1.1rem; color: var(--primary-color); font-weight: 600;">${xray.prediction}</p>
                            </div>
                        ` : ''}
                    </div>

                    <div style="background: #f9fafb; padding: 1.5rem; border-radius: 0.75rem; border: 1px solid var(--border-color);">
                        <h4 style="margin-bottom: 1rem;">
                            <i class="fa-solid fa-gear"></i> Acciones
                        </h4>
                        
                        ${!xray.has_prediction ? `
                            <button class="btn btn-primary" onclick="processXray(${xray.id})" style="width: 100%; margin-bottom: 1rem;">
                                <i class="fa-solid fa-brain"></i> Procesar con CNN
                            </button>
                        ` : ''}
                        
                        <button class="btn btn-outline" onclick="deleteXrayFromDetail(${xray.id})" style="width: 100%; background: #fee2e2; color: #dc2626; border-color: #fecaca;">
                            <i class="fa-solid fa-trash"></i> Eliminar Radiografía
                        </button>
                    </div>
                </div>
            </div>
        `;

        setupReplaceXrayListener();

    } catch (error) {
        console.error('Error loading xray detail:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <p style="color: var(--danger-color); margin-bottom: 1rem;">
                    <i class="fa-solid fa-triangle-exclamation"></i> Error al cargar los detalles de la radiografía
                </p>
                <button class="btn btn-primary" onclick="setActiveSection('all-xrays')">
                    <i class="fa-solid fa-arrow-left"></i> Volver a Radiografías
                </button>
            </div>
        `;
    }
}

function setupReplaceXrayListener() {
    const fileInput = document.getElementById('replace-xray-input');
    const preview = document.getElementById('replace-preview');
    const fileNameDisplay = document.getElementById('replace-file-name');
    const saveBtn = document.getElementById('btn-save-replacement');

    if (!fileInput) return;

    fileInput.addEventListener('change', function () {
        if (this.files && this.files[0]) {
            const file = this.files[0];
            fileNameDisplay.textContent = file.name;
            preview.style.display = 'block';
            saveBtn.disabled = false;
            window.replacementXrayFile = file;
        } else {
            preview.style.display = 'none';
            saveBtn.disabled = true;
            window.replacementXrayFile = null;
        }
    });
}

async function saveReplacedXray(xrayId) {
    if (!window.replacementXrayFile) {
        showNotification('Por favor selecciona un archivo primero', 'warning');
        return;
    }

    const saveBtn = document.getElementById('btn-save-replacement');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

    try {
        const formData = new FormData();
        formData.append('image', window.replacementXrayFile);

        const response = await fetch(`/api/xrays/${xrayId}`, {
            method: 'PUT',
            body: formData
        });

        if (!response.ok) throw new Error('Error al actualizar la radiografía');

        showNotification('Radiografía actualizada exitosamente', 'success');
        await loadXrayDetailData(xrayId);
        window.replacementXrayFile = null;

    } catch (error) {
        console.error('Error replacing xray:', error);
        showNotification(`Error al actualizar: ${error.message}`, 'error');
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> Guardar Cambios';
    }
}

async function deleteXrayFromDetail(xrayId) {
    const modal = document.createElement('div');
    modal.id = 'delete-xray-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.5); display: flex;
        justify-content: center; align-items: center; z-index: 10000;
        animation: fadeIn 0.2s ease-out;
    `;

    modal.innerHTML = `
        <div style="background: white; border-radius: 1rem; padding: 2rem; max-width: 400px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); animation: slideUp 0.3s ease-out;">
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <div style="width: 60px; height: 60px; background: #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
                    <i class="fa-solid fa-trash" style="font-size: 1.5rem; color: #dc2626;"></i>
                </div>
                <h3 style="margin: 0 0 0.5rem 0; color: #1f2937;">¿Eliminar radiografía?</h3>
                <p style="color: #6b7280; margin: 0; font-size: 0.875rem;">
                    Esta acción no se puede deshacer. La radiografía y todos sus diagnósticos serán eliminados permanentemente.
                </p>
            </div>
            
            <div style="display: flex; gap: 0.75rem;">
                <button onclick="closeXrayDeleteModal()" class="btn btn-outline" style="flex: 1;">
                    <i class="fa-solid fa-times"></i> Cancelar
                </button>
                <button onclick="confirmDeleteXray(${xrayId})" class="btn" style="flex: 1; background: #dc2626; color: white;">
                    <i class="fa-solid fa-trash"></i> Eliminar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeXrayDeleteModal();
    });
}

function closeXrayDeleteModal() {
    const modal = document.getElementById('delete-xray-modal');
    if (modal) {
        modal.style.animation = 'fadeOut 0.2s ease-out';
        setTimeout(() => modal.remove(), 200);
    }
}

async function confirmDeleteXray(xrayId) {
    closeXrayDeleteModal();

    try {
        const response = await fetch(`/api/xrays/${xrayId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Error al eliminar la radiografía');

        showNotification('Radiografía eliminada exitosamente', 'success');
        sessionStorage.removeItem('current_xray_id');
        setActiveSection('all-xrays');

    } catch (error) {
        console.error('Error deleting xray:', error);
        showNotification(`Error al eliminar: ${error.message}`, 'error');
    }
}

function viewXrayAnalysis(xrayId) {
    sessionStorage.setItem('current_xray_id', xrayId);
    sessionStorage.setItem('analysis_previous_section', 'xray-detail');
    setActiveSection('analysis');
}

function goBackFromXrayDetail() {
    const prev = sessionStorage.getItem('analysis_previous_section');
    if (prev && prev !== 'xray-detail') {
        setActiveSection(prev);
    } else {
        setActiveSection('all-xrays');
    }
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
            showNotification('Por favor selecciona un archivo y un paciente', 'warning');
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
            showNotification('Radiografía subida exitosamente', 'success');

            setActiveSection('all-xrays');

        } catch (error) {
            console.error(error);
            showNotification(`Error: ${error.message}`, 'error');
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
            showNotification('Por favor completa todos los campos', 'warning');
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
            showNotification(`Paciente creado: ${data.name}`, 'success');

            document.getElementById('patient-name').value = '';
            document.getElementById('patient-age').value = '';
            document.getElementById('create-patient-modal').style.display = 'none';

            loadPatientsForUpload();

        } catch (error) {
            showNotification(`Error: ${error.message}`, 'error');
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
        sessionStorage.setItem('analysis_previous_section', currentSection);
        setActiveSection('analysis');

    } catch (error) {
        console.error(error);
        showNotification('Error al procesar la radiografía', 'error');
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

// 📌 Toggle Bounding Box
function toggleBoundingBox() {
    const checkbox = document.getElementById('bbox-toggle');
    const container = document.getElementById('gradcam-container');
    const existingBbox = document.getElementById('bbox-overlay');

    if (!checkbox || !container) return;

    if (checkbox.checked) {
        if (existingBbox) return; // Ya existe

        // Obtener datos de bbox desde sessionStorage
        let dataStr = sessionStorage.getItem('validate_prediction_data');
        // Si no hay de validacion, buscamos current (pero validate tiene prioridad en esta vista si ambos existen)
        // La logica en renderAnalysis prioriza validateId. Haremos lo mismo.
        if (!dataStr && sessionStorage.getItem('current_prediction')) {
            dataStr = sessionStorage.getItem('current_prediction');
        }

        if (!dataStr) {
            showNotification('No hay datos de predicción disponibles.', 'warning');
            checkbox.checked = false;
            return;
        }

        const data = JSON.parse(dataStr);
        const bbox = data.bounding_box;

        if (!bbox) {
            showNotification('No se pudo calcular la región de interés para esta imagen.', 'warning');
            checkbox.checked = false;
            return;
        }

        // Crear elemento bbox
        const box = document.createElement('div');
        box.id = 'bbox-overlay';
        box.style.position = 'absolute';
        box.style.border = '3px solid #ef4444'; // Red
        box.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
        box.style.zIndex = '10';
        box.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.5)';
        box.style.borderRadius = '4px';
        box.style.pointerEvents = 'none'; // Permitir clicks a través

        // Calcular porcentajes (asumiendo 224x224 base)
        const scale = 100 / 224;

        box.style.left = (bbox.x * scale) + '%';
        box.style.top = (bbox.y * scale) + '%';
        box.style.width = (bbox.width * scale) + '%';
        box.style.height = (bbox.height * scale) + '%';

        container.appendChild(box);

    } else {
        if (existingBbox) {
            existingBbox.remove();
        }
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
                    <button class="btn" style="background: rgba(255,255,255,0.2); color: white; border: none;" onclick="goBackFromAnalysis()">
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
                    <div id="gradcam-container" style="position: relative; border-radius: 0.75rem; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                        <img src="/api/gradcam/${data.gradcam_id}/image" 
                             alt="Grad-CAM" 
                             style="width: 100%; display: block; background: #f0f0f0;">
                    </div>
                    
                    <details style="margin-top: 1rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.5rem; background: #fff;">
                        <summary style="cursor: pointer; font-weight: 600; color: var(--primary-color); list-style: none; display: flex; justify-content: space-between; align-items: center;">
                            <span><i class="fa-solid fa-vector-square"></i> Bounding Box</span>
                            <i class="fa-solid fa-chevron-down" style="font-size: 0.8rem;"></i>
                        </summary>
                        <div style="margin-top: 1rem; padding: 0.5rem; border-top: 1px solid #eee;">
                            <label style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer; user-select: none;">
                                <input type="checkbox" id="bbox-toggle" style="width: 1.25rem; height: 1.25rem;" onchange="toggleBoundingBox()">
                                <div>
                                    <span style="display: block; font-weight: 500;">Bounding Box</span>
                                    <span style="font-size: 0.8rem; color: var(--text-secondary);">Recuadro de la zona de interés</span>
                                </div>
                            </label>
                        </div>
                    </details>

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
                        
                        <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.2);">
                            <button class="btn btn-sm" style="background: rgba(255,255,255,0.2); color: white; border: none; width: 100%;" onclick="setActiveSection('explainable-ai')">
                                <i class="fa-solid fa-circle-question"></i> ¿Qué es una CNN?
                            </button>
                        </div>
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
            </div>

            <!-- Panel de Recomendaciones Individuales -->
            <div style="background: #f0f9ff; padding: 2rem; border-radius: 0.75rem; border: 1px solid #bae6fd; margin-bottom: 2rem;">
                <h3 style="margin-bottom: 1.5rem; color: #0369a1;">
                    <i class="fa-solid fa-user-doctor"></i> Recomendaciones Individuales
                </h3>
                <p style="color: #0c4a6e; margin-bottom: 1.5rem;">
                    Análisis detallado con modelos específicos para cada patología.
                </p>
                
                <div style="display: flex; gap: 1.5rem; flex-wrap: wrap;">
                    <!-- Card Cardiomegaly -->
                    <div style="background: white; padding: 1.5rem; border-radius: 0.5rem; flex: 1; border: 1px solid #e2e8f0; min-width: 300px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <h4 style="margin: 0;"><i class="fa-solid fa-heart-pulse"></i> Cardiomegaly</h4>
                            <button id="btn-analyze-cardio" class="btn btn-outline btn-sm" onclick="analyzeSpecificDisease('${xrayId}', 'Cardiomegaly')">
                                Analizar
                            </button>
                        </div>
                        <div id="result-Cardiomegaly" style="display: none; margin-top: 1rem;">
                            <!-- Resultados inyectados aquí -->
                        </div>
                    </div>

                    <!-- Card Nodule -->
                    <div style="background: white; padding: 1.5rem; border-radius: 0.5rem; flex: 1; border: 1px solid #e2e8f0; min-width: 300px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <h4 style="margin: 0;"><i class="fa-solid fa-circle"></i> Nodule</h4>
                            <button id="btn-analyze-nodule" class="btn btn-outline btn-sm" onclick="analyzeSpecificDisease('${xrayId}', 'Nodule')">
                                Analizar
                            </button>
                        </div>
                        <div id="result-Nodule" style="display: none; margin-top: 1rem;">
                            <!-- Resultados inyectados aquí -->
                        </div>
                    </div>

                    <!-- Card Atelectasis -->
                    <div style="background: white; padding: 1.5rem; border-radius: 0.5rem; flex: 1; border: 1px solid #e2e8f0; min-width: 300px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <h4 style="margin: 0;"><i class="fa-solid fa-lungs"></i> Atelectasis</h4>
                            <button id="btn-analyze-atelectasis" class="btn btn-outline btn-sm" onclick="analyzeSpecificDisease('${xrayId}', 'Atelectasis')">
                                Analizar
                            </button>
                        </div>
                        <div id="result-Atelectasis" style="display: none; margin-top: 1rem;">
                            <!-- Resultados inyectados aquí -->
                        </div>
                    </div>
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
        option.addEventListener('click', function () {
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
        showNotification('Por favor selecciona el diagnóstico correcto', 'warning');
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

        showNotification('Diagnóstico validado exitosamente', 'success');

        // Limpiar sessionStorage
        sessionStorage.removeItem('validate_prediction_id');
        sessionStorage.removeItem('validate_prediction_data');
        sessionStorage.removeItem('current_xray_id');
        sessionStorage.removeItem('current_prediction');

        // Redirigir a diagnósticos
        setActiveSection('diagnoses');

    } catch (error) {
        console.error('❌ Error completo:', error);
        showNotification(`Error al validar: ${error.message}`, 'error');
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
            
            <div id="diagnosis-stats-container"></div>
            
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
        listDiv.innerHTML = '<p style="color: var(--danger-color); text-align: center;">Error al cargar diagnósticos</p>';
    }
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

// 📌 Mostrar diagnósticos y predicciones en tabla
function displayDiagnosesAndPredictions(data) {
    const listDiv = document.getElementById('diagnoses-list');

    if (!data || data.length === 0) {
        listDiv.innerHTML = `
            <p style="text-align:center; color: var(--text-secondary); padding: 2rem;">
                No hay diagnósticos que coincidan con los filtros
            </p>
        `;
        return;
    }

    // Calcular estadísticas
    const totalCount = data.length;
    const validatedCount = data.filter(d => d.validated).length;
    const pendingCount = totalCount - validatedCount;
    const correctCount = data.filter(d => d.is_correct).length;

    // Mostrar estadísticas
    const statsContainer = document.getElementById('diagnosis-stats-container');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="status-summary-grid" style="margin-bottom: 1.5rem;">
                <div class="status-card">
                    <div class="status-info">
                        <h4>Total Diagnósticos</h4>
                        <div class="count">${totalCount}</div>
                    </div>
                    <div class="status-icon blue">
                        <i class="fa-solid fa-notes-medical"></i>
                    </div>
                </div>
                <div class="status-card">
                    <div class="status-info">
                        <h4>Validados</h4>
                        <div class="count">${validatedCount}</div>
                    </div>
                    <div class="status-icon green">
                        <i class="fa-solid fa-check-circle"></i>
                    </div>
                </div>
                <div class="status-card">
                    <div class="status-info">
                        <h4>Pendientes</h4>
                        <div class="count">${pendingCount}</div>
                    </div>
                    <div class="status-icon yellow">
                        <i class="fa-solid fa-clock"></i>
                    </div>
                </div>
                <div class="status-card">
                    <div class="status-info">
                        <h4>Correctos</h4>
                        <div class="count">${correctCount}</div>
                    </div>
                    <div class="status-icon green">
                        <i class="fa-solid fa-thumbs-up"></i>
                    </div>
                </div>
            </div>
        `;
    }

    // Generar tabla
    const rows = data.map(d => {
        const displayDisease = d.corrected_disease_name || d.disease_name;
        const statusBadge = d.validated
            ? '<span class="badge" style="background: #dcfce7; color: #166534;">Validado</span>'
            : '<span class="badge" style="background: #fef3c7; color: #92400e;">Pendiente</span>';

        const correctnessBadge = d.validated
            ? (d.is_correct
                ? '<span class="badge" style="background: #dbeafe; color: #1e40af;">Correcto</span>'
                : '<span class="badge" style="background: #fee2e2; color: #991b1b;">Incorrecto</span>')
            : '<span class="badge" style="background: #f3f4f6; color: #6b7280;">-</span>';

        return `
            <tr>
                <td>
                    <div style="font-weight: 500;">${d.patient_name}</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">ID: ${d.patient_id}</div>
                </td>
                <td>
                    <strong style="color: var(--primary-color);">${displayDisease}</strong>
                    ${d.corrected_disease_name ? `<br><small style="color: var(--text-secondary);">Original: ${d.disease_name}</small>` : ''}
                </td>
                <td>${new Date(d.predicted_at).toLocaleDateString()}</td>
                <td>${statusBadge}</td>
                <td>${correctnessBadge}</td>
                <td>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="action-btn view" onclick="viewXrayDetail(${d.xray_id})" title="Ver Radiografía">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        ${!d.validated ? `
                            <button class="action-btn edit" onclick="validatePrediction(${d.id})" title="Validar">
                                <i class="fa-solid fa-check"></i>
                            </button>
                        ` : ''}
                        <button class="action-btn delete" onclick="deleteDiagnosis(${d.id}, 'prediction')" title="Eliminar">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
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
                        <th>Fecha</th>
                        <th>Estado</th>
                        <th>Validación</th>
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

// 📌 Cargar filtros de pacientes
async function loadDiagnosisFilters() {
    const select = document.getElementById('filter-patient-diagnosis');
    if (!select) return;

    try {
        const response = await fetch('/api/patients');
        const patients = await response.json();

        select.innerHTML = '<option value="">Todos los pacientes</option>';
        patients.forEach(p => {
            select.innerHTML += `<option value="${p.id}">${p.name}</option>`;
        });
    } catch (error) {
        console.error('Error cargando filtros de pacientes:', error);
    }
}

// 📌 Eliminar Diagnóstico/Predicción
function deleteDiagnosis(id, type) {
    showDeleteConfirmModal(id, type);
}

async function executeDeleteDiagnosis(id, type) {
    const endpoint = type === 'prediction' ? `/api/predictions/${id}` : `/api/diagnoses/${id}`;

    try {
        const response = await fetch(endpoint, { method: 'DELETE' });
        const data = await response.json();

        if (data.error) throw new Error(data.error);

        showNotification('Registro eliminado', 'success');
        loadAllDiagnosesAndPredictions(); // Recargar lista

    } catch (error) {
        console.error(error);
        showNotification(`Error al eliminar: ${error.message}`, 'error');
    }
}

// 📌 Modal de confirmación para eliminar diagnóstico
function showDeleteConfirmModal(id, type) {
    const modal = document.createElement('div');
    modal.id = 'delete-confirm-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        animation: fadeIn 0.2s ease-out;
    `;

    modal.innerHTML = `
        <div style="
            background: white;
            border-radius: 1rem;
            padding: 2rem;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            animation: slideUp 0.3s ease-out;
        ">
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <div style="
                    width: 60px;
                    height: 60px;
                    background: #fee2e2;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1rem;
                ">
                    <i class="fa-solid fa-trash" style="font-size: 1.5rem; color: #dc2626;"></i>
                </div>
                <h3 style="margin: 0 0 0.5rem 0; color: #1f2937;">¿Eliminar diagnóstico?</h3>
                <p style="color: #6b7280; margin: 0; font-size: 0.875rem;">
                    Esta acción no se puede deshacer. El registro será eliminado permanentemente.
                </p>
            </div>
            
            <div style="display: flex; gap: 0.75rem;">
                <button 
                    onclick="closeDeleteConfirmModal()" 
                    class="btn btn-outline" 
                    style="flex: 1;"
                >
                    <i class="fa-solid fa-times"></i> Cancelar
                </button>
                <button 
                    onclick="confirmDeleteDiagnosis(${id}, '${type}')" 
                    class="btn" 
                    style="flex: 1; background: #dc2626; color: white;"
                >
                    <i class="fa-solid fa-trash"></i> Eliminar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Cerrar al hacer clic fuera del modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeDeleteConfirmModal();
        }
    });
}

function closeDeleteConfirmModal() {
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) {
        modal.style.animation = 'fadeOut 0.2s ease-out';
        setTimeout(() => modal.remove(), 200);
    }
}

function confirmDeleteDiagnosis(id, type) {
    closeDeleteConfirmModal();
    executeDeleteDiagnosis(id, type);
}



// 📌 Análisis Específico (Cardiomegaly / Nodule / Atelectasis)
async function analyzeSpecificDisease(xrayId, diseaseType) {
    const containerId = `result-${diseaseType}`;
    let btnId = '';

    if (diseaseType === 'Cardiomegaly') btnId = 'btn-analyze-cardio';
    else if (diseaseType === 'Nodule') btnId = 'btn-analyze-nodule';
    else if (diseaseType === 'Atelectasis') btnId = 'btn-analyze-atelectasis';

    const container = document.getElementById(containerId);
    const btn = document.getElementById(btnId);

    // UI Loading
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando...';
    container.style.display = 'block';
    container.innerHTML = '<p style="color: var(--text-secondary);">Ejecutando modelo dedicado...</p>';

    try {
        const response = await fetch(`/api/xrays/${xrayId}/analyze/${diseaseType}`, {
            method: 'POST'
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Error en análisis');

        // Render Result - Cambio de probabilidad a Positivo/Negativo
        const isPositive = data.probability > 0.5;
        const color = isPositive ? '#ef4444' : '#10b981';
        const label = isPositive ? 'POSITIVO' : 'NEGATIVO';
        const icon = isPositive ? 'fa-circle-exclamation' : 'fa-circle-check';

        container.innerHTML = `
            <div style="display: flex; gap: 1rem; align-items: flex-start; margin-top: 1rem;">
                <!-- Miniatura Heatmap -->
                <div style="width: 100px; height: 100px; border-radius: 8px; overflow: hidden; border: 1px solid #ddd; flex-shrink: 0; cursor: pointer;" onclick="openImageModal('data:image/jpeg;base64,${data.heatmap_image}')">
                    <img src="data:image/jpeg;base64,${data.heatmap_image}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                
                <div style="flex: 1;">
                    <div style="font-weight: 700; font-size: 1.1rem; color: ${color}; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fa-solid ${icon}"></i> ${label}
                    </div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">
                        Modelo especializado ${diseaseType}.<br>
                        <small>Click en la imagen para ampliar.</small>
                    </div>
                </div>
            </div>
            `;

    } catch (error) {
        console.error(error);
        container.innerHTML = `<p style="color: red;"><i class="fa-solid fa-triangle-exclamation"></i> Error: ${error.message}</p>`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Re-analizar';
    }
}

function openImageModal(imgSrc) {
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
    modal.style.zIndex = '9999';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.onclick = () => modal.remove();

    modal.innerHTML = `<img src="${imgSrc}" style="max-width: 90%; max-height: 90%; border-radius: 8px; box-shadow: 0 0 20px rgba(0,0,0,0.5);">`;
    document.body.appendChild(modal);
}

// 📌 Validar predicción con modal simplificado
async function validatePrediction(predictionId) {
    try {
        const response = await fetch(`/api/predictions/${predictionId}`);
        const prediction = await response.json();

        // Guardar datos en sessionStorage
        sessionStorage.setItem('validate_prediction_id', predictionId);
        sessionStorage.setItem('validate_prediction_data', JSON.stringify(prediction));
        // También establecemos el current_xray_id para que renderAnalysis cargue la imagen correctamente
        sessionStorage.setItem('current_xray_id', prediction.xray_id);

        // Redirigir a sección de análisis (donde está la validación unificada)
        sessionStorage.setItem('analysis_previous_section', currentSection);
        setActiveSection('analysis');

    } catch (error) {
        console.error(error);
        showNotification('Error al cargar la predicción', 'error');
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

document.addEventListener('DOMContentLoaded', function () {
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
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const target = this.getAttribute('data-target');

            // Close sidebar on mobile
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
            }

            // Use unified function
            setActiveSection(target);
        });
    });

    // Initial render
    setActiveSection('patients');
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

        switch (sectionId) {
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
            case 'xray-detail':
                title = 'Detalles de Radiografía';
                content = renderXrayDetail();
                break;
            case 'diagnoses':
                title = 'Gestión de Diagnósticos';
                content = renderDiagnoses();
                break;
            case 'diseases':
                title = 'Enfermedades';
                content = renderDiseases();
                break;
            case 'dashboard':
                title = 'Panel de Estadísticas';
                content = renderDashboard();
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

function goBackFromAnalysis() {
    const prev = sessionStorage.getItem('analysis_previous_section');
    if (prev && prev !== 'analysis') {
        setActiveSection(prev);
    } else {
        setActiveSection('all-xrays'); // Default fallback
    }
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
        if (!listDiv) return;

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

// 📌 DASHBOARD MEJORADO
function renderDashboard() {
    const content = `
        <!-- Stats Cards -->
        <div id="dashboard-stats-cards"></div>

        <!-- Charts Grid -->
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin-bottom: 1.5rem;">
            <div class="card" style="box-shadow: 0 4px 12px rgba(59, 130, 246, 0.08);">
                <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem; color: var(--text-main);">
                    <i class="fa-solid fa-users" style="color: #3b82f6;"></i> Pacientes por Género
                </h3>
                <canvas id="chartGender" style="max-height: 250px;"></canvas>
            </div>
            <div class="card" style="box-shadow: 0 4px 12px rgba(59, 130, 246, 0.08);">
                <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem; color: var(--text-main);">
                    <i class="fa-solid fa-check-circle" style="color: #3b82f6;"></i> Validación de Diagnósticos
                </h3>
                <canvas id="chartAccuracy" style="max-height: 250px;"></canvas>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
            <div class="card" style="box-shadow: 0 4px 12px rgba(59, 130, 246, 0.08);">
                <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem; color: var(--text-main);">
                    <i class="fa-solid fa-chart-bar" style="color: #3b82f6;"></i> Enfermedades Detectadas
                </h3>
                <canvas id="chartDiseases" style="max-height: 300px;"></canvas>
            </div>
            <div class="card" style="box-shadow: 0 4px 12px rgba(59, 130, 246, 0.08);">
                <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem; color: var(--text-main);">
                    <i class="fa-solid fa-calendar-days" style="color: #3b82f6;"></i> Actividad Mensual
                </h3>
                <canvas id="chartMonthly" style="max-height: 300px;"></canvas>
            </div>
        </div>

        <div class="card" style="box-shadow: 0 4px 12px rgba(59, 130, 246, 0.08);">
            <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem; color: var(--text-main);">
                <i class="fa-solid fa-clock-rotate-left" style="color: #3b82f6;"></i> Diagnósticos Recientes
            </h3>
            <div id="recent-diagnoses-list"></div>
        </div>
    `;

    setTimeout(async () => {
        try {
            const [patients, predictions, xrays] = await Promise.all([
                fetch('/api/patients').then(r => r.json()),
                fetch('/api/predictions/all').then(r => r.json()),
                fetch('/api/xrays/all').then(r => r.json())
            ]);

            // Render stats cards
            renderDashboardStatsCards(patients, predictions, xrays);

            // 1. Gender Chart (Doughnut)
            const male = patients.filter(p => p.gender === 'M').length;
            const female = patients.filter(p => p.gender === 'F').length;

            if (document.getElementById('chartGender')) {
                new Chart(document.getElementById('chartGender'), {
                    type: 'doughnut',
                    data: {
                        labels: ['Masculino', 'Femenino'],
                        datasets: [{
                            data: [male, female],
                            backgroundColor: ['#3b82f6', '#93c5fd'],
                            borderWidth: 0,
                            hoverOffset: 10
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    padding: 15,
                                    font: { size: 12, family: 'Inter' }
                                }
                            }
                        }
                    }
                });
            }

            // 2. Accuracy Chart (Pie)
            const correct = predictions.filter(p => p.is_correct === true).length;
            const incorrect = predictions.filter(p => p.is_correct === false).length;
            const pending = predictions.filter(p => p.is_correct === null).length;

            if (document.getElementById('chartAccuracy')) {
                new Chart(document.getElementById('chartAccuracy'), {
                    type: 'pie',
                    data: {
                        labels: ['Correcto', 'Incorrecto', 'Pendiente'],
                        datasets: [{
                            data: [correct, incorrect, pending],
                            backgroundColor: ['#60a5fa', '#3b82f6', '#93c5fd'],
                            borderWidth: 0,
                            hoverOffset: 10
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    padding: 15,
                                    font: { size: 12, family: 'Inter' }
                                }
                            }
                        }
                    }
                });
            }

            // 3. Diseases Distribution (Bar)
            const diseaseCounts = {};
            predictions.forEach(p => {
                const name = p.corrected_disease_name || p.disease_name;
                diseaseCounts[name] = (diseaseCounts[name] || 0) + 1;
            });

            if (document.getElementById('chartDiseases')) {
                new Chart(document.getElementById('chartDiseases'), {
                    type: 'bar',
                    data: {
                        labels: Object.keys(diseaseCounts),
                        datasets: [{
                            label: 'Casos',
                            data: Object.values(diseaseCounts),
                            backgroundColor: '#3b82f6',
                            borderRadius: 8,
                            barThickness: 40
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: { font: { family: 'Inter' } }
                            },
                            x: {
                                ticks: { font: { family: 'Inter', size: 11 } }
                            }
                        },
                        plugins: {
                            legend: { display: false }
                        }
                    }
                });
            }

            // 4. Monthly Activity (Line)
            const monthlyData = {};
            predictions.forEach(p => {
                const month = new Date(p.predicted_at).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
                monthlyData[month] = (monthlyData[month] || 0) + 1;
            });

            const months = Object.keys(monthlyData).slice(-6);
            const counts = months.map(m => monthlyData[m]);

            if (document.getElementById('chartMonthly')) {
                new Chart(document.getElementById('chartMonthly'), {
                    type: 'line',
                    data: {
                        labels: months,
                        datasets: [{
                            label: 'Diagnósticos',
                            data: counts,
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            tension: 0.4,
                            fill: true,
                            pointRadius: 5,
                            pointHoverRadius: 7,
                            pointBackgroundColor: '#3b82f6'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: { font: { family: 'Inter' } }
                            },
                            x: {
                                ticks: { font: { family: 'Inter', size: 10 } }
                            }
                        },
                        plugins: {
                            legend: { display: false }
                        }
                    }
                });
            }

            // 5. Recent diagnoses list
            renderRecentDiagnoses(predictions.slice(-5).reverse());

        } catch (error) {
            console.error('Error loading dashboard:', error);
            const area = document.getElementById('content-area');
            if (area) area.innerHTML += '<p style="color: var(--danger-color);">Error cargando datos del dashboard</p>';
        }
    }, 100);

    return content;
}

function renderDashboardStatsCards(patients, predictions, xrays) {
    const container = document.getElementById('dashboard-stats-cards');
    if (!container) return;

    const validated = predictions.filter(p => p.validated).length;
    const pending = predictions.filter(p => !p.validated).length;
    const accuracy = predictions.filter(p => p.is_correct === true).length;
    const totalPredictions = validated > 0 ? validated : 1;
    const accuracyPercent = Math.round((accuracy / totalPredictions) * 100);

    container.innerHTML = `
        <div class="status-summary-grid" style="margin-bottom: 2rem;">
            <div class="status-card" style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #bfdbfe;">
                <div class="status-info">
                    <h4 style="color: #1e40af;">Total Pacientes</h4>
                    <div class="count" style="color: #1e40af;">${patients.length}</div>
                </div>
                <div class="status-icon" style="background: #3b82f6; color: white;">
                    <i class="fa-solid fa-users"></i>
                </div>
            </div>

            <div class="status-card" style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #bfdbfe;">
                <div class="status-info">
                    <h4 style="color: #1e40af;">Radiografías Subidas</h4>
                    <div class="count" style="color: #1e40af;">${xrays.length}</div>
                </div>
                <div class="status-icon" style="background: #60a5fa; color: white;">
                    <i class="fa-solid fa-images"></i>
                </div>
            </div>

            <div class="status-card" style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #bfdbfe;">
                <div class="status-info">
                    <h4 style="color: #1e40af;">Diagnósticos Realizados</h4>
                    <div class="count" style="color: #1e40af;">${predictions.length}</div>
                </div>
                <div class="status-icon" style="background: #2563eb; color: white;">
                    <i class="fa-solid fa-stethoscope"></i>
                </div>
            </div>

            <div class="status-card" style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #bfdbfe;">
                <div class="status-info">
                    <h4 style="color: #1e40af;">Precisión del Modelo</h4>
                    <div class="count" style="color: #1e40af;">${accuracyPercent}%</div>
                </div>
                <div class="status-icon" style="background: #1d4ed8; color: white;">
                    <i class="fa-solid fa-chart-line"></i>
                </div>
            </div>
        </div>
    `;
}

function renderRecentDiagnoses(recentPredictions) {
    const container = document.getElementById('recent-diagnoses-list');
    if (!container) return;

    if (recentPredictions.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No hay diagnósticos recientes</p>';
        return;
    }

    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 1rem;">
            ${recentPredictions.map(p => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: #f8fafc; border-radius: 0.75rem; border-left: 4px solid #3b82f6;">
                    <div>
                        <div style="font-weight: 600; color: var(--text-main); margin-bottom: 0.25rem;">${p.patient_name}</div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">
                            <i class="fa-solid fa-stethoscope" style="color: #3b82f6;"></i> ${p.corrected_disease_name || p.disease_name}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem;">
                            ${new Date(p.predicted_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </div>
                        ${p.validated
            ? `<span class="badge" style="background: #dcfce7; color: #166534; font-size: 0.7rem;">Validado</span>`
            : `<span class="badge" style="background: #fef3c7; color: #92400e; font-size: 0.7rem;">Pendiente</span>`
        }
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}


function renderExplainableAI() {
    const modules = [
        {
            title: "¿Qué es una CNN?",
            icon: "fa-brain",
            description: "Una Red Neuronal Convolucional (CNN) es un tipo de IA diseñada para analizar imágenes.",
            details: [
                "Funciona <strong>aprendiendo patrones</strong> como líneas y formas.",
                "Es como si 'mirara' la imagen varias veces para entenderla.",
                "Analiza desde detalles simples hasta estructuras complejas."
            ]
        },
        {
            title: "¿Qué modelo usé?",
            icon: "fa-layer-group",
            description: "Usé <strong>DenseNet-121</strong>, un modelo pre-entrenado en millones de imágenes.",
            details: [
                "<strong>Aprende muy bien</strong> patrones visuales complejos.",
                "<strong>Eficiente:</strong> No necesita demasiados datos.",
                "<strong>Estándar:</strong> Muy usado en radiología médica.",
                "Adaptado para detectar 5 enfermedades pulmonares específicas."
            ]
        },
        {
            title: "¿Qué hace con la imagen?",
            icon: "fa-microscope",
            description: "Proceso paso a paso desde que recibe la radiografía:",
            details: [
                "1. <strong>Ajusta y normaliza</strong> la imagen.",
                "2. Busca <strong>bordes y sombras</strong> básicos.",
                "3. Combina detalles para hallar <strong>nódulos u opacidades</strong>.",
                "4. Decide qué enfermedades están presentes (pueden ser varias)."
            ]
        },
        {
            title: "¿Qué detecta?",
            icon: "fa-lungs-virus",
            description: "El modelo aprende a detectar independientemente:",
            details: [
                "<span class='ai-highlight'>Atelectasis</span> (Colapso pulmonar)",
                "<span class='ai-highlight'>Effusion</span> (Derrame pleural)",
                "<span class='ai-highlight'>Infiltration</span> (Infiltración)",
                "<span class='ai-highlight'>Cardiomegaly</span> (Corazón agrandado)",
                "<span class='ai-highlight'>Nodule</span> (Pequeñas masas)"
            ]
        },
        {
            title: "¿Cómo aprende?",
            icon: "fa-graduation-cap",
            description: "El aprendizaje se basa en la comparación constante:",
            details: [
                "Compara su <strong>predicción</strong> vs la <strong>realidad</strong>.",
                "Si se equivoca, <strong>ajusta sus parámetros</strong>.",
                "Repite esto miles de veces (epochs) hasta mejorar.",
                "Es un proceso de prueba y error matemático masivo."
            ]
        },
        {
            title: "Transformación de Imágenes",
            icon: "fa-image",
            description: "Antes de entrar al modelo, la imagen se prepara:",
            details: [
                "Redimensión a <strong>224x224 píxeles</strong>.",
                "Pequeños giros aleatorios para variar los datos.",
                "Conversión a <strong>tensores</strong> (números).",
                "<strong>Normalización</strong> para estandarizar los valores."
            ]
        },
        {
            title: "¿Por qué multietiqueta?",
            icon: "fa-list-check",
            description: "La realidad médica no es binaria.",
            details: [
                "Un paciente puede tener <strong>varias patologías</strong> a la vez.",
                "O podría no tener ninguna (sano).",
                "El modelo tiene <strong>5 salidas independientes</strong>.",
                "Cada salida es una respuesta de 'Sí/No'."
            ]
        },
        {
            title: "¿Cómo se evaluó?",
            icon: "fa-chart-line",
            description: "Métricas clave usadas durante el entrenamiento:",
            details: [
                "<strong>Loss de validación:</strong> Mide qué tan bien aprende.",
                "<strong>Predicciones Sigmoid:</strong> Probabilidades 0-1.",
                "<strong>F1 Macro:</strong> Equilibrio entre precisión y recall.",
                "Mientras más alto el F1, mejor rendimiento general."
            ]
        },
        {
            title: "Métricas de Validación",
            icon: "fa-clipboard-check",
            description: "Indicadores clínicos de rendimiento:",
            details: [
                "<strong>AUC-ROC:</strong> Capacidad de distinguir enfermos de sanos.",
                "<strong>Sensibilidad:</strong> Qué tan bueno es detectando positivos.",
                "<strong>Especificidad:</strong> Qué tan bueno es descartando negativos.",
                "<strong>Matriz de Confusión:</strong> Visualización de aciertos vs errores."
            ]
        }
    ];

    const cardsHtml = modules.map((mod, index) => `
        <div class="ai-module-card" style="animation: fadeInUp 0.5s ease-out ${index * 0.1}s backwards;">
            <div class="ai-module-header">
                <h3><i class="fa-solid ${mod.icon}"></i> ${mod.title}</h3>
            </div>
            <div class="ai-module-content">
                <p>${mod.description}</p>
                <ul>
                    ${mod.details.map(detail => `<li>${detail}</li>`).join('')}
                </ul>
            </div>
        </div>
    `).join('');

    return `
        <div class="ai-intro">
            <h2>Cómo funciona esta IA</h2>
            <p style="color: var(--text-secondary); font-size: 1.1rem;">
                Una guía interactiva para entender la tecnología detrás del diagnóstico automatizado.
            </p>
        </div>
        <div class="ai-modules-grid">
            ${cardsHtml}
        </div>
        <style>
            @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
        </style>
    `;
}

function attachDynamicListeners() {
    // Placeholder para listeners dinámicos si son necesarios
    console.log('✅ Dynamic listeners attached');
}
