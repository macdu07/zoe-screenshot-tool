/**
 * Full Page Screenshot Tool - Client Application
 */

// Application State
const state = {
  url: '',
  device: 'desktop',
  width: 1920,
  height: 1080,
  scope: 'full', // 'full' or 'viewport'
  format: 'png',
  scale: 2,
  quality: 90,
  blockBanners: true,
  waitAnimations: true,
  colorScheme: 'no-preference',
  delay: 0,
  isMobile: false,

  // UI state
  isLoading: false,
  zoom: 1.0,
  autoFitPreview: false,
  currentScreenshot: null,
  history: []
};

// Device Presets
const DEVICE_PRESETS = {
  desktop: { width: 1920, height: 1080, isMobile: false },
  tablet: { width: 820, height: 1180, isMobile: true },
  mobile: { width: 393, height: 852, isMobile: true },
  custom: { width: 1920, height: 1080, isMobile: false }
};

// DOM Elements
const elements = {
  form: document.getElementById('screenshot-form'),
  urlInput: document.getElementById('url-input'),
  clearUrlBtn: document.getElementById('clear-url-btn'),
  deviceSelector: document.getElementById('device-selector'),
  widthInput: document.getElementById('width-input'),
  heightInput: document.getElementById('height-input'),
  heightGroup: document.getElementById('height-group'),
  scopeSelector: document.getElementById('scope-selector'),
  formatSelector: document.getElementById('format-selector'),
  scaleSelector: document.getElementById('scale-selector'),
  qualityContainer: document.getElementById('quality-container'),
  qualityInput: document.getElementById('quality-input'),
  qualityVal: document.getElementById('quality-val'),
  
  advancedToggle: document.getElementById('advanced-toggle'),
  advancedAccordion: document.querySelector('.advanced-accordion'),
  waitAnimationsInput: document.getElementById('wait-animations'),
  blockBannersInput: document.getElementById('block-banners'),
  themeSelector: document.getElementById('theme-selector'),
  delaySelect: document.getElementById('delay-select'),
  generateBtn: document.getElementById('generate-btn'),

  // Preview elements
  emptyState: document.getElementById('empty-state'),
  loadingState: document.getElementById('loading-state'),
  loadingStatusText: document.getElementById('loading-status-text'),
  loadingUrlText: document.getElementById('loading-url-text'),
  previewViewport: document.getElementById('preview-viewport'),
  screenshotContainer: document.getElementById('screenshot-container'),
  imageWrapper: document.getElementById('image-wrapper'),
  screenshotImg: document.getElementById('screenshot-img'),
  previewUrlDisplay: document.getElementById('preview-url-display'),
  browserActions: document.getElementById('browser-actions'),
  previewStats: document.getElementById('preview-stats'),

  // Stats
  statDimensions: document.getElementById('stat-dimensions'),
  statFormat: document.getElementById('stat-format'),
  statSize: document.getElementById('stat-size'),
  statDuration: document.getElementById('stat-duration'),

  // Zoom & Action buttons
  zoomOutBtn: document.getElementById('zoom-out-btn'),
  zoomInBtn: document.getElementById('zoom-in-btn'),
  zoomResetBtn: document.getElementById('zoom-reset-btn'),
  zoomLevelText: document.getElementById('zoom-level-text'),
  copyClipboardBtn: document.getElementById('copy-clipboard-btn'),
  downloadDropdownBtn: document.getElementById('download-dropdown-btn'),
  downloadMenu: document.getElementById('download-menu'),
  downloadNativeLink: document.getElementById('download-native-link'),
  openNewTabLink: document.getElementById('open-new-tab-link'),
  copyApiLinkBtn: document.getElementById('copy-api-link-btn'),
  currentFormatLabel: document.getElementById('current-format-label'),

  // History & Demos
  recentContainer: document.getElementById('recent-container'),
  clearHistoryBtn: document.getElementById('clear-history-btn'),
  toastContainer: document.getElementById('toast-container')
};

/**
 * Initialize Application
 */
