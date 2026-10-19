/**
 * TAOBAO ➔ RAJSHAHI LANDED COST & PRICING ENGINE
 * Ultra-Responsive Mobile Web Application Engine
 */

// -----------------------------------------------------------------------------
// Storage Keys & Default Configuration
// -----------------------------------------------------------------------------
const STORAGE_KEYS = {
  SETTINGS: 'rcb_settings_v1',
  CATEGORIES: 'rcb_categories_v1',
  BATCH: 'rcb_batch_v1',
  THEME: 'rcb_theme_v1',
  HAS_ONBOARDED: 'rcb_has_onboarded_v1'
};

const DEFAULT_SETTINGS = {
  rmbRate: 18.00,             // 18.00 BDT per RMB
  chinaDomesticRmb: 30.00,    // 30 RMB
  chinaDomesticKg: 10.00,     // per 10 kg
  bdDomesticBdt: 500.00,      // 500 BDT
  bdDomesticKg: 10.00,        // per 10 kg
  safetyBufferPerGram: 0.05,  // 0.05 BDT per gram
  roundToNearest: 'none'      // 'none', '10', '50'
};

const DEFAULT_CATEGORIES = [
  { id: 'shoes-bags', name: 'Shoes / Bags', ratePerKg: 800, isDefault: true },
  { id: 'clothing', name: 'Clothing / Dress', ratePerKg: 980, isDefault: true },
  { id: 'jewelry', name: 'Jewelry / Accessories', ratePerKg: 800, isDefault: true },
  { id: 'cosmetics', name: 'Cosmetics', ratePerKg: 1000, isDefault: true },
  { id: 'battery-gadgets', name: 'Battery / Gadgets', ratePerKg: 1400, isDefault: true }
];

const PRESET_PRODUCTS = [
  { name: 'Sneakers / Chunky Shoes', categoryId: 'shoes-bags', weight: 850, priceRmb: 98 },
  { name: 'Summer Chiffon Dress', categoryId: 'clothing', weight: 280, priceRmb: 55 },
  { name: 'Titanium Pendant Chain', categoryId: 'jewelry', weight: 45, priceRmb: 28 },
  { name: 'Moisturizing Cream 50g', categoryId: 'cosmetics', weight: 140, priceRmb: 48 },
  { name: 'TWS Bluetooth Earbuds', categoryId: 'battery-gadgets', weight: 175, priceRmb: 68 },
  { name: 'Tote Shoulder Bag', categoryId: 'shoes-bags', weight: 520, priceRmb: 75 }
];

// -----------------------------------------------------------------------------
// State Management
// -----------------------------------------------------------------------------
class AppState {
  constructor() {
    this.settings = this.loadSettings();
    this.categories = this.loadCategories();
    this.batch = this.loadBatch();
    this.currentMobileTab = 'calc'; // 'calc' | 'batch'
    this.calculator = {
      productName: '',
      categoryId: this.categories[0]?.id || 'clothing',
      priceRmb: 65,
      weightGrams: 350,
      profitMode: 'percent', // 'percent' | 'flat'
      marginPercent: 30,
      flatMarkupBdt: 400
    };
  }

  loadSettings() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : { ...DEFAULT_SETTINGS };
    } catch (e) {
      return { ...DEFAULT_SETTINGS };
    }
  }

  saveSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
  }

  loadCategories() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      return stored ? JSON.parse(stored) : [...DEFAULT_CATEGORIES];
    } catch (e) {
      return [...DEFAULT_CATEGORIES];
    }
  }

  saveCategories(categories) {
    this.categories = categories;
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(this.categories));
  }

  loadBatch() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.BATCH);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  saveBatch(batch) {
    this.batch = batch;
    localStorage.setItem(STORAGE_KEYS.BATCH, JSON.stringify(this.batch));
  }
}

const state = new AppState();

