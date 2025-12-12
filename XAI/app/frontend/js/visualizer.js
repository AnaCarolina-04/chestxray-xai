/**
 * CNN Model Visualizer
 * Uses D3.js to create interactive 2D visualization of neural network layers
 */

// Configuration
const CONFIG = {
    API_BASE: 'http://localhost:5000',
    LAYER_WIDTH: 280,
    LAYER_HEIGHT: 80,
    LAYER_SPACING: 50,
    START_Y: 100,
    START_X: 100,
    ANIMATION_DURATION: 400
};

// Global state
let modelData = null;
let selectedLayer = null;
let svg = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeVisualization();
});

/**
 * Initialize the visualization
 */
async function initializeVisualization() {
    try {
        // Get SVG element
        svg = d3.select('#network-canvas');

        // Fetch model layers
        showLoading('Cargando arquitectura del modelo...');
        const response = await fetch(`${CONFIG.API_BASE}/model/layers`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        modelData = await response.json();

        // Update model info
        updateModelInfo(modelData);

        // Draw network
        drawNetwork(modelData.layers);

        hideLoading();

    } catch (error) {
        console.error('Error initializing visualizer:', error);
        showError(`Error loading model: ${error.message}`);
    }
}

/**
 * Draw the neural network diagram
 */
function drawNetwork(layers) {
    if (!layers || layers.length === 0) {
        showError('No layers found in model');
        return;
    }

    // Calculate canvas dimensions
    const canvasHeight = layers.length * (CONFIG.LAYER_HEIGHT + CONFIG.LAYER_SPACING) + CONFIG.START_Y * 2;
    const canvasWidth = CONFIG.LAYER_WIDTH * 2 + CONFIG.START_X * 2;

    svg.attr('width', canvasWidth)
        .attr('height', canvasHeight);

    // Clear previous content
    svg.selectAll('*').remove();

    // Create group for zoom/pan
    const g = svg.append('g');

    // Draw connections first (so they appear behind blocks)
    drawConnections(g, layers);

    // Draw layer blocks
    drawLayers(g, layers);
}

/**
 * Draw connections between layers
 */
function drawConnections(g, layers) {
    const connections = g.append('g').attr('class', 'connections');

    for (let i = 0; i < layers.length - 1; i++) {
        const y1 = CONFIG.START_Y + i * (CONFIG.LAYER_HEIGHT + CONFIG.LAYER_SPACING) + CONFIG.LAYER_HEIGHT / 2;
        const y2 = CONFIG.START_Y + (i + 1) * (CONFIG.LAYER_HEIGHT + CONFIG.LAYER_SPACING) + CONFIG.LAYER_HEIGHT / 2;
        const x = CONFIG.START_X + CONFIG.LAYER_WIDTH / 2;

        connections.append('line')
            .attr('class', 'layer-connection')
            .attr('id', `connection-${i}`)
            .attr('x1', x)
            .attr('y1', y1)
            .attr('x2', x)
            .attr('y2', y2)
            .attr('stroke-dasharray', '5,5');
    }
}

/**
 * Draw individual layer blocks
 */
function drawLayers(g, layers) {
    const layersGroup = g.append('g').attr('class', 'layers');

    layers.forEach((layer, index) => {
        const y = CONFIG.START_Y + index * (CONFIG.LAYER_HEIGHT + CONFIG.LAYER_SPACING);
        const x = CONFIG.START_X;

        // Create layer group
        const layerGroup = layersGroup.append('g')
            .attr('class', 'layer-block')
            .attr('id', `layer-${index}`)
            .attr('transform', `translate(${x}, ${y})`)
            .style('cursor', 'pointer')
            .on('click', () => selectLayer(layer, index));

        // Get color based on layer type
        const color = getLayerColor(layer.type);

        // Draw rectangle with gradient
        layerGroup.append('rect')
            .attr('class', 'layer-rect')
            .attr('width', CONFIG.LAYER_WIDTH)
            .attr('height', CONFIG.LAYER_HEIGHT)
            .attr('rx', 12)
            .attr('ry', 12)
            .attr('fill', color)
            .attr('stroke', '#64b5f6')
            .attr('stroke-width', 2)
            .style('filter', 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.4))');

        // Layer name (bold, larger)
        layerGroup.append('text')
            .attr('class', 'layer-text')
            .attr('x', CONFIG.LAYER_WIDTH / 2)
            .attr('y', 24)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .attr('font-size', '14px')
            .attr('font-weight', 'bold')
            .text(truncateText(layer.name, 28));

        // Layer type
        layerGroup.append('text')
            .attr('class', 'layer-text')
            .attr('x', CONFIG.LAYER_WIDTH / 2)
            .attr('y', 44)
            .attr('text-anchor', 'middle')
            .attr('fill', '#e3f2fd')
            .attr('font-size', '11px')
            .attr('opacity', 0.9)
            .text(layer.type);

        // Shape info (small text at bottom)
        layerGroup.append('text')
            .attr('class', 'layer-text')
            .attr('x', CONFIG.LAYER_WIDTH / 2)
            .attr('y', 64)
            .attr('text-anchor', 'middle')
            .attr('fill', '#bbdefb')
            .attr('font-size', '9px')
            .attr('opacity', 0.7)
            .text(truncateText(layer.shape, 32));

        // Layer index badge
        layerGroup.append('circle')
            .attr('cx', 10)
            .attr('cy', 10)
            .attr('r', 8)
            .attr('fill', '#1976d2')
            .attr('stroke', 'white')
            .attr('stroke-width', 1);

        layerGroup.append('text')
            .attr('class', 'layer-text')
            .attr('x', 10)
            .attr('y', 14)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .attr('font-size', '9px')
            .attr('font-weight', 'bold')
            .text(index);

        // Animate on load
        layerGroup
            .style('opacity', 0)
            .transition()
            .duration(CONFIG.ANIMATION_DURATION)
            .delay(index * 30)
            .style('opacity', 1);
    });
}