function init() {
  bindEvents();
  loadHistory();
}

/**
 * Event Listeners
 */
function bindEvents() {
  // URL Input
  elements.urlInput.addEventListener('input', (e) => {
    state.url = e.target.value.trim();
    elements.clearUrlBtn.style.display = state.url ? 'flex' : 'none';
  });

  elements.clearUrlBtn.addEventListener('click', () => {
    elements.urlInput.value = '';
    state.url = '';
    elements.clearUrlBtn.style.display = 'none';
    elements.urlInput.focus();
  });

  // Quick Demo Pills
  document.querySelectorAll('.demo-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.url;
      elements.urlInput.value = url;
      state.url = url;
      elements.clearUrlBtn.style.display = 'flex';
      handleGenerate();
    });
  });

  // Device Presets
  elements.deviceSelector.addEventListener('click', (e) => {
    const btn = e.target.closest('.segment-btn');
    if (!btn) return;

    elements.deviceSelector.querySelectorAll('.segment-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    const device = btn.dataset.device;
    state.device = device;

    if (device !== 'custom') {
      const preset = DEVICE_PRESETS[device];
      elements.widthInput.value = preset.width;
      elements.heightInput.value = preset.height;
      state.width = preset.width;
      state.height = preset.height;
      state.isMobile = preset.isMobile;
    }
  });

  // Width & Height inputs
  elements.widthInput.addEventListener('input', (e) => {
    state.width = parseInt(e.target.value, 10) || 1920;
  });
  elements.heightInput.addEventListener('input', (e) => {
    state.height = parseInt(e.target.value, 10) || 1080;
  });

  // Capture Scope (Full vs Viewport)
  elements.scopeSelector.addEventListener('click', (e) => {
    const btn = e.target.closest('.segment-btn');
    if (!btn) return;

    elements.scopeSelector.querySelectorAll('.segment-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    state.scope = btn.dataset.scope;
  });

  // Format Selector
  elements.formatSelector.addEventListener('click', (e) => {
    const btn = e.target.closest('.segment-btn');
    if (!btn) return;

    elements.formatSelector.querySelectorAll('.segment-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    state.format = btn.dataset.format;
    elements.currentFormatLabel.textContent = state.format.toUpperCase();

    // Toggle quality slider
    if (state.format === 'jpg' || state.format === 'webp') {
      elements.qualityContainer.style.display = 'block';
    } else {
      elements.qualityContainer.style.display = 'none';
    }
  });

  // Resolution Scale Selector
  elements.scaleSelector.addEventListener('click', (e) => {
    const btn = e.target.closest('.segment-btn');
    if (!btn) return;

    elements.scaleSelector.querySelectorAll('.segment-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    state.scale = parseFloat(btn.dataset.scale);
  });

  // Quality Slider
  elements.qualityInput.addEventListener('input', (e) => {
    state.quality = parseInt(e.target.value, 10);
    elements.qualityVal.textContent = `${state.quality}%`;
  });

  // Advanced Options Accordion
  elements.advancedToggle.addEventListener('click', () => {
    elements.advancedAccordion.classList.toggle('open');
  });

  // Theme Selector
  elements.themeSelector.addEventListener('click', (e) => {
    const btn = e.target.closest('.theme-btn');
    if (!btn) return;

    elements.themeSelector.querySelectorAll('.theme-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    state.colorScheme = btn.dataset.theme;
  });

  // Delay & Checkboxes
  elements.delaySelect.addEventListener('change', (e) => {
    state.delay = parseInt(e.target.value, 10);
  });

  elements.waitAnimationsInput.addEventListener('change', (e) => {
    state.waitAnimations = e.target.checked;
  });

  elements.blockBannersInput.addEventListener('change', (e) => {
    state.blockBanners = e.target.checked;
  });

  // Form Submit
  elements.form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleGenerate();
  });

  // Zoom Controls
  elements.zoomInBtn.addEventListener('click', () => adjustZoom(0.15));
  elements.zoomOutBtn.addEventListener('click', () => adjustZoom(-0.15));
  elements.zoomResetBtn.addEventListener('click', resetPreviewZoom);

  window.addEventListener('resize', () => {
    if (state.autoFitPreview && state.currentScreenshot?.fullPage === false) fitViewportCapture();
  });

  // Copy to Clipboard
  elements.copyClipboardBtn.addEventListener('click', handleCopyToClipboard);

  // Download Dropdown
  elements.downloadDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.downloadDropdownBtn.parentElement.classList.toggle('open');
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-container').forEach((d) => d.classList.remove('open'));
  });

  // Copy Direct API URL
  elements.copyApiLinkBtn.addEventListener('click', () => {
    if (!state.currentScreenshot) return;
    const apiUrl = `${window.location.origin}/api/screenshot/direct?url=${encodeURIComponent(state.currentScreenshot.url)}&format=${state.format}&scale=${state.scale}&fullPage=${state.scope === 'full'}`;
    navigator.clipboard.writeText(apiUrl).then(() => {
      showToast('Direct API URL copied to clipboard!', 'success');
    });
  });

  // Clear History
  elements.clearHistoryBtn.addEventListener('click', async () => {
    try {
      await fetch('/api/history', { method: 'DELETE' });
    } catch (e) {
      console.warn('Could not reach backend to clear history:', e);
    }
    state.history = [];
    localStorage.removeItem('screenshot_history');
    renderHistory();
    showToast('Recent history cleared', 'success');
  });
}

