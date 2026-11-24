# Bases to HTML (Obsidian Plugin)

Export your Obsidian **Bases** views into standalone, interactive, and responsive HTML pages perfect for static website hosting or offline browsing.

## Features

- **Full Bases Fidelity**:
  - Exports gallery/cards view with exact card sizes, aspect ratios, image cover fits, and custom property ordering.
  - Multi-view support: If a `.base` file contains multiple views (e.g. Books, Movies, Series, Medias), all views are exported and switchable via an interactive dropdown.
  - Default view filters, sorting, and grouping settings are preserved on initial load.
- **Interactive Client-Side Engine**:
  - Live full-text search across titles, tags, and metadata properties.
  - Dynamic tag and property filtering.
  - Client-side sorting (ASC / DESC).
  - Client-side grouping (e.g. group by rating, genre, date) with section counters.
  - Zero external JavaScript runtime dependencies — fast and standalone.
- **Customizable UI & Themes**:
  - Built-in Light and Dark themes.
  - Responsive Page Width switcher (Full, Normal, Narrow).
  - Typography font switcher with Google Fonts (Vazirmatn for multilingual/Persian support, Inter, System fonts).
  - Persistence: User preferences (theme, width, font, view, filters) persist in browser `localStorage`.
- **Note Detail Modals**:
  - Option to include full rendered Markdown notes with clickable cards.
- **Export Formats**:
  - **Single Page**: Self-contained HTML with inlined CSS, JS, and Base64-encoded cover images.
  - **Multi-file**: Organized directory with `index.html`, `assets/css/`, `assets/js/`, and `assets/images/`.
- **Custom CSS**:
  - Apply custom styling globally or per-base.

## Usage

1. Open the Command Palette in Obsidian (`Ctrl+P` or `Cmd+P`).
2. Search for **Bases to HTML: Export Bases to HTML** (or click the layout icon in the ribbon).
3. Configure your export settings:
   - **Document Title**: Document and site name.
   - **Select Base Files**: Choose one or multiple `.base` files to export.
   - **Export Format**: Choose Single Page or Multi-file.
   - **Export Scope**: Choose *Include Notes* (full notes rendered into modals) or *Bases Only*.
   - **Font**: Select preferred typography.
   - **Output Location**: Specify target folder in vault.
   - **Open Exported Files**: Check to automatically preview the exported HTML.
4. Click **Export HTML**.

## License

MIT
