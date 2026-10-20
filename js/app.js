/**
 * TAOBAO ➔ RAJSHAHI LANDED COST & PRICING ENGINE
 * Granular Weight-Proportional Costing (GWPC) Architecture
 */

// -----------------------------------------------------------------------------
// Storage Keys & Default Configuration
// -----------------------------------------------------------------------------
const STORAGE_KEYS = {
  SETTINGS: 'rcb_settings_v2',
  CATEGORIES: 'rcb_categories_v2',
  BATCH: 'rcb_batch_v2',
  THEME: 'rcb_theme_v2',
  HAS_ONBOARDED: 'rcb_has_onboarded_v2'
};

const DEFAULT_SETTINGS = {
  rmbRate: 19.00,             // 1 RMB = 19.00 BDT
  sundarbanBdt: 500.00,       // 500 BDT per 10 kg (= 0.05 BDT/g)
  sundarbanKg: 10.00,         // 10 kg courier basis
  chinaDomesticRmb: 0.00,     // Friend China domestic leg (RMB / 10kg)
  chinaDomesticKg: 10.00,     // 10 kg basis
  safetyBufferPerGram: 0.00,  // Packaging/buffer BDT per gram
  roundToNearest: 'none',     // 'none', '10', '50'
  defaultFlatMarkup: 300      // Fixed flat markup in BDT (TK)
};

