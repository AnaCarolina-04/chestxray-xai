
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
