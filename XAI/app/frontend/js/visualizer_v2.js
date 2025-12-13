/**
 * CNN Visualizer V4 - Dynamic Block Explorer
 * Supports auto-grouped architectures like EfficientNet & DenseNet
 */

const API_BASE = 'http://localhost:5000';

document.addEventListener('DOMContentLoaded', () => {
    init();
});

async function init() {
    try {
        console.log("Fetching model structure...");
        const response = await fetch(`${API_BASE}/api/v2/model/structure`);

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Model structure loaded:", data);

        // Hide loader
        document.getElementById('loading').style.display = 'none';

        // Update header
        document.getElementById('model-name').textContent = `Architecture: ${data.architecture}`;

        // Render
        renderArchitecture(data.blocks);

        // Setup buttons
        setupGlobalButtons();
        setupHyperparamButton();

    } catch (error) {
        console.error("Initialization failed:", error);
        document.getElementById('loading').innerHTML = `
            <div style="color: #ef4444; font-size: 2rem; margin-bottom: 1rem;"><i class="fa-solid fa-triangle-exclamation"></i></div>
            <div style="color: #fff;">Error loading visualization</div>
            <div style="color: #94a3b8; font-size: 0.9rem; margin-top: 0.5rem;">${error.message}</div>
            <button onclick="location.reload()" style="margin-top: 1.5rem; padding: 0.5rem 1rem; border: none; background: #3b82f6; color: white; border-radius: 4px; cursor: pointer;">Retry</button>
        `;
    }
}

function renderArchitecture(blocks) {
    const container = document.getElementById('diagram-container');
    container.innerHTML = '';

    blocks.forEach((block, index) => {
        // Create block element
        const el = document.createElement('div');
        el.className = 'model-stage';
        el.style.animationDelay = `${index * 100}ms`;

        // Determine style class based on name/type
        let typeClass = 'block-card';
        let icon = 'fa-layer-group';

        const nameLower = block.name.toLowerCase();

        if (nameLower.includes('input') || nameLower.includes('stem')) {
            typeClass += ' block-input';
            icon = 'fa-image';
        } else if (nameLower.includes('dense block') || nameLower.includes('block')) {
            typeClass += ' block-dense';
            icon = 'fa-cubes';
        } else if (nameLower.includes('transition')) {
            typeClass += ' block-transition';
            icon = 'fa-compress-arrows-alt';
        } else if (nameLower.includes('classification') || nameLower.includes('top')) {
            typeClass += ' block-output';
            icon = 'fa-brain';
        }

        el.innerHTML = `
            <div class="stage-title">Step ${index + 1}</div>
            <div class="${typeClass}" onclick='showDetails(${JSON.stringify(block).replace(/'/g, "&#39;")})'>
                <i class="fa-solid ${icon} block-icon"></i>
                <div class="block-name">${block.name}</div>
                <div class="block-meta">${block.layers.length} layers</div>
                ${index < blocks.length - 1 ? '<div class="connector"></div>' : ''}
            </div>
        `;

        container.appendChild(el);
    });
}