// -----------------------------------------------------------------------------
// Core Mathematical Calculations
// -----------------------------------------------------------------------------
const CalcEngine = {
  // China domestic leg per gram: (RMB_per_kg / 1000) * RMB_Rate
  getChinaDomesticRatePerGram(settings = state.settings) {
    const rmbPerKg = settings.chinaDomesticKg > 0 ? (settings.chinaDomesticRmb / settings.chinaDomesticKg) : 0;
    return (rmbPerKg / 1000) * settings.rmbRate;
  },

  // BD domestic delivery leg per gram: BDT_per_kg / 1000
  getBdDomesticRatePerGram(settings = state.settings) {
    const bdtPerKg = settings.bdDomesticKg > 0 ? (settings.bdDomesticBdt / settings.bdDomesticKg) : 0;
    return bdtPerKg / 1000;
  },

  // Forwarder freight leg per gram: Category_BDT_per_kg / 1000
  getCategoryFreightRatePerGram(category) {
    if (!category || !category.ratePerKg) return 0;
    return category.ratePerKg / 1000;
  },

  // Total shipping rate per gram
  getTotalShippingRatePerGram(category, settings = state.settings) {
    const leg1 = this.getChinaDomesticRatePerGram(settings);
    const leg2 = this.getCategoryFreightRatePerGram(category);
    const leg3 = this.getBdDomesticRatePerGram(settings);
    const buffer = parseFloat(settings.safetyBufferPerGram) || 0;
    return leg1 + leg2 + leg3 + buffer;
  },

  // Complete breakdown calculation
  calculate(params, settings = state.settings, categories = state.categories) {
    const weight = Math.max(0, parseFloat(params.weightGrams) || 0);
    const priceRmb = Math.max(0, parseFloat(params.priceRmb) || 0);
    const rmbRate = Math.max(0.001, parseFloat(settings.rmbRate) || 18.00);

    const category = categories.find(c => c.id === params.categoryId) || categories[0] || DEFAULT_CATEGORIES[0];

    const chinaRatePerGm = this.getChinaDomesticRatePerGram(settings);
    const freightRatePerGm = this.getCategoryFreightRatePerGram(category);
    const bdRatePerGm = this.getBdDomesticRatePerGram(settings);
    const bufferRatePerGm = parseFloat(settings.safetyBufferPerGram) || 0;

    const totalShippingRatePerGm = chinaRatePerGm + freightRatePerGm + bdRatePerGm + bufferRatePerGm;

    // Base Product Purchase Cost
    const productBaseCostBdt = priceRmb * rmbRate;

    // Component Shipping Costs
    const chinaDomesticCostBdt = weight * chinaRatePerGm;
    const forwarderFreightCostBdt = weight * freightRatePerGm;
    const bdDomesticCostBdt = weight * bdRatePerGm;
    const safetyBufferCostBdt = weight * bufferRatePerGm;
    const totalShippingCostBdt = weight * totalShippingRatePerGm;

    // Total Landed Cost
    const totalLandedCostBdt = productBaseCostBdt + totalShippingCostBdt;

    // Selling Price calculation
    let rawSellingPriceBdt = 0;
    if (params.profitMode === 'flat') {
      const flatMarkup = Math.max(0, parseFloat(params.flatMarkupBdt) || 0);
      rawSellingPriceBdt = totalLandedCostBdt + flatMarkup;
    } else {
      const marginPct = Math.min(95, Math.max(0, parseFloat(params.marginPercent) || 0));
      if (marginPct >= 100) {
        rawSellingPriceBdt = totalLandedCostBdt * 2;
      } else {
        rawSellingPriceBdt = totalLandedCostBdt / (1 - (marginPct / 100));
      }
    }

    // Optional smart price rounding
    let sellingPriceBdt = rawSellingPriceBdt;
    if (settings.roundToNearest === '10') {
      sellingPriceBdt = Math.ceil(rawSellingPriceBdt / 10) * 10;
    } else if (settings.roundToNearest === '50') {
      sellingPriceBdt = Math.ceil(rawSellingPriceBdt / 50) * 50;
    }

    // Profit & Actual Margins
    const netProfitBdt = Math.max(0, sellingPriceBdt - totalLandedCostBdt);
    const effectiveMarginPct = sellingPriceBdt > 0 ? (netProfitBdt / sellingPriceBdt) * 100 : 0;
    const markupPct = totalLandedCostBdt > 0 ? (netProfitBdt / totalLandedCostBdt) * 100 : 0;
    const shippingSharePct = totalLandedCostBdt > 0 ? (totalShippingCostBdt / totalLandedCostBdt) * 100 : 0;

    return {
      category,
      weight,
      priceRmb,
      rmbRate,
      chinaRatePerGm,
      freightRatePerGm,
      bdRatePerGm,
      bufferRatePerGm,
      totalShippingRatePerGm,
      productBaseCostBdt,
      chinaDomesticCostBdt,
      forwarderFreightCostBdt,
      bdDomesticCostBdt,
      safetyBufferCostBdt,
      totalShippingCostBdt,
      totalLandedCostBdt,
      sellingPriceBdt,
      rawSellingPriceBdt,
      netProfitBdt,
      effectiveMarginPct,
      markupPct,
      shippingSharePct
    };
  }
};

// -----------------------------------------------------------------------------
// Formatters & UI Utilities
// -----------------------------------------------------------------------------
const formatBDT = (num, decimals = 2) => {
  if (isNaN(num)) return '৳0.00';
  return '৳' + Number(num).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

const formatRMB = (num, decimals = 2) => {
  if (isNaN(num)) return '¥0.00';
  return '¥' + Number(num).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

// Toast notification helper
const showToast = (message, type = 'success') => {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
  } else if (type === 'error') {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
  } else {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
  }

  toast.innerHTML = `${iconSvg} <span>${message}</span>`;
  container.appendChild(toast);

  if ('vibrate' in navigator) {
    try { navigator.vibrate(25); } catch (e) {}
  }

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.2s ease';
    setTimeout(() => toast.remove(), 200);
  }, 2600);
};

