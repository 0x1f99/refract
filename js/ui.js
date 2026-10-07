'use strict';

const UI = {
  els: {},
  debounceTimer: null,
  copyFeedbackTimers: {},
  notificationTimer: null,

  init() {
    this.cacheElements();
    this.applyTheme(RefractState.theme);
    this.renderSidebar();
    this.renderPipeline();
    this.bindGlobalEvents();
    this.updateStats();
    this.showWelcome();
    this.updateWordWrap();
  },

  cacheElements() {
    const $ = (id) => document.getElementById(id);
    this.els = {
      app: $('app'),
      inputEditor: $('input-editor'),
      outputEditor: $('output-editor'),
      inputStats: $('input-stats'),
      outputStats: $('output-stats'),
      inputFooter: $('input-footer'),
      outputFooter: $('output-footer'),
      pipelineSteps: $('pipeline-steps'),
      pipelineEmpty: $('pipeline-empty'),
      errorDisplay: $('error-display'),
      errorMessage: $('error-message'),
      errorRecovery: $('error-recovery'),
      statusPipeline: $('status-pipeline'),
      statusTime: $('status-time'),
      statusPrivacy: $('status-privacy'),
      opConfigPanel: $('op-config-panel'),
      opConfigInner: $('op-config-inner'),
      sidebarContent: $('sidebar-content'),
      searchInput: $('sidebar-search-input'),
      paletteOverlay: $('palette-overlay'),
      paletteInput: $('palette-input'),
      paletteResults: $('palette-results'),
      sidebar: $('sidebar'),
      sidebarBackdrop: $('sidebar-backdrop'),
      notification: $('notification'),
      processingIndicator: $('processing-indicator'),
    };
  },

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    RefractState.setTheme(theme);
    const btn = document.getElementById('theme-btn');
    if (btn) btn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  },

  toggleTheme() {
    this.applyTheme(RefractState.theme === 'dark' ? 'light' : 'dark');
  },

  showWelcome() {
    if (!this.els.inputEditor.value && RefractState.pipeline.length === 0) {
      this.showOutputEmpty();
    }
  },

  showOutputEmpty() {
    this.els.outputEditor.value = '';
  },

  loadExample(exampleId) {
    const examples = {
      'hex-escape': {
        input: 'Hello World',
        ops: [
          {
            opId: 'hex-escape-encode',
            options: { mode: 'utf8-bytes', case: 'lower', scope: 'all' },
          },
        ],
      },
      base64: {
        input: 'Hello, World!',
        ops: [
          {
            opId: 'base64-encode',
            options: { alphabet: 'standard', padding: 'yes', linebreak: 'none' },
          },
        ],
      },
      'base64-decode': {
        input: 'SGVsbG8sIFdvcmxkIQ==',
        ops: [{ opId: 'base64-decode', options: { alphabet: 'auto', encoding: 'utf8' } }],
      },
      'url-decode': {
        input: 'https://example.com/search?q=hello%20world&lang=en',
        ops: [{ opId: 'url-decode', options: {} }],
      },
      'unicode-decode': {
        input: '\\u0048\\u0065\\u006c\\u006c\\u006f\\u0020\\u1F600',
        ops: [{ opId: 'unicode-escape-decode', options: {} }],
      },
      'json-format': {
        input: '{"name":"Alice","age":30,"hobbies":["reading","coding"],"active":true}',
        ops: [{ opId: 'json-format', options: { indent: '2', sort: 'no' } }],
      },
      hex: {
        input: 'Hello',
        ops: [
          { opId: 'hex-encode', options: { separator: 'space', case: 'lower', prefix: 'none' } },
        ],
      },
      sha256: {
        input: 'The quick brown fox jumps over the lazy dog',
        ops: [{ opId: 'sha256', options: { encoding: 'hex' } }],
      },
      binary: {
        input: 'Hi!',
        ops: [{ opId: 'binary-encode', options: { separator: 'space', padding: 'yes' } }],
      },
      'html-encode': {
        input: '<script>alert("Hello & <World>")</script>',
        ops: [{ opId: 'html-encode', options: { mode: 'essential', quotes: 'both' } }],
      },
    };

    const ex = examples[exampleId];
    if (!ex) return;

    RefractState.clearPipeline();
    this.els.inputEditor.value = ex.input;
    this.updateInputStats(ex.input);

    ex.ops.forEach(({ opId, options }) => {
      RefractState.addPipelineStep(opId, options);
    });

    this.renderPipeline();
    this.triggerProcessing(true);

    if (ex.ops.length > 0) {
      this.showConfigForStep(RefractState.pipeline[0]);
    }
    this.closeSidebar();
  },

  renderSidebar(query) {
    const content = this.els.sidebarContent;
    const activeTab = document.querySelector('.sidebar-tab.active');
    const tabId = activeTab ? activeTab.dataset.tab : 'all';

    if (tabId === 'favorites') {
      this.renderFavorites(content, query);
    } else if (tabId === 'recent') {
      this.renderRecent(content, query);
    } else {
      this.renderAllOps(content, query);
    }
  },

  renderAllOps(container, query) {
    const ops = query ? RefractOps.search(query) : RefractOps.all;
    container.innerHTML = '';

    if (ops.length === 0) {
      container.innerHTML = `<div class="empty-state" style="padding: var(--space-9) var(--space-5);">
        <div class="empty-state-title">No operations found</div>
        <div class="empty-state-desc">Try a different search term</div>
      </div>`;
      return;
    }

    if (query) {
      const group = this.createOpGroup(null, ops, query);
      container.appendChild(group);
      return;
    }

    const byCategory = {};
    ops.forEach((op) => {
      if (!byCategory[op.category]) byCategory[op.category] = [];
      byCategory[op.category].push(op);
    });

    Object.entries(byCategory).forEach(([cat, catOps]) => {
      const group = this.createOpGroup(cat, catOps, query);
      container.appendChild(group);
    });
  },

  createOpGroup(categoryName, ops, query) {
    const group = document.createElement('div');
    group.className = 'op-category';

    if (categoryName) {
      const header = document.createElement('div');
      header.className = 'op-category-header';
      header.innerHTML = `<span>${categoryName}</span><span class="op-category-chevron">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </span>`;
      header.addEventListener('click', () => group.classList.toggle('collapsed'));
      group.appendChild(header);
    }

    const items = document.createElement('div');
    items.className = 'op-category-items';

    ops.forEach((op) => {
      const item = document.createElement('div');
      item.className = 'op-item';
      item.dataset.opId = op.id;

      const isFav = RefractState.favorites.has(op.id);
      const dirClass =
        op.direction === 'encode' ? 'encode' : op.direction === 'decode' ? 'decode' : 'transform';
      const dirLabel = op.direction === 'encode' ? 'enc' : op.direction === 'decode' ? 'dec' : 'tx';

      item.innerHTML = `
        <div class="op-item-icon">${escapeHtml(op.icon || op.name.slice(0, 2))}</div>
        <span class="op-item-name">${query ? highlightMatch(escapeHtml(op.name), query) : escapeHtml(op.name)}</span>
        <span class="op-item-dir chip ${dirClass}">${dirLabel}</span>
        <button class="op-item-fav ${isFav ? 'active' : ''}" data-fav-id="${op.id}" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}" aria-label="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M6 1L7.5 4.5L11 5L8.5 7.5L9 11L6 9.5L3 11L3.5 7.5L1 5L4.5 4.5L6 1Z"/></svg>
        </button>
      `;

      item.addEventListener('click', (e) => {
        if (e.target.closest('.op-item-fav')) {
          e.stopPropagation();
          this.toggleFavorite(op.id, e.currentTarget);
          return;
        }
        this.addOpToPipeline(op.id);
      });

      items.appendChild(item);
    });

    group.appendChild(items);
    return group;
  },

  renderFavorites(container, query) {
    container.innerHTML = '';
    const favOps = RefractOps.all.filter((op) => RefractState.favorites.has(op.id));
    if (favOps.length === 0) {
      container.innerHTML = `<div class="empty-state" style="padding: var(--space-9) var(--space-5);">
        <div class="empty-state-title">No favorites yet</div>
        <div class="empty-state-desc">Click the star on any operation to add it here</div>
      </div>`;
      return;
    }
    const filtered = query
      ? favOps.filter((op) => RefractOps.search(query).some((o) => o.id === op.id))
      : favOps;
    const group = this.createOpGroup(null, filtered, query);
    container.appendChild(group);
  },

  renderRecent(container, query) {
    container.innerHTML = '';
    const recentOps = RefractState.recentOps.map((id) => RefractOps.get(id)).filter(Boolean);
    if (recentOps.length === 0) {
      container.innerHTML = `<div class="empty-state" style="padding: var(--space-9) var(--space-5);">
        <div class="empty-state-title">No recent operations</div>
        <div class="empty-state-desc">Operations you use will appear here</div>
      </div>`;
      return;
    }
    const group = this.createOpGroup(null, recentOps, query);
    container.appendChild(group);
  },

  toggleFavorite(opId, btn) {
    RefractState.toggleFavorite(opId);
    const isNowFav = RefractState.favorites.has(opId);
    document.querySelectorAll(`.op-item-fav[data-fav-id="${opId}"]`).forEach((el) => {
      el.classList.toggle('active', isNowFav);
      el.title = isNowFav ? 'Remove from favorites' : 'Add to favorites';
    });
    const activeTab = document.querySelector('.sidebar-tab.active');
    if (activeTab && activeTab.dataset.tab === 'favorites') {
      this.renderSidebar();
    }
  },

  addOpToPipeline(opId) {
    const step = RefractState.addPipelineStep(opId);
    if (!step) return;
    this.renderPipeline();
    this.triggerProcessing();
    this.showConfigForStep(step);
    this.showNotification(`${RefractOps.get(opId).name} added to pipeline`, 'success');
  },

  renderPipeline() {
    const container = this.els.pipelineSteps;
    const empty = this.els.pipelineEmpty;
    container.innerHTML = '';

    if (RefractState.pipeline.length === 0) {
      empty.style.display = '';
      this.els.statusPipeline.textContent = 'No pipeline';
      this.hideConfigPanel();
      return;
    }

    empty.style.display = 'none';
    this.els.statusPipeline.textContent = `${RefractState.pipeline.length} step${RefractState.pipeline.length !== 1 ? 's' : ''}`;

    RefractState.pipeline.forEach((step, i) => {
      const op = RefractOps.get(step.opId);
      if (!op) return;

      if (i > 0) {
        const arrow = document.createElement('span');
        arrow.className = 'pipeline-arrow';
        arrow.textContent = '→';
        arrow.setAttribute('aria-hidden', 'true');
        container.appendChild(arrow);
      }

      const stepEl = document.createElement('div');
      stepEl.className = 'pipeline-step';
      stepEl.dataset.stepId = step.id;
      stepEl.dataset.stepIndex = i;
      if (RefractState.activeStepIndex === i) stepEl.classList.add('active');

      const dirLabel = op.direction === 'encode' ? 'enc' : op.direction === 'decode' ? 'dec' : '';

      stepEl.innerHTML = `
        <span class="pipeline-step-name">${escapeHtml(op.name)}</span>
        ${dirLabel ? `<span class="pipeline-step-dir">${dirLabel}</span>` : ''}
        <button class="pipeline-step-remove" data-step-id="${step.id}" title="Remove step" aria-label="Remove ${escapeHtml(op.name)} from pipeline">
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 2L8 8M8 2L2 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
      `;

      stepEl.addEventListener('click', (e) => {
        if (e.target.closest('.pipeline-step-remove')) {
          e.stopPropagation();
          this.removeStep(step.id);
          return;
        }
        this.selectStep(i);
      });

      container.appendChild(stepEl);
    });
  },

  selectStep(index) {
    RefractState.activeStepIndex = index;
    document.querySelectorAll('.pipeline-step').forEach((el, i) => {
      el.classList.toggle('active', i === index);
    });
    const step = RefractState.pipeline[index];
    if (step) this.showConfigForStep(step);
  },

  removeStep(stepId) {
    RefractState.removePipelineStep(stepId);
    this.renderPipeline();
    this.triggerProcessing();
    if (RefractState.pipeline.length === 0) this.hideConfigPanel();
  },

  showConfigForStep(step) {
    const op = RefractOps.get(step.opId);
    if (!op) return;

    const panel = this.els.opConfigPanel;
    const inner = this.els.opConfigInner;

    if (!op.options || op.options.length === 0) {
      this.showSimpleConfig(op, step, inner);
    } else {
      this.showFullConfig(op, step, inner);
    }

    panel.style.display = '';
  },

  showSimpleConfig(op, step, container) {
    const dirLabel =
      op.direction === 'encode' ? 'Encoding' : op.direction === 'decode' ? 'Decoding' : 'Transform';
    container.innerHTML = `
      <div class="op-config-title">
        <span>${escapeHtml(op.name)}</span>
        <span class="chip ${op.direction}">${dirLabel}</span>
      </div>
      <div class="op-config-grid">
        <div class="op-config-description">${escapeHtml(op.description)}</div>
      </div>
    `;
  },

  showFullConfig(op, step, container) {
    const dirLabel =
      op.direction === 'encode' ? 'Encoding' : op.direction === 'decode' ? 'Decoding' : 'Transform';

    let optionsHtml = op.options
      .map((opt) => {
        if (opt.type === 'select') {
          return `<div class="op-config-field">
          <label class="op-config-label" for="opt-${escapeHtml(opt.id)}">${escapeHtml(opt.label)}</label>
          <select class="op-config-select" id="opt-${escapeHtml(opt.id)}" data-opt-id="${escapeHtml(opt.id)}" data-step-id="${step.id}">
            ${opt.choices.map((ch) => `<option value="${escapeHtml(ch.value)}" ${step.options[opt.id] === ch.value ? 'selected' : ''}>${escapeHtml(ch.label)}</option>`).join('')}
          </select>
        </div>`;
        } else if (opt.type === 'text') {
          return `<div class="op-config-field">
          <label class="op-config-label" for="opt-${escapeHtml(opt.id)}">${escapeHtml(opt.label)}</label>
          <input class="op-config-input" type="text" id="opt-${escapeHtml(opt.id)}"
            data-opt-id="${escapeHtml(opt.id)}" data-step-id="${step.id}"
            value="${escapeHtml(step.options[opt.id] !== undefined ? step.options[opt.id] : opt.default || '')}">
        </div>`;
        }
        return '';
      })
      .join('');

    const noteHtml =
      op.help && op.help.notes
        ? `
      <div class="op-config-description op-help-note">${escapeHtml(op.help.notes)}</div>
    `
        : `<div class="op-config-description">${escapeHtml(op.description)}</div>`;

    container.innerHTML = `
      <div class="op-config-title">
        <span>${escapeHtml(op.name)}</span>
        <span class="chip ${op.direction}">${dirLabel}</span>
      </div>
      <div class="op-config-grid">
        ${optionsHtml}
        ${noteHtml}
      </div>
    `;

    container.querySelectorAll('.op-config-select, .op-config-input').forEach((el) => {
      el.addEventListener('change', () => this.updateStepOption(el));
      if (el.tagName === 'INPUT') el.addEventListener('input', () => this.updateStepOption(el));
    });
  },

  updateStepOption(el) {
    const stepId = parseFloat(el.dataset.stepId);
    const optId = el.dataset.optId;
    const step = RefractState.pipeline.find((s) => s.id === stepId);
    if (!step) return;
    step.options[optId] = el.value;
    this.triggerProcessing();
  },

  hideConfigPanel() {
    this.els.opConfigPanel.style.display = 'none';
  },

  triggerProcessing(immediate) {
    if (!RefractState.liveProcessing && !immediate) return;
    clearTimeout(this.debounceTimer);
    const delay = this.els.inputEditor.value.length > 10000 ? 400 : 150;
    this.debounceTimer = setTimeout(() => this.runPipeline(), immediate ? 0 : delay);
  },

  async runPipeline() {
    const input = this.els.inputEditor.value;
    const steps = RefractState.pipeline.filter((s) => s.enabled);

    if (steps.length === 0) {
      this.els.outputEditor.value = input;
      this.clearError();
      this.updateOutputStats(input);
      this.els.statusTime.textContent = '';
      return;
    }

    this.showProcessing(true);

    try {
      const result = await RefractPipeline.process(input, steps);

      if (result.error) {
        this.showError(result.error);
        this.els.outputEditor.value = '';
        this.markStepError(result.error.stepIndex);
      } else {
        this.clearError();
        this.els.outputEditor.value = result.output;
        this.clearStepErrors();
      }

      this.updateOutputStats(result.error ? '' : result.output);
      this.els.statusTime.textContent =
        result.time < 1 ? `< 1 ms` : `${Math.round(result.time)} ms`;
    } catch (e) {
      this.showError({ message: e.message || 'Unexpected processing error' });
      this.els.outputEditor.value = '';
    } finally {
      this.showProcessing(false);
    }
  },

  showProcessing(active) {
    RefractState.processing = active;
    const ind = this.els.processingIndicator;
    if (ind) ind.style.display = active ? '' : 'none';
  },

  showError(error) {
    const display = this.els.errorDisplay;
    const msg = this.els.errorMessage;
    const rec = this.els.errorRecovery;

    display.classList.remove('hidden');

    const opName = error.opName ? `${error.opName}: ` : '';
    msg.textContent = opName + (error.message || 'Processing failed');

    if (error.inputSnippet) {
      rec.textContent = `Input causing error: "${error.inputSnippet}"`;
      rec.style.display = '';
    } else {
      rec.style.display = 'none';
    }
  },

  clearError() {
    this.els.errorDisplay.classList.add('hidden');
  },

  markStepError(stepIndex) {
    const steps = document.querySelectorAll('.pipeline-step');
    steps.forEach((el, i) => el.classList.toggle('error', i === stepIndex));
  },

  clearStepErrors() {
    document.querySelectorAll('.pipeline-step.error').forEach((el) => el.classList.remove('error'));
  },

  updateStats() {
    this.updateInputStats(this.els.inputEditor.value);
    this.updateOutputStats(this.els.outputEditor.value);
  },

  updateInputStats(value) {
    const chars = Array.from(value).length;
    const lines = value ? value.split('\n').length : 0;
    const bytes = new TextEncoder().encode(value).length;
    this.els.inputStats.textContent = `${chars.toLocaleString()} chars, ${bytes.toLocaleString()} bytes, ${lines.toLocaleString()} line${lines !== 1 ? 's' : ''}`;
    this.els.inputFooter.textContent = `${bytes.toLocaleString()} bytes`;
  },

  updateOutputStats(value) {
    const chars = Array.from(value).length;
    const lines = value ? value.split('\n').length : 0;
    const bytes = new TextEncoder().encode(value).length;
    this.els.outputStats.textContent = `${chars.toLocaleString()} chars, ${bytes.toLocaleString()} bytes, ${lines.toLocaleString()} line${lines !== 1 ? 's' : ''}`;
    this.els.outputFooter.textContent = `${bytes.toLocaleString()} bytes`;
  },

  updateWordWrap() {
    const ww = RefractState.wordWrap;
    this.els.inputEditor.className = 'panel-editor ' + (ww ? 'word-wrap' : 'no-word-wrap');
    this.els.outputEditor.className = 'panel-editor ' + (ww ? 'word-wrap' : 'no-word-wrap');
  },

  bindGlobalEvents() {
    this.els.inputEditor.addEventListener('input', () => {
      this.updateInputStats(this.els.inputEditor.value);
      this.triggerProcessing();
    });

    this.els.searchInput.addEventListener('input', (e) => {
      this.renderSidebar(e.target.value.trim());
    });

    document.querySelectorAll('.sidebar-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.sidebar-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        this.renderSidebar(this.els.searchInput.value.trim());
      });
    });

    document.getElementById('theme-btn')?.addEventListener('click', () => this.toggleTheme());
    document.getElementById('clear-all-btn')?.addEventListener('click', () => this.clearAll());
    document.getElementById('swap-btn')?.addEventListener('click', () => this.swapInputOutput());
    document.getElementById('copy-output-btn')?.addEventListener('click', () => this.copyOutput());
    document.getElementById('copy-input-btn')?.addEventListener('click', () => this.copyInput());
    document.getElementById('clear-input-btn')?.addEventListener('click', () => this.clearInput());
    document
      .getElementById('download-output-btn')
      ?.addEventListener('click', () => this.downloadOutput());
    document
      .getElementById('paste-btn')
      ?.addEventListener('click', () => this.pasteFromClipboard());

    document
      .getElementById('pipeline-clear-btn')
      ?.addEventListener('click', () => this.clearPipelineAction());
    document
      .getElementById('pipeline-save-btn')
      ?.addEventListener('click', () => this.showSaveRecipeDialog());

    document
      .getElementById('header-search-btn')
      ?.addEventListener('click', () => this.openPalette());
    document
      .getElementById('open-palette-btn')
      ?.addEventListener('click', () => this.openPalette());
    document
      .getElementById('palette-open-btn')
      ?.addEventListener('click', () => this.openPalette());

    document.getElementById('shortcuts-btn')?.addEventListener('click', () => this.showShortcuts());
    document.getElementById('settings-btn')?.addEventListener('click', () => this.showSettings());
    document.getElementById('recipes-btn')?.addEventListener('click', () => this.showRecipes());

    document.getElementById('menu-btn')?.addEventListener('click', () => this.toggleSidebar());
    this.els.sidebarBackdrop?.addEventListener('click', () => this.closeSidebar());

    document.getElementById('wordwrap-btn')?.addEventListener('click', () => {
      RefractState.setWordWrap(!RefractState.wordWrap);
      this.updateWordWrap();
    });

    document.getElementById('load-file-btn')?.addEventListener('click', () => this.loadFile());
    document
      .getElementById('input-file-input')
      ?.addEventListener('change', (e) => this.handleFileSelect(e));

    this.setupDragDrop();

    this.els.paletteOverlay?.addEventListener('click', (e) => {
      if (e.target === this.els.paletteOverlay) this.closePalette();
    });

    this.els.paletteInput?.addEventListener('input', () => this.updatePalette());
    this.els.paletteInput?.addEventListener('keydown', (e) => this.handlePaletteKeydown(e));

    document.addEventListener('keydown', (e) => this.handleGlobalKeydown(e));

    document.querySelectorAll('.example-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.loadExample(btn.dataset.example));
    });

    document.querySelectorAll('.modal-overlay').forEach((overlay) => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.add('hidden');
      });
    });

    document.querySelectorAll('.modal-close').forEach((btn) => {
      btn.addEventListener('click', () => btn.closest('.modal-overlay').classList.add('hidden'));
    });
  },

  setupDragDrop() {
    const inputWrap = document.getElementById('input-drop-zone');
    if (!inputWrap) return;

    ['dragenter', 'dragover'].forEach((ev) => {
      inputWrap.addEventListener(ev, (e) => {
        e.preventDefault();
        document.getElementById('input-drag-overlay')?.classList.add('visible');
      });
    });

    ['dragleave', 'drop'].forEach((ev) => {
      inputWrap.addEventListener(ev, () => {
        document.getElementById('input-drag-overlay')?.classList.remove('visible');
      });
    });

    inputWrap.addEventListener('drop', (e) => {
      e.preventDefault();
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) this.readFileIntoInput(files[0]);
    });
  },

  loadFile() {
    document.getElementById('input-file-input')?.click();
  },

  handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) this.readFileIntoInput(file);
    e.target.value = '';
  },

  readFileIntoInput(file) {
    if (file.size > 5 * 1024 * 1024) {
      this.showNotification('File is larger than 5 MB. Large files may process slowly.', 'error');
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      this.els.inputEditor.value = ev.target.result;
      this.updateInputStats(this.els.inputEditor.value);
      this.triggerProcessing();
      this.showNotification(`Loaded: ${file.name}`, 'success');
    };
    reader.onerror = () => this.showNotification('Failed to read file.', 'error');
    reader.readAsText(file, 'UTF-8');
  },

  clearAll() {
    this.els.inputEditor.value = '';
    this.els.outputEditor.value = '';
    RefractState.clearPipeline();
    this.renderPipeline();
    this.hideConfigPanel();
    this.clearError();
    this.updateStats();
  },

  clearInput() {
    this.els.inputEditor.value = '';
    this.updateInputStats('');
    this.triggerProcessing();
    this.els.inputEditor.focus();
  },

  swapInputOutput() {
    const outVal = this.els.outputEditor.value;
    if (!outVal.trim()) return;
    this.els.inputEditor.value = outVal;
    this.updateInputStats(outVal);
    this.triggerProcessing(true);
    this.showNotification('Output moved to input', 'success');
  },

  async copyOutput() {
    const val = this.els.outputEditor.value;
    if (!val) return;
    await this.copyToClipboard(val, 'copy-output-btn');
  },

  async copyInput() {
    const val = this.els.inputEditor.value;
    if (!val) return;
    await this.copyToClipboard(val, 'copy-input-btn');
  },

  async copyToClipboard(text, btnId) {
    try {
      await navigator.clipboard.writeText(text);
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.classList.add('copied');
        clearTimeout(this.copyFeedbackTimers[btnId]);
        this.copyFeedbackTimers[btnId] = setTimeout(() => btn.classList.remove('copied'), 1200);
      }
      this.showNotification('Copied to clipboard', 'success');
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.showNotification('Copied to clipboard', 'success');
    }
  },

  async pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      this.els.inputEditor.value = text;
      this.updateInputStats(text);
      this.triggerProcessing();
    } catch (e) {
      this.showNotification('Cannot access clipboard. Paste manually with Ctrl+V.', 'error');
    }
  },

  downloadOutput() {
    const val = this.els.outputEditor.value;
    if (!val) return;
    const blob = new Blob([val], { type: 'text/plain; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'refract-output.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  clearPipelineAction() {
    RefractState.clearPipeline();
    this.renderPipeline();
    this.hideConfigPanel();
    this.runPipeline();
  },

  showSaveRecipeDialog() {
    if (RefractState.pipeline.length === 0) {
      this.showNotification('Add operations to the pipeline first', 'error');
      return;
    }
    const name = prompt('Recipe name:', 'My Recipe');
    if (!name) return;
    const recipe = RefractState.saveRecipe(name.trim());
    this.showNotification(`Recipe "${recipe.name}" saved`, 'success');
  },

  toggleSidebar() {
    const sidebar = this.els.sidebar;
    const backdrop = this.els.sidebarBackdrop;
    sidebar.classList.toggle('open');
    backdrop.classList.toggle('visible');
  },

  closeSidebar() {
    this.els.sidebar.classList.remove('open');
    this.els.sidebarBackdrop.classList.remove('visible');
  },

  openPalette() {
    this.els.paletteOverlay.classList.remove('hidden');
    this.els.paletteInput.value = '';
    this.updatePalette();
    setTimeout(() => this.els.paletteInput.focus(), 50);
  },

  closePalette() {
    this.els.paletteOverlay.classList.add('hidden');
  },

  paletteHighlightIndex: -1,

  updatePalette() {
    const q = this.els.paletteInput.value.trim();
    const results = this.els.paletteResults;
    this.paletteHighlightIndex = -1;

    if (!q) {
      results.innerHTML =
        this.renderPaletteQuickActions() +
        this.renderPaletteOps(RefractOps.all.slice(0, 20), 'Operations');
      return;
    }

    const matchedOps = RefractOps.search(q);
    const commands = this.getPaletteCommands().filter(
      (cmd) =>
        cmd.name.toLowerCase().includes(q.toLowerCase()) ||
        (cmd.keywords || []).some((k) => k.includes(q.toLowerCase())),
    );

    let html = '';
    if (commands.length > 0) html += this.renderPaletteCommands(commands);
    if (matchedOps.length > 0)
      html += this.renderPaletteOps(
        matchedOps.slice(0, 30),
        matchedOps.length > 30
          ? `Operations (${matchedOps.length} found, showing 30)`
          : 'Operations',
      );
    if (!html) html = `<div class="palette-empty">No results for "${escapeHtml(q)}"</div>`;
    results.innerHTML = html;

    results.querySelectorAll('.palette-item').forEach((item) => {
      item.addEventListener('click', () => this.executePaletteItem(item));
    });
  },

  getPaletteCommands() {
    return [
      {
        name: 'Clear All',
        icon: 'X',
        desc: 'Clear input, output, and pipeline',
        keywords: ['clear', 'reset'],
        action: () => this.clearAll(),
      },
      {
        name: 'Copy Output',
        icon: 'C',
        desc: 'Copy output to clipboard',
        keywords: ['copy', 'clipboard'],
        action: () => this.copyOutput(),
      },
      {
        name: 'Swap Input/Output',
        icon: 'S',
        desc: 'Move output to input',
        keywords: ['swap', 'reverse'],
        action: () => this.swapInputOutput(),
      },
      {
        name: 'Clear Pipeline',
        icon: 'P',
        desc: 'Remove all pipeline steps',
        keywords: ['pipeline', 'clear'],
        action: () => this.clearPipelineAction(),
      },
      {
        name: 'Toggle Dark/Light',
        icon: 'T',
        desc: 'Switch color theme',
        keywords: ['theme', 'dark', 'light'],
        action: () => this.toggleTheme(),
      },
      {
        name: 'Toggle Word Wrap',
        icon: 'W',
        desc: 'Enable/disable word wrapping',
        keywords: ['wrap', 'word'],
        action: () => {
          RefractState.setWordWrap(!RefractState.wordWrap);
          this.updateWordWrap();
        },
      },
      {
        name: 'Download Output',
        icon: 'D',
        desc: 'Save output as a file',
        keywords: ['download', 'save', 'file'],
        action: () => this.downloadOutput(),
      },
      {
        name: 'Load File',
        icon: 'L',
        desc: 'Open a local file as input',
        keywords: ['load', 'open', 'file'],
        action: () => this.loadFile(),
      },
      {
        name: 'Show Shortcuts',
        icon: 'K',
        desc: 'Keyboard shortcut reference',
        keywords: ['keyboard', 'shortcuts'],
        action: () => {
          this.closePalette();
          this.showShortcuts();
        },
      },
      {
        name: 'Save Recipe',
        icon: 'R',
        desc: 'Save current pipeline as a recipe',
        keywords: ['recipe', 'save'],
        action: () => {
          this.closePalette();
          this.showSaveRecipeDialog();
        },
      },
      {
        name: 'Recipes',
        icon: 'R',
        desc: 'Browse and manage recipes',
        keywords: ['recipe', 'workflow'],
        action: () => {
          this.closePalette();
          this.showRecipes();
        },
      },
      {
        name: 'Settings',
        icon: 'S',
        desc: 'Open settings',
        keywords: ['settings', 'preferences'],
        action: () => {
          this.closePalette();
          this.showSettings();
        },
      },
    ];
  },

  renderPaletteQuickActions() {
    const commands = this.getPaletteCommands().slice(0, 5);
    return this.renderPaletteCommands(commands, 'Quick Actions');
  },

  renderPaletteCommands(commands, label) {
    const labelHtml = label ? `<div class="palette-section-label">${escapeHtml(label)}</div>` : '';
    return (
      labelHtml +
      commands
        .map(
          (cmd, i) => `
      <div class="palette-item" data-type="command" data-index="${i}" data-name="${escapeHtml(cmd.name)}">
        <div class="palette-item-icon">${escapeHtml(cmd.icon)}</div>
        <div class="palette-item-content">
          <div class="palette-item-name">${escapeHtml(cmd.name)}</div>
          <div class="palette-item-desc">${escapeHtml(cmd.desc)}</div>
        </div>
      </div>
    `,
        )
        .join('')
    );
  },

  renderPaletteOps(ops, label) {
    if (!ops.length) return '';
    const labelHtml = label ? `<div class="palette-section-label">${escapeHtml(label)}</div>` : '';
    return (
      labelHtml +
      ops
        .map((op) => {
          const dirLabel =
            op.direction === 'encode' ? 'enc' : op.direction === 'decode' ? 'dec' : 'tx';
          return `
        <div class="palette-item" data-type="op" data-op-id="${op.id}">
          <div class="palette-item-icon">${escapeHtml(op.icon || op.name.slice(0, 2))}</div>
          <div class="palette-item-content">
            <div class="palette-item-name">${escapeHtml(op.name)}</div>
            <div class="palette-item-desc">${escapeHtml(op.description)}</div>
          </div>
          <div class="palette-item-badge"><span class="chip ${op.direction}">${dirLabel}</span></div>
        </div>
      `;
        })
        .join('')
    );
  },

  handlePaletteKeydown(e) {
    const items = this.els.paletteResults.querySelectorAll('.palette-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.paletteHighlightIndex = Math.min(this.paletteHighlightIndex + 1, items.length - 1);
      this.highlightPaletteItem(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.paletteHighlightIndex = Math.max(this.paletteHighlightIndex - 1, -1);
      this.highlightPaletteItem(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (this.paletteHighlightIndex >= 0 && items[this.paletteHighlightIndex]) {
        this.executePaletteItem(items[this.paletteHighlightIndex]);
      }
    } else if (e.key === 'Escape') {
      this.closePalette();
    }
  },

  highlightPaletteItem(items) {
    items.forEach((item, i) =>
      item.classList.toggle('highlighted', i === this.paletteHighlightIndex),
    );
    if (this.paletteHighlightIndex >= 0) {
      items[this.paletteHighlightIndex].scrollIntoView({ block: 'nearest' });
    }
  },

  executePaletteItem(item) {
    this.closePalette();
    const type = item.dataset.type;
    if (type === 'op') {
      this.addOpToPipeline(item.dataset.opId);
    } else if (type === 'command') {
      const name = item.dataset.name;
      const cmd = this.getPaletteCommands().find((c) => c.name === name);
      if (cmd) cmd.action();
    }
  },

  handleGlobalKeydown(e) {
    const isMac = navigator.platform.includes('Mac');
    const ctrl = isMac ? e.metaKey : e.ctrlKey;

    if (ctrl && e.key === 'k') {
      e.preventDefault();
      this.openPalette();
      return;
    }
    if (ctrl && e.key === 'Enter') {
      e.preventDefault();
      this.triggerProcessing(true);
      return;
    }
    if (ctrl && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      this.copyOutput();
      return;
    }
    if (ctrl && e.shiftKey && e.key === 'V') {
      e.preventDefault();
      this.pasteFromClipboard();
      return;
    }
    if (ctrl && e.shiftKey && e.key === 'X') {
      e.preventDefault();
      this.swapInputOutput();
      return;
    }
    if (ctrl && e.shiftKey && e.key === 'W') {
      e.preventDefault();
      RefractState.setWordWrap(!RefractState.wordWrap);
      this.updateWordWrap();
      return;
    }
    if (ctrl && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      this.downloadOutput();
      return;
    }
    if (e.key === 'Escape') {
      if (!this.els.paletteOverlay.classList.contains('hidden')) {
        this.closePalette();
        return;
      }
    }
  },

  showShortcuts() {
    const overlay = document.getElementById('shortcuts-overlay');
    if (overlay) overlay.classList.remove('hidden');
  },

  showSettings() {
    const overlay = document.getElementById('settings-overlay');
    if (overlay) {
      this.renderSettings();
      overlay.classList.remove('hidden');
    }
  },

  renderSettings() {
    const container = document.getElementById('settings-body');
    if (!container) return;

    container.innerHTML = `
      <div class="settings-section">
        <div class="settings-section-title">Appearance</div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Color theme</div>
          </div>
          <select class="op-config-select" id="setting-theme" style="width:auto;">
            <option value="dark" ${RefractState.theme === 'dark' ? 'selected' : ''}>Dark</option>
            <option value="light" ${RefractState.theme === 'light' ? 'selected' : ''}>Light</option>
          </select>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Word wrap</div>
            <div class="settings-row-desc">Wrap long lines in the editors</div>
          </div>
          <label class="toggle">
            <input type="checkbox" id="setting-wordwrap" ${RefractState.wordWrap ? 'checked' : ''}>
            <span class="toggle-track"><span class="toggle-thumb"></span></span>
          </label>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Live processing</div>
            <div class="settings-row-desc">Process as you type (disable for performance)</div>
          </div>
          <label class="toggle">
            <input type="checkbox" id="setting-live" ${RefractState.liveProcessing ? 'checked' : ''}>
            <span class="toggle-track"><span class="toggle-thumb"></span></span>
          </label>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">Privacy and Data</div>
        <div class="privacy-notice">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><path d="M7 1L2 3v4c0 3 2.3 5.4 5 6 2.7-.6 5-3 5-6V3L7 1z"/></svg>
          Processing happens locally in your browser. Your input is not uploaded by this application. No analytics, no telemetry, no network requests during normal use.
        </div>
        <div class="settings-row" style="margin-top: var(--space-5);">
          <div>
            <div class="settings-row-label">Clear stored data</div>
            <div class="settings-row-desc">Removes favorites, recent operations, and recipes</div>
          </div>
          <button class="btn btn-danger" id="setting-clear-data">Clear</button>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">About Refract</div>
        <div class="settings-row">
          <div class="settings-row-label">Version</div>
          <div style="font-family: var(--font-mono); font-size: var(--text-sm); color: var(--text-secondary);">1.0.0</div>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Operations available</div>
          </div>
          <div style="font-family: var(--font-mono); font-size: var(--text-sm); color: var(--text-secondary);">${RefractOps.all.length}</div>
        </div>
      </div>
    `;

    document.getElementById('setting-theme')?.addEventListener('change', (e) => {
      this.applyTheme(e.target.value);
    });

    document.getElementById('setting-wordwrap')?.addEventListener('change', (e) => {
      RefractState.setWordWrap(e.target.checked);
      this.updateWordWrap();
    });

    document.getElementById('setting-live')?.addEventListener('change', (e) => {
      RefractState.setLiveProcessing(e.target.checked);
    });

    document.getElementById('setting-clear-data')?.addEventListener('click', () => {
      if (
        confirm(
          'Clear all stored favorites, recent operations, and recipes? This cannot be undone.',
        )
      ) {
        RefractState.clearAllData();
        this.renderSidebar();
        this.showNotification('Local data cleared', 'success');
      }
    });
  },

  showRecipes() {
    const overlay = document.getElementById('recipes-overlay');
    if (overlay) {
      this.renderRecipes();
      overlay.classList.remove('hidden');
    }
  },

  renderRecipes() {
    const body = document.getElementById('recipes-body');
    if (!body) return;

    const recipes = RefractState.recipes;

    if (recipes.length === 0) {
      body.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">No saved recipes</div>
          <div class="empty-state-desc">Build a pipeline and click "Save recipe" to store it here. You can also import a recipe from a JSON file.</div>
        </div>
        <div style="margin-top: var(--space-6);">
          <label class="file-drop-zone" style="cursor:pointer;">
            <div class="file-drop-label">Import recipe: <span>click to select JSON file</span></div>
            <input type="file" accept=".json" style="display:none;" id="import-recipe-file">
          </label>
        </div>
      `;
    } else {
      body.innerHTML = `
        <div style="margin-bottom: var(--space-5);">
          <label class="file-drop-zone" style="cursor:pointer; padding: var(--space-4);">
            <div class="file-drop-label">Import recipe: <span>click to select JSON file</span></div>
            <input type="file" accept=".json" style="display:none;" id="import-recipe-file">
          </label>
        </div>
        ${recipes
          .map(
            (r) => `
          <div class="recipe-item" data-recipe-id="${r.id}">
            <div style="flex:1; min-width:0;">
              <div class="recipe-name">${escapeHtml(r.name)}</div>
              <div class="recipe-steps">${r.steps
                .map((s) => {
                  const op = RefractOps.get(s.opId);
                  return op ? escapeHtml(op.name) : s.opId;
                })
                .join(' → ')}</div>
            </div>
            <div class="recipe-actions">
              <button class="btn btn-secondary btn-icon tooltip recipe-export-btn" data-id="${r.id}" title="Export as JSON" data-tip="Export JSON">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 1v8M4 6l3 3 3-3M2 11h10"/></svg>
              </button>
              <button class="btn btn-danger btn-icon tooltip recipe-delete-btn" data-id="${r.id}" title="Delete recipe" data-tip="Delete">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 4h10M5 4V2.5h4V4M5.5 6.5v4M8.5 6.5v4M3 4l.5 7.5h7L11 4"/></svg>
              </button>
            </div>
          </div>
        `,
          )
          .join('')}
      `;
    }

    body.querySelectorAll('.recipe-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.recipe-actions')) return;
        const id = parseInt(item.dataset.recipeId);
        RefractState.loadRecipe(id);
        this.renderPipeline();
        this.triggerProcessing();
        document.getElementById('recipes-overlay').classList.add('hidden');
        this.showNotification('Recipe loaded', 'success');
      });
    });

    body.querySelectorAll('.recipe-export-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const json = RefractState.exportRecipe(parseInt(btn.dataset.id));
        if (!json) return;
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'refract-recipe.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
    });

    body.querySelectorAll('.recipe-delete-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Delete this recipe?')) {
          RefractState.deleteRecipe(parseInt(btn.dataset.id));
          this.renderRecipes();
        }
      });
    });

    document.getElementById('import-recipe-file')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          RefractState.importRecipe(ev.target.result);
          this.renderRecipes();
          this.showNotification('Recipe imported', 'success');
        } catch (err) {
          this.showNotification(err.message, 'error');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
  },

  showNotification(message, type) {
    const el = this.els.notification;
    if (!el) return;
    el.textContent = message;
    el.className = 'notification ' + (type || '');
    el.classList.add('show');
    clearTimeout(this.notificationTimer);
    this.notificationTimer = setTimeout(() => el.classList.remove('show'), 2500);
  },
};

function escapeHtml(str) {
  if (typeof str !== 'string') return String(str || '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function highlightMatch(html, query) {
  const q = escapeHtml(query);
  const idx = html.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return html;
  return (
    html.slice(0, idx) +
    '<mark class="search-highlight">' +
    html.slice(idx, idx + q.length) +
    '</mark>' +
    html.slice(idx + q.length)
  );
}

window.RefractUI = UI;
window.escapeHtml = escapeHtml;