// ===== DETAILS PANEL =====
window.showDetails = function (block) {
    const panel = document.getElementById('side-panel');
    const content = document.getElementById('panel-content');
    const title = document.getElementById('panel-title');

    // Highlight active block
    document.querySelectorAll('.block-card').forEach(b => b.classList.remove('active'));
    // (Ideally we would add active class to clicked element, but passing 'this' is tricky with inline onclick)

    panel.classList.add('active');
    title.textContent = block.name;

    // Calculate total params for this block
    const totalParams = block.layers.reduce((sum, l) => sum + (l.params || 0), 0);

    content.innerHTML = `
        <div class="detail-group">
            <h4>Summary</h4>
            <div class="info-row">
                <span class="info-label">Type</span>
                <span>${block.layers[0]?.type || 'Block'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Layers</span>
                <span>${block.layers.length}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Start Shape</span>
                <span>${formatShape(block.layers[0]?.input_shape)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">End Shape</span>
                <span>${formatShape(block.layers[block.layers.length - 1]?.output_shape)}</span>
            </div>
        </div>

        <div class="detail-group">
            <h4>Layers in Block</h4>
            <div class="layer-list">
                ${block.layers.map(layer => `
                    <div class="layer-item">
                        <div style="display:flex; justify-content:space-between; margin-bottom: 2px;">
                            <span style="font-weight:600; color: #fff;">${layer.name}</span>
                            <span style="font-size:0.75rem; color:#64748b;">${layer.type}</span>
                        </div>
                        <div style="font-size:0.75rem; color:#94a3b8;">
                            Out: ${formatShape(layer.output_shape)}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="detail-group">
            <h4>Activations</h4>
            <p style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 1rem;">
                Visualizing output of last layer in block.
            </p>
            <button onclick="loadActivations('${block.layers[block.layers.length - 1].name}')" 
                style="width:100%; padding:0.6rem; background: var(--accent); border:none; color:white; border-radius:6px; cursor:pointer;">
                <i class="fa-solid fa-eye"></i> View Feature Maps
            </button>
            <div id="activation-container" style="min-height: 100px; display: flex; align-items: center; justify-content: center;"></div>
        </div>
    `;
};

window.closePanel = function () {
    document.getElementById('side-panel').classList.remove('active');
};

// ===== ACTIVATIONS =====
window.loadActivations = async function (layerName) {
    const container = document.getElementById('activation-container');
    container.innerHTML = '<div class="spinner" style="width:20px; height:20px; border-width:2px;"></div>';

    try {
        const response = await fetch(`${API_BASE}/api/v2/model/activation/${encodeURIComponent(layerName)}`);
        const data = await response.json();

        if (data.error) throw new Error(data.error);
        if (!data.image) throw new Error("No image returned");

        container.innerHTML = `
            <div style="width:100%; margin-top:1rem;">
                <img src="data:image/png;base64,${data.image}" class="vis-image" alt="Activations">
                <div style="font-size:0.7rem; color:#64748b; text-align:center; margin-top:0.2rem;">
                    Shape: ${data.activation_shape}
                </div>
            </div>
        `;
    } catch (e) {
        container.innerHTML = `<div style="color: #ef4444; font-size: 0.8rem; margin-top:1rem;">${e.message}</div>`;
        if (e.message.includes('No image available')) {
            container.innerHTML += `<div style="font-size: 0.7rem; color: #94a3b8;">Please analyze an X-ray first.</div>`;
        }
    }
};

// ===== GLOBAL BUTTONS (GradCAM) =====
function setupGlobalButtons() {
    const btnGrad = document.getElementById('btn-gradcam');

    if (btnGrad) {
        btnGrad.onclick = async () => {
            const panel = document.getElementById('side-panel');
            const content = document.getElementById('panel-content');
            const title = document.getElementById('panel-title');

            panel.classList.add('active');
            title.textContent = "Grad-CAM Explanation";
            content.innerHTML = '<div style="display:flex; justify-content:center; padding:2rem;"><div class="spinner"></div></div>';

            try {
                const response = await fetch(`${API_BASE}/api/v2/model/gradcam`);
                const data = await response.json();

                if (data.error) throw new Error(data.error);

                // Build HTML
                content.innerHTML = `
                    <div class="detail-group">
                        <img src="data:image/png;base64,${data.image}" class="vis-image">
                        <div style="margin-top: 0.5rem; text-align: center; color: #f8fafc; font-weight: 600;">
                            Prediction: <span style="color: #f59e0b">${data.predicted_class}</span>
                        </div>
                        <div style="text-align: center; font-size: 0.8rem; color: #94a3b8;">
                            Confidence: ${(data.confidence * 100).toFixed(1)}%
                        </div>
                    </div>
                    
                    <div style="text-align:center; margin-top:1rem; font-size: 0.8rem; color: #64748b;">
                        <em>Heatmap shows regions influential to the diagnosis.</em>
                    </div>
                 `;
            } catch (e) {
                content.innerHTML = `<div style="color:#ef4444; padding:1rem;">Error: ${e.message}</div>`;
            }
        };
    }
}

// Utility
function formatShape(shapeStr) {
    if (!shapeStr || shapeStr === 'N/A') return 'N/A';
    // Remove (None, ) or (?, ) or (1, ) from start if it represents batch
    let clean = shapeStr.replace(/[()]/g, '');
    clean = clean.replace(/None, /g, '').replace(/\?, /g, '');
    // If it starts with a batch dim comma separation, clean it
    if (clean.startsWith('None,')) clean = clean.substring(5);
    return clean;
}

// ===== HYPERPARAMETERS =====
function setupHyperparamButton() {
    const btnParams = document.getElementById('btn-hyperparams');
    if (!btnParams) return;

    btnParams.onclick = async () => {
        const panel = document.getElementById('side-panel');
        const content = document.getElementById('panel-content');
        const title = document.getElementById('panel-title');

        panel.classList.add('active');
        title.textContent = "Model Parameters & Metrics";
        content.innerHTML = '<div style="display:flex; justify-content:center; padding:2rem;"><div class="spinner"></div></div>';

        try {
            const response = await fetch(`${API_BASE}/api/v2/model/hyperparameters`);
            const data = await response.json();

            let html = '';

            // Model Info
            html += `<div class="detail-group"><h4>Architecture Info</h4>`;
            for (const [k, v] of Object.entries(data.model_info || {})) {
                html += `<div class="info-row"><span class="info-label">${k}</span><span>${v}</span></div>`;
            }
            html += `</div>`;

            // Training Config
            html += `<div class="detail-group"><h4>Training Configuration</h4>`;
            for (const [k, v] of Object.entries(data.training_config || {})) {
                html += `<div class="info-row"><span class="info-label">${k}</span><span>${v}</span></div>`;
            }
            html += `</div>`;

            // ROC Curves & Metrics
            if (data.auc_metrics) {
                html += `
                    <div class="detail-group" style="margin-top: 2rem;">
                        <h4>Model Performance (ROC)</h4>
                        <div style="background: white; padding: 5px; border-radius: 8px; margin-bottom: 1rem;">
                            <!-- Placeholder image path, user should ensure file exists -->
                            <img src="/assets/roc_curves.png" style="width: 100%; border-radius: 4px; display:block;" 
                                 onerror="this.src='https://placehold.co/400x300/1e293b/FFF?text=ROC+Curves+Image+Missing'">
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr; gap: 0.5rem; font-size: 0.85rem;">
                            ${data.auc_metrics.map(m => `
                                <div style="display:flex; align-items:center; justify-content: space-between;">
                                    <div style="display:flex; align-items:center; gap: 8px;">
                                        <div style="width:10px; height:10px; border-radius:50%; background:${m.color}"></div>
                                        <span style="color:#cbd5e1">${m.label}</span>
                                    </div>
                                    <span style="font-weight:600; color:#fff">AUC: ${m.value.toFixed(3)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            content.innerHTML = html;

        } catch (e) {
            content.innerHTML = `<div style="color:#ef4444; padding:1rem;">Error: ${e.message}</div>`;
        }
    };
}
