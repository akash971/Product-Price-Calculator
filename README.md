# 📱 Taobao ➔ Rajshahi Cross-Border Landed Cost & Micro-Pricing Web App

A clean, high-performance, **mobile-responsive web application** designed specifically for cross-border e-commerce merchants importing goods from **Taobao (China)** to **Rajshahi (Bangladesh)**.

---

## ⚡ Core Mathematical Architecture: Dynamic "BDT per gram" Model

The app aggregates the entire international & domestic logistics pipeline into an exact, dynamic **BDT per gram** shipping cost model:

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

## 📱 Mobile-First Web Experience

1. **Thumb-Friendly Touch Navigation:**
   - **Segmented Mobile Tabs** (`Calculator` vs `Batch Orders` with live item count badge) on phones, seamlessly switching to a 2-column side-by-side view on tablets & desktops.
   - **Mobile Sticky Bottom Summary Bar**: Keep eyes on your Landed Cost and Selling Price while scrolling inputs, with an instant one-tap **"Save"** button.
   - **Mobile Bottom Sheet Modal**: Settings and courier variables open as a native bottom sheet on mobile screens with drag-handle styling.
   - **Mobile Order Cards**: Consolidated orders display as responsive mini cards on phones and as full data tables on desktop screens.
   - **Zero Auto-Zoom Friction**: All inputs set to `16px` font size and touch targets $\ge 48\text{px}$ for comfortable one-handed mobile entry.

2. **Phase 1: Global Variables & Settings Modal**
   - Editable RMB ➔ BDT exchange rate (default: `18.00 BDT/RMB`).
   - Leg 1 & Leg 3 inputs with weight basis (auto-calculates unit rates).
   - Category rates management (Default: Shoes/Bags: 800 BDT/kg, Clothing: 980 BDT/kg, Jewelry: 800 BDT/kg, Cosmetics: 1000 BDT/kg, Gadgets: 1400 BDT/kg).
   - Add custom categories, edit names, edit rates, and delete categories.
   - Live aggregate rate preview inside the modal.

3. **Phase 2: Live Calculator Engine**
   - Instant calculation on every keystroke with zero page reload.
   - Quick preset products (*Sneakers, Summer Dress, Titanium Chain, Moisturizer, Earbuds, Tote Bag*).
   - Quick weight chips (`100g`, `250g`, `500g`, `1.0 kg`, `+50g`, `+100g`).
   - Target profit mode switcher (Margin % with slider vs Flat Markup in BDT).
   - Smart price rounding options (Exact, Nearest 10 BDT, Nearest 50 BDT).

4. **Phase 3: Hero Output & Micro-Breakdown**
   - Hero Card with Total Landed Cost (৳) and Suggested Selling Price (৳).
   - Net Profit & Margin badge pills.
   - Stacked visual cost distribution bar.
   - Itemized micro-breakdown audit table with formula references.

5. **Phase 4: Session Batch Summary**
   - Running list of evaluated order items.
   - Live KPI summary: Total Items, Consolidated Weight (kg), Capital Required (৳), Projected Revenue (৳), Projected Profit (৳), and Average Margin %.
   - One-click **Export to CSV**.
   - One-click **Copy Summary** formatted for WhatsApp / WeChat / Messenger.
   - Reload any batch item back into the calculator.

---

## 🚀 Running Locally

```bash
# Start the local server:
node server.js
```

Then visit:
```
http://127.0.0.1:4173
```
Or open `index.html` directly in any mobile or desktop web browser.