/**
 * Handle Generate Screenshot Request
 */
async function handleGenerate() {
  let url = elements.urlInput.value.trim();
  if (!url) {
    showToast('Please enter a website URL', 'error');
    elements.urlInput.focus();
    return;
  }

  // Prepend https:// if protocol missing
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
    elements.urlInput.value = url;
  }
  state.url = url;

  setLoadingState(true, url);

  try {
    const payload = {
      url: state.url,
      width: state.width,
      height: state.height,
      format: state.format,
      quality: state.quality,
      fullPage: state.scope === 'full',
      scale: state.scale,
      delay: state.delay,
      blockBanners: state.blockBanners,
      waitAnimations: state.waitAnimations,
      colorScheme: state.colorScheme,
      isMobile: state.isMobile
    };

    // Simulate animated progress steps while server captures
    runStepTracker();

    const response = await fetch('/api/screenshot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to capture screenshot');
    }

    displayScreenshot(data.data);
    addToHistory(data.data);
    showToast('Screenshot generated successfully!', 'success');
  } catch (error) {
    console.error('Screenshot error:', error);
    showToast(error.message || 'Error capturing screenshot. Please check the URL.', 'error');
    if (!state.currentScreenshot) {
      setEmptyState();
    }
  } finally {
    setLoadingState(false);
  }
}

/**
 * Step Tracker Animation during loading
 */
function runStepTracker() {
  const steps = [
    { id: 'step-1', text: 'Navigating to website...' },
    { id: 'step-2', text: 'Scrolling & triggering lazy-load images...' },
    { id: 'step-3', text: 'Rendering high-resolution canvas...' },
    { id: 'step-4', text: 'Saving and formatting image...' }
  ];

  let current = 0;
  function nextStep() {
    if (!state.isLoading || current >= steps.length) return;
    
    // Update active step UI
    steps.forEach((s, idx) => {
      const el = document.getElementById(s.id);
      if (idx < current) {
        el.className = 'step completed';
      } else if (idx === current) {
        el.className = 'step active';
      } else {
        el.className = 'step';
      }
    });

    elements.loadingStatusText.textContent = steps[current].text;
    current++;
    if (current < steps.length) {
      setTimeout(nextStep, 1000);
    }
  }

  nextStep();
}

/**
 * Display Screenshot in Preview Viewport
 */
