# Bases to HTML (Obsidian Plugin)

![image](screenshot1.webp)

**Bases to HTML** is an Obsidian plugin that transforms your **Bases** database views into standalone, responsive, and fully interactive HTML pages. The generated files require no backend server or external dependencies, making them perfect for offline archiving, sharing, or publishing to static website hosts like GitHub Pages.

**[Live Demo](https://fardm.github.io/bases-to-html/)** — Explore and interact with a live example of the exported HTML page. Try searching, filtering, sorting, grouping, and switching between views.

---

## Supported Views

Currently, the plugin supports two primary Bases views:
- **Table View:** Full tabular presentation with sortable column headers, badge pills, and summary calculation footers (`Sum`, `Average`, `Count`, custom formulas, etc.).
- **Cards View:** Gallery cards featuring cover images, capsule badges, star rating displays, and custom property ordering.

*(Additional Bases views will be introduced in future releases).*

---

## Key Features

- **Interactive Client-Side Engine:** Viewers can interact with the exported web page in real-time:
  - **Live Search:** Fast, instant text search across titles, tags, and properties.
  - **Dynamic Filtering:** Add, toggle, or adjust multi-criteria filters on the fly.
  - **Grouping:** Group records by any property with live section counters.
  - **Sorting:** Multi-column ascending and descending sorting.
- **Local Storage State Persistence:** User modifications made in the web interface — including active filters, grouping, sorting rules, active view, theme mode (dark/light), and page width preferences — are automatically saved in the browser's `localStorage` and preserved across visits and reloads.
- **Semantic & Unique CSS Architecture:** Built with clean, unique, and predictable class names (e.g. `.bases-card`, `.bases-card-badges`, `.card-prop-item`, `.bases-td`) along with `data-property="..."` attributes, allowing you to easily target elements and apply custom styles.
- **Bases Fidelity:** Preserves multi-view configurations with a view switcher dropdown, custom column formulas, tags, independent capsule badges, and summary aggregations.
- **Note Detail Modals:** Clickable cards and rows open detailed popups showcasing note properties and rendered Markdown content.
- **Responsive & Modern UI:** Automatic dark/light theme switching, adjustable page width (Full, Normal, Narrow), and Google Fonts integration (Vazirmatn & Inter).
- **Zero External Runtime Dependencies:** Pure vanilla JavaScript ensuring high performance and lightweight exports.

---

## Custom Styling & Showcase

Thanks to the modular, class-rich HTML structure, you can completely restyle the exported output to match your personal aesthetic.

Check out [**Bases-Style-for-Archive.css**](https://github.com/fardm/bases-to-html/blob/vault/Bases-Style-for-Archive.css) for a real-world example featuring:
- Realistic 3D hardcover book spines and covers.
- Custom styled overview cards and glowing metadata badges.

---

## Usage

1. Open the Obsidian Command Palette (`Ctrl+P` or `Cmd+P`).
2. Search for and select **Bases to HTML: Export Bases to HTML** (or click the ribbon icon).
3. Configure your export preferences in the modal dialog.
4. Click **Export HTML**.

---

## Settings Guide

### 1. General Plugin Settings (`Settings → Bases to HTML`)

- **Default output folder:** Specify a vault folder where generated HTML exports will be saved. Leave blank to save directly in the root of your vault.

---

### 2. Export Modal Options

When triggering an export, customize your output with the following options:

#### **Document title**
The primary title used for the exported page's browser tab, header navigation bar, and output folder naming.

#### **Select base files**
Search and select one or multiple `.base` files from your vault to export.

#### **Export format**
- **Single page (embedded):** Generates a self-contained, single HTML file where all CSS styles, JavaScript scripts, and cover images (Base64-encoded) are embedded inline. Best for quick sharing and standalone offline viewing.
- **Multi-file (folder with assets):** Creates an organized folder containing an `index.html` file alongside a dedicated `assets/` directory for stylesheets, scripts, and media files. Ideal for website hosting and GitHub Pages.

#### **Exported data**
- **All Matching Data:** Exports all database rows. Initial view filters set the default display state, but viewers can adjust or clear filters on the web page to explore all data.
- **Filtered Data Only:** Exports only items matching the active filters at the time of export. Unmatched items are omitted from the HTML file, minimizing file size and preserving privacy.

#### **Note content**
- **Bases Only:** Exports only the Bases cards and tables. Note contents are not included, and cards remain static.
- **Properties Only:** Clicking a card or row opens a modal displaying note metadata and properties without the note body.
- **Full Note Content:** Clicking a card or row opens a modal containing note properties along with the full, rendered Markdown body.

#### **Font**
Typography font loaded via Google Fonts CDN in the HTML output:
- **Vazirmatn (Default):** Elegant typography optimized for Persian and multilingual text.
- **Inter:** Clean, modern sans-serif optimized for English and Latin scripts.
- **System sans-serif / System serif:** Uses native operating system fonts without loading external web fonts.

#### **Custom CSS**
Inject custom styling rules into the exported HTML:
- **Select from vault:** Pick one or multiple `.css` files from your vault.
- **Select from disk:** Load external `.css` files from your local storage.
- **CSS Textarea:** Enter or paste raw CSS code directly.
- Multiple CSS files can be loaded simultaneously with individual trash buttons to remove them independently.

#### **Open exported files**
When enabled, automatically opens the exported HTML document in your system's default web browser upon completion.

---

## License

This project is licensed under the [MIT License](LICENSE).
