# SR Fashion Nanded Branch Inventory

This is a static product inventory site for the SR Fashion Nanded branch.

## Features
- Product list with MRP, sale price, wholesale price
- Shop stock and godown stock fields
- Total stock auto-calculated
- Admin mode unlocks editable stock fields
- Browser `localStorage` saves stock edits
- Search and sort support
- Future-ready data sync support via external JSON endpoint

## How to use
1. Open `index.html` in a browser.
2. Click `Admin` and enter PIN: `7277`.
3. After admin unlock, the dashboard shows `Purchase Price` and enables stock editing.
4. Edit `Shop Stock` and `Godown Stock` for any product, then click `Save`.
5. Total stock updates automatically from the live stock data.
6. Local edits are stored in your browser using `localStorage`.

## GitHub Pages deployment
1. Create a new GitHub repository, for example `sr-fashion-nanded`.
2. In this folder, initialize git and commit the files:
   ```powershell
   git init
   git add .
   git commit -m "Initial Nanded branch inventory site"
   git branch -M main
   ```
3. Add your GitHub remote and push:
   ```powershell
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
4. On GitHub, go to `Settings` → `Pages`.
5. Choose the branch `main` and folder `/ (root)` as the source.
6. Save and wait for GitHub Pages to publish the site.

## Optional: publish from `gh-pages`
If you prefer a dedicated GitHub Pages branch:
```powershell
git checkout -b gh-pages
git push -u origin gh-pages
```
Then set GitHub Pages source to the `gh-pages` branch.

## Busy 21 auto-sync
The site can load inventory directly from Busy 21 data automatically.

### How it works
- The website now loads `items.json` from the GitHub repo by default.
- A GitHub Action can keep `items.json` updated automatically from a Busy 21 JSON or CSV export.
- If your data includes `busy_stock` or `total_stock`, the site uses that value for total stock.
- Purchase price defaults to `₹0` when it is not provided.
- Busy data fields that are supported:
  - `alias`, `name`, `barcode`, `brand`, `group`, `print_name`, `mrp`, `sale_price`, `wholesale_price`, `purchase_price`, `busy_stock`, `shop_stock`, `godown_stock`

### Option 1: Runtime sync from Busy 21 export
1. Export Busy 21 inventory to JSON or CSV.
2. Host that file somewhere public or on GitHub.
3. Set `DATA_SOURCE_URL` in `app.js` to the file URL:
   ```js
   const DATA_SOURCE_URL = 'https://raw.githubusercontent.com/srfashionned/sr-fashion-nanded/main/items.json';
   ```
4. Open the site; it will fetch the latest data from that URL on load.
5. Click the `Sync Busy Data` button to refresh immediately on demand.

### Option 2: GitHub Actions sync
The repo already includes `.github/workflows/stock-sync.yml`.
1. Add a GitHub secret named `INVENTORY_DATA_URL` with your Busy export URL.
2. The workflow will download the JSON or CSV, update `items.json`, and commit changes automatically.
3. This keeps the repo copy in sync without manual updates.

### If Busy 21 only exports CSV
1. Export CSV from Busy 21.
2. Make sure the first row headers match the supported field names above.
3. Host the CSV file and set `DATA_SOURCE_URL` to that CSV URL.
4. The site will parse the CSV automatically.

### Recommended setup
- Keep `items.json` or `items.csv` in the repo as the fallback dataset.
- Use `DATA_SOURCE_URL` if you have a public Busy export URL.
- Use the GitHub Action to push scheduled or manual sync updates.

## Notes
- `items.js` is still the local fallback dataset for offline use.
- `items.json` is the preferred repo-backed fallback and can be updated by the workflow.
- If you want a direct Busy 21 integration later, I can help with the exact Busy API or export format.

