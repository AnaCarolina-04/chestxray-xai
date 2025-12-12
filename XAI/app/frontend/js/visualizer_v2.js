/**
 * CNN Visualizer V2 - Modern Horizontal Layout with D3.js
 * Supports intelligent block grouping, zoom/pan, and interactive exploration
 */

// ===== CONFIGURATION =====
const CONFIG = {
    API_BASE: 'http://localhost:5000',
    BLOCK_WIDTH: 200,
    BLOCK_HEIGHT: 120,
    BLOCK_SPACING_X: 80,
    BLOCK_SPACING_Y: 60,
    START_X: 100,
    START_Y: 150,
    ANIMATION_DURATION: 300
};

// ===== GLOBAL STATE =====
let modelData = null;
let selectedBlock = null;
let svg = null;
let zoomBehavior = null;
let currentZoom = 1;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initializeVisualizer();
});

async function initializeVisualizer() {
    try {
        showLoading();

        // Initialize SVG with zoom
        initializeSVG();

        // Fetch grouped layers
        const response = await fetch(`${CONFIG.API_BASE}/model/layers_grouped`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        modelData = await response.json();

        // Update stats
        updateStats(modelData);

        // Draw network
        drawNetwork(modelData.blocks);

        hideLoading();

    } catch (error) {
        console.error('Error initializing visualizer:', error);
        showError(`Error loading model: ${error.message}`);
        hideLoading();
    }
}

// ===== SVG INITIALIZATION =====
function initializeSVG() {
    svg = d3.select('#network-canvas');

    // Create main group for zoom/pan
    const g = svg.append('g').attr('id', 'main-group');

    // Setup zoom behavior
    zoomBehavior = d3.zoom()
        .scaleExtent([0.3, 3])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
            currentZoom = event.transform.k;
        });

    svg.call(zoomBehavior);

    // Zoom controls
    document.getElementById('zoom-in-btn').addEventListener('click', () => {
        svg.transition().duration(300).call(zoomBehavior.scaleBy, 1.3);
    });

    document.getElementById('zoom-out-btn').addEventListener('click', () => {
        svg.transition().duration(300).call(zoomBehavior.scaleBy, 0.7);
    });

    document.getElementById('zoom-reset-btn').addEventListener('click', () => {
        svg.transition().duration(300).call(zoomBehavior.transform, d3.zoomIdentity);
    });

    // Close panel button
    document.getElementById('close-panel').addEventListener('click', () => {
        closeSidePanel();
    });
}

// ===== NETWORK DRAWING =====
function drawNetwork(blocks) {
    if (!blocks || blocks.length === 0) {
        showError('No blocks found in model');
        return;
    }

    const g = d3.select('#main-group');

    // Calculate canvas dimensions
    const canvasWidth = blocks.length * (CONFIG.BLOCK_WIDTH + CONFIG.BLOCK_SPACING_X) + CONFIG.START_X * 2;
    const canvasHeight = CONFIG.BLOCK_HEIGHT + CONFIG.START_Y * 2;

    svg.attr('width', canvasWidth)
        .attr('height', Math.max(canvasHeight, window.innerHeight - 70));

    // Clear previous content
    g.selectAll('*').remove();

    // Draw connections first
    drawConnections(g, blocks);

    // Draw blocks
    drawBlocks(g, blocks);
}

// ===== CONNECTIONS =====
function drawConnections(g, blocks) {
    const connectionsGroup = g.append('g').attr('class', 'connections');

    for (let i = 0; i < blocks.length - 1; i++) {
        const x1 = CONFIG.START_X + i * (CONFIG.BLOCK_WIDTH + CONFIG.BLOCK_SPACING_X) + CONFIG.BLOCK_WIDTH;
        const x2 = CONFIG.START_X + (i + 1) * (CONFIG.BLOCK_WIDTH + CONFIG.BLOCK_SPACING_X);
        const y = CONFIG.START_Y + CONFIG.BLOCK_HEIGHT / 2;

        // Draw smooth line
        connectionsGroup.append('path')
            .attr('class', 'connection')
            .attr('id', `connection-${i}`)
            .attr('d', `M ${x1} ${y} L ${x2} ${y}`)
            .attr('stroke', '#cbd5e1')
            .attr('stroke-width', 2)
            .attr('fill', 'none')
            .style('opacity', 0)
            .transition()
            .duration(CONFIG.ANIMATION_DURATION)
            .delay(i * 50)
            .style('opacity', 1);
    }
}