const DEFAULT_CATEGORIES = [
  { id: 'clothing', name: 'Clothing', ratePerKg: 900, isDefault: true, desc: 'Apparel & Dresses' },
  { id: 'footwear', name: 'Footwear', ratePerKg: 900, isDefault: true, desc: 'Shoes & Sneakers' },
  { id: 'jwelry', name: 'Jwelry', ratePerKg: 800, isDefault: true, desc: 'Jewelry & Accessories' },
  { id: 'bags', name: 'Bags', ratePerKg: 800, isDefault: true, desc: 'Handbags & Totes' }
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
      categoryId: 'footwear',
      priceRmb: 10,
      weightGrams: 100,
      costPerKg: 900,
      profitMode: 'flat', // Fixed flat markup model
      flatMarkupBdt: this.settings.defaultFlatMarkup || 300
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
      if (stored) {
        const parsed = JSON.parse(stored);
        const hasAllFour = ['clothing', 'footwear', 'jwelry', 'bags'].every(id => parsed.some(c => c.id === id));
        if (hasAllFour) {
          return parsed;
        }
      }
      return JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
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
// Core Mathematical Calculations (GWPC Engine)
// -----------------------------------------------------------------------------
const CalcEngine = {
  // China domestic leg per gram: (D_china / 10000) * R
  getChinaDomesticRatePerGram(settings = state.settings) {
    const rmb = parseFloat(settings.chinaDomesticRmb) || 0;
    const kg = parseFloat(settings.chinaDomesticKg) || 10;
    if (rmb <= 0 || kg <= 0) return 0;
    return (rmb / (kg * 1000)) * (parseFloat(settings.rmbRate) || 19.0);
  },

  // Local courier (Sundarban L_local) per gram: L_local / 10000
  getLocalCourierRatePerGram(settings = state.settings) {
    const bdt = parseFloat(settings.sundarbanBdt) || 500;
    const kg = parseFloat(settings.sundarbanKg) || 10;
    if (bdt <= 0 || kg <= 0) return 0;
    return bdt / (kg * 1000); // 500 / 10000 = 0.05 BDT/g
  },

  // Forwarder freight leg per gram: L_intl / 1000
  getIntlFreightRatePerGram(ratePerKg) {
    const rate = parseFloat(ratePerKg) || 900;
    return rate / 1000; // 900 / 1000 = 0.90 BDT/g
  },

  // Total shipping rate per gram: γ_total = γ_intl + γ_local + γ_china + Buffer
  getTotalShippingRatePerGram(categoryRatePerKg, settings = state.settings) {
    const intlRate = this.getIntlFreightRatePerGram(categoryRatePerKg);
    const localRate = this.getLocalCourierRatePerGram(settings);
    const chinaRate = this.getChinaDomesticRatePerGram(settings);
    const buffer = parseFloat(settings.safetyBufferPerGram) || 0;
    return intlRate + localRate + chinaRate + buffer;
  },

  // Complete GWPC Calculation
  calculate(params, settings = state.settings, categories = state.categories) {
    const weight = Math.max(0, parseFloat(params.weightGrams) || 0);
    const priceRmb = Math.max(0, parseFloat(params.priceRmb) || 0);
    const rmbRate = Math.max(0.001, parseFloat(settings.rmbRate) || 19.0);

    const category = categories.find(c => c.id === params.categoryId) || categories[0] || DEFAULT_CATEGORIES[0];
    const categoryCostPerKg = parseFloat(params.costPerKg ?? category.ratePerKg) || 900;

    const intlRatePerGm = this.getIntlFreightRatePerGram(categoryCostPerKg);
    const localRatePerGm = this.getLocalCourierRatePerGram(settings);
    const chinaRatePerGm = this.getChinaDomesticRatePerGram(settings);
    const bufferRatePerGm = parseFloat(settings.safetyBufferPerGram) || 0;

    const totalShippingRatePerGm = intlRatePerGm + localRatePerGm + chinaRatePerGm + bufferRatePerGm;

    // Step 1: Base Purchase Cost: C_base = P_rmb * R
    const baseCostBdt = priceRmb * rmbRate;

    // Step 2 & 3: Total Logistics Cost: C_logistics = W_gm * γ_total
    const logisticsCostBdt = weight * totalShippingRatePerGm;

    // Step 4: Final Landed Cost: C_landed = C_base + C_logistics
    const totalLandedCostBdt = baseCostBdt + logisticsCostBdt;

    // Fixed Flat Markup Selling Price: Selling Price = C_landed + Flat_Markup
    const flatMarkup = Math.max(0, parseFloat(params.flatMarkupBdt) || 0);
    const rawSellingPriceBdt = totalLandedCostBdt + flatMarkup;

    let sellingPriceBdt = rawSellingPriceBdt;
    if (settings.roundToNearest === '10') {
      sellingPriceBdt = Math.ceil(rawSellingPriceBdt / 10) * 10;
    } else if (settings.roundToNearest === '50') {
      sellingPriceBdt = Math.ceil(rawSellingPriceBdt / 50) * 50;
    }

    const netProfitBdt = sellingPriceBdt - totalLandedCostBdt;
    const realizedMarginPct = sellingPriceBdt > 0 ? (netProfitBdt / sellingPriceBdt) * 100 : 0;
    const markupPct = totalLandedCostBdt > 0 ? (netProfitBdt / totalLandedCostBdt) * 100 : 0;

    return {
      priceRmb,
      weightGrams: weight,
      rmbRate,
      category,
      categoryCostPerKg,
      intlRatePerGm,
      localRatePerGm,
      chinaRatePerGm,
      bufferRatePerGm,
      totalShippingRatePerGm,
      baseCostBdt,
      logisticsCostBdt,
      totalLandedCostBdt,
      flatMarkupBdt: flatMarkup,
      sellingPriceBdt,
      netProfitBdt,
      realizedMarginPct,
      markupPct
    };
  }
};

// -----------------------------------------------------------------------------
// Formatters & Helpers
// -----------------------------------------------------------------------------
const formatBDT = (amount) => {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount).replace('BDT', '৳');
};

const formatRMB = (amount) => {
  return `¥${Number(amount).toFixed(2)}`;
};