// -----------------------------------------------------------------------------
// UI Controller
// -----------------------------------------------------------------------------
const UI = {
  init() {
    this.cacheDom();
    this.renderCategorySelect();
    this.renderPresets();
    this.bindEvents();
    this.applyTheme(this.getInitialTheme());
    this.updateRouteVisualizer();
    this.renderBatchSummary();
    this.calculateAndRender();
    this.checkFirstVisit();
  },

  cacheDom() {
    // Mobile Tab Navigation
    this.tabBtnCalc = document.getElementById('tabBtnCalc');
    this.tabBtnBatch = document.getElementById('tabBtnBatch');
    this.tabBatchBadge = document.getElementById('tabBatchBadge');
    this.sectionCalculator = document.getElementById('sectionCalculator');
    this.sectionBatch = document.getElementById('sectionBatch');

    // Header elements
    this.badgeExchangeRate = document.getElementById('badgeExchangeRate');
    this.btnSettings = document.getElementById('btnSettings');
    this.btnThemeToggle = document.getElementById('btnThemeToggle');

    // Route bar
    this.routeLeg1Rate = document.getElementById('routeLeg1Rate');
    this.routeLeg2Rate = document.getElementById('routeLeg2Rate');
    this.routeLeg3Rate = document.getElementById('routeLeg3Rate');
    this.routeBufferRate = document.getElementById('routeBufferRate');

    // Calculator inputs
    this.inputProductName = document.getElementById('productName');
    this.selectCategory = document.getElementById('categorySelect');
    this.inputPriceRmb = document.getElementById('priceRmb');
    this.inputWeightGrams = document.getElementById('weightGrams');
    this.togglePercent = document.getElementById('togglePercent');
    this.toggleFlat = document.getElementById('toggleFlat');
    this.containerPercent = document.getElementById('containerPercent');
    this.containerFlat = document.getElementById('containerFlat');
    this.sliderMargin = document.getElementById('sliderMargin');
    this.inputMarginPercent = document.getElementById('marginPercent');
    this.inputFlatMarkup = document.getElementById('flatMarkup');
    this.btnSaveBatch = document.getElementById('btnSaveBatch');
    this.btnClearForm = document.getElementById('btnClearForm');
    this.btnCopyQuote = document.getElementById('btnCopyQuote');
    this.presetContainer = document.getElementById('presetContainer');

    // Sticky Mobile Bar
    this.stickyLanded = document.getElementById('stickyLanded');
    this.stickySell = document.getElementById('stickySell');
    this.btnStickySave = document.getElementById('btnStickySave');

    // Hero outputs
    this.outLandedCost = document.getElementById('outLandedCost');
    this.outSellingPrice = document.getElementById('outSellingPrice');
    this.outNetProfit = document.getElementById('outNetProfit');
    this.badgeMargin = document.getElementById('badgeMargin');
    this.badgeMarkup = document.getElementById('badgeMarkup');
    this.outTotalShippingRate = document.getElementById('outTotalShippingRate');

    // Visual Composition Bar
    this.barBase = document.getElementById('barBase');
    this.barChina = document.getElementById('barChina');
    this.barFreight = document.getElementById('barFreight');
    this.barBd = document.getElementById('barBd');
    this.barBuffer = document.getElementById('barBuffer');

    // Breakdown Table elements
    this.tableBaseCost = document.getElementById('tableBaseCost');
    this.tableChinaCost = document.getElementById('tableChinaCost');
    this.tableFreightCost = document.getElementById('tableFreightCost');
    this.tableBdCost = document.getElementById('tableBdCost');
    this.tableBufferCost = document.getElementById('tableBufferCost');
    this.tableTotalShipping = document.getElementById('tableTotalShipping');
    this.tableTotalLanded = document.getElementById('tableTotalLanded');

    this.calcBaseText = document.getElementById('calcBaseText');
    this.calcChinaText = document.getElementById('calcChinaText');
    this.calcFreightText = document.getElementById('calcFreightText');
    this.calcBdText = document.getElementById('calcBdText');
    this.calcBufferText = document.getElementById('calcBufferText');
    this.calcShippingText = document.getElementById('calcShippingText');

    // Batch Elements (Mobile cards + Desktop table)
    this.batchMobileCards = document.getElementById('batchMobileCards');
    this.batchTableBody = document.getElementById('batchTableBody');
    this.batchEmptyState = document.getElementById('batchEmptyState');
    this.batchTableContainer = document.getElementById('batchTableContainer');
    this.statTotalItems = document.getElementById('statTotalItems');
    this.statTotalWeight = document.getElementById('statTotalWeight');
    this.statTotalCapital = document.getElementById('statTotalCapital');
    this.statTotalRevenue = document.getElementById('statTotalRevenue');
    this.statTotalProfit = document.getElementById('statTotalProfit');
    this.statAvgMargin = document.getElementById('statAvgMargin');
    this.btnExportCsv = document.getElementById('btnExportCsv');
    this.btnCopyBatch = document.getElementById('btnCopyBatch');
    this.btnClearBatch = document.getElementById('btnClearBatch');

    // Settings Modal
    this.modalSettings = document.getElementById('modalSettings');
    this.btnCloseModal = document.getElementById('btnCloseModal');
    this.btnSaveModal = document.getElementById('btnSaveModal');
    this.btnResetSettings = document.getElementById('btnResetSettings');
    this.btnAddCategory = document.getElementById('btnAddCategory');
    this.categoryTableBody = document.getElementById('categoryTableBody');

    this.settingRmbRate = document.getElementById('settingRmbRate');
    this.settingChinaRmb = document.getElementById('settingChinaRmb');
    this.settingChinaKg = document.getElementById('settingChinaKg');
    this.settingBdBdt = document.getElementById('settingBdBdt');
    this.settingBdKg = document.getElementById('settingBdKg');
    this.settingBuffer = document.getElementById('settingBuffer');
    this.settingRound = document.getElementById('settingRound');

    this.previewLeg1 = document.getElementById('previewLeg1');
    this.previewLeg3 = document.getElementById('previewLeg3');
    this.previewBuffer = document.getElementById('previewBuffer');
  },

  bindEvents() {
    // Mobile Tab switching
    if (this.tabBtnCalc && this.tabBtnBatch) {
      this.tabBtnCalc.addEventListener('click', () => this.switchMobileTab('calc'));
      this.tabBtnBatch.addEventListener('click', () => this.switchMobileTab('batch'));
    }

    const triggerRecalc = () => {
      this.syncStateFromInputs();
      this.calculateAndRender();
    };

    this.inputProductName.addEventListener('input', () => {
      state.calculator.productName = this.inputProductName.value;
    });

    this.selectCategory.addEventListener('change', () => {
      state.calculator.categoryId = this.selectCategory.value;
      this.updateRouteVisualizer();
      this.calculateAndRender();
    });

    this.inputPriceRmb.addEventListener('input', triggerRecalc);
    this.inputWeightGrams.addEventListener('input', triggerRecalc);

    // Profit Mode Switches
    this.togglePercent.addEventListener('click', () => {
      state.calculator.profitMode = 'percent';
      this.togglePercent.classList.add('active');
      this.toggleFlat.classList.remove('active');
      this.containerPercent.style.display = 'block';
      this.containerFlat.style.display = 'none';
      this.calculateAndRender();
    });

    this.toggleFlat.addEventListener('click', () => {
      state.calculator.profitMode = 'flat';
      this.toggleFlat.classList.add('active');
      this.togglePercent.classList.remove('active');
      this.containerPercent.style.display = 'none';
      this.containerFlat.style.display = 'block';
      this.calculateAndRender();
    });

    // Margin Slider & Input synchronization
    this.sliderMargin.addEventListener('input', () => {
      this.inputMarginPercent.value = this.sliderMargin.value;
      state.calculator.marginPercent = parseFloat(this.sliderMargin.value) || 0;
      this.calculateAndRender();
    });

    this.inputMarginPercent.addEventListener('input', () => {
      this.sliderMargin.value = this.inputMarginPercent.value;
      state.calculator.marginPercent = parseFloat(this.inputMarginPercent.value) || 0;
      this.calculateAndRender();
    });

    this.inputFlatMarkup.addEventListener('input', () => {
      state.calculator.flatMarkupBdt = parseFloat(this.inputFlatMarkup.value) || 0;
      this.calculateAndRender();
    });

    // Quick Weight Pill Buttons
    document.querySelectorAll('[data-weight-quick]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const action = btn.dataset.weightQuick;
        let curr = parseFloat(this.inputWeightGrams.value) || 0;
        if (action.startsWith('+')) {
          curr += parseFloat(action.substring(1));
        } else {
          curr = parseFloat(action);
        }
        this.inputWeightGrams.value = curr;
        state.calculator.weightGrams = curr;
        this.calculateAndRender();
      });
    });

    // Quick Margin Pill Buttons
    document.querySelectorAll('[data-margin-quick]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const margin = parseFloat(btn.dataset.marginQuick);
        this.sliderMargin.value = margin;
        this.inputMarginPercent.value = margin;
        state.calculator.marginPercent = margin;
        this.calculateAndRender();
      });
    });

    // Action buttons
    this.btnSaveBatch.addEventListener('click', () => this.handleSaveToBatch());
    if (this.btnStickySave) {
      this.btnStickySave.addEventListener('click', () => this.handleSaveToBatch());
    }
    this.btnClearForm.addEventListener('click', () => this.handleClearForm());
    this.btnCopyQuote.addEventListener('click', () => this.handleCopyQuote());

    // Batch Actions
    this.btnExportCsv.addEventListener('click', () => this.handleExportCsv());
    this.btnCopyBatch.addEventListener('click', () => this.handleCopyBatchSummary());
    this.btnClearBatch.addEventListener('click', () => this.handleClearBatch());

    // Settings Modal
    this.btnSettings.addEventListener('click', () => this.openSettingsModal());
    this.badgeExchangeRate.addEventListener('click', () => this.openSettingsModal());
    this.btnCloseModal.addEventListener('click', () => this.closeSettingsModal());
    this.btnSaveModal.addEventListener('click', () => this.handleSaveSettings());
    this.btnResetSettings.addEventListener('click', () => this.handleResetSettings());
    this.btnAddCategory.addEventListener('click', () => this.handleAddCategoryRow());

    // Modal Live Preview Listeners
    [this.settingRmbRate, this.settingChinaRmb, this.settingChinaKg, this.settingBdBdt, this.settingBdKg, this.settingBuffer]
      .forEach(inp => inp.addEventListener('input', () => this.updateModalLivePreviews()));

    // Theme Toggle
    this.btnThemeToggle.addEventListener('click', () => this.toggleTheme());

    // Close modal on outside click
    this.modalSettings.addEventListener('click', (e) => {
      if (e.target === this.modalSettings) {
        this.closeSettingsModal();
      }
    });

    // Close on Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modalSettings.classList.contains('open')) {
        this.closeSettingsModal();
      }
    });
  },

  switchMobileTab(tab) {
    state.currentMobileTab = tab;
    if (window.innerWidth < 960) {
      if (tab === 'calc') {
        this.tabBtnCalc.classList.add('active');
        this.tabBtnBatch.classList.remove('active');
        this.sectionCalculator.style.display = 'grid';
        this.sectionBatch.style.display = 'none';
      } else {
        this.tabBtnBatch.classList.add('active');
        this.tabBtnCalc.classList.remove('active');
        this.sectionCalculator.style.display = 'none';
        this.sectionBatch.style.display = 'block';
      }
    }
  },

  syncStateFromInputs() {
    state.calculator.productName = this.inputProductName.value.trim();
    state.calculator.categoryId = this.selectCategory.value;
    state.calculator.priceRmb = parseFloat(this.inputPriceRmb.value) || 0;
    state.calculator.weightGrams = parseFloat(this.inputWeightGrams.value) || 0;
    state.calculator.marginPercent = parseFloat(this.inputMarginPercent.value) || 0;
    state.calculator.flatMarkupBdt = parseFloat(this.inputFlatMarkup.value) || 0;
  },

  renderCategorySelect() {
    const prevSelected = state.calculator.categoryId;
    this.selectCategory.innerHTML = '';

    state.categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id;
      const totalGm = CalcEngine.getTotalShippingRatePerGram(cat);
      option.textContent = `${cat.name} (${cat.ratePerKg} BDT/kg ➔ ৳${totalGm.toFixed(3)}/g total)`;
      this.selectCategory.appendChild(option);
    });

    if (state.categories.some(c => c.id === prevSelected)) {
      this.selectCategory.value = prevSelected;
    } else if (state.categories.length > 0) {
      this.selectCategory.value = state.categories[0].id;
      state.calculator.categoryId = state.categories[0].id;
    }
  },

  renderPresets() {
    this.presetContainer.innerHTML = '';
    PRESET_PRODUCTS.forEach(p => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'preset-chip';
      chip.innerHTML = `<span>${p.name}</span><span class="font-mono text-dim" style="font-size:0.68rem">${p.weight}g · ¥${p.priceRmb}</span>`;
      chip.addEventListener('click', () => {
        this.inputProductName.value = p.name;
        this.selectCategory.value = p.categoryId;
        this.inputWeightGrams.value = p.weight;
        this.inputPriceRmb.value = p.priceRmb;
        this.syncStateFromInputs();
        this.updateRouteVisualizer();
        this.calculateAndRender();
        showToast(`Loaded: ${p.name}`, 'info');
      });
      this.presetContainer.appendChild(chip);
    });
  },

  updateRouteVisualizer() {
    const leg1 = CalcEngine.getChinaDomesticRatePerGram();
    const currentCategory = state.categories.find(c => c.id === state.calculator.categoryId) || state.categories[0];
    const leg2 = CalcEngine.getCategoryFreightRatePerGram(currentCategory);
    const leg3 = CalcEngine.getBdDomesticRatePerGram();
    const buffer = parseFloat(state.settings.safetyBufferPerGram) || 0;

    this.routeLeg1Rate.textContent = `৳${leg1.toFixed(3)}/g`;
    this.routeLeg2Rate.textContent = `৳${leg2.toFixed(3)}/g`;
    this.routeLeg3Rate.textContent = `৳${leg3.toFixed(3)}/g`;
    this.routeBufferRate.textContent = `+৳${buffer.toFixed(2)}/g`;
    this.badgeExchangeRate.innerHTML = `<span>¥1 = ৳${Number(state.settings.rmbRate).toFixed(2)}</span>`;
  },

  calculateAndRender() {
    const res = CalcEngine.calculate(state.calculator);

    // Hero outputs
    this.outLandedCost.textContent = formatBDT(res.totalLandedCostBdt);
    this.outSellingPrice.textContent = formatBDT(res.sellingPriceBdt);
    this.outNetProfit.textContent = `+${formatBDT(res.netProfitBdt)}`;

    // Mobile Sticky Bar sync
    if (this.stickyLanded && this.stickySell) {
      this.stickyLanded.textContent = formatBDT(res.totalLandedCostBdt);
      this.stickySell.textContent = `Sell: ${formatBDT(res.sellingPriceBdt)}`;
    }

    this.badgeMargin.textContent = `${res.effectiveMarginPct.toFixed(1)}% Margin`;
    this.badgeMarkup.textContent = `${res.markupPct.toFixed(1)}% Markup`;
    this.outTotalShippingRate.textContent = `৳${res.totalShippingRatePerGm.toFixed(3)} / gram total`;

    // Micro Breakdown Table
    this.tableBaseCost.textContent = formatBDT(res.productBaseCostBdt);
    this.tableChinaCost.textContent = formatBDT(res.chinaDomesticCostBdt);
    this.tableFreightCost.textContent = formatBDT(res.forwarderFreightCostBdt);
    this.tableBdCost.textContent = formatBDT(res.bdDomesticCostBdt);
    this.tableBufferCost.textContent = formatBDT(res.safetyBufferCostBdt);
    this.tableTotalShipping.textContent = formatBDT(res.totalShippingCostBdt);
    this.tableTotalLanded.textContent = formatBDT(res.totalLandedCostBdt);

    // Micro Breakdown Formula Text
    this.calcBaseText.textContent = `${formatRMB(res.priceRmb)} × ৳${Number(res.rmbRate).toFixed(2)}`;
    this.calcChinaText.textContent = `${res.weight}g × ৳${res.chinaRatePerGm.toFixed(4)}/g`;
    this.calcFreightText.textContent = `${res.weight}g × ৳${res.freightRatePerGm.toFixed(4)}/g`;
    this.calcBdText.textContent = `${res.weight}g × ৳${res.bdRatePerGm.toFixed(4)}/g`;
    this.calcBufferText.textContent = `${res.weight}g × ৳${res.bufferRatePerGm.toFixed(4)}/g`;
    this.calcShippingText.textContent = `${res.shippingSharePct.toFixed(1)}% shipping`;

    // Cost Composition Bar
    const total = res.totalLandedCostBdt || 1;
    this.barBase.style.width = `${(res.productBaseCostBdt / total) * 100}%`;
    this.barChina.style.width = `${(res.chinaDomesticCostBdt / total) * 100}%`;
    this.barFreight.style.width = `${(res.forwarderFreightCostBdt / total) * 100}%`;
    this.barBd.style.width = `${(res.bdDomesticCostBdt / total) * 100}%`;
    this.barBuffer.style.width = `${(res.safetyBufferCostBdt / total) * 100}%`;
  },

  handleSaveToBatch() {
    const res = CalcEngine.calculate(state.calculator);
    if (res.totalLandedCostBdt <= 0) {
      showToast('Enter a valid price and weight first', 'error');
      return;
    }

    const itemName = state.calculator.productName || `${res.category.name} Item #${state.batch.length + 1}`;

    const batchItem = {
      id: Date.now().toString(),
      name: itemName,
      categoryId: res.category.id,
      categoryName: res.category.name,
      weightGrams: res.weight,
      priceRmb: res.priceRmb,
      landedCostBdt: res.totalLandedCostBdt,
      sellingPriceBdt: res.sellingPriceBdt,
      netProfitBdt: res.netProfitBdt,
      marginPercent: res.effectiveMarginPct,
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    state.batch.unshift(batchItem);
    state.saveBatch(state.batch);

    this.renderBatchSummary();
    showToast(`Added "${itemName}" to batch!`, 'success');
  },

  handleClearForm() {
    this.inputProductName.value = '';
    this.inputPriceRmb.value = '';
    this.inputWeightGrams.value = '';
    state.calculator.productName = '';
    state.calculator.priceRmb = 0;
    state.calculator.weightGrams = 0;
    this.calculateAndRender();
    showToast('Form cleared', 'info');
  },

  handleCopyQuote() {
    const res = CalcEngine.calculate(state.calculator);
    const title = state.calculator.productName || res.category.name;

    const quoteText = `📦 [Taobao ➔ Rajshahi Landed Quote]
Product: ${title}
Category: ${res.category.name}
Weight: ${res.weight} gm
Taobao Price: ${formatRMB(res.priceRmb)} (Rate: ৳${res.rmbRate}/RMB)
----------------------------------
Total Landed Cost: ${formatBDT(res.totalLandedCostBdt)}
Suggested Selling Price: ${formatBDT(res.sellingPriceBdt)}
Projected Net Profit: +${formatBDT(res.netProfitBdt)} (${res.effectiveMarginPct.toFixed(1)}% margin)
----------------------------------
Shipping Breakdown:
• China Domestic: ${formatBDT(res.chinaDomesticCostBdt)}
• Guangzhou ➔ Dhaka Freight: ${formatBDT(res.forwarderFreightCostBdt)}
• Dhaka ➔ Rajshahi Courier: ${formatBDT(res.bdDomesticCostBdt)}
• Buffer / Contingency: ${formatBDT(res.safetyBufferCostBdt)}
Total Shipping Rate: ৳${res.totalShippingRatePerGm.toFixed(3)}/gm`;

    navigator.clipboard.writeText(quoteText).then(() => {
      showToast('Quote copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Could not access clipboard', 'error');
    });
  },

  renderBatchSummary() {
    const items = state.batch;
    if (this.tabBatchBadge) {
      this.tabBatchBadge.textContent = items.length.toString();
    }

    if (items.length === 0) {
      this.batchEmptyState.style.display = 'block';
      this.batchTableContainer.style.display = 'none';
      if (this.batchMobileCards) this.batchMobileCards.innerHTML = '';
      this.statTotalItems.textContent = '0';
      this.statTotalWeight.textContent = '0.00 kg';
      this.statTotalCapital.textContent = '৳0';
      this.statTotalRevenue.textContent = '৳0';
      this.statTotalProfit.textContent = '৳0';
      this.statAvgMargin.textContent = '0%';
      return;
    }

    this.batchEmptyState.style.display = 'none';
    if (window.innerWidth >= 768) {
      this.batchTableContainer.style.display = 'block';
    }

    let totalWeightGrams = 0;
    let totalCapital = 0;
    let totalRevenue = 0;
    let totalProfit = 0;

    this.batchTableBody.innerHTML = '';
    if (this.batchMobileCards) this.batchMobileCards.innerHTML = '';

    items.forEach((item) => {
      totalWeightGrams += item.weightGrams;
      totalCapital += item.landedCostBdt;
      totalRevenue += item.sellingPriceBdt;
      totalProfit += item.netProfitBdt;

      // 1. Desktop Table Row
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:700">
          <div>${item.name}</div>
          <div class="text-dim font-mono" style="font-size:0.7rem">${item.date}</div>
        </td>
        <td><span class="batch-category-badge">${item.categoryName}</span></td>
        <td class="font-mono">${item.weightGrams}g</td>
        <td class="font-mono">${formatRMB(item.priceRmb)}</td>
        <td class="font-mono text-emerald" style="font-weight:700">${formatBDT(item.landedCostBdt)}</td>
        <td class="font-mono" style="font-weight:800; color:var(--text-main)">${formatBDT(item.sellingPriceBdt)}</td>
        <td class="font-mono text-emerald" style="font-weight:700">+${formatBDT(item.netProfitBdt)}</td>
        <td style="text-align:right">
          <div style="display:inline-flex; gap:6px;">
            <button class="btn-table-icon" title="Load into Calculator" data-load-id="${item.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
            </button>
            <button class="btn-table-icon delete" title="Remove" data-delete-id="${item.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </td>
      `;
      this.batchTableBody.appendChild(tr);

      // 2. Mobile Responsive Card
      if (this.batchMobileCards) {
        const card = document.createElement('div');
        card.className = 'batch-card';
        card.innerHTML = `
          <div class="batch-card-header">
            <div>
              <div class="batch-card-title">${item.name}</div>
              <div class="text-dim font-mono" style="font-size:0.68rem">${item.date}</div>
            </div>
            <span class="batch-category-badge">${item.categoryName}</span>
          </div>

          <div class="batch-card-meta">
            <div>
              <div class="batch-card-metric-label">Weight</div>
              <div class="batch-card-metric-val">${item.weightGrams}g</div>
            </div>
            <div>
              <div class="batch-card-metric-label">Landed Cost</div>
              <div class="batch-card-metric-val landed">${formatBDT(item.landedCostBdt)}</div>
            </div>
            <div>
              <div class="batch-card-metric-label">Selling Price</div>
              <div class="batch-card-metric-val">${formatBDT(item.sellingPriceBdt)}</div>
            </div>
          </div>

          <div class="batch-card-footer">
            <div class="batch-card-profit">Profit: +${formatBDT(item.netProfitBdt)} (${item.marginPercent.toFixed(1)}%)</div>
            <div style="display:flex; gap:6px;">
              <button class="btn-table-icon" title="Load into Calculator" data-load-id="${item.id}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
              </button>
              <button class="btn-table-icon delete" title="Remove" data-delete-id="${item.id}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
        `;
        this.batchMobileCards.appendChild(card);
      }
    });

    // Attach row/card event listeners
    document.querySelectorAll('[data-delete-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.deleteId;
        state.batch = state.batch.filter(b => b.id !== id);
        state.saveBatch(state.batch);
        this.renderBatchSummary();
        showToast('Item removed from batch', 'info');
      });
    });

    document.querySelectorAll('[data-load-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.loadId;
        const item = state.batch.find(b => b.id === id);
        if (item) {
          this.inputProductName.value = item.name;
          this.selectCategory.value = item.categoryId;
          this.inputWeightGrams.value = item.weightGrams;
          this.inputPriceRmb.value = item.priceRmb;
          this.syncStateFromInputs();
          this.updateRouteVisualizer();
          this.calculateAndRender();
          this.switchMobileTab('calc');
          showToast(`Loaded "${item.name}" into calculator`, 'info');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });

    // KPI Metrics
    this.statTotalItems.textContent = items.length.toString();
    this.statTotalWeight.textContent = `${(totalWeightGrams / 1000).toFixed(2)} kg`;
    this.statTotalCapital.textContent = formatBDT(totalCapital, 0);
    this.statTotalRevenue.textContent = formatBDT(totalRevenue, 0);
    this.statTotalProfit.textContent = `+${formatBDT(totalProfit, 0)}`;

    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    this.statAvgMargin.textContent = `${avgMargin.toFixed(1)}%`;
  },

  handleExportCsv() {
    if (state.batch.length === 0) {
      showToast('Batch list is empty', 'error');
      return;
    }

    const headers = ['Item Name', 'Category', 'Weight (gm)', 'Taobao Price (RMB)', 'Landed Cost (BDT)', 'Selling Price (BDT)', 'Net Profit (BDT)', 'Margin (%)', 'Time'];
    const rows = state.batch.map(item => [
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.categoryName}"`,
      item.weightGrams,
      item.priceRmb,
      item.landedCostBdt.toFixed(2),
      item.sellingPriceBdt.toFixed(2),
      item.netProfitBdt.toFixed(2),
      item.marginPercent.toFixed(1),
      `"${item.date}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `taobao_rajshahi_batch_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Batch exported to CSV!', 'success');
  },

  handleCopyBatchSummary() {
    if (state.batch.length === 0) {
      showToast('Batch list is empty', 'error');
      return;
    }

    let totalWeightGrams = 0;
    let totalCapital = 0;
    let totalRevenue = 0;
    let totalProfit = 0;

    let itemLines = state.batch.map((it, idx) => {
      totalWeightGrams += it.weightGrams;
      totalCapital += it.landedCostBdt;
      totalRevenue += it.sellingPriceBdt;
      totalProfit += it.netProfitBdt;
      return `${idx + 1}. ${it.name} [${it.categoryName}] - ${it.weightGrams}g | Landed: ${formatBDT(it.landedCostBdt)} | Sell: ${formatBDT(it.sellingPriceBdt)} | Profit: +${formatBDT(it.netProfitBdt)}`;
    }).join('\n');

    const summaryText = `📋 [Taobao ➔ Rajshahi Batch Shipment Summary]
Total Items: ${state.batch.length}
Total Weight: ${(totalWeightGrams / 1000).toFixed(2)} kg (${totalWeightGrams} gm)
Total Capital (Landed Cost): ${formatBDT(totalCapital)}
Total Projected Revenue: ${formatBDT(totalRevenue)}
Total Net Profit: +${formatBDT(totalProfit)} (${totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}% Margin)
----------------------------------------
Items Breakdown:
${itemLines}
----------------------------------------
Exported from Taobao ➔ Rajshahi Landed Cost Engine`;

    navigator.clipboard.writeText(summaryText).then(() => {
      showToast('Batch summary copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Could not access clipboard', 'error');
    });
  },

  handleClearBatch() {
    if (state.batch.length === 0) return;
    if (confirm('Are you sure you want to clear all items in this session batch?')) {
      state.batch = [];
      state.saveBatch([]);
      this.renderBatchSummary();
      showToast('Batch list cleared', 'info');
    }
  },

  // ---------------------------------------------------------------------------
  // Settings Modal / Mobile Bottom Sheet
  // ---------------------------------------------------------------------------
  openSettingsModal() {
    this.settingRmbRate.value = state.settings.rmbRate;
    this.settingChinaRmb.value = state.settings.chinaDomesticRmb;
    this.settingChinaKg.value = state.settings.chinaDomesticKg;
    this.settingBdBdt.value = state.settings.bdDomesticBdt;
    this.settingBdKg.value = state.settings.bdDomesticKg;
    this.settingBuffer.value = state.settings.safetyBufferPerGram;
    this.settingRound.value = state.settings.roundToNearest || 'none';

    this.renderCategorySettingsRows();
    this.updateModalLivePreviews();

    this.modalSettings.classList.add('open');
    document.body.style.overflow = 'hidden';
  },

  closeSettingsModal() {
    this.modalSettings.classList.remove('open');
    document.body.style.overflow = '';
  },

  renderCategorySettingsRows() {
    this.categoryTableBody.innerHTML = '';
    state.categories.forEach((cat, index) => {
      const tr = document.createElement('tr');
      tr.className = 'category-row';
      tr.innerHTML = `
        <td>
          <input type="text" class="category-name-input" value="${cat.name}" data-cat-idx="${index}" data-cat-field="name" placeholder="Category name" />
        </td>
        <td style="text-align:right">
          <input type="number" class="category-rate-input" value="${cat.ratePerKg}" data-cat-idx="${index}" data-cat-field="rate" min="10" step="10" />
        </td>
        <td style="text-align:right">
          <span class="category-calc-badge" id="catPreview_${index}">৳${(cat.ratePerKg / 1000).toFixed(2)}/g</span>
        </td>
        <td style="text-align:center">
          <button type="button" class="btn-table-icon delete" data-cat-delete="${index}" title="Delete Category">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </td>
      `;
      this.categoryTableBody.appendChild(tr);
    });

    this.categoryTableBody.querySelectorAll('.category-rate-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = e.target.dataset.catIdx;
        const val = parseFloat(e.target.value) || 0;
        const badge = document.getElementById(`catPreview_${idx}`);
        if (badge) badge.textContent = `৳${(val / 1000).toFixed(2)}/g`;
      });
    });

    this.categoryTableBody.querySelectorAll('[data-cat-delete]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.catDelete, 10);
        if (state.categories.length <= 1) {
          showToast('Keep at least one category', 'error');
          return;
        }
        state.categories.splice(idx, 1);
        this.renderCategorySettingsRows();
      });
    });
  },

  handleAddCategoryRow() {
    const newId = 'custom_' + Date.now();
    state.categories.push({
      id: newId,
      name: 'New Custom Category',
      ratePerKg: 900,
      isDefault: false
    });
    this.renderCategorySettingsRows();
  },

  updateModalLivePreviews() {
    const tempSettings = {
      rmbRate: parseFloat(this.settingRmbRate.value) || 18.00,
      chinaDomesticRmb: parseFloat(this.settingChinaRmb.value) || 30,
      chinaDomesticKg: parseFloat(this.settingChinaKg.value) || 10,
      bdDomesticBdt: parseFloat(this.settingBdBdt.value) || 500,
      bdDomesticKg: parseFloat(this.settingBdKg.value) || 10,
      safetyBufferPerGram: parseFloat(this.settingBuffer.value) || 0.05
    };

    const leg1 = CalcEngine.getChinaDomesticRatePerGram(tempSettings);
    const leg3 = CalcEngine.getBdDomesticRatePerGram(tempSettings);
    const buffer = tempSettings.safetyBufferPerGram;

    this.previewLeg1.textContent = `৳${leg1.toFixed(3)}/g (${(tempSettings.chinaDomesticRmb / tempSettings.chinaDomesticKg).toFixed(1)} ¥/kg)`;
    this.previewLeg3.textContent = `৳${leg3.toFixed(3)}/g (${(tempSettings.bdDomesticBdt / tempSettings.bdKg).toFixed(1)} ৳/kg)`;
    this.previewBuffer.textContent = `+৳${buffer.toFixed(2)}/g`;
  },

  handleSaveSettings() {
    const updatedCategories = [];
    const rows = this.categoryTableBody.querySelectorAll('.category-row');
    rows.forEach((row, i) => {
      const nameInput = row.querySelector('.category-name-input');
      const rateInput = row.querySelector('.category-rate-input');
      if (nameInput && rateInput) {
        const existing = state.categories[i] || {};
        updatedCategories.push({
          id: existing.id || 'cat_' + Date.now() + '_' + i,
          name: nameInput.value.trim() || `Category ${i + 1}`,
          ratePerKg: Math.max(1, parseFloat(rateInput.value) || 800),
          isDefault: existing.isDefault || false
        });
      }
    });

    state.saveCategories(updatedCategories);

    const newSettings = {
      rmbRate: Math.max(0.01, parseFloat(this.settingRmbRate.value) || 18.00),
      chinaDomesticRmb: Math.max(0, parseFloat(this.settingChinaRmb.value) || 0),
      chinaDomesticKg: Math.max(0.1, parseFloat(this.settingChinaKg.value) || 1),
      bdDomesticBdt: Math.max(0, parseFloat(this.settingBdBdt.value) || 0),
      bdDomesticKg: Math.max(0.1, parseFloat(this.settingBdKg.value) || 1),
      safetyBufferPerGram: Math.max(0, parseFloat(this.settingBuffer.value) || 0),
      roundToNearest: this.settingRound.value
    };

    state.saveSettings(newSettings);
    localStorage.setItem(STORAGE_KEYS.HAS_ONBOARDED, 'true');

    this.renderCategorySelect();
    this.updateRouteVisualizer();
    this.calculateAndRender();
    this.closeSettingsModal();
    showToast('Settings saved!', 'success');
  },

  handleResetSettings() {
    if (confirm('Reset all exchange rates, courier fees, and categories to defaults?')) {
      state.settings = { ...DEFAULT_SETTINGS };
      state.categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
      state.saveSettings(state.settings);
      state.saveCategories(state.categories);

      this.openSettingsModal();
      this.renderCategorySelect();
      this.updateRouteVisualizer();
      this.calculateAndRender();
      showToast('Reset to defaults', 'info');
    }
  },

  checkFirstVisit() {
    const hasOnboarded = localStorage.getItem(STORAGE_KEYS.HAS_ONBOARDED);
    if (!hasOnboarded) {
      setTimeout(() => {
        this.openSettingsModal();
      }, 400);
    }
  },

  // ---------------------------------------------------------------------------
  // Theme Management
  // ---------------------------------------------------------------------------
  getInitialTheme() {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
  },

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    this.applyTheme(next);
    showToast(`Switched to ${next} mode`, 'info');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  UI.init();
});