// ===== BLOCKS =====
function drawBlocks(g, blocks) {
    const blocksGroup = g.append('g').attr('class', 'blocks');

    blocks.forEach((block, index) => {
        const x = CONFIG.START_X + index * (CONFIG.BLOCK_WIDTH + CONFIG.BLOCK_SPACING_X);
        const y = CONFIG.START_Y;

        // Create block group
        const blockGroup = blocksGroup.append('g')
            .attr('class', 'block')
            .attr('id', `block-${index}`)
            .attr('transform', `translate(${x}, ${y})`)
            .style('cursor', 'pointer')
            .on('click', () => selectBlock(block, index))
            .on('mouseenter', function () {
                d3.select(this).select('.block-rect')
                    .transition()
                    .duration(200)
                    .attr('transform', 'translate(0, -5)')
                    .style('filter', 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.15))');
            })
            .on('mouseleave', function () {
                if (selectedBlock !== block) {
                    d3.select(this).select('.block-rect')
                        .transition()
                        .duration(200)
                        .attr('transform', 'translate(0, 0)')
                        .style('filter', 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))');
                }
            });

        // Get block color
        const color = getBlockGradient(block.type);

        // Draw block rectangle with gradient
        const defs = svg.append('defs');
        const gradient = defs.append('linearGradient')
            .attr('id', `gradient-${index}`)
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '0%')
            .attr('y2', '100%');

        const colors = color.match(/rgba?\([^)]+\)/g);
        if (colors && colors.length >= 2) {
            gradient.append('stop')
                .attr('offset', '0%')
                .attr('stop-color', colors[0]);
            gradient.append('stop')
                .attr('offset', '100%')
                .attr('stop-color', colors[1]);
        }

        blockGroup.append('rect')
            .attr('class', 'block-rect')
            .attr('width', CONFIG.BLOCK_WIDTH)
            .attr('height', CONFIG.BLOCK_HEIGHT)
            .attr('rx', 12)
            .attr('ry', 12)
            .attr('fill', `url(#gradient-${index})`)
            .style('filter', 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))')
            .style('opacity', 0)
            .transition()
            .duration(CONFIG.ANIMATION_DURATION)
            .delay(index * 50)
            .style('opacity', 1);

        // Block icon
        blockGroup.append('text')
            .attr('class', 'block-icon')
            .attr('x', CONFIG.BLOCK_WIDTH / 2)
            .attr('y', 35)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .attr('font-size', '24px')
            .attr('font-family', 'FontAwesome')
            .text(getBlockIcon(block.type))
            .style('opacity', 0)
            .transition()
            .duration(CONFIG.ANIMATION_DURATION)
            .delay(index * 50 + 100)
            .style('opacity', 1);

        // Block name
        blockGroup.append('text')
            .attr('class', 'block-name')
            .attr('x', CONFIG.BLOCK_WIDTH / 2)
            .attr('y', 65)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .attr('font-size', '12px')
            .attr('font-weight', '600')
            .text(truncateText(block.name, 20))
            .style('opacity', 0)
            .transition()
            .duration(CONFIG.ANIMATION_DURATION)
            .delay(index * 50 + 150)
            .style('opacity', 0.95);

        // Block type
        blockGroup.append('text')
            .attr('class', 'block-type-label')
            .attr('x', CONFIG.BLOCK_WIDTH / 2)
            .attr('y', 85)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .attr('font-size', '10px')
            .text(block.type)
            .style('opacity', 0)
            .transition()
            .duration(CONFIG.ANIMATION_DURATION)
            .delay(index * 50 + 200)
            .style('opacity', 0.8);

        // Parameters count
        if (block.params > 0) {
            blockGroup.append('text')
                .attr('class', 'block-params')
                .attr('x', CONFIG.BLOCK_WIDTH / 2)
                .attr('y', 105)
                .attr('text-anchor', 'middle')
                .attr('fill', 'white')
                .attr('font-size', '9px')
                .text(formatParams(block.params))
                .style('opacity', 0)
                .transition()
                .duration(CONFIG.ANIMATION_DURATION)
                .delay(index * 50 + 250)
                .style('opacity', 0.7);
        }
    });
}

// ===== BLOCK SELECTION =====
function selectBlock(block, index) {
    selectedBlock = block;

    // Remove previous selection
    d3.selectAll('.block-rect')
        .transition()
        .duration(200)
        .attr('stroke', 'none')
        .attr('stroke-width', 0);

    // Highlight selected block
    d3.select(`#block-${index} .block-rect`)
        .transition()
        .duration(200)
        .attr('stroke', '#fbbf24')
        .attr('stroke-width', 3)
        .attr('transform', 'translate(0, -5)');

    // Show details in side panel
    showBlockDetails(block);
}

