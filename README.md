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

## Auto stock sync
The site is built to support automated inventory sync from external JSON data.

### Option 1: Runtime sync using a JSON source
1. Publish your inventory as JSON with this shape:
   - `alias`, `name`, `barcode`, `brand`, `group`, `mrp`, `sale_price`, `wholesale_price`, `purchase_price`, `shop_stock`, `godown_stock`
2. Set `DATA_SOURCE_URL` in `app.js`:
   ```js
   const DATA_SOURCE_URL = 'https://raw.githubusercontent.com/srfashionned/sr-fashion-nanded/main/items.json';
   ```
3. Push the repo and open the site. The page will fetch the latest JSON when it loads.

### Option 2: GitHub Actions sync
The repo includes `.github/workflows/stock-sync.yml` to keep `items.json` updated automatically.
1. In GitHub, add a repository secret named `INVENTORY_JSON_URL` with your JSON source URL.
2. The workflow runs on a schedule and on manual dispatch.
3. It downloads the JSON, writes `items.json`, and commits the update when the data changes.

### Recommended setup
- Keep `items.json` in the repo as the fallback dataset for the live site.
- Use `DATA_SOURCE_URL` for live runtime data if you have an external inventory API.
- Use the GitHub Action for scheduled repo updates if your source is externally hosted.

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

## Future auto stock sync
The site is now ready for future auto-sync. To enable it:
- set `DATA_SOURCE_URL` in `app.js` to a JSON endpoint that returns the latest inventory data
- host a JSON file in the repo or from another service
- update the external JSON whenever stock changes

Example endpoint:
```js
const DATA_SOURCE_URL = 'https://raw.githubusercontent.com/<your-username>/<repo-name>/main/items.json';
```

For fully automated sync, you can later add a GitHub Action that regenerates `items.json` or `items.js` from a CSV or database nightly.

## Notes
- `items.js` currently provides the inventory dataset used by the page.
- `items.json` is included as a fallback and can also be used as the data source.
- If you want live stock from a backend or Google Sheet, the next step is to provide a JSON API endpoint and update `DATA_SOURCE_URL`.

