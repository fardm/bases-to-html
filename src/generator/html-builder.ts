import { BaseFileConfig, ExportOptions, NoteItem } from '../types';
import { getClientScript } from './client-script';
import { getClientCss } from './client-style';
import { getLucideSpriteSvg, renderIconSvg } from './icons';

export interface GeneratedFile {
  relativePath: string;
  content: string;
}

export class HtmlBuilder {
  private options: ExportOptions;

  constructor(options: ExportOptions) {
    this.options = options;
  }

  buildSinglePage(
    baseConfig: BaseFileConfig,
    items: NoteItem[],
    rootHref = 'index.html',
  ): string {
    const customCss = this.options.customCss || '';
    const css = getClientCss(customCss);
    const js = getClientScript();

    return this.generateBaseHtmlDocument({
      title: this.options.documentTitle || baseConfig.baseTitle,
      baseConfig,
      items,
      cssInline: css,
      jsInline: js,
      rootHref,
    });
  }

  buildMultiFile(
    exportedBases: Array<{ config: BaseFileConfig; items: NoteItem[] }>,
  ): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const isSingleBase = exportedBases.length === 1;

    // Shared CSS and JS
    const globalCss = getClientCss(this.options.customCss || '');
    files.push({
      relativePath: 'assets/css/styles.css',
      content: globalCss,
    });

    const clientJs = getClientScript();
    files.push({
      relativePath: 'assets/js/app.js',
      content: clientJs,
    });

    if (isSingleBase) {
      const firstBase = exportedBases[0];
      if (!firstBase) return files;

      const { config, items } = firstBase;
      const baseHtml = this.generateBaseHtmlDocument({
        title: this.options.documentTitle || config.baseTitle,
        baseConfig: config,
        items,
        cssRef: 'assets/css/styles.css',
        jsRef: 'assets/js/app.js',
        rootHref: 'index.html',
      });

      files.push({
        relativePath: 'index.html',
        content: baseHtml,
      });
    } else {
      // Generate Directory index.html
      const indexHtml = this.generateIndexDirectoryHtml(exportedBases, false);
      files.push({
        relativePath: 'index.html',
        content: indexHtml,
      });

      // Generate each Base HTML
      for (const { config, items } of exportedBases) {
        const slug = sanitizeSlug(config.fileName);
        const baseHtml = this.generateBaseHtmlDocument({
          title: `${config.baseTitle} - ${this.options.documentTitle}`,
          baseConfig: config,
          items,
          cssRef: 'assets/css/styles.css',
          jsRef: 'assets/js/app.js',
          rootHref: 'index.html',
        });

        files.push({
          relativePath: `${slug}.html`,
          content: baseHtml,
        });
      }
    }