function displayScreenshot(data) {
  state.currentScreenshot = data;

  // Update browser bar
  elements.previewUrlDisplay.textContent = data.url;
  elements.browserActions.style.display = 'flex';

  // Set image source
  elements.screenshotImg.src = data.viewUrl;
  elements.screenshotImg.onload = () => {
    if (data.fullPage === false) {
      fitViewportCapture();
    } else {
      resetFullPagePreview();
    }
  };

  // Update stats
  elements.statDimensions.textContent = `${data.effectiveWidth} × ${data.effectiveHeight} px`;
  elements.statFormat.textContent = data.format.toUpperCase();
  elements.statSize.textContent = data.sizeFormatted;
  elements.statDuration.textContent = `${(data.durationMs / 1000).toFixed(2)}s`;
  elements.previewStats.style.display = 'flex';

  // Update download actions
  elements.downloadNativeLink.href = data.downloadUrl;
  elements.downloadNativeLink.setAttribute('download', data.filename);
  elements.openNewTabLink.href = data.viewUrl;
  elements.currentFormatLabel.textContent = data.format.toUpperCase();

  // Show container
  elements.emptyState.style.display = 'none';
  elements.loadingState.style.display = 'none';
  elements.screenshotContainer.style.display = 'flex';
}

/**
 * Set Zoom Level
 */
function setZoom(val) {
  state.autoFitPreview = false;
  state.zoom = Math.min(Math.max(val, 0.05), 2.0);

  if (state.currentScreenshot?.fullPage === false && elements.screenshotImg.naturalWidth) {
    elements.screenshotContainer.classList.add('viewport-capture');
    elements.imageWrapper.style.transform = 'none';
    elements.imageWrapper.style.width = `${Math.round(elements.screenshotImg.naturalWidth * state.zoom)}px`;
  } else {
    elements.imageWrapper.style.transform = `scale(${state.zoom})`;
  }

  elements.zoomLevelText.textContent = `${Math.round(state.zoom * 100)}%`;
}

function adjustZoom(delta) {
  setZoom(state.zoom + delta);
}

function fitViewportCapture() {
  const image = elements.screenshotImg;
  const viewport = elements.previewViewport;
  if (!image.naturalWidth || !image.naturalHeight) return;

  const styles = getComputedStyle(viewport);
  const availableWidth = viewport.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
  const availableHeight = viewport.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom);
  const fitScale = Math.min(availableWidth / image.naturalWidth, availableHeight / image.naturalHeight, 1);

  state.autoFitPreview = true;
  state.zoom = fitScale;
  elements.screenshotContainer.classList.add('viewport-capture');
  elements.imageWrapper.style.transform = 'none';
  elements.imageWrapper.style.width = `${Math.max(1, Math.floor(image.naturalWidth * fitScale))}px`;
  elements.zoomLevelText.textContent = `${Math.round(fitScale * 100)}%`;
  viewport.scrollTo({ top: 0, left: 0 });
}

function resetFullPagePreview() {
  state.autoFitPreview = false;
  elements.screenshotContainer.classList.remove('viewport-capture');
  elements.imageWrapper.style.width = '';
  setZoom(1.0);
}

function resetPreviewZoom() {
  if (state.currentScreenshot?.fullPage === false) {
    fitViewportCapture();
  } else {
    resetFullPagePreview();
  }
}

/**
 * Copy Image to Clipboard
 */
async function handleCopyToClipboard() {
  if (!state.currentScreenshot) return;

  try {
    showToast('Copying image to clipboard...', 'success');
    const response = await fetch(state.currentScreenshot.viewUrl);
    const blob = await response.blob();

    // Convert to PNG blob if needed (Clipboard API natively requires image/png)
    let pngBlob = blob;
    if (blob.type !== 'image/png') {
      const img = new Image();
      const imgLoaded = new Promise((resolve) => { img.onload = resolve; });
      img.src = URL.createObjectURL(blob);
      await imgLoaded;

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    }

    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': pngBlob })
    ]);

    showToast('Copied screenshot to clipboard!', 'success');
  } catch (err) {
    console.error('Clipboard copy failed:', err);
    showToast('Could not copy image directly. You can use Download.', 'error');
  }
}

