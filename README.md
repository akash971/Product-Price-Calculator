# 📦 Taobao ➔ Rajshahi Cross-Border Landed Cost & Micro-Pricing Engine (PWA)

A clean, high-performance, mobile-responsive **Landed-Cost & Micro-Pricing Web Application (PWA-Ready)** designed specifically for cross-border e-commerce merchants importing goods from **Taobao (China)** to **Rajshahi (Bangladesh)**.

---

## ⚡ Core Mathematical Architecture: Dynamic "BDT per gram" Model

The app aggregates the entire international & domestic logistics route into an exact, dynamic **BDT per gram** shipping cost model:

### 1. Leg Formulas
| Leg | Description | Input Format | Auto-Calculated Formula |
|---|---|---|---|
| **Leg 1: China Domestic** | Supplier / Friend to Guangzhou Forwarder Hub | Rate in RMB per X kg (e.g., 30 RMB / 10 kg) | `(RMB_per_kg / 1000) * RMB_Rate` = `China_Domestic_BDT_per_gram` |
| **Leg 2: Forwarder Freight** | Guangzhou to Dhaka Forwarder Air/Sea Cargo | BDT per kg by category (e.g., 800 - 1400 BDT/kg) | `Category_BDT_per_kg / 1000` = `Category_Guangzhou_BDT_per_gram` |
| **Leg 3: BD Domestic Delivery** | Dhaka Hub to Rajshahi (Sundarban / Steadfast / Courier) | Rate in BDT per X kg (e.g., 500 BDT / 10 kg) | `BDT_per_kg / 1000` = `BD_Domestic_BDT_per_gram` |
| **Leg 4: Safety Contingency** | Buffer for packaging cartons, tape, moisture bags & currency shifts | Rate in BDT per gram (e.g., 0.05 BDT/gm) | Direct addition to shipping rate |

### 2. Aggregation & Pricing Logic
1. `Total_Shipping_Rate_per_gram = China_Domestic_BDT_per_gram + Category_Guangzhou_BDT_per_gram + BD_Domestic_BDT_per_gram + Safety_Buffer`
2. `Product_Base_Cost_BDT = Taobao_Price_RMB * RMB_Rate`
3. `Total_Shipping_Cost_BDT = Product_Weight_Grams * Total_Shipping_Rate_per_gram`
4. `Total_Landed_Cost_BDT = Product_Base_Cost_BDT + Total_Shipping_Cost_BDT`
5. `Selling_Price_BDT`:
   - **Target Margin %**: `Total_Landed_Cost_BDT / (1 - (Margin_Percent / 100))`
   - **Flat Markup**: `Total_Landed_Cost_BDT + Flat_Markup_BDT`
6. `Net_Profit_BDT = Selling_Price_BDT - Total_Landed_Cost_BDT`

---

## 🌟 Key Features

1. **Phase 1: Global Variables & Settings Modal**
   - Live editable RMB ➔ BDT exchange rate (default: `18.00 BDT/RMB`).
   - Leg 1 & Leg 3 inputs with weight basis (auto-calculates unit rates).
   - Category rates management (Default: Shoes/Bags: 800 BDT/kg, Clothing: 980 BDT/kg, Jewelry: 800 BDT/kg, Cosmetics: 1000 BDT/kg, Gadgets: 1400 BDT/kg).
   - Add custom categories, edit names, edit rates, and delete categories.
   - Live rate preview right inside the modal footer.

2. **Phase 2: Live Calculator Engine**
   - Instant calculation on every keystroke with zero reload.
   - Quick preset products for instant testing.
   - Quick weight chips (100g, 250g, 500g, 1kg, +50g, +100g).
   - Target profit mode switcher (Margin % with slider vs Flat Markup in BDT).
   - Smart price rounding options (Exact, Nearest 10 BDT, Nearest 50 BDT).

3. **Phase 3: Hero Output & Micro-Breakdown**
   - High-contrast Hero Card with Total Landed Cost (৳) and Suggested Selling Price (৳).
   - Net Profit & Margin badge pills.
   - Visual stacked composition bar displaying percentage shares of purchase price vs shipping legs.
   - Full micro-breakdown audit table with line-by-line formulas.

4. **Phase 4: Session Batch Summary**
   - Running compilation list of evaluated items.
   - Live KPI dashboard: Total Items, Total Weight (kg), Total Capital Required (৳), Total Projected Revenue (৳), Total Net Profit (৳), and Average Margin %.
   - Export to CSV format.
   - One-click copy summary formatted for WhatsApp / WeChat / Notepad.
   - Reload any batch item back into the calculator.

5. **Phase 5: PWA & Offline Readiness**
   - `manifest.json` configured for standalone display.
   - Offline Service Worker (`sw.js`) caching all local assets and stylesheets.
   - High-resolution vector SVG and PNG icons (`icon-192.png`, `icon-512.png`).
   - Mobile-first UI optimized for iOS Safari: minimum 16px font sizes to prevent auto-zooming, safe area insets, touch-friendly 48px hit targets.
   - Dark / Light executive mode toggle.

---

## 🚀 Running Locally

To run the application locally:

```bash
# Start the built-in zero-dependency server:
node server.js
```

Then visit:
```
http://127.0.0.1:4173
```

Alternatively, open `index.html` directly in any modern web browser or host on GitHub Pages, Netlify, or Vercel.

---

## 📱 Installing on iOS & Mobile (PWA)

1. Open `http://<your-domain-or-local-ip>:4173` in **Safari** on iOS.
2. Tap the **Share** button in the bottom menu.
3. Scroll down and tap **"Add to Home Screen"**.
4. The app installs as a native-like standalone app without URL bars and works completely offline!