    return files;
  }

  private generateBaseHtmlDocument(params: {
    title: string;
    baseConfig: BaseFileConfig;
    items: NoteItem[];
    cssInline?: string;
    jsInline?: string;
    cssRef?: string;
    jsRef?: string;
    extraCss?: string;
    rootHref?: string;
  }): string {
    const {
      title,
      baseConfig,
      items,
      cssInline,
      jsInline,
      cssRef,
      jsRef,
      extraCss,
      rootHref = 'index.html',
    } = params;

    const viewsOptionsHtml = baseConfig.views
      .map(
        (v, idx) =>
          `<option value="${idx}">${escapeHtml(v.name || `View ${idx + 1}`)}</option>`,
      )
      .join('\n');

    const basePayload = {
      base: {
        id: baseConfig.id,
        title: baseConfig.fileName,
        formulas: baseConfig.formulas,
        summaries: baseConfig.summaries || {},
        views: baseConfig.views,
        propertyTypes: baseConfig.propertyTypes || {},
      },
      items,
    };

    const fontLink = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Vazirmatn:wght@400;500;600;700&display=swap" rel="stylesheet">`;

    const cssInclude = cssRef
      ? `<link rel="stylesheet" href="${cssRef}">`
      : `<style>\n${cssInline || ''}\n</style>`;

    const extraCssInclude = extraCss
      ? `<style>\n/* Per-base custom CSS */\n${extraCss}\n</style>`
      : '';

    const jsInclude = jsRef
      ? `<script src="${jsRef}"></script>`
      : `<script>\n${jsInline || ''}\n</script>`;

    const firstView = baseConfig.views[0];
    const initCardSize = firstView?.cardSize || 180;
    const initRawRatio =
      typeof firstView?.imageAspectRatio === 'number' && firstView.imageAspectRatio > 0
        ? firstView.imageAspectRatio
        : 1.5;
    const initCssRatio = 1 / initRawRatio;
    const initImageFit = firstView?.imageFit || 'cover';

    return `<!DOCTYPE html>
<html lang="en" data-theme="dark" data-width="normal" data-font="${this.options.font || 'vazirmatn'}" style="--card-size: ${initCardSize}px; --aspect-ratio: ${initRawRatio}; --css-aspect-ratio: ${initCssRatio}; --image-fit: ${initImageFit};">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  ${fontLink}
  ${cssInclude}
  ${extraCssInclude}
</head>
<body data-base-id="${escapeHtml(baseConfig.id)}" data-base-name="${escapeHtml(baseConfig.fileName)}">
  ${getLucideSpriteSvg()}

  <!-- Navbar -->
  <nav class="navbar">
    <div class="navbar-container">
      <div class="nav-brand-group">
        <a href="${rootHref}" class="nav-brand" title="Home">
          ${renderIconSvg('folder')}
          <span>${escapeHtml(this.options.documentTitle || baseConfig.baseTitle)}</span>
        </a>
        ${baseConfig.views.length > 1
        ? `<div class="view-selector-wrapper">
          <select id="viewSelect" class="view-select">
            ${viewsOptionsHtml}
          </select>
        </div>`
        : ''
      }
      </div>

      <div class="nav-controls">
        <!-- Sort Button & Popover -->
        <div class="toolbar-btn-group">
          <button id="sortToggleBtn" class="toolbar-btn" title="Sort items">
            ${renderIconSvg('sort')}
            <span>Sort</span>
            <span id="sortCountBadge" class="toolbar-btn-badge" style="display:none;">0</span>
          </button>
          <div id="sortPopover" class="bases-popover popover-align-left">
            <div class="popover-header">Sort by</div>
            <div id="sortRulesList" class="popover-rules-list"></div>
            <button id="addSortBtn" class="popover-add-btn">${renderIconSvg('plus', 'b2h-icon-xs')} Add sort</button>
          </div>
        </div>

        <!-- Group Button & Popover -->
        <div class="toolbar-btn-group">
          <button id="groupToggleBtn" class="toolbar-btn" title="Group items">
            ${renderIconSvg('group')}
            <span>Group</span>
          </button>
          <div id="groupPopover" class="bases-popover popover-align-left">
            <div class="popover-header">Group by</div>
            <div id="groupRulesList" class="popover-rules-list"></div>
            <button id="addGroupBtn" class="popover-add-btn">${renderIconSvg('plus', 'b2h-icon-xs')} Add group</button>
          </div>
        </div>

        <!-- Filter Button & Popover -->
        <div class="toolbar-btn-group">
          <button id="filterToggleBtn" class="toolbar-btn" title="Filter items">
            ${renderIconSvg('filter')}
            <span>Filter</span>
            <span id="filterCountBadge" class="toolbar-btn-badge" style="display:none;">0</span>
          </button>
          <div id="filterPopover" class="bases-popover popover-align-left" style="min-width: 440px;">
            <div class="popover-header">Filter</div>
            <div id="filterRulesList" class="popover-rules-list"></div>
            <button id="addFilterBtn" class="popover-add-btn">${renderIconSvg('plus', 'b2h-icon-xs')} Add filter</button>
          </div>
        </div>

        <!-- Properties Button & Popover -->
        <div class="toolbar-btn-group">
          <button id="propertiesToggleBtn" class="toolbar-btn" title="Shown properties">
            ${renderIconSvg('properties')}
            <span>Properties</span>
          </button>
          <div id="propertiesPopover" class="bases-popover popover-align-left">
            <div class="popover-header">Card properties</div>
            <div id="propertiesList" class="popover-rules-list"></div>
          </div>
        </div>

        <!-- Search Box -->
        <div class="search-box">
          <input type="text" id="searchInput" class="search-input" placeholder="Search..." autocomplete="off">
          <button id="searchClearBtn" class="search-clear-btn" title="Clear search">${renderIconSvg('x', 'b2h-icon-xs')}</button>
        </div>

        <!-- Settings Button -->
        <button id="settingsBtn" class="toolbar-btn" title="Display settings">
          ${renderIconSvg('settings')}
        </button>
      </div>
    </div>
  </nav>

  <!-- Main content -->
  <main class="main-content" data-view-id="${escapeHtml(firstView?.id || '')}" data-view-name="${escapeHtml(firstView?.name || '')}" data-view-type="${escapeHtml(firstView?.type || 'cards')}">
    <div class="content-status-bar bases-status-bar">
      <span id="itemCountBadge" class="item-count-badge bases-item-count">0 items</span>
    </div>

    <div id="contentContainer" class="content-container bases-view-container"></div>
  </main>

  <!-- Settings drawer -->
  <div id="settingsDrawer" class="settings-drawer">
    <div class="drawer-header">
      <span class="drawer-title">Settings</span>
      <button id="drawerCloseBtn" class="drawer-close-btn">${renderIconSvg('x')}</button>
    </div>
    <div class="drawer-body">
      <div class="setting-row">
        <span class="setting-label">Theme</span>
        <span class="setting-desc">Switch between light and dark display</span>
        <div class="theme-toggle-group">
          <button id="themeLightBtn" class="theme-toggle-btn">${renderIconSvg('sun', 'b2h-icon-sm')} Light</button>
          <button id="themeDarkBtn" class="theme-toggle-btn active">${renderIconSvg('moon', 'b2h-icon-sm')} Dark</button>
        </div>
      </div>

      <div class="setting-row">
        <span class="setting-label">Page width</span>
        <span class="setting-desc">Adjust the reading width</span>
        <div class="width-toggle-group">
          <button id="widthNarrowBtn" class="width-toggle-btn">Narrow</button>
          <button id="widthNormalBtn" class="width-toggle-btn active">Normal</button>
          <button id="widthFullBtn" class="width-toggle-btn">Full</button>
        </div>
      </div>

      <div class="setting-row">
        <span class="setting-label">Font</span>
        <span class="setting-desc">Select typography style</span>
        <select id="fontSelect" class="font-select">
          <option value="vazirmatn">Vazirmatn (Default)</option>
          <option value="inter">Inter</option>
          <option value="system-sans">System Sans-Serif</option>
          <option value="system-serif">System Serif</option>
        </select>
      </div>
    </div>
  </div>

  <!-- Note details modal -->
  <div id="modalOverlay" class="modal-overlay"></div>
  <div id="noteModal" class="note-modal">
    <div class="modal-header">
      <h2 id="modalTitle" class="modal-title"></h2>
      <button id="modalCloseBtn" class="modal-close-btn">${renderIconSvg('x')}</button>
    </div>
    <div class="modal-body">
      <div id="modalProperties" class="modal-properties"></div>
      <div id="modalMarkdownContent" class="modal-markdown-content" dir="auto"></div>
    </div>
  </div>

  <!-- Footer -->
  <footer class="site-footer">
    Powered by <a href="https://github.com/fardm/bases-to-html" target="_blank" rel="noopener">Bases to HTML</a>
  </footer>

  <!-- Data island -->
  <script id="base-data" type="application/json">
    ${JSON.stringify(basePayload).replace(/</g, '\\u003c')}
  </script>

  ${jsInclude}
</body>
</html>`;
  }

  buildDirectoryIndex(
    exportedBases: Array<{ config: BaseFileConfig; items: NoteItem[] }>,
    isSinglePage = false,
  ): string {
    return this.generateIndexDirectoryHtml(exportedBases, isSinglePage);
  }

  private generateIndexDirectoryHtml(
    exportedBases: Array<{ config: BaseFileConfig; items: NoteItem[] }>,
    isSinglePage = false,
  ): string {
    const title = this.options.documentTitle || 'Bases Archive';
    const font = this.options.font || 'vazirmatn';
    const customCss = this.options.customCss || '';

    const fontLink = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Vazirmatn:wght@400;500;600;700&display=swap" rel="stylesheet">`;

    const cssInclude = isSinglePage
      ? `<style>\n${getClientCss(customCss)}\n</style>`
      : `<link rel="stylesheet" href="./assets/css/styles.css">`;

    const initScript = `<script>
  (function() {
    var savedTheme = localStorage.getItem('b2h_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    var savedFont = localStorage.getItem('b2h_font') || '${font}';
    document.documentElement.setAttribute('data-font', savedFont);
    var savedWidth = localStorage.getItem('b2h_width') || 'normal';
    document.documentElement.setAttribute('data-width', savedWidth);
  })();
</script>`;

    const cardsHtml = exportedBases
      .map(({ config, items }) => {
        const slug = sanitizeSlug(config.fileName);
        const viewsCount = config.views.length;
        const itemsCount = items.length;
        return `<a href="${slug}.html" class="base-directory-card">
        <div class="directory-card-icon">${renderIconSvg('book-open', 'b2h-icon-xl')}</div>
        <div class="directory-card-content">
          <h3 class="directory-card-title">${escapeHtml(config.baseTitle)}</h3>
          <div class="directory-card-meta">
            <span>${viewsCount} view${viewsCount === 1 ? '' : 's'}</span>
            <span>•</span>
            <span>${itemsCount} item${itemsCount === 1 ? '' : 's'}</span>
          </div>
        </div>
      </a>`;
      })
      .join('\n');

    return `<!DOCTYPE html>
<html lang="en" data-theme="dark" data-width="normal" data-font="${font}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  ${fontLink}
  ${cssInclude}
  <style>
    .directory-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-top: 2rem;
    }
    .base-directory-card {
      background-color: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 1.5rem;
      text-decoration: none;
      color: inherit;
      display: flex;
      align-items: center;
      gap: 1.25rem;
      box-shadow: var(--shadow-sm);
      transition: transform var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
    }
    .base-directory-card:hover {
      transform: translateY(-3px);
      border-color: var(--border-focus);
      box-shadow: var(--shadow-md);
      background-color: var(--bg-card-hover);
    }
    .directory-card-icon {
      font-size: 2.2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--accent-color);
    }
    .directory-card-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 0.35rem;
    }
    .directory-card-meta {
      font-size: 0.85rem;
      color: var(--text-muted);
      display: flex;
      gap: 0.5rem;
    }
  </style>
  ${initScript}
</head>
<body data-base-id="index" data-base-name="index">
  ${getLucideSpriteSvg()}

  <nav class="navbar">
    <div class="navbar-container">
      <div class="nav-brand-group">
        <a href="index.html" class="nav-brand">
          ${renderIconSvg('folder')}
          <span>${escapeHtml(title)}</span>
        </a>
      </div>
    </div>
  </nav>

  <main class="main-content" data-view-id="directory" data-view-name="directory" data-view-type="directory">
    <div style="margin-top: 1.5rem;">
      <h1 style="font-size: 1.8rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">Exported bases</h1>
      <p style="color: var(--text-muted);">Select a base below to explore views and items.</p>
    </div>

    <div class="directory-grid">
      ${cardsHtml}
    </div>
  </main>

  <footer class="site-footer">
    Powered by <a href="https://github.com/fardm/bases-to-html" target="_blank" rel="noopener">Bases to HTML</a>
  </footer>
</body>
</html>`;
  }
}

export function sanitizeSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[\s/\\?%*:|"<>]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'base'
  );
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