/**
 * Loading & Empty state toggles
 */
function setLoadingState(isLoading, url = '') {
  state.isLoading = isLoading;
  elements.generateBtn.disabled = isLoading;
  elements.generateBtn.querySelector('.btn-text').textContent = isLoading ? 'Capturing...' : 'Generate Screenshot';
  elements.generateBtn.querySelector('.btn-icon').style.display = isLoading ? 'none' : 'inline-block';
  elements.generateBtn.querySelector('.btn-spinner').style.display = isLoading ? 'inline-block' : 'none';

  if (isLoading) {
    elements.emptyState.style.display = 'none';
    elements.screenshotContainer.style.display = 'none';
    elements.loadingState.style.display = 'flex';
    elements.loadingUrlText.textContent = url;
    elements.loadingStatusText.textContent = 'Navigating to website...';
  } else {
    elements.loadingState.style.display = 'none';
  }
}

function setEmptyState() {
  elements.emptyState.style.display = 'flex';
  elements.loadingState.style.display = 'none';
  elements.screenshotContainer.style.display = 'none';
  elements.browserActions.style.display = 'none';
  elements.previewStats.style.display = 'none';
}

/**
 * Toast Notifications
 */
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="ph-bold ${type === 'success' ? 'ph-check-circle' : 'ph-warning-circle'}"></i>
    <span>${message}</span>
  `;

  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/**
 * History Management
 */
function loadHistory() {
  const saved = localStorage.getItem('screenshot_history');
  if (saved) {
    try {
      state.history = JSON.parse(saved);
      renderHistory();
    } catch {
      state.history = [];
    }
  }

  // Also fetch from server
  fetch('/api/history')
    .then((res) => res.json())
    .then((data) => {
      if (data.success && data.data && data.data.length > 0) {
        state.history = data.data;
        renderHistory();
      }
    })
    .catch(() => {});
}

function addToHistory(item) {
  // Prevent duplicates
  state.history = [item, ...state.history.filter((h) => h.id !== item.id)].slice(0, 15);
  localStorage.setItem('screenshot_history', JSON.stringify(state.history));
  renderHistory();
}

function renderHistory() {
  if (!state.history.length) {
    elements.recentContainer.innerHTML = '<div class="recent-empty">No captures yet. Generate your first one above!</div>';
    return;
  }

  elements.recentContainer.innerHTML = state.history.map((item) => `
    <div class="recent-card" data-id="${item.id}">
      <img src="${item.viewUrl}" alt="${item.url}" class="recent-thumb" />
      <div class="recent-info">
        <div class="recent-url">${item.url.replace(/^https?:\/\/(www\.)?/, '')}</div>
        <div class="recent-meta">
          <span>${item.format.toUpperCase()}</span>
          <span>•</span>
          <span>${item.effectiveWidth}x${item.effectiveHeight}</span>
          <span>•</span>
          <span>${item.sizeFormatted}</span>
        </div>
      </div>
      <button type="button" class="recent-del-btn" data-del-id="${item.id}" title="Remove">
        <i class="ph-bold ph-trash"></i>
      </button>
    </div>
  `).join('');

  // Click handler to load recent
  elements.recentContainer.querySelectorAll('.recent-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.recent-del-btn')) return;
      const id = card.dataset.id;
      const found = state.history.find((h) => h.id === id);
      if (found) {
        elements.urlInput.value = found.url;
        state.url = found.url;
        elements.clearUrlBtn.style.display = 'flex';
        displayScreenshot(found);
      }
    });
  });

  // Delete button handler
  elements.recentContainer.querySelectorAll('.recent-del-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.delId;
      deleteHistoryItem(id);
    });
  });
}

function deleteHistoryItem(id) {
  state.history = state.history.filter((h) => h.id !== id);
  localStorage.setItem('screenshot_history', JSON.stringify(state.history));
  renderHistory();
  fetch(`/api/history/${id}`, { method: 'DELETE' }).catch(() => {});
}

// Start application
document.addEventListener('DOMContentLoaded', init);
