export function getClientCss(customCss = ''): string {
	return `/* Bases to HTML - Modern Responsive Stylesheet */
:root {
  --bg-primary: #f8fafc;
  --bg-secondary: #ffffff;
  --bg-tertiary: #f1f5f9;
  --bg-card: #ffffff;
  --bg-card-hover: #f8fafc;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --border-color: #e2e8f0;
  --border-focus: #3b82f6;
  --accent-color: #2563eb;
  --accent-hover: #1d4ed8;
  --accent-light: #eff6ff;
  --accent-badge: #dbeafe;
  --badge-text: #1e40af;
  --star-color: #f59e0b;
  --modal-overlay: rgba(15, 23, 42, 0.6);
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --font-family: 'Vazirmatn', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --container-max-width: 1280px;
  --card-size: 180px;
  --aspect-ratio: 1.5;
  --image-fit: cover;
  --transition-fast: 0.15s ease;
  --transition-normal: 0.25s ease;
}

[data-theme="dark"] {
  --bg-primary: #090d16;
  --bg-secondary: #111827;
  --bg-tertiary: #1f2937;
  --bg-card: #151e2e;
  --bg-card-hover: #1e293b;
  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-muted: #64748b;
  --border-color: #263346;
  --border-focus: #60a5fa;
  --accent-color: #3b82f6;
  --accent-hover: #60a5fa;
  --accent-light: #1e293b;
  --accent-badge: #1e3a8a;
  --badge-text: #bfdbfe;
  --star-color: #fbbf24;
  --modal-overlay: rgba(0, 0, 0, 0.75);
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
}

[data-width="full"] {
  --container-max-width: 100%;
}
[data-width="narrow"] {
  --container-max-width: 860px;
}
[data-width="normal"] {
  --container-max-width: 1280px;
}

[data-font="vazirmatn"] {
  --font-family: 'Vazirmatn', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
[data-font="inter"] {
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
[data-font="system-sans"] {
  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
[data-font="system-serif"] {
  --font-family: Georgia, Cambria, "Times New Roman", Times, serif;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-family);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.6;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  transition: background-color var(--transition-normal), color var(--transition-normal);
  -webkit-font-smoothing: antialiased;
}

/* Navbar */
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  backdrop-filter: blur(8px);
  padding: 0.75rem 1.25rem;
  box-shadow: var(--shadow-sm);
}

.navbar-container {
  max-width: var(--container-max-width);
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.nav-brand-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.nav-brand {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: color var(--transition-fast);
}

.nav-brand:hover {
  color: var(--accent-color);
}

.view-selector-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.view-select {
  padding: 0.45rem 0.9rem;
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.view-select:focus {
  border-color: var(--border-focus);
}

/* Controls Toolbar */
.nav-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  padding: 0.45rem 2rem 0.45rem 0.85rem;
  font-size: 0.875rem;
  font-family: inherit;
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  outline: none;
  width: 200px;
  transition: width var(--transition-normal), border-color var(--transition-fast);
}

.search-input:focus {
  width: 260px;
  border-color: var(--border-focus);
  background-color: var(--bg-secondary);
}

.search-clear-btn {
  position: absolute;
  right: 0.5rem;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: none;
  font-size: 1rem;
  padding: 0 0.25rem;
}

.search-clear-btn.visible {
  display: block;
}

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.85rem;
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: background-color var(--transition-fast), border-color var(--transition-fast);
}

.toolbar-btn:hover {
  background-color: var(--bg-card-hover);
  border-color: var(--border-focus);
}

.toolbar-btn.active {
  background-color: var(--accent-light);
  color: var(--accent-color);
  border-color: var(--accent-color);
}

/* Main Layout */
.main-content {
  flex: 1;
  max-width: var(--container-max-width);
  width: 100%;
  margin: 0 auto;
  padding: 1.5rem 1.25rem;
}

/* Filter/Sort Action Bar */
.filter-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0.75rem 1rem;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.action-bar-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  background-color: var(--accent-badge);
  color: var(--badge-text);
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
}

.filter-pill-remove {
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  opacity: 0.75;
}

.filter-pill-remove:hover {
  opacity: 1;
}

.item-count-badge {
  font-size: 0.875rem;
  color: var(--text-muted);
  font-weight: 500;
}

/* Filter Dropdown Panel */
.filter-panel {
  display: none;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 1rem;
  margin-bottom: 1.25rem;
  box-shadow: var(--shadow-md);
}

.filter-panel.open {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.filter-group-title {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

.filter-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.filter-tag-chip {
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-sm);
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.filter-tag-chip:hover {
  border-color: var(--accent-color);
  color: var(--text-primary);
}

.filter-tag-chip.selected {
  background-color: var(--accent-color);
  border-color: var(--accent-color);
  color: #ffffff;
}

/* Group Sections */
.group-section {
  margin-bottom: 2.5rem;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-bottom: 0.5rem;
  margin-bottom: 1rem;
  border-bottom: 2px solid var(--border-color);
}

.group-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-primary);
}

.group-count {
  font-size: 0.85rem;
  padding: 0.15rem 0.5rem;
  background-color: var(--bg-tertiary);
  color: var(--text-muted);
  border-radius: 9999px;
  font-weight: 600;
}

/* Cards Gallery Grid */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--card-size, 180px), 1fr));
  gap: 1.25rem;
  width: 100%;
}

.base-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast);
  box-shadow: var(--shadow-sm);
  position: relative;
}

.base-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
  border-color: var(--border-focus);
  background-color: var(--bg-card-hover);
}

.card-image-wrapper {
  width: 100%;
  aspect-ratio: var(--aspect-ratio, 1.5);
  background-color: var(--bg-tertiary);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: var(--image-fit, cover);
  transition: transform var(--transition-normal);
}

.base-card:hover .card-image {
  transform: scale(1.03);
}

.card-image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 2.25rem;
  height: 100%;
  width: 100%;
  background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
}

.card-body {
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  flex: 1;
}

.card-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.35;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card-badge {
  display: inline-block;
  align-self: flex-start;
  padding: 0.15rem 0.5rem;
  background-color: var(--accent-badge);
  color: var(--badge-text);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
}

.card-rating {
  color: var(--star-color);
  font-size: 0.95rem;
  letter-spacing: 0.08em;
  font-weight: 700;
}

.card-prop-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.card-prop-key {
  color: var(--text-muted);
  font-size: 0.75rem;
}

.card-prop-val {
  font-weight: 500;
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-muted);
}

.empty-state h3 {
  font-size: 1.25rem;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

/* Settings Sidebar */
.settings-drawer {
  position: fixed;
  top: 0;
  right: -380px;
  width: 360px;
  max-width: 90vw;
  height: 100%;
  background-color: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.settings-drawer.open {
  right: 0;
}

.drawer-header {
  padding: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
}

.drawer-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
}

.drawer-close-btn {
  background: transparent;
  border: none;
  font-size: 1.4rem;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.2rem;
  border-radius: var(--radius-sm);
  transition: color var(--transition-fast);
}

.drawer-close-btn:hover {
  color: var(--text-primary);
}

.drawer-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.setting-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.setting-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.setting-desc {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.theme-toggle-group, .width-toggle-group {
  display: flex;
  background-color: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  padding: 0.25rem;
  border: 1px solid var(--border-color);
}

.theme-toggle-btn, .width-toggle-btn {
  flex: 1;
  padding: 0.4rem 0.6rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-family: inherit;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color var(--transition-fast), color var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
}

.theme-toggle-btn.active, .width-toggle-btn.active {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}

.font-select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  font-family: inherit;
  outline: none;
}

/* Modal Backdrop */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: var(--modal-overlay);
  backdrop-filter: blur(4px);
  z-index: 900;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.25s ease, visibility 0.25s ease;
}

.modal-overlay.open {
  opacity: 1;
  visibility: visible;
}

/* Note Details Modal */
.note-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.95);
  width: 90%;
  max-width: 760px;
  max-height: 85vh;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: 1001;
  display: flex;
  flex-direction: column;
  opacity: 0;
  visibility: hidden;
  transition: transform 0.25s ease, opacity 0.25s ease, visibility 0.25s ease;
}

.note-modal.open {
  transform: translate(-50%, -50%) scale(1);
  opacity: 1;
  visibility: visible;
}

.modal-header {
  padding: 1.25rem 1.5rem;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
  gap: 1rem;
}

.modal-title {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
}

.modal-close-btn {
  background: transparent;
  border: none;
  font-size: 1.5rem;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.2rem;
  border-radius: var(--radius-sm);
}

.modal-close-btn:hover {
  color: var(--text-primary);
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.modal-properties {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-prop-chip {
  padding: 0.3rem 0.65rem;
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.modal-prop-chip strong {
  color: var(--text-primary);
}

.modal-markdown-content {
  color: var(--text-primary);
  line-height: 1.8;
  font-size: 1rem;
}

.modal-markdown-content h1,
.modal-markdown-content h2,
.modal-markdown-content h3 {
  margin: 1.25rem 0 0.5rem;
  color: var(--text-primary);
}

.modal-markdown-content p {
  margin-bottom: 1rem;
}

.modal-markdown-content ul,
.modal-markdown-content ol {
  padding-left: 1.5rem;
  margin-bottom: 1rem;
}

.modal-markdown-content a {
  color: var(--accent-color);
  text-decoration: none;
}

.modal-markdown-content a:hover {
  text-decoration: underline;
}

/* Footer */
.site-footer {
  margin-top: auto;
  border-top: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
  padding: 1.25rem;
  text-align: center;
  font-size: 0.875rem;
  color: var(--text-muted);
}

.site-footer a {
  color: var(--accent-color);
  text-decoration: none;
  font-weight: 600;
}

.site-footer a:hover {
  text-decoration: underline;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .navbar-container {
    flex-direction: column;
    align-items: stretch;
  }
  .nav-controls {
    justify-content: space-between;
  }
  .search-input {
    width: 100%;
  }
  .search-input:focus {
    width: 100%;
  }
  .search-box {
    flex: 1;
  }
  .cards-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.75rem;
  }
}

/* User Custom CSS injection point */
${customCss}
`;
}