/**
 * Get color based on layer type
 */
function getLayerColor(layerType) {
    const colorMap = {
        'InputLayer': 'rgba(76, 175, 80, 0.8)',
        'Conv2D': 'rgba(33, 150, 243, 0.8)',
        'BatchNormalization': 'rgba(156, 39, 176, 0.8)',
        'Activation': 'rgba(255, 152, 0, 0.8)',
        'MaxPooling2D': 'rgba(3, 169, 244, 0.8)',
        'GlobalAveragePooling2D': 'rgba(0, 150, 136, 0.8)',
        'Dense': 'rgba(233, 30, 99, 0.8)',
        'Dropout': 'rgba(121, 85, 72, 0.8)',
        'Flatten': 'rgba(96, 125, 139, 0.8)',
        'ZeroPadding2D': 'rgba(63, 81, 181, 0.8)',
        'Add': 'rgba(205, 220, 57, 0.8)',
        'Multiply': 'rgba(255, 193, 7, 0.8)'
    };

    return colorMap[layerType] || 'rgba(100, 181, 246, 0.8)';
}

/**
 * Select a layer and show its information
 */
function selectLayer(layer, index) {
    selectedLayer = layer;

    // Remove previous selection
    d3.selectAll('.layer-rect').classed('selected', false);
    d3.selectAll('.layer-connection').classed('active', false);

    // Highlight selected layer
    d3.select(`#layer-${index} .layer-rect`).classed('selected', true);

    // Animate connections
    if (index > 0) {
        d3.select(`#connection-${index - 1}`).classed('active', true);
    }
    if (index < modelData.layers.length - 1) {
        d3.select(`#connection-${index}`).classed('active', true);
    }

    // Update layer info panel
    updateLayerInfo(layer);

    // Enable activation button
    document.getElementById('get-activations-btn').disabled = false;
}

/**
 * Update layer information panel
 */
function updateLayerInfo(layer) {
    const infoDiv = document.getElementById('layer-info');

    infoDiv.innerHTML = `
        <div class="info-row">
            <span class="info-label">Name:</span>
            <span class="info-value">${layer.name}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Type:</span>
            <span class="info-value">${layer.type}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Output Shape:</span>
            <span class="info-value">${layer.shape}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Activation:</span>
            <span class="info-value">${layer.activation}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Parameters:</span>
            <span class="info-value">${layer.params.toLocaleString()}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Trainable:</span>
            <span class="info-value">${layer.trainable ? 'Yes' : 'No'}</span>
        </div>
    `;
}

/**
 * Update model information panel
 */
function updateModelInfo(data) {
    const infoDiv = document.getElementById('model-info');

    const totalParams = data.layers.reduce((sum, layer) => sum + layer.params, 0);
    const trainableLayers = data.layers.filter(l => l.trainable).length;

    infoDiv.innerHTML = `
        <div class="info-row">
            <span class="info-label">Model:</span>
            <span class="info-value">${data.model_name}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Total Layers:</span>
            <span class="info-value">${data.total_layers}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Trainable Layers:</span>
            <span class="info-value">${trainableLayers}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Total Parameters:</span>
            <span class="info-value">${totalParams.toLocaleString()}</span>
        </div>
    `;
}

/**
 * Get layer activations
 */
document.getElementById('get-activations-btn').addEventListener('click', async () => {
    if (!selectedLayer) return;

    const displayDiv = document.getElementById('activation-display');
    displayDiv.innerHTML = '<div class="loading">Computing activations...</div>';

    try {
        const response = await fetch(`${CONFIG.API_BASE}/model/activation/${encodeURIComponent(selectedLayer.name)}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || error.message || 'Failed to get activations');
        }

        const data = await response.json();

        // Display activation image
        displayDiv.innerHTML = `
            <p style="color: #90caf9; font-size: 12px; margin-bottom: 10px;">
                Shape: ${data.activation_shape}
            </p>
            <img src="data:image/png;base64,${data.image}" alt="Layer Activations">
        `;

    } catch (error) {
        console.error('Error getting activations:', error);
        displayDiv.innerHTML = `<div class="error">${error.message}</div>`;
    }
});

/**
 * Utility Functions
 */

function truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
}

function showLoading(message) {
    const modelInfo = document.getElementById('model-info');
    modelInfo.innerHTML = `<div class="loading">${message}</div>`;
}

function hideLoading() {
    // Loading is replaced by actual content
}

function showError(message) {
    const modelInfo = document.getElementById('model-info');
    modelInfo.innerHTML = `<div class="error">${message}</div>`;

    // Also show in canvas area
    svg.selectAll('*').remove();
    svg.append('text')
        .attr('x', 50)
        .attr('y', 100)
        .attr('fill', '#ef5350')
        .attr('font-size', '16px')
        .text(message);
}
