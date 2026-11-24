export function getClientScript(): string {
	return `/* Bases to HTML - Client Script */
(function() {
  'use strict';

  var dataEl = document.getElementById('base-data');
  if (!dataEl) return;

  var baseData;
  try {
    baseData = JSON.parse(dataEl.textContent || '{}');
  } catch (e) {
    console.error('Failed to parse base-data JSON:', e);
    return;
  }

  var base = baseData.base;
  var items = baseData.items;
  if (!base || !items) return;

  var storagePrefix = 'b2h_' + (base.title || 'default') + '_';

  // Global settings state
  var currentTheme = localStorage.getItem('b2h_theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  var currentWidth = localStorage.getItem('b2h_width') || 'normal';
  var currentFont = localStorage.getItem('b2h_font') || 'vazirmatn';

  // Base state
  var currentViewIdx = 0;
  var savedViewIdx = localStorage.getItem(storagePrefix + 'view_idx');
  if (savedViewIdx !== null && !isNaN(Number(savedViewIdx)) && Number(savedViewIdx) < base.views.length) {
    currentViewIdx = Number(savedViewIdx);
  }

  var searchQuery = '';
  var activeTagFilters = new Set();
  var activeSort = null;
  var activeGroup = null;

  // DOM Elements
  var htmlRoot = document.documentElement;
  var viewSelect = document.getElementById('viewSelect');
  var searchInput = document.getElementById('searchInput');
  var searchClearBtn = document.getElementById('searchClearBtn');
  var filterToggleBtn = document.getElementById('filterToggleBtn');
  var filterPanel = document.getElementById('filterPanel');
  var activeFiltersBar = document.getElementById('activeFiltersBar');
  var filterTagsContainer = document.getElementById('filterTagsContainer');
  var sortSelect = document.getElementById('sortSelect');
  var sortDirBtn = document.getElementById('sortDirBtn');
  var groupSelect = document.getElementById('groupSelect');
  var groupDirBtn = document.getElementById('groupDirBtn');
  var contentContainer = document.getElementById('contentContainer');
  var itemCountBadge = document.getElementById('itemCountBadge');

  // Settings Drawer Elements
  var settingsBtn = document.getElementById('settingsBtn');
  var settingsDrawer = document.getElementById('settingsDrawer');
  var drawerCloseBtn = document.getElementById('drawerCloseBtn');
  var modalOverlay = document.getElementById('modalOverlay');
  var themeLightBtn = document.getElementById('themeLightBtn');
  var themeDarkBtn = document.getElementById('themeDarkBtn');
  var widthFullBtn = document.getElementById('widthFullBtn');
  var widthNormalBtn = document.getElementById('widthNormalBtn');
  var widthNarrowBtn = document.getElementById('widthNarrowBtn');
  var fontSelect = document.getElementById('fontSelect');

  // Note Modal Elements
  var noteModal = document.getElementById('noteModal');
  var modalTitle = document.getElementById('modalTitle');
  var modalCloseBtn = document.getElementById('modalCloseBtn');
  var modalProperties = document.getElementById('modalProperties');
  var modalMarkdownContent = document.getElementById('modalMarkdownContent');

  // Initialize Global Preferences
  applyTheme(currentTheme);
  applyWidth(currentWidth);
  applyFont(currentFont);

  // Initialize View
  initView(currentViewIdx);

  // Event Listeners
  if (viewSelect) {
    viewSelect.addEventListener('change', function(e) {
      currentViewIdx = Number(e.target.value);
      localStorage.setItem(storagePrefix + 'view_idx', String(currentViewIdx));
      initView(currentViewIdx);
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', function(e) {
      searchQuery = e.target.value.trim().toLowerCase();
      if (searchClearBtn) {
        if (searchQuery) searchClearBtn.classList.add('visible');
        else searchClearBtn.classList.remove('visible');
      }
      renderCards();
    });
  }

  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', function() {
      searchInput.value = '';
      searchQuery = '';
      searchClearBtn.classList.remove('visible');
      renderCards();
    });
  }

  if (filterToggleBtn && filterPanel) {
    filterToggleBtn.addEventListener('click', function() {
      filterPanel.classList.toggle('open');
      filterToggleBtn.classList.toggle('active', filterPanel.classList.contains('open'));
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', function(e) {
      var prop = e.target.value;
      if (prop === '__default__') {
        var view = base.views[currentViewIdx];
        activeSort = view && view.sort && view.sort[0] ? { property: view.sort[0].property, direction: view.sort[0].direction || 'DESC' } : null;
      } else {
        var dir = activeSort ? activeSort.direction : 'ASC';
        activeSort = { property: prop, direction: dir };
      }
      saveViewState();
      renderCards();
    });
  }

  if (sortDirBtn) {
    sortDirBtn.addEventListener('click', function() {
      if (!activeSort) activeSort = { property: 'name', direction: 'ASC' };
      activeSort.direction = (String(activeSort.direction).toUpperCase() === 'ASC') ? 'DESC' : 'ASC';
      sortDirBtn.textContent = String(activeSort.direction).toUpperCase() === 'ASC' ? '▲' : '▼';
      saveViewState();
      renderCards();
    });
  }

  if (groupSelect) {
    groupSelect.addEventListener('change', function(e) {
      var prop = e.target.value;
      if (prop === '__none__') {
        activeGroup = null;
      } else {
        var dir = activeGroup ? activeGroup.direction : 'DESC';
        activeGroup = { property: prop, direction: dir };
      }
      saveViewState();
      renderCards();
    });
  }

  if (groupDirBtn) {
    groupDirBtn.addEventListener('click', function() {
      if (!activeGroup) return;
      activeGroup.direction = (String(activeGroup.direction).toUpperCase() === 'ASC') ? 'DESC' : 'ASC';
      groupDirBtn.textContent = String(activeGroup.direction).toUpperCase() === 'ASC' ? '▲' : '▼';
      saveViewState();
      renderCards();
    });
  }

  // Drawer / Modal Handlers
  if (settingsBtn) {
    settingsBtn.addEventListener('click', openSettings);
  }
  if (drawerCloseBtn) {
    drawerCloseBtn.addEventListener('click', closeSettings);
  }
  if (modalOverlay) {
    modalOverlay.addEventListener('click', function() {
      closeSettings();
      closeNoteModal();
    });
  }
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeNoteModal);
  }

  window.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeSettings();
      closeNoteModal();
    }
  });

  // Settings Actions
  if (themeLightBtn) themeLightBtn.addEventListener('click', function() { applyTheme('light'); });
  if (themeDarkBtn) themeDarkBtn.addEventListener('click', function() { applyTheme('dark'); });
  if (widthFullBtn) widthFullBtn.addEventListener('click', function() { applyWidth('full'); });
  if (widthNormalBtn) widthNormalBtn.addEventListener('click', function() { applyWidth('normal'); });
  if (widthNarrowBtn) widthNarrowBtn.addEventListener('click', function() { applyWidth('narrow'); });
  if (fontSelect) {
    fontSelect.addEventListener('change', function(e) { applyFont(e.target.value); });
  }

  function applyTheme(theme) {
    currentTheme = theme;
    htmlRoot.setAttribute('data-theme', theme);
    localStorage.setItem('b2h_theme', theme);
    if (themeLightBtn && themeDarkBtn) {
      themeLightBtn.classList.toggle('active', theme === 'light');
      themeDarkBtn.classList.toggle('active', theme === 'dark');
    }
  }

  function applyWidth(width) {
    currentWidth = width;
    htmlRoot.setAttribute('data-width', width);
    localStorage.setItem('b2h_width', width);
    if (widthFullBtn && widthNormalBtn && widthNarrowBtn) {
      widthFullBtn.classList.toggle('active', width === 'full');
      widthNormalBtn.classList.toggle('active', width === 'normal');
      widthNarrowBtn.classList.toggle('active', width === 'narrow');
    }
  }

  function applyFont(font) {
    currentFont = font;
    htmlRoot.setAttribute('data-font', font);
    localStorage.setItem('b2h_font', font);
    if (fontSelect) fontSelect.value = font;
  }

  function openSettings() {
    if (settingsDrawer) settingsDrawer.classList.add('open');
    if (modalOverlay) modalOverlay.classList.add('open');
  }

  function closeSettings() {
    if (settingsDrawer) settingsDrawer.classList.remove('open');
    if (!noteModal || !noteModal.classList.contains('open')) {
      if (modalOverlay) modalOverlay.classList.remove('open');
    }
  }

  function openNoteModal(item) {
    if (!noteModal) return;
    if (modalTitle) {
      modalTitle.textContent = item.title;
      modalTitle.setAttribute('dir', 'auto');
    }

    if (modalProperties) {
      modalProperties.innerHTML = '';
      var props = Object.entries(item.properties || {});
      props.forEach(function(entry) {
        var key = entry[0];
        var val = entry[1];
        if (key === 'cover' || key === 'cover_source' || key === 'image') return;
        var chip = document.createElement('div');
        chip.className = 'modal-prop-chip';
        var displayVal = Array.isArray(val) ? val.join(', ') : String(val != null ? val : '');
        chip.innerHTML = '<strong>' + escapeHtml(key) + ':</strong> ' + escapeHtml(displayVal);
        modalProperties.appendChild(chip);
      });
    }

    if (modalMarkdownContent) {
      if (item.htmlContent) {
        modalMarkdownContent.innerHTML = item.htmlContent;
      } else if (item.properties && item.properties.source) {
        modalMarkdownContent.innerHTML = '<p><a href="' + escapeHtml(String(item.properties.source)) + '" target="_blank" rel="noopener">Open source link &rarr;</a></p>';
      } else {
        modalMarkdownContent.innerHTML = '<p style="color:var(--text-muted);">No note content exported for this item.</p>';
      }
    }

    noteModal.classList.add('open');
    if (modalOverlay) modalOverlay.classList.add('open');
  }

  function closeNoteModal() {
    if (noteModal) noteModal.classList.remove('open');
    if (!settingsDrawer || !settingsDrawer.classList.contains('open')) {
      if (modalOverlay) modalOverlay.classList.remove('open');
    }
  }

  function initView(viewIdx) {
    var view = base.views[viewIdx];
    if (!view) return;

    if (viewSelect) viewSelect.value = String(viewIdx);

    var cardSize = view.cardSize || 180;
    var aspectRatio = view.imageAspectRatio || 1.5;
    var imageFit = view.imageFit || 'cover';

    htmlRoot.style.setProperty('--card-size', cardSize + 'px');
    htmlRoot.style.setProperty('--aspect-ratio', String(aspectRatio));
    htmlRoot.style.setProperty('--image-fit', imageFit);

    var savedSort = localStorage.getItem(storagePrefix + 'view_' + viewIdx + '_sort');
    if (savedSort) {
      try { activeSort = JSON.parse(savedSort); } catch (e) { activeSort = null; }
    } else if (view.sort && view.sort.length > 0) {
      activeSort = { property: view.sort[0].property, direction: view.sort[0].direction || 'DESC' };
    } else {
      activeSort = null;
    }

    var savedGroup = localStorage.getItem(storagePrefix + 'view_' + viewIdx + '_group');
    if (savedGroup) {
      try { activeGroup = JSON.parse(savedGroup); } catch (e) { activeGroup = null; }
    } else if (view.groupBy && view.groupBy.property) {
      activeGroup = { property: view.groupBy.property, direction: view.groupBy.direction || 'DESC' };
    } else {
      activeGroup = null;
    }

    searchQuery = '';
    if (searchInput) searchInput.value = '';
    activeTagFilters.clear();

    populateFilterTags();
    populateSortAndGroupOptions(view);
    renderCards();
  }

  function saveViewState() {
    localStorage.setItem(storagePrefix + 'view_' + currentViewIdx + '_sort', JSON.stringify(activeSort));
    localStorage.setItem(storagePrefix + 'view_' + currentViewIdx + '_group', JSON.stringify(activeGroup));
  }

  function populateFilterTags() {
    if (!filterTagsContainer) return;
    filterTagsContainer.innerHTML = '';

    var allTags = new Set();
    items.forEach(function(it) {
      if (Array.isArray(it.tags)) {
        it.tags.forEach(function(t) { allTags.add(t); });
      }
    });

    allTags.forEach(function(tag) {
      var chip = document.createElement('span');
      chip.className = 'filter-tag-chip';
      chip.textContent = '#' + tag;
      chip.addEventListener('click', function() {
        if (activeTagFilters.has(tag)) {
          activeTagFilters.delete(tag);
          chip.classList.remove('selected');
        } else {
          activeTagFilters.add(tag);
          chip.classList.add('selected');
        }
        renderActiveFiltersBar();
        renderCards();
      });
      filterTagsContainer.appendChild(chip);
    });
  }

  function populateSortAndGroupOptions(view) {
    var props = new Set(['name', 'rating', 'date']);
    if (view.order) {
      view.order.forEach(function(p) {
        var clean = p.replace(/^formula\\./, '').replace(/^note\\./, '').replace(/^file\\./, '');
        props.add(clean);
      });
    }

    if (sortSelect) {
      sortSelect.innerHTML = '<option value="__default__">Default sort</option>';
      props.forEach(function(p) {
        var opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        if (activeSort && activeSort.property === p) opt.selected = true;
        sortSelect.appendChild(opt);
      });
    }

    if (sortDirBtn && activeSort) {
      sortDirBtn.textContent = String(activeSort.direction).toUpperCase() === 'ASC' ? '▲' : '▼';
    }

    if (groupSelect) {
      groupSelect.innerHTML = '<option value="__none__">No grouping</option>';
      props.forEach(function(p) {
        var opt = document.createElement('option');
        opt.value = p;
        opt.textContent = 'Group by: ' + p;
        if (activeGroup && activeGroup.property === p) opt.selected = true;
        groupSelect.appendChild(opt);
      });
    }

    if (groupDirBtn && activeGroup) {
      groupDirBtn.textContent = String(activeGroup.direction).toUpperCase() === 'ASC' ? '▲' : '▼';
    }
  }

  function renderActiveFiltersBar() {
    if (!activeFiltersBar) return;
    activeFiltersBar.innerHTML = '';

    activeTagFilters.forEach(function(tag) {
      var pill = document.createElement('span');
      pill.className = 'filter-pill';
      pill.innerHTML = '#' + escapeHtml(tag) + ' <span class="filter-pill-remove">&times;</span>';
      var rmBtn = pill.querySelector('.filter-pill-remove');
      if (rmBtn) {
        rmBtn.addEventListener('click', function() {
          activeTagFilters.delete(tag);
          renderActiveFiltersBar();
          if (filterTagsContainer) {
            var chips = filterTagsContainer.querySelectorAll('.filter-tag-chip');
            chips.forEach(function(c) {
              if (c.textContent === '#' + tag) c.classList.remove('selected');
            });
          }
          renderCards();
        });
      }
      activeFiltersBar.appendChild(pill);
    });
  }

  function getItemValue(item, propPath) {
    if (!propPath) return undefined;
    var clean = propPath.trim();
    if (clean === 'file.name' || clean === 'name') return item.title;
    if (clean === 'file.path') return item.path;
    if (clean === 'file.tags') return item.tags;
    if (clean.startsWith('formula.')) {
      var fName = clean.slice('formula.'.length);
      return item.computedFormulas ? item.computedFormulas[fName] : undefined;
    }
    if (clean.startsWith('note.')) {
      var p = clean.slice('note.'.length);
      return item.properties ? item.properties[p] : undefined;
    }
    if (item.properties && clean in item.properties) {
      return item.properties[clean];
    }
    if (item.computedFormulas && clean in item.computedFormulas) {
      return item.computedFormulas[clean];
    }
    return undefined;
  }

  function passesViewFilter(item, view) {
    if (!view.filters) return true;
    return evaluateFilterClient(view.filters, item);
  }

  function evaluateFilterClient(filter, item) {
    if (!filter) return true;
    if (typeof filter === 'string') {
      return evaluateExprClient(filter, item);
    }
    if (Array.isArray(filter)) {
      return filter.every(function(f) { return evaluateFilterClient(f, item); });
    }
    if (typeof filter === 'object') {
      if (filter.and && Array.isArray(filter.and)) {
        return filter.and.every(function(f) { return evaluateFilterClient(f, item); });
      }
      if (filter.or && Array.isArray(filter.or)) {
        return filter.or.some(function(f) { return evaluateFilterClient(f, item); });
      }
    }
    return true;
  }

  function evaluateExprClient(expr, item) {
    var trimmed = expr.trim();
    var tagMatch = trimmed.match(/^file\\.hasTag\\(["']?(.*?)["']?\\)$/);
    if (tagMatch && tagMatch[1]) {
      var tagToFind = tagMatch[1].replace(/^#/, '').toLowerCase();
      return (item.tags || []).some(function(t) { return t.toLowerCase() === tagToFind; });
    }

    var contMatch = trimmed.match(/^([\\w.-]+)\\.contains\\(["']?(.*?)["']?\\)$/);
    if (contMatch && contMatch[1] && contMatch[2]) {
      var val = getItemValue(item, contMatch[1]);
      var sub = contMatch[2].toLowerCase();
      if (Array.isArray(val)) return val.some(function(x) { return String(x).toLowerCase().includes(sub); });
      return String(val != null ? val : '').toLowerCase().includes(sub);
    }

    var ops = ['!=', '==', '>=', '<=', '>', '<'];
    for (var i = 0; i < ops.length; i++) {
      var op = ops[i];
      var parts = trimmed.split(op);
      if (parts.length === 2 && parts[0] && parts[1]) {
        var leftVal = getItemValue(item, parts[0].trim());
        var rightStr = parts[1].trim().replace(/^["']/, '').replace(/["']$/, '');
        var rightVal = rightStr;
        if (!isNaN(Number(rightStr))) rightVal = Number(rightStr);

        if (op === '==') return String(leftVal != null ? leftVal : '') === String(rightVal);
        if (op === '!=') return String(leftVal != null ? leftVal : '') !== String(rightVal);
        if (op === '>=') return Number(leftVal) >= Number(rightVal);
        if (op === '<=') return Number(leftVal) <= Number(rightVal);
        if (op === '>') return Number(leftVal) > Number(rightVal);
        if (op === '<') return Number(leftVal) < Number(rightVal);
      }
    }

    return true;
  }

  function renderCards() {
    if (!contentContainer) return;
    var view = base.views[currentViewIdx];
    if (!view) return;

    var filtered = items.filter(function(it) { return passesViewFilter(it, view); });

    if (searchQuery) {
      filtered = filtered.filter(function(it) {
        if (it.title.toLowerCase().includes(searchQuery)) return true;
        if (it.tags && it.tags.some(function(t) { return t.toLowerCase().includes(searchQuery); })) return true;
        var propValues = Object.values(it.properties || {});
        for (var i = 0; i < propValues.length; i++) {
          if (String(propValues[i]).toLowerCase().includes(searchQuery)) return true;
        }
        return false;
      });
    }

    if (activeTagFilters.size > 0) {
      filtered = filtered.filter(function(it) {
        var itemTags = (it.tags || []).map(function(t) { return t.toLowerCase(); });
        var hasAll = true;
        activeTagFilters.forEach(function(reqTag) {
          if (!itemTags.includes(reqTag.toLowerCase())) hasAll = false;
        });
        return hasAll;
      });
    }

    if (activeSort && activeSort.property) {
      var prop = activeSort.property;
      var isAsc = String(activeSort.direction).toUpperCase() === 'ASC';
      filtered.sort(function(a, b) {
        var valA = getItemValue(a, prop);
        var valB = getItemValue(b, prop);
        return compareValuesClient(valA, valB, isAsc);
      });
    }

    if (itemCountBadge) {
      itemCountBadge.textContent = filtered.length + ' item' + (filtered.length === 1 ? '' : 's');
    }

    contentContainer.innerHTML = '';

    if (filtered.length === 0) {
      var emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-state';
      emptyDiv.innerHTML = '<h3>No items found</h3><p>Try clearing your search or filters.</p>';
      contentContainer.appendChild(emptyDiv);
      return;
    }

    if (activeGroup && activeGroup.property) {
      var groupProp = activeGroup.property;
      var isGroupAsc = String(activeGroup.direction).toUpperCase() === 'ASC';

      var groups = new Map();
      filtered.forEach(function(it) {
        var keyVal = getItemValue(it, groupProp);
        var keyStr = (keyVal === undefined || keyVal === null || keyVal === '') ? 'Uncategorized' : String(keyVal);
        if (!groups.has(keyStr)) groups.set(keyStr, []);
        groups.get(keyStr).push(it);
      });

      var sortedKeys = Array.from(groups.keys()).sort(function(a, b) {
        if (a === 'Uncategorized') return 1;
        if (b === 'Uncategorized') return -1;
        return compareValuesClient(a, b, isGroupAsc);
      });

      sortedKeys.forEach(function(grpKey) {
        var grpItems = groups.get(grpKey);
        if (!grpItems) return;
        var grpSection = document.createElement('section');
        grpSection.className = 'group-section';

        var grpHeader = document.createElement('div');
        grpHeader.className = 'group-header';
        grpHeader.innerHTML = '<span class="group-title">' + escapeHtml(grpKey) + '</span><span class="group-count">' + grpItems.length + '</span>';
        grpSection.appendChild(grpHeader);

        var grid = document.createElement('div');
        grid.className = 'cards-grid';
        grpItems.forEach(function(item) {
          grid.appendChild(createCardElement(item, view));
        });
        grpSection.appendChild(grid);

        contentContainer.appendChild(grpSection);
      });
    } else {
      var grid = document.createElement('div');
      grid.className = 'cards-grid';
      filtered.forEach(function(item) {
        grid.appendChild(createCardElement(item, view));
      });
      contentContainer.appendChild(grid);
    }
  }

  function createCardElement(item, view) {
    var card = document.createElement('div');
    card.className = 'base-card';

    var imgWrapper = document.createElement('div');
    imgWrapper.className = 'card-image-wrapper';

    var imgSrc = item.coverImageBase64 || item.coverAssetRelativePath || item.coverImage;
    if (imgSrc) {
      var img = document.createElement('img');
      img.className = 'card-image';
      img.src = imgSrc;
      img.alt = item.title;
      img.loading = 'lazy';
      img.onerror = function() {
        img.remove();
        imgWrapper.appendChild(createPlaceholder(item.title));
      };
      imgWrapper.appendChild(img);
    } else {
      imgWrapper.appendChild(createPlaceholder(item.title));
    }
    card.appendChild(imgWrapper);

    var body = document.createElement('div');
    body.className = 'card-body';

    var order = view.order || ['file.name', 'rating'];
    var renderedTitle = false;

    order.forEach(function(prop) {
      var val = getItemValue(item, prop);
      if (val === undefined || val === null || val === '') return;

      if (prop === 'file.name' || prop === 'name') {
        var titleEl = document.createElement('div');
        titleEl.className = 'card-title';
        titleEl.textContent = String(val);
        titleEl.setAttribute('dir', 'auto');
        body.appendChild(titleEl);
        renderedTitle = true;
      } else if (prop === 'badge') {
        var badgeEl = document.createElement('div');
        badgeEl.className = 'card-badge';
        badgeEl.textContent = Array.isArray(val) ? val.join(' ') : String(val);
        badgeEl.setAttribute('dir', 'auto');
        body.appendChild(badgeEl);
      } else if (prop.includes('starRating') || (typeof val === 'string' && val.includes('★'))) {
        var starEl = document.createElement('div');
        starEl.className = 'card-rating';
        starEl.textContent = String(val);
        body.appendChild(starEl);
      } else {
        var row = document.createElement('div');
        row.className = 'card-prop-item';
        var cleanKey = prop.replace(/^formula\\./, '').replace(/^note\\./, '');
        var displayVal = Array.isArray(val) ? val.join(', ') : String(val);
        row.innerHTML = '<span class="card-prop-key">' + escapeHtml(cleanKey) + '</span><span class="card-prop-val" dir="auto">' + escapeHtml(displayVal) + '</span>';
        body.appendChild(row);
      }
    });

    if (!renderedTitle) {
      var fallbackTitle = document.createElement('div');
      fallbackTitle.className = 'card-title';
      fallbackTitle.textContent = item.title;
      fallbackTitle.setAttribute('dir', 'auto');
      body.insertBefore(fallbackTitle, body.firstChild);
    }

    card.appendChild(body);

    card.addEventListener('click', function() {
      openNoteModal(item);
    });

    return card;
  }

  function createPlaceholder(title) {
    var ph = document.createElement('div');
    ph.className = 'card-image-placeholder';
    var initial = title ? title.trim()[0].toUpperCase() : '📄';
    ph.innerHTML = '<span>' + escapeHtml(initial) + '</span>';
    return ph;
  }

  function compareValuesClient(a, b, isAsc) {
    if (a === b) return 0;
    if (a === undefined || a === null) return isAsc ? 1 : -1;
    if (b === undefined || b === null) return isAsc ? -1 : 1;

    var numA = Number(a);
    var numB = Number(b);
    if (!isNaN(numA) && !isNaN(numB) && typeof a !== 'boolean' && typeof b !== 'boolean') {
      return isAsc ? numA - numB : numB - numA;
    }

    var strA = String(a).toLowerCase();
    var strB = String(b).toLowerCase();
    var res = strA.localeCompare(strB);
    return isAsc ? res : -res;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

})();
`;
}
