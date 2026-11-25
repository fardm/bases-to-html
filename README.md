# Bases to HTML (Obsidian Plugin)

![image](screenshot1.webp)

**Bases to HTML** is an Obsidian plugin that converts your **Bases** views into standalone, interactive, and responsive HTML pages.

📥 **[Install from Obsidian Community Plugins](https://community.obsidian.md/plugins/bases-to-html)**

🌐 **[Live Demo](https://fardm.github.io/bases-to-html/)** — Try the exported HTML in action.


<br>

## Key Features

- 🧩 **Full Obsidian Bases Compatibility:** Preserves your Bases setup—including views, properties, filters, grouping, sorting, tags, and badges.
- 🎛️ **Interactive Exported UI:** Viewers can live-search, toggle or adjust filters, change grouping, sort columns, and switch views directly in the exported page.
- 📄 **Note Detail Modals:** Click any card or row to view note properties and rendered Markdown content (configurable to Bases only, properties only, or full note).
- 📦 **Flexible Export Formats:** Export as a single self-contained HTML file (with embedded scripts, styles, and images) or a structured multi-file folder for web hosting.
- 🎨 **Customizable Appearance:** Supports dark/light themes, adjustable page widths, Google Fonts or local fonts, and custom CSS injection with clean semantic classes.
- 📊 Supported Views: Cards and Table (more views coming in future updates).

<br>

## Usage

1. Open the Obsidian Command Palette (`Ctrl+P` or `Cmd+P`).
2. Search for and select **Bases to HTML: Export Bases to HTML** (or click the ribbon icon).
3. Configure your export preferences in the modal dialog.
4. Click **Export HTML**.

<br>

## Good to Know

- **Browser State (`localStorage`):** Interactions in the exported HTML page—such as active filters, grouping, sorting, selected view, theme, and page width—are saved locally in the browser's `localStorage`.
- **Saved Export Preferences (`data.json`):** Your last used export modal settings are automatically saved in the plugin's `data.json` file and can be reset anytime in **Settings → Bases to HTML**.
- **Custom Summary Formulas:** Custom formulas in **Add summary** are exported as static, display-only values and will not recalculate when filters are changed in the exported page (a dedicated formula engine is not currently supported).

<br>

## License

This project is licensed under the [MIT License](LICENSE).
