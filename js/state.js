'use strict';

const STORAGE_KEY_PREFIX = 'refract_';

const State = {
  theme: 'dark',
  pipeline: [],
  favorites: new Set(),
  recentOps: [],
  inputValue: '',
  outputValue: '',
  wordWrap: true,
  liveProcessing: true,
  recipes: [],
  activeStepIndex: null,
  processing: false,
  lastError: null,
  processingTime: null,

  init() {
    const savedTheme = this.load('theme') || 'dark';
    const savedFavs = this.load('favorites') || [];
    const savedRecent = this.load('recent_ops') || [];
    const savedRecipes = this.load('recipes') || [];
    const savedWordWrap = this.load('word_wrap');
    const savedLive = this.load('live_processing');

    this.theme = savedTheme;
    this.favorites = new Set(savedFavs);
    this.recentOps = savedRecent;
    this.recipes = savedRecipes;
    this.wordWrap = savedWordWrap !== false;
    this.liveProcessing = savedLive !== false;
  },

  save(key, value) {
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.warn('localStorage write failed:', e);
    }
  },

  load(key) {
    try {
      const item = localStorage.getItem(STORAGE_KEY_PREFIX + key);
      return item !== null ? JSON.parse(item) : null;
    } catch (e) {
      return null;
    }
  },

  setTheme(theme) {
    this.theme = theme;
    this.save('theme', theme);
  },

  addToRecent(opId) {
    this.recentOps = [opId, ...this.recentOps.filter((id) => id !== opId)].slice(0, 10);
    this.save('recent_ops', this.recentOps);
  },

  toggleFavorite(opId) {
    if (this.favorites.has(opId)) {
      this.favorites.delete(opId);
    } else {
      this.favorites.add(opId);
    }
    this.save('favorites', Array.from(this.favorites));
  },

  addPipelineStep(opId, options) {
    const op = window.RefractOps.get(opId);
    if (!op) return;
    const defaultOptions = {};
    (op.options || []).forEach((opt) => {
      defaultOptions[opt.id] = opt.default;
    });
    const step = {
      id: Date.now() + Math.random(),
      opId,
      options: { ...defaultOptions, ...(options || {}) },
      enabled: true,
    };
    this.pipeline.push(step);
    this.addToRecent(opId);
    return step;
  },

  removePipelineStep(stepId) {
    this.pipeline = this.pipeline.filter((s) => s.id !== stepId);
    if (this.activeStepIndex !== null && this.activeStepIndex >= this.pipeline.length) {
      this.activeStepIndex = this.pipeline.length > 0 ? this.pipeline.length - 1 : null;
    }
  },

  movePipelineStep(fromIndex, toIndex) {
    const steps = [...this.pipeline];
    const [moved] = steps.splice(fromIndex, 1);
    steps.splice(toIndex, 0, moved);
    this.pipeline = steps;
  },

  clearPipeline() {
    this.pipeline = [];
    this.activeStepIndex = null;
  },

  saveRecipe(name) {
    const recipe = {
      id: Date.now(),
      name,
      steps: this.pipeline.map((s) => ({ opId: s.opId, options: { ...s.options } })),
      created: new Date().toISOString(),
    };
    this.recipes = [recipe, ...this.recipes];
    this.save('recipes', this.recipes);
    return recipe;
  },

  deleteRecipe(id) {
    this.recipes = this.recipes.filter((r) => r.id !== id);
    this.save('recipes', this.recipes);
  },

  loadRecipe(id) {
    const recipe = this.recipes.find((r) => r.id === id);
    if (!recipe) return;
    this.clearPipeline();
    recipe.steps.forEach((s) => this.addPipelineStep(s.opId, s.options));
  },

  exportRecipe(id) {
    const recipe = this.recipes.find((r) => r.id === id);
    if (!recipe) return null;
    return JSON.stringify(recipe, null, 2);
  },

  importRecipe(json) {
    let recipe;
    try {
      recipe = JSON.parse(json);
    } catch (e) {
      throw new Error('Invalid recipe JSON.');
    }
    if (!recipe.name || !Array.isArray(recipe.steps)) {
      throw new Error('Invalid recipe format. Missing name or steps.');
    }
    recipe.id = Date.now();
    recipe.imported = new Date().toISOString();
    this.recipes = [recipe, ...this.recipes];
    this.save('recipes', this.recipes);
    return recipe;
  },

  clearAllData() {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(STORAGE_KEY_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
    this.favorites = new Set();
    this.recentOps = [];
    this.recipes = [];
  },

  setWordWrap(val) {
    this.wordWrap = val;
    this.save('word_wrap', val);
  },

  setLiveProcessing(val) {
    this.liveProcessing = val;
    this.save('live_processing', val);
  },
};

window.RefractState = State;