// ===== SIDE PANEL =====
function showBlockDetails(block) {
    const panel = document.getElementById('side-panel');
    const content = document.getElementById('panel-content');

    panel.classList.add('active');

    let html = `
        <div class="block-header">
            <div class="block-title">${block.name}</div>
            <span class="block-type">${block.type}</span>
        </div>
        
        <div class="detail-section">
            <h4>Information</h4>
            <div class="detail-grid">
                <div class="detail-row">
                    <span class="detail-label">Input Shape</span>
                    <span class="detail-value">${block.input_shape}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Output Shape</span>
                    <span class="detail-value">${block.output_shape}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Parameters</span>
                    <span class="detail-value">${formatParams(block.params)}</span>
                </div>
            </div>
        </div>
    `;

    // Show layers if grouped
    if (block.layers && block.layers.length > 1) {
        html += `
            <div class="detail-section">
                <h4>Layers (${block.layers.length})</h4>
                <div class="layer-list">
                    ${block.layers.map(layer => `
                        <div class="layer-item">
                            <div class="layer-item-name">${layer.name}</div>
                            <div class="layer-item-type">${layer.type} • ${formatParams(layer.params)} params</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Activation button
    if (block.layers && block.layers.length > 0) {
        const layerName = block.layers[0].name;
        html += `
            <button class="activation-btn" onclick="getActivations('${layerName}')">
                <i class="fa-solid fa-eye"></i>
                View Activations
            </button>
            <div id="activation-display"></div>
        `;
    }

    content.innerHTML = html;
}

function closeSidePanel() {
    document.getElementById('side-panel').classList.remove('active');
    selectedBlock = null;

    // Remove selection highlight
    d3.selectAll('.block-rect')
        .transition()
        .duration(200)
        .attr('stroke', 'none')
        .attr('stroke-width', 0)
        .attr('transform', 'translate(0, 0)');
}

// ===== ACTIVATIONS =====
async function getActivations(layerName) {
    const displayDiv = document.getElementById('activation-display');
    displayDiv.innerHTML = '<div class="message info">Computing activations...</div>';

    try {
        const response = await fetch(`${CONFIG.API_BASE}/model/activation/${encodeURIComponent(layerName)}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || error.message || 'Failed to get activations');
        }

        const data = await response.json();

        displayDiv.innerHTML = `
            <div class="detail-section">
                <h4>Activation Visualization</h4>
                <div style="margin-top: 0.5rem; color: var(--text-secondary); font-size: 0.875rem;">
                    Shape: ${data.activation_shape}
                </div>
                <img src="data:image/png;base64,${data.image}" alt="Layer Activations" style="margin-top: 1rem;">
            </div>
        `;

    } catch (error) {
        console.error('Error getting activations:', error);
        displayDiv.innerHTML = `<div class="message error">${error.message}</div>`;
    }
}

// ===== UTILITY FUNCTIONS =====
function getBlockGradient(blockType) {
    const gradients = {
        'InputLayer': 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)',
        'Conv2D': 'linear-gradient(135deg, #2196F3 0%, #42A5F5 100%)',
        'ConvBlock': 'linear-gradient(135deg, #2196F3 0%, #42A5F5 100%)',
        'DepthwiseBlock': 'linear-gradient(135deg, #00BCD4 0%, #26C6DA 100%)',
        'DenseBlock': 'linear-gradient(135deg, #9C27B0 0%, #AB47BC 100%)',
        'Dense': 'linear-gradient(135deg, #9C27B0 0%, #AB47BC 100%)',
        'GlobalAveragePooling2D': 'linear-gradient(135deg, #009688 0%, #26A69A 100%)',
        'Dropout': 'linear-gradient(135deg, #795548 0%, #8D6E63 100%)',
        'Activation': 'linear-gradient(135deg, #FF9800 0%, #FFA726 100%)',
        'BatchNormalization': 'linear-gradient(135deg, #673AB7 0%, #7E57C2 100%)',
    };

    return gradients[blockType] || 'linear-gradient(135deg, #607D8B 0%, #78909C 100%)';
}

function getBlockIcon(blockType) {
    const icons = {
        'InputLayer': '\uf03e',  // image
        'Conv2D': '\uf1fc',      // paint-brush
        'ConvBlock': '\uf1fc',
        'DepthwiseBlock': '\uf1fc',
        'DenseBlock': '\uf542',  // layer-group
        'Dense': '\uf542',
        'GlobalAveragePooling2D': '\uf0b0',  // filter
        'Dropout': '\uf204',     // droplet
        'Activation': '\uf06d',  // fire
        'BatchNormalization': '\uf1de',  // sliders
    };

    return icons[blockType] || '\uf0c8';  // square
}

function formatParams(count) {
    if (count === 0) return '0';
    if (count < 1000) return count.toString();
    if (count < 1000000) return (count / 1000).toFixed(1) + 'K';
    return (count / 1000000).toFixed(1) + 'M';
}

function truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
}

function updateStats(data) {
    document.getElementById('stat-blocks').textContent = data.total_blocks || 0;

    const totalParams = data.blocks.reduce((sum, block) => sum + (block.params || 0), 0);
    document.getElementById('stat-params').textContent = formatParams(totalParams);

    document.getElementById('model-name').textContent = data.model_name || 'CNN Model';
}

function showLoading() {
    document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
}

function showError(message) {
    hideLoading();
    const content = document.getElementById('panel-content');
    content.innerHTML = `<div class="message error">${message}</div>`;
}

// Make getActivations globally available
window.getActivations = getActivations;