const showToast = (message, type = 'info') => {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      ${type === 'success' ? '<polyline points="20 6 9 17 4 12"></polyline>' : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>'}
    </svg>
    <span>${message}</span>
  `;
  container.appendChild(toast);

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
    this.populateInitialValues();
    this.bindEvents();
    this.applyTheme(this.getInitialTheme());
    this.renderBatchSummary();
    this.calculateAndRender();
    this.selectProductChoice(state.calculator.categoryId, true);
  },

  cacheDom() {
    // Product Choice Elements (Step 1)
    this.sectionProductChoice = document.getElementById('sectionProductChoice');
    this.choiceCards = document.querySelectorAll('.choice-card');
    this.choiceStatusCard = document.getElementById('choiceStatusCard');
    this.statusPulseDot = document.getElementById('statusPulseDot');
    this.statusTitle = document.getElementById('statusTitle');
    this.statusSubtitle = document.getElementById('statusSubtitle');
    this.btnContinueChoice = document.getElementById('btnContinueChoice');
    this.calculatorSuite = document.getElementById('calculatorSuite');

    // Header elements
    this.badgeExchangeRate = document.getElementById('badgeExchangeRate');
    this.btnSettings = document.getElementById('btnSettings');
    this.btnThemeToggle = document.getElementById('btnThemeToggle');

    // GWPC Panel 1: Session Settings
    this.settingRmbRate = document.getElementById('settingRmbRate');
    this.settingSundarbanBdt = document.getElementById('settingSundarbanBdt');
    this.pillSundarbanRate = document.getElementById('pillSundarbanRate');
    this.categorySelect = document.getElementById('categorySelect');
    this.settingCostPerKg = document.getElementById('settingCostPerKg');
    this.pillIntlRate = document.getElementById('pillIntlRate');
    this.gwpcCombinedFactor = document.getElementById('gwpcCombinedFactor');
    this.gwpcFactorFormula = document.getElementById('gwpcFactorFormula');
    this.settingChinaRmb = document.getElementById('settingChinaRmb');
    this.pillChinaRate = document.getElementById('pillChinaRate');
    this.settingBuffer = document.getElementById('settingBuffer');

    // GWPC Panel 2: Active Item
    this.inputProductName = document.getElementById('productName');
    this.inputPriceRmb = document.getElementById('priceRmb');
    this.inputWeightGrams = document.getElementById('weightGrams');

    // GWPC Panel 3: Instant Result
    this.gwpcTotalLanded = document.getElementById('gwpcTotalLanded');
    this.gwpcBaseProductText = document.getElementById('gwpcBaseProductText');
    this.gwpcShippingText = document.getElementById('gwpcShippingText');
    this.gwpcSellingPrice = document.getElementById('gwpcSellingPrice');
    this.gwpcSellingFormula = document.getElementById('gwpcSellingFormula');
    this.gwpcNetProfit = document.getElementById('gwpcNetProfit');
    this.inputFlatMarkup = document.getElementById('flatMarkup');
    this.markupPills = document.querySelectorAll('.gwpc-pill-btn[data-markup]');

    // Action buttons
    this.btnSaveBatch = document.getElementById('btnSaveBatch');
    this.btnClearForm = document.getElementById('btnClearForm');
    this.btnCopyQuote = document.getElementById('btnCopyQuote');

    // Batch Elements
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

    // Settings Modal (if opened)
    this.modalSettings = document.getElementById('modalSettings');
    this.btnCloseModal = document.getElementById('btnCloseModal');
    this.btnSaveModal = document.getElementById('btnSaveModal');
    this.btnResetSettings = document.getElementById('btnResetSettings');
    this.btnAddCategory = document.getElementById('btnAddCategory');
    this.categoryTableBody = document.getElementById('categoryTableBody');
    this.modalSettingRmbRate = document.getElementById('settingRmbRate_modal');
  },

  populateInitialValues() {
    if (this.settingRmbRate) this.settingRmbRate.value = state.settings.rmbRate;
    if (this.settingSundarbanBdt) this.settingSundarbanBdt.value = state.settings.sundarbanBdt;
    if (this.settingChinaRmb) this.settingChinaRmb.value = state.settings.chinaDomesticRmb;
    if (this.settingBuffer) this.settingBuffer.value = state.settings.safetyBufferPerGram;

    const currentCat = state.categories.find(c => c.id === state.calculator.categoryId) || state.categories[0];
    if (this.categorySelect) this.categorySelect.value = currentCat.id;
    if (this.settingCostPerKg) this.settingCostPerKg.value = currentCat.ratePerKg;

    if (this.inputPriceRmb) this.inputPriceRmb.value = state.calculator.priceRmb;
    if (this.inputWeightGrams) this.inputWeightGrams.value = state.calculator.weightGrams;
    if (this.inputFlatMarkup) {
      this.inputFlatMarkup.value = state.calculator.flatMarkupBdt || 300;
      this.updateMarkupPillsActive(state.calculator.flatMarkupBdt || 300);
    }
  },

  updateMarkupPillsActive(val) {
    if (!this.markupPills) return;
    this.markupPills.forEach(pill => {
      const pVal = parseFloat(pill.dataset.markup);
      pill.classList.toggle('active', Math.abs(pVal - val) < 0.1);
    });
  },

  renderCategorySelect() {
    if (!this.categorySelect) return;
    this.categorySelect.innerHTML = '';
    state.categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = `${cat.name} (${cat.ratePerKg} BDT/kg)`;
      this.categorySelect.appendChild(option);
    });
  },

  bindEvents() {
    const triggerRecalc = () => {
      this.syncStateFromInputs();
      this.calculateAndRender();
    };

    // Live session settings inputs
    if (this.settingRmbRate) this.settingRmbRate.addEventListener('input', triggerRecalc);
    if (this.settingSundarbanBdt) this.settingSundarbanBdt.addEventListener('input', triggerRecalc);
    if (this.settingCostPerKg) this.settingCostPerKg.addEventListener('input', triggerRecalc);
    if (this.settingChinaRmb) this.settingChinaRmb.addEventListener('input', triggerRecalc);
    if (this.settingBuffer) this.settingBuffer.addEventListener('input', triggerRecalc);

    // Category dropdown in Session Settings
    if (this.categorySelect) {
      this.categorySelect.addEventListener('change', () => {
        const catId = this.categorySelect.value;
        const cat = state.categories.find(c => c.id === catId);
        if (cat && this.settingCostPerKg) {
          this.settingCostPerKg.value = cat.ratePerKg;
        }
        this.selectProductChoice(catId, true);
        triggerRecalc();
      });
    }

    // Top Product Choice Cards
    this.choiceCards.forEach(card => {
      card.addEventListener('click', () => {
        const catId = card.dataset.category;
        this.selectProductChoice(catId);
        triggerRecalc();
      });
    });

    if (this.btnContinueChoice) {
      this.btnContinueChoice.addEventListener('click', () => {
        const activeCat = state.categories.find(c => c.id === state.calculator.categoryId);
        const name = activeCat ? activeCat.name : 'Product';
        showToast(`Ready! Now calculating for ${name}.`, 'success');
        if (this.calculatorSuite) {
          this.calculatorSuite.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    // Active item inputs
    if (this.inputPriceRmb) this.inputPriceRmb.addEventListener('input', triggerRecalc);
    if (this.inputWeightGrams) this.inputWeightGrams.addEventListener('input', triggerRecalc);
    if (this.inputProductName) {
      this.inputProductName.addEventListener('input', () => {
        state.calculator.productName = this.inputProductName.value;
      });
    }

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
        triggerRecalc();
      });
    });

    // Fixed Flat Markup input and quick preset pills
    if (this.inputFlatMarkup) {
      this.inputFlatMarkup.addEventListener('input', () => {
        const val = parseFloat(this.inputFlatMarkup.value) || 0;
        state.calculator.flatMarkupBdt = val;
        this.updateMarkupPillsActive(val);
        triggerRecalc();
      });
    }

    if (this.markupPills) {
      this.markupPills.forEach(btn => {
        btn.addEventListener('click', () => {
          const val = parseFloat(btn.dataset.markup) || 300;
          if (this.inputFlatMarkup) this.inputFlatMarkup.value = val;
          state.calculator.flatMarkupBdt = val;
          this.updateMarkupPillsActive(val);
          triggerRecalc();
        });
      });
    }

    // Actions
    if (this.btnSaveBatch) this.btnSaveBatch.addEventListener('click', () => this.handleSaveToBatch());
    if (this.btnClearForm) this.btnClearForm.addEventListener('click', () => this.handleClearForm());
    if (this.btnCopyQuote) this.btnCopyQuote.addEventListener('click', () => this.handleCopyQuote());

    // Batch Actions
    if (this.btnExportCsv) this.btnExportCsv.addEventListener('click', () => this.handleExportCsv());
    if (this.btnCopyBatch) this.btnCopyBatch.addEventListener('click', () => this.handleCopyBatchSummary());
    if (this.btnClearBatch) this.btnClearBatch.addEventListener('click', () => this.handleClearBatch());

    // Theme Toggle
    if (this.btnThemeToggle) {
      this.btnThemeToggle.addEventListener('click', () => this.toggleTheme());
    }

    // Rate badge click
    if (this.badgeExchangeRate) {
      this.badgeExchangeRate.addEventListener('click', () => {
        if (this.settingRmbRate) {
          this.settingRmbRate.focus();
          this.settingRmbRate.select();
        }
      });
    }
  },

  syncStateFromInputs() {
    state.settings.rmbRate = Math.max(0.01, parseFloat(this.settingRmbRate?.value) || 19.0);
    state.settings.sundarbanBdt = Math.max(0, parseFloat(this.settingSundarbanBdt?.value) || 500);
    state.settings.chinaDomesticRmb = Math.max(0, parseFloat(this.settingChinaRmb?.value) || 0);
    state.settings.safetyBufferPerGram = Math.max(0, parseFloat(this.settingBuffer?.value) || 0);

    state.calculator.productName = this.inputProductName?.value?.trim() || '';
    state.calculator.categoryId = this.categorySelect?.value || 'footwear';
    state.calculator.priceRmb = Math.max(0, parseFloat(this.inputPriceRmb?.value) || 0);
    state.calculator.weightGrams = Math.max(0, parseFloat(this.inputWeightGrams?.value) || 0);
    state.calculator.costPerKg = Math.max(1, parseFloat(this.settingCostPerKg?.value) || 900);
    state.calculator.flatMarkupBdt = Math.max(0, parseFloat(this.inputFlatMarkup?.value) || 0);
    state.settings.defaultFlatMarkup = state.calculator.flatMarkupBdt;

    state.saveSettings(state.settings);

    // Update active category in state categories
    const activeCat = state.categories.find(c => c.id === state.calculator.categoryId);
    if (activeCat && this.settingCostPerKg) {
      activeCat.ratePerKg = parseFloat(this.settingCostPerKg.value) || activeCat.ratePerKg;
      state.saveCategories(state.categories);
    }
  },

  selectProductChoice(catId, silent = false) {
    const category = state.categories.find(c => c.id === catId);
    if (!category) return;

    state.calculator.categoryId = catId;
    if (this.categorySelect) {
      this.categorySelect.value = catId;
    }
    if (this.settingCostPerKg) {
      this.settingCostPerKg.value = category.ratePerKg;
    }

    // Update visual active state on choice cards
    this.choiceCards.forEach(card => {
      const isSelected = card.dataset.category === catId;
      card.classList.toggle('selected', isSelected);
      card.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    });

    if (this.choiceStatusCard) this.choiceStatusCard.classList.add('active');
    if (this.statusPulseDot) this.statusPulseDot.classList.add('active');
    if (this.statusTitle) this.statusTitle.textContent = `Selected: ${category.name}`;
    if (this.statusSubtitle) {
      const perGram = (category.ratePerKg / 1000).toFixed(2);
      this.statusSubtitle.textContent = `Forwarder freight: ৳${category.ratePerKg}/kg (৳${perGram}/g) · Guangzhou ➔ Dhaka Hub`;
    }
    if (this.btnContinueChoice) {
      this.btnContinueChoice.disabled = false;
      this.btnContinueChoice.innerHTML = `
        <span>Calculate ${category.name}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      `;
    }

    if (!silent) {
      this.syncStateFromInputs();
      this.calculateAndRender();
      showToast(`Selected: ${category.name}`, 'info');
    }
  },

  calculateAndRender() {
    const res = CalcEngine.calculate(state.calculator, state.settings, state.categories);

    // Update GWPC Instant Result (Panel 3)
    if (this.gwpcTotalLanded) {
      this.gwpcTotalLanded.innerHTML = `${Math.round(res.totalLandedCostBdt)} <span class="gwpc-hero-total-unit">TK</span>`;
    }
    if (this.gwpcBaseProductText) {
      this.gwpcBaseProductText.textContent = `${Math.round(res.baseCostBdt)} TK (${res.priceRmb} ¥ × ${res.rmbRate.toFixed(1)})`;
    }
    if (this.gwpcShippingText) {
      this.gwpcShippingText.textContent = `${Math.round(res.logisticsCostBdt)} TK (${res.weightGrams}g × ${res.totalShippingRatePerGm.toFixed(2)}/g)`;
    }
    if (this.gwpcSellingPrice) {
      this.gwpcSellingPrice.textContent = `৳${Math.round(res.sellingPriceBdt)} TK`;
    }
    if (this.gwpcSellingFormula) {
      this.gwpcSellingFormula.textContent = `৳${Math.round(res.totalLandedCostBdt)} (Landed) + ৳${Math.round(res.netProfitBdt)} (Markup)`;
    }
    if (this.gwpcNetProfit) {
      this.gwpcNetProfit.textContent = `+৳${Math.round(res.netProfitBdt)} TK`;
    }

    // Update Session Settings (Panel 1) live pill badges
    if (this.pillSundarbanRate) {
      this.pillSundarbanRate.textContent = `(=${res.localRatePerGm.toFixed(2)}/g)`;
    }
    if (this.pillIntlRate) {
      this.pillIntlRate.textContent = `(=${res.intlRatePerGm.toFixed(2)}/g)`;
    }
    if (this.pillChinaRate) {
      this.pillChinaRate.textContent = `(=${res.chinaRatePerGm.toFixed(2)}/g)`;
    }
    if (this.gwpcCombinedFactor) {
      this.gwpcCombinedFactor.textContent = `${res.totalShippingRatePerGm.toFixed(3)} BDT/g`;
    }
    if (this.gwpcFactorFormula) {
      let formulaStr = `γ_intl (${res.intlRatePerGm.toFixed(2)}) + γ_local (${res.localRatePerGm.toFixed(2)})`;
      if (res.chinaRatePerGm > 0) formulaStr += ` + γ_china (${res.chinaRatePerGm.toFixed(2)})`;
      if (res.bufferRatePerGm > 0) formulaStr += ` + Buffer (${res.bufferRatePerGm.toFixed(2)})`;
      this.gwpcFactorFormula.textContent = formulaStr;
    }

    // Header badge
    if (this.badgeExchangeRate) {
      this.badgeExchangeRate.innerHTML = `<span>¥1 = ৳${res.rmbRate.toFixed(2)}</span>`;
    }
  },

  handleSaveToBatch() {
    this.syncStateFromInputs();
    const res = CalcEngine.calculate(state.calculator, state.settings, state.categories);
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
      weightGrams: res.weightGrams,
      priceRmb: res.priceRmb,
      landedCostBdt: res.totalLandedCostBdt,
      flatMarkupBdt: res.netProfitBdt,
      sellingPriceBdt: res.sellingPriceBdt,
      netProfitBdt: res.netProfitBdt,
      marginPercent: res.realizedMarginPct,
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    state.batch.unshift(batchItem);
    state.saveBatch(state.batch);

    this.renderBatchSummary();
    showToast(`Added "${itemName}" to batch!`, 'success');
  },

  handleClearForm() {
    if (this.inputProductName) this.inputProductName.value = '';
    if (this.inputPriceRmb) this.inputPriceRmb.value = '10';
    if (this.inputWeightGrams) this.inputWeightGrams.value = '100';
    state.calculator.productName = '';
    state.calculator.priceRmb = 10;
    state.calculator.weightGrams = 100;
    this.calculateAndRender();
    showToast('Reset to default (10 ¥, 100g)', 'info');
  },

  handleCopyQuote() {
    this.syncStateFromInputs();
    const res = CalcEngine.calculate(state.calculator, state.settings, state.categories);
    const title = state.calculator.productName || res.category.name;

    const quoteText = `Taobao Landed Cost (GWPC)
• Item: ${title}
• Category: ${res.category.name}
• Base Product: ${Math.round(res.baseCostBdt)} TK (${res.priceRmb} ¥ × ${res.rmbRate.toFixed(1)})
• Shipping: ${Math.round(res.logisticsCostBdt)} TK (${res.weightGrams}g × ${res.totalShippingRatePerGm.toFixed(2)}/g)
TOTAL LANDED COST: ${Math.round(res.totalLandedCostBdt)} TK
• Fixed Markup: +${Math.round(res.netProfitBdt)} TK
SUGGESTED SELLING PRICE: ${Math.round(res.sellingPriceBdt)} TK (Net Profit: +${Math.round(res.netProfitBdt)} TK)`;

    navigator.clipboard.writeText(quoteText).then(() => {
      showToast('Quote copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Could not access clipboard', 'error');
    });
  },

  renderBatchSummary() {
    const items = state.batch;

    if (!this.batchEmptyState) return;

    if (items.length === 0) {
      this.batchEmptyState.style.display = 'block';
      if (this.batchTableContainer) this.batchTableContainer.style.display = 'none';
      if (this.batchMobileCards) this.batchMobileCards.innerHTML = '';
      if (this.statTotalItems) this.statTotalItems.textContent = '0';
      if (this.statTotalWeight) this.statTotalWeight.textContent = '0.00 kg';
      if (this.statTotalCapital) this.statTotalCapital.textContent = '৳0';
      if (this.statTotalRevenue) this.statTotalRevenue.textContent = '৳0';
      if (this.statTotalProfit) this.statTotalProfit.textContent = '৳0';
      if (this.statAvgMargin) this.statAvgMargin.textContent = '0%';
      return;
    }

    this.batchEmptyState.style.display = 'none';
    if (this.batchTableContainer && window.innerWidth >= 768) {
      this.batchTableContainer.style.display = 'block';
    }

    let totalWeightGrams = 0;
    let totalCapital = 0;
    let totalRevenue = 0;
    let totalProfit = 0;

    if (this.batchTableBody) this.batchTableBody.innerHTML = '';
    if (this.batchMobileCards) this.batchMobileCards.innerHTML = '';

    items.forEach((item) => {
      totalWeightGrams += item.weightGrams;
      totalCapital += item.landedCostBdt;
      totalRevenue += item.sellingPriceBdt;
      totalProfit += item.netProfitBdt;

      // 1. Desktop Table Row
      if (this.batchTableBody) {
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
      }

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
            <div class="batch-card-profit">Profit: +${formatBDT(item.netProfitBdt)} (Markup: +৳${Math.round(item.flatMarkupBdt || item.netProfitBdt)})</div>
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

    // Update KPI Summaries
    if (this.statTotalItems) this.statTotalItems.textContent = items.length.toString();
    if (this.statTotalWeight) this.statTotalWeight.textContent = `${(totalWeightGrams / 1000).toFixed(2)} kg`;
    if (this.statTotalCapital) this.statTotalCapital.textContent = formatBDT(totalCapital);
    if (this.statTotalRevenue) this.statTotalRevenue.textContent = formatBDT(totalRevenue);
    if (this.statTotalProfit) this.statTotalProfit.textContent = `+${formatBDT(totalProfit)}`;

    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    if (this.statAvgMargin) this.statAvgMargin.textContent = `${avgMargin.toFixed(1)}% Avg Margin`;

    this.bindBatchItemButtons();
  },

  bindBatchItemButtons() {
    document.querySelectorAll('[data-load-id]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.loadId;
        const item = state.batch.find(i => i.id === id);
        if (item) {
          if (this.inputProductName) this.inputProductName.value = item.name;
          if (this.inputPriceRmb) this.inputPriceRmb.value = item.priceRmb;
          if (this.inputWeightGrams) this.inputWeightGrams.value = item.weightGrams;
          if (this.inputFlatMarkup && item.flatMarkupBdt) {
            this.inputFlatMarkup.value = item.flatMarkupBdt;
            state.calculator.flatMarkupBdt = item.flatMarkupBdt;
            this.updateMarkupPillsActive(item.flatMarkupBdt);
          }
          this.selectProductChoice(item.categoryId, true);
          this.syncStateFromInputs();
          this.calculateAndRender();
          if (this.calculatorSuite) this.calculatorSuite.scrollIntoView({ behavior: 'smooth' });
          showToast(`Loaded "${item.name}"`, 'info');
        }
      };
    });

    document.querySelectorAll('[data-delete-id]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.deleteId;
        state.batch = state.batch.filter(i => i.id !== id);
        state.saveBatch(state.batch);
        this.renderBatchSummary();
        showToast('Item removed from batch', 'info');
      };
    });
  },

  handleClearBatch() {
    if (state.batch.length === 0) return;
    if (confirm('Clear all items from session batch?')) {
      state.batch = [];
      state.saveBatch(state.batch);
      this.renderBatchSummary();
      showToast('Batch cleared', 'info');
    }
  },

  handleExportCsv() {
    if (state.batch.length === 0) {
      showToast('Batch is empty', 'error');
      return;
    }
    const headers = ['Item Name', 'Category', 'Weight (g)', 'Taobao (RMB)', 'Landed Cost (BDT)', 'Fixed Markup (BDT)', 'Selling Price (BDT)', 'Net Profit (BDT)', 'Time'];
    const rows = state.batch.map(i => [
      `"${i.name.replace(/"/g, '""')}"`,
      `"${i.categoryName}"`,
      i.weightGrams,
      i.priceRmb,
      i.landedCostBdt.toFixed(2),
      (i.flatMarkupBdt || i.netProfitBdt).toFixed(2),
      i.sellingPriceBdt.toFixed(2),
      i.netProfitBdt.toFixed(2),
      `"${i.date}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `taobao_rajshahi_batch_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('CSV downloaded', 'success');
  },

  handleCopyBatchSummary() {
    if (state.batch.length === 0) {
      showToast('Batch is empty', 'error');
      return;
    }
    let totalWeightGrams = 0;
    let totalCapital = 0;
    let totalRevenue = 0;
    let totalProfit = 0;

    let text = `📦 TAOBAO ➔ RAJSHAHI BATCH ORDER SUMMARY\n`;
    text += `Generated: ${new Date().toLocaleString()}\n`;
    text += `-------------------------------------------------\n`;

    state.batch.forEach((i, idx) => {
      totalWeightGrams += i.weightGrams;
      totalCapital += i.landedCostBdt;
      totalRevenue += i.sellingPriceBdt;
      totalProfit += i.netProfitBdt;
      text += `${idx + 1}. ${i.name} [${i.categoryName}] - ${i.weightGrams}g | Taobao: ¥${i.priceRmb} | Landed: ৳${Math.round(i.landedCostBdt)} | Sell: ৳${Math.round(i.sellingPriceBdt)} (Profit: +৳${Math.round(i.netProfitBdt)})\n`;
    });

    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    text += `-------------------------------------------------\n`;
    text += `TOTAL ITEMS: ${state.batch.length}\n`;
    text += `TOTAL WEIGHT: ${(totalWeightGrams / 1000).toFixed(2)} kg\n`;
    text += `CAPITAL REQUIRED: ৳${Math.round(totalCapital)}\n`;
    text += `PROJECTED REVENUE: ৳${Math.round(totalRevenue)}\n`;
    text += `PROJECTED NET PROFIT: +৳${Math.round(totalProfit)} (${avgMargin.toFixed(1)}% Avg Margin)\n`;

    navigator.clipboard.writeText(text).then(() => {
      showToast('Batch summary copied!', 'success');
    }).catch(() => {
      showToast('Could not access clipboard', 'error');
    });
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
