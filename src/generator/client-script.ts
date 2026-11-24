export function getClientScript(): string {
	return `/* Bases to HTML - Type-Aware Interactive Engine */
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
  var activeFilterRules = [];
  var activeSortRules = [];
  var activeGroupRule = null;
  var activeOrder = [];

  // Property types dictionary from export
  var propertyTypes = base.propertyTypes || {};

  // Standard operators by type
  var OPERATORS_BY_TYPE = {
    text: [
      { id: 'contains', label: 'contains' },
      { id: 'does_not_contain', label: 'does not contain' },
      { id: 'is', label: 'is exactly' },
      { id: 'is_not', label: 'is not exactly' },
      { id: 'is_empty', label: 'is empty', noValue: true },
      { id: 'is_not_empty', label: 'is not empty', noValue: true }
    ],
    number: [
      { id: '=', label: '=' },
      { id: '!=', label: '≠' },
      { id: '>', label: '>' },
      { id: '<', label: '<' },
      { id: '>=', label: '≥' },
      { id: '<=', label: '≤' },
      { id: 'is_empty', label: 'is empty', noValue: true },
      { id: 'is_not_empty', label: 'is not empty', noValue: true }
    ],
    date: [
      { id: 'is', label: 'is' },
      { id: 'is_before', label: 'is before' },
      { id: 'is_after', label: 'is after' },
      { id: 'is_on_or_before', label: 'is on or before' },
      { id: 'is_on_or_after', label: 'is on or after' },
      { id: 'is_empty', label: 'is empty', noValue: true },
      { id: 'is_not_empty', label: 'is not empty', noValue: true }
    ],
    checkbox: [
      { id: 'is_checked', label: 'is checked', noValue: true },
      { id: 'is_not_checked', label: 'is not checked', noValue: true }
    ],
    list: [
      { id: 'contains', label: 'contains' },
      { id: 'has_tag', label: 'has tag' },
      { id: 'contains_any', label: 'contains any of' },
      { id: 'contains_all', label: 'contains all of' },
      { id: 'does_not_contain', label: 'does not contain' },
      { id: 'does_not_contain_any', label: 'does not contain any of' },
      { id: 'is_empty', label: 'is empty', noValue: true },
      { id: 'is_not_empty', label: 'is not empty', noValue: true }
    ],
    link: [
      { id: 'is', label: 'is' },
      { id: 'is_not', label: 'is not' },
      { id: 'contains', label: 'contains' },
      { id: 'is_empty', label: 'is empty', noValue: true },
      { id: 'is_not_empty', label: 'is not empty', noValue: true }
    ]
  };

  // DOM Elements
  var htmlRoot = document.documentElement;
  var viewSelect = document.getElementById('viewSelect');
  var searchInput = document.getElementById('searchInput');
  var searchClearBtn = document.getElementById('searchClearBtn');

  // Popover Buttons & Elements
  var sortToggleBtn = document.getElementById('sortToggleBtn');
  var sortPopover = document.getElementById('sortPopover');
  var sortRulesList = document.getElementById('sortRulesList');
  var addSortBtn = document.getElementById('addSortBtn');
  var sortCountBadge = document.getElementById('sortCountBadge');

  var groupToggleBtn = document.getElementById('groupToggleBtn');
  var groupPopover = document.getElementById('groupPopover');
  var groupRulesList = document.getElementById('groupRulesList');
  var addGroupBtn = document.getElementById('addGroupBtn');

  var filterToggleBtn = document.getElementById('filterToggleBtn');
  var filterPopover = document.getElementById('filterPopover');
  var filterRulesList = document.getElementById('filterRulesList');
  var addFilterBtn = document.getElementById('addFilterBtn');
  var filterCountBadge = document.getElementById('filterCountBadge');

  var propertiesToggleBtn = document.getElementById('propertiesToggleBtn');
  var propertiesPopover = document.getElementById('propertiesPopover');
  var propertiesList = document.getElementById('propertiesList');

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

  // Setup Popovers toggling
  setupPopoverToggles();

  // Search input events
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

  if (viewSelect) {
    viewSelect.addEventListener('change', function(e) {
      currentViewIdx = Number(e.target.value);
      localStorage.setItem(storagePrefix + 'view_idx', String(currentViewIdx));
      initView(currentViewIdx);
    });
  }

  // Settings Handlers
  if (settingsBtn) settingsBtn.addEventListener('click', openSettings);
  if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeSettings);
  if (modalOverlay) {
    modalOverlay.addEventListener('click', function() {
      closeSettings();
      closeNoteModal();
      closeAllPopovers();
    });
  }
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeNoteModal);

  window.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeSettings();
      closeNoteModal();
      closeAllPopovers();
    }
  });

  if (themeLightBtn) themeLightBtn.addEventListener('click', function() { applyTheme('light'); });
  if (themeDarkBtn) themeDarkBtn.addEventListener('click', function() { applyTheme('dark'); });
  if (widthFullBtn) widthFullBtn.addEventListener('click', function() { applyWidth('full'); });
  if (widthNormalBtn) widthNormalBtn.addEventListener('click', function() { applyWidth('normal'); });
  if (widthNarrowBtn) widthNarrowBtn.addEventListener('click', function() { applyWidth('narrow'); });
  if (fontSelect) {
    fontSelect.addEventListener('change', function(e) { applyFont(e.target.value); });
  }

  // =========================================================================
  // Popover Handlers
  // =========================================================================

  function setupPopoverToggles() {
    var popoverPairs = [
      { btn: sortToggleBtn, popover: sortPopover },
      { btn: groupToggleBtn, popover: groupPopover },
      { btn: filterToggleBtn, popover: filterPopover },
      { btn: propertiesToggleBtn, popover: propertiesPopover }
    ];

    popoverPairs.forEach(function(pair) {
      if (!pair.btn || !pair.popover) return;
      pair.btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var wasOpen = pair.popover.classList.contains('open');
        closeAllPopovers();
        if (!wasOpen) {
          pair.popover.classList.add('open');
          pair.btn.classList.add('active');
        }
      });

      pair.popover.addEventListener('click', function(e) {
        e.stopPropagation();
      });
    });

    document.addEventListener('click', function() {
      closeAllPopovers();
    });

    if (addSortBtn) {
      addSortBtn.addEventListener('click', function() {
        var allProps = getAllAvailablePropertyKeys();
        var defaultProp = allProps[0] || 'file.name';
        activeSortRules.push({ property: defaultProp, direction: 'DESC' });
        saveSortState();
        renderSortPopover();
        renderCards();
      });
    }

    if (addGroupBtn) {
      addGroupBtn.addEventListener('click', function() {
        var allProps = getAllAvailablePropertyKeys();
        var defaultProp = allProps[0] || 'rating';
        activeGroupRule = { property: defaultProp, direction: 'DESC' };
        saveGroupState();
        renderGroupPopover();
        renderCards();
      });
    }

    if (addFilterBtn) {
      addFilterBtn.addEventListener('click', function() {
        var allProps = getAllAvailablePropertyKeys();
        var defaultProp = allProps[0] || 'file.name';
        var pType = getPropertyType(defaultProp);
        var opList = OPERATORS_BY_TYPE[pType] || OPERATORS_BY_TYPE.text;
        var defaultOp = opList[0] ? opList[0].id : 'contains';
        activeFilterRules.push({
          conjunction: activeFilterRules.length === 0 ? 'where' : 'and',
          property: defaultProp,
          operator: defaultOp,
          value: ''
        });
        saveFilterState();
        renderFilterPopover();
        renderCards();
      });
    }
  }

  function closeAllPopovers() {
    [sortPopover, groupPopover, filterPopover, propertiesPopover].forEach(function(pop) {
      if (pop) pop.classList.remove('open');
    });
    updateToolbarActiveStates();
  }

  function updateToolbarActiveStates() {
    if (sortToggleBtn) {
      var isSortOpen = sortPopover && sortPopover.classList.contains('open');
      var hasSorts = activeSortRules.length > 0;
      sortToggleBtn.classList.toggle('active', isSortOpen || hasSorts);
      if (sortCountBadge) {
        if (hasSorts) {
          sortCountBadge.textContent = String(activeSortRules.length);
          sortCountBadge.style.display = 'inline-block';
        } else {
          sortCountBadge.style.display = 'none';
        }
      }
    }

    if (groupToggleBtn) {
      var isGroupOpen = groupPopover && groupPopover.classList.contains('open');
      var hasGroup = Boolean(activeGroupRule && activeGroupRule.property);
      groupToggleBtn.classList.toggle('active', isGroupOpen || hasGroup);
    }

    if (filterToggleBtn) {
      var isFilterOpen = filterPopover && filterPopover.classList.contains('open');
      var hasFilters = activeFilterRules.length > 0;
      filterToggleBtn.classList.toggle('active', isFilterOpen || hasFilters);
      if (filterCountBadge) {
        if (hasFilters) {
          filterCountBadge.textContent = String(activeFilterRules.length);
          filterCountBadge.style.display = 'inline-block';
        } else {
          filterCountBadge.style.display = 'none';
        }
      }
    }

    if (propertiesToggleBtn) {
      var isPropsOpen = propertiesPopover && propertiesPopover.classList.contains('open');
      propertiesToggleBtn.classList.toggle('active', isPropsOpen);
    }
  }

  // =========================================================================
  // View Initialization & LocalStorage
  // =========================================================================

  function initView(viewIdx) {
    var view = base.views[viewIdx];
    if (!view) return;

    if (viewSelect) viewSelect.value = String(viewIdx);

    var cardSize = view.cardSize || 180;
    var rawRatio = typeof view.imageAspectRatio === 'number' && view.imageAspectRatio > 0 ? view.imageAspectRatio : 1.5;
    var cssRatio = 1 / rawRatio;
    var imageFit = view.imageFit || 'cover';

    htmlRoot.style.setProperty('--card-size', cardSize + 'px');
    htmlRoot.style.setProperty('--aspect-ratio', String(rawRatio));
    htmlRoot.style.setProperty('--css-aspect-ratio', String(cssRatio));
    htmlRoot.style.setProperty('--image-fit', imageFit);

    // 1. Sort state
    var savedSorts = localStorage.getItem(storagePrefix + 'view_' + viewIdx + '_sorts');
    if (savedSorts) {
      try { activeSortRules = JSON.parse(savedSorts) || []; } catch (e) { activeSortRules = []; }
    } else if (Array.isArray(view.sort) && view.sort.length > 0) {
      activeSortRules = view.sort.map(function(s) {
        return { property: s.property, direction: (s.direction || 'DESC').toUpperCase() };
      });
    } else {
      activeSortRules = [];
    }

    // 2. Group state
    var savedGroup = localStorage.getItem(storagePrefix + 'view_' + viewIdx + '_group');
    if (savedGroup) {
      try { activeGroupRule = JSON.parse(savedGroup); } catch (e) { activeGroupRule = null; }
    } else if (view.groupBy && view.groupBy.property) {
      activeGroupRule = { property: view.groupBy.property, direction: (view.groupBy.direction || 'DESC').toUpperCase() };
    } else {
      activeGroupRule = null;
    }

    // 3. Filter state
    var savedFilters = localStorage.getItem(storagePrefix + 'view_' + viewIdx + '_filters');
    if (savedFilters) {
      try { activeFilterRules = JSON.parse(savedFilters) || []; } catch (e) { activeFilterRules = []; }
    } else {
      activeFilterRules = parseInitialViewFilters(view.filters);
    }

    // 4. Properties order state
    var savedOrder = localStorage.getItem(storagePrefix + 'view_' + viewIdx + '_order');
    if (savedOrder) {
      try { activeOrder = JSON.parse(savedOrder) || []; } catch (e) { activeOrder = []; }
    } else if (Array.isArray(view.order) && view.order.length > 0) {
      activeOrder = view.order.slice();
    } else {
      activeOrder = ['file.name', 'rating'];
    }

    searchQuery = '';
    if (searchInput) searchInput.value = '';

    renderSortPopover();
    renderGroupPopover();
    renderFilterPopover();
    renderPropertiesPopover();
    renderCards();
    updateToolbarActiveStates();
  }

  function parseInitialViewFilters(filters) {
    var rules = [];
    if (!filters) return rules;

    function parseItem(item) {
      if (typeof item === 'string') {
        var str = item.trim();
        var tagMatch = str.match(/^file\\.hasTag\\(["']?(.*?)["']?\\)$/);
        if (tagMatch) {
          rules.push({
            conjunction: rules.length === 0 ? 'where' : 'and',
            property: 'file.tags',
            operator: 'has_tag',
            value: tagMatch[1].replace(/^#/, '')
          });
          return;
        }

        var contMatch = str.match(/^([\\w.-]+)\\.contains\\(["']?(.*?)["']?\\)$/);
        if (contMatch) {
          rules.push({
            conjunction: rules.length === 0 ? 'where' : 'and',
            property: contMatch[1],
            operator: 'contains',
            value: contMatch[2]
          });
          return;
        }

        var ops = ['!=', '==', '>=', '<=', '>', '<'];
        for (var i = 0; i < ops.length; i++) {
          var op = ops[i];
          var parts = str.split(op);
          if (parts.length === 2) {
            var pName = parts[0].trim();
            var rawVal = parts[1].trim().replace(/^["']/, '').replace(/["']$/, '');
            var val = !isNaN(Number(rawVal)) ? Number(rawVal) : rawVal;
            var mappedOp = op === '==' ? '=' : (op === '!=' ? '!=' : op);
            rules.push({
              conjunction: rules.length === 0 ? 'where' : 'and',
              property: pName,
              operator: mappedOp,
              value: val
            });
            return;
          }
        }
      } else if (Array.isArray(item)) {
        item.forEach(parseItem);
      } else if (typeof item === 'object' && item !== null) {
        if (Array.isArray(item.and)) item.and.forEach(parseItem);
        if (Array.isArray(item.or)) item.or.forEach(parseItem);
      }
    }

    parseItem(filters);
    return rules;
  }

  function saveSortState() {
    localStorage.setItem(storagePrefix + 'view_' + currentViewIdx + '_sorts', JSON.stringify(activeSortRules));
    updateToolbarActiveStates();
  }

  function saveGroupState() {
    localStorage.setItem(storagePrefix + 'view_' + currentViewIdx + '_group', JSON.stringify(activeGroupRule));
    updateToolbarActiveStates();
  }

  function saveFilterState() {
    localStorage.setItem(storagePrefix + 'view_' + currentViewIdx + '_filters', JSON.stringify(activeFilterRules));
    updateToolbarActiveStates();
  }

  function saveOrderState() {
    localStorage.setItem(storagePrefix + 'view_' + currentViewIdx + '_order', JSON.stringify(activeOrder));
  }

  // =========================================================================
  // Property Helpers & Types
  // =========================================================================

  function getAllAvailablePropertyKeys() {
    var set = new Set();
    set.add('file.name');
    set.add('file.tags');

    Object.keys(propertyTypes).forEach(function(k) {
      set.add(k);
    });

    items.forEach(function(it) {
      if (it.properties) {
        Object.keys(it.properties).forEach(function(k) { set.add(k); });
      }
      if (it.computedFormulas) {
        Object.keys(it.computedFormulas).forEach(function(k) { set.add('formula.' + k); });
      }
    });

    return Array.from(set);
  }

  function getPropertyMetadata(propName) {
    if (propertyTypes[propName]) return propertyTypes[propName];

    var type = 'text';
    var icon = '☰';

    if (propName === 'rating' || propName.toLowerCase().includes('score') || propName === 'pages' || propName === 'year') {
      type = 'number';
      icon = '🔢';
    } else if (propName === 'date' || propName.toLowerCase().includes('date')) {
      type = 'date';
      icon = '📅';
    } else if (propName === 'badge' || propName === 'tags' || propName === 'file.tags') {
      type = 'list';
      icon = '🏷';
    } else if (propName === 'file' || propName === 'file.name') {
      type = 'text';
      icon = '📄';
    }

    return { id: propName, name: propName, type: type, icon: icon };
  }

  function getPropertyType(propName) {
    return getPropertyMetadata(propName).type;
  }

  function getDirectionLabels(propName) {
    var type = getPropertyType(propName);
    if (type === 'number') {
      return { asc: '0 → 1', desc: '1 → 0' };
    }
    if (type === 'date') {
      return { asc: 'Oldest → Newest', desc: 'Newest → Oldest' };
    }
    return { asc: 'A → Z', desc: 'Z → A' };
  }

  function getItemValue(item, propPath) {
    if (!propPath) return undefined;
    var clean = propPath.trim();
    if (clean === 'file.name' || clean === 'name' || clean === 'file') return item.title;
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

  // =========================================================================
  // Popover Renders (Sort, Group, Filter, Properties)
  // =========================================================================

  function renderSortPopover() {
    if (!sortRulesList) return;
    sortRulesList.innerHTML = '';

    var allProps = getAllAvailablePropertyKeys();

    activeSortRules.forEach(function(rule, idx) {
      var row = document.createElement('div');
      row.className = 'popover-rule-row';
      row.setAttribute('draggable', 'true');

      // Drag Handle
      var dragHandle = document.createElement('span');
      dragHandle.className = 'drag-handle';
      dragHandle.innerHTML = '⠿';
      row.appendChild(dragHandle);

      // Pill container
      var pill = document.createElement('div');
      pill.className = 'popover-rule-pill';

      // Property Select
      var propSelect = document.createElement('select');
      propSelect.className = 'pill-select';
      allProps.forEach(function(p) {
        var meta = getPropertyMetadata(p);
        var opt = document.createElement('option');
        opt.value = p;
        opt.textContent = (meta.icon ? meta.icon + ' ' : '') + meta.name;
        if (p === rule.property) opt.selected = true;
        propSelect.appendChild(opt);
      });

      propSelect.addEventListener('change', function(e) {
        rule.property = e.target.value;
        saveSortState();
        renderSortPopover();
        renderCards();
      });
      pill.appendChild(propSelect);

      var divider = document.createElement('span');
      divider.className = 'pill-divider';
      pill.appendChild(divider);

      // Direction Select
      var dirSelect = document.createElement('select');
      dirSelect.className = 'pill-select';
      var dirLabels = getDirectionLabels(rule.property);

      var optDesc = document.createElement('option');
      optDesc.value = 'DESC';
      optDesc.textContent = dirLabels.desc + ' ↕';
      if (rule.direction === 'DESC') optDesc.selected = true;
      dirSelect.appendChild(optDesc);

      var optAsc = document.createElement('option');
      optAsc.value = 'ASC';
      optAsc.textContent = dirLabels.asc + ' ↕';
      if (rule.direction === 'ASC') optAsc.selected = true;
      dirSelect.appendChild(optAsc);

      dirSelect.addEventListener('change', function(e) {
        rule.direction = e.target.value;
        saveSortState();
        renderCards();
      });
      pill.appendChild(dirSelect);

      row.appendChild(pill);

      // Delete Button
      var delBtn = document.createElement('button');
      delBtn.className = 'popover-rule-delete';
      delBtn.title = 'Remove sort rule';
      delBtn.innerHTML = '🗑';
      delBtn.addEventListener('click', function() {
        activeSortRules.splice(idx, 1);
        saveSortState();
        renderSortPopover();
        renderCards();
      });
      row.appendChild(delBtn);

      // Drag and Drop
      setupDragDrop(row, idx, activeSortRules, function() {
        saveSortState();
        renderSortPopover();
        renderCards();
      });

      sortRulesList.appendChild(row);
    });

    updateToolbarActiveStates();
  }

  function renderGroupPopover() {
    if (!groupRulesList) return;
    groupRulesList.innerHTML = '';

    if (!activeGroupRule || !activeGroupRule.property) {
      var emptyMsg = document.createElement('p');
      emptyMsg.style.fontSize = '0.85rem';
      emptyMsg.style.color = 'var(--text-muted)';
      emptyMsg.style.margin = '0.25rem 0';
      emptyMsg.textContent = 'No active grouping.';
      groupRulesList.appendChild(emptyMsg);
      if (addGroupBtn) addGroupBtn.style.display = 'inline-flex';
      updateToolbarActiveStates();
      return;
    }

    if (addGroupBtn) addGroupBtn.style.display = 'none';

    var allProps = getAllAvailablePropertyKeys();
    var row = document.createElement('div');
    row.className = 'popover-rule-row';

    var pill = document.createElement('div');
    pill.className = 'popover-rule-pill';

    // Property Select
    var propSelect = document.createElement('select');
    propSelect.className = 'pill-select';
    allProps.forEach(function(p) {
      var meta = getPropertyMetadata(p);
      var opt = document.createElement('option');
      opt.value = p;
      opt.textContent = (meta.icon ? meta.icon + ' ' : '') + meta.name;
      if (p === activeGroupRule.property) opt.selected = true;
      propSelect.appendChild(opt);
    });

    propSelect.addEventListener('change', function(e) {
      activeGroupRule.property = e.target.value;
      saveGroupState();
      renderGroupPopover();
      renderCards();
    });
    pill.appendChild(propSelect);

    var divider = document.createElement('span');
    divider.className = 'pill-divider';
    pill.appendChild(divider);

    // Direction Select
    var dirSelect = document.createElement('select');
    dirSelect.className = 'pill-select';
    var dirLabels = getDirectionLabels(activeGroupRule.property);

    var optDesc = document.createElement('option');
    optDesc.value = 'DESC';
    optDesc.textContent = dirLabels.desc + ' ↕';
    if (activeGroupRule.direction === 'DESC') optDesc.selected = true;
    dirSelect.appendChild(optDesc);

    var optAsc = document.createElement('option');
    optAsc.value = 'ASC';
    optAsc.textContent = dirLabels.asc + ' ↕';
    if (activeGroupRule.direction === 'ASC') optAsc.selected = true;
    dirSelect.appendChild(optAsc);

    dirSelect.addEventListener('change', function(e) {
      activeGroupRule.direction = e.target.value;
      saveGroupState();
      renderCards();
    });
    pill.appendChild(dirSelect);

    row.appendChild(pill);

    // Delete Button (Remove grouping)
    var delBtn = document.createElement('button');
    delBtn.className = 'popover-rule-delete';
    delBtn.title = 'Remove grouping';
    delBtn.innerHTML = '🗑';
    delBtn.addEventListener('click', function() {
      activeGroupRule = null;
      saveGroupState();
      renderGroupPopover();
      renderCards();
    });
    row.appendChild(delBtn);

    groupRulesList.appendChild(row);
    updateToolbarActiveStates();
  }

  function renderFilterPopover() {
    if (!filterRulesList) return;
    filterRulesList.innerHTML = '';

    var allProps = getAllAvailablePropertyKeys();

    activeFilterRules.forEach(function(rule, idx) {
      var row = document.createElement('div');
      row.className = 'popover-rule-row';
      row.setAttribute('draggable', 'true');

      // Prefix button (where for row 0, and/or toggle for row > 0)
      if (idx === 0) {
        var whereLabel = document.createElement('span');
        whereLabel.className = 'filter-conjunction-btn';
        whereLabel.textContent = 'where';
        whereLabel.style.cursor = 'default';
        row.appendChild(whereLabel);
      } else {
        var conjBtn = document.createElement('button');
        conjBtn.className = 'filter-conjunction-btn';
        conjBtn.textContent = rule.conjunction || 'and';
        conjBtn.title = 'Toggle AND / OR';
        conjBtn.addEventListener('click', function() {
          rule.conjunction = (rule.conjunction === 'or') ? 'and' : 'or';
          conjBtn.textContent = rule.conjunction;
          saveFilterState();
          renderCards();
        });
        row.appendChild(conjBtn);
      }

      // Pill container
      var pill = document.createElement('div');
      pill.className = 'popover-rule-pill';

      // 1. Property Select
      var propSelect = document.createElement('select');
      propSelect.className = 'pill-select';
      allProps.forEach(function(p) {
        var meta = getPropertyMetadata(p);
        var opt = document.createElement('option');
        opt.value = p;
        opt.textContent = (meta.icon ? meta.icon + ' ' : '') + meta.name;
        if (p === rule.property) opt.selected = true;
        propSelect.appendChild(opt);
      });

      propSelect.addEventListener('change', function(e) {
        rule.property = e.target.value;
        var pType = getPropertyType(rule.property);
        var opList = OPERATORS_BY_TYPE[pType] || OPERATORS_BY_TYPE.text;
        rule.operator = opList[0] ? opList[0].id : 'contains';
        rule.value = '';
        saveFilterState();
        renderFilterPopover();
        renderCards();
      });
      pill.appendChild(propSelect);

      var divider1 = document.createElement('span');
      divider1.className = 'pill-divider';
      pill.appendChild(divider1);

      // 2. Operator Select
      var pType = getPropertyType(rule.property);
      var opList = OPERATORS_BY_TYPE[pType] || OPERATORS_BY_TYPE.text;

      var opSelect = document.createElement('select');
      opSelect.className = 'pill-select';
      var currentOpDef = null;

      opList.forEach(function(opDef) {
        var opt = document.createElement('option');
        opt.value = opDef.id;
        opt.textContent = opDef.label + ' ↕';
        if (opDef.id === rule.operator) {
          opt.selected = true;
          currentOpDef = opDef;
        }
        opSelect.appendChild(opt);
      });

      if (!currentOpDef && opList[0]) {
        currentOpDef = opList[0];
        rule.operator = currentOpDef.id;
      }

      opSelect.addEventListener('change', function(e) {
        rule.operator = e.target.value;
        saveFilterState();
        renderFilterPopover();
        renderCards();
      });
      pill.appendChild(opSelect);

      // 3. Value Input (if operator requires value)
      if (currentOpDef && !currentOpDef.noValue) {
        var divider2 = document.createElement('span');
        divider2.className = 'pill-divider';
        pill.appendChild(divider2);

        var valInput = document.createElement('input');
        valInput.className = 'pill-input';

        if (pType === 'number') {
          valInput.type = 'number';
          valInput.value = (rule.value !== undefined && rule.value !== null) ? String(rule.value) : '';
        } else if (pType === 'date') {
          valInput.type = 'date';
          valInput.value = rule.value || '';
        } else {
          valInput.type = 'text';
          valInput.placeholder = 'Value...';
          valInput.value = rule.value || '';
        }

        valInput.addEventListener('input', function(e) {
          rule.value = pType === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value;
          saveFilterState();
          renderCards();
        });
        pill.appendChild(valInput);
      }

      row.appendChild(pill);

      // Delete Button
      var delBtn = document.createElement('button');
      delBtn.className = 'popover-rule-delete';
      delBtn.title = 'Remove filter';
      delBtn.innerHTML = '&times;';
      delBtn.addEventListener('click', function() {
        activeFilterRules.splice(idx, 1);
        if (activeFilterRules.length > 0 && activeFilterRules[0]) {
          activeFilterRules[0].conjunction = 'where';
        }
        saveFilterState();
        renderFilterPopover();
        renderCards();
      });
      row.appendChild(delBtn);

      setupDragDrop(row, idx, activeFilterRules, function() {
        if (activeFilterRules[0]) activeFilterRules[0].conjunction = 'where';
        saveFilterState();
        renderFilterPopover();
        renderCards();
      });

      filterRulesList.appendChild(row);
    });

    updateToolbarActiveStates();
  }

  function renderPropertiesPopover() {
    if (!propertiesList) return;
    propertiesList.innerHTML = '';

    var allProps = getAllAvailablePropertyKeys();

    allProps.forEach(function(prop) {
      var meta = getPropertyMetadata(prop);
      var isVisible = activeOrder.includes(prop);

      var row = document.createElement('div');
      row.className = 'property-visibility-row';

      var left = document.createElement('div');
      left.className = 'property-visibility-left';

      var chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.className = 'property-visibility-toggle';
      chk.checked = isVisible;
      chk.addEventListener('change', function() {
        if (chk.checked) {
          if (!activeOrder.includes(prop)) activeOrder.push(prop);
        } else {
          activeOrder = activeOrder.filter(function(p) { return p !== prop; });
        }
        saveOrderState();
        renderCards();
      });

      var label = document.createElement('span');
      label.textContent = (meta.icon ? meta.icon + ' ' : '') + meta.name;

      left.appendChild(chk);
      left.appendChild(label);
      row.appendChild(left);

      propertiesList.appendChild(row);
    });
  }

  // Generic Drag & Drop setup
  var draggedRowIdx = null;

  function setupDragDrop(rowEl, index, arrayRef, onReorder) {
    rowEl.addEventListener('dragstart', function(e) {
      draggedRowIdx = index;
      rowEl.classList.add('dragging');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
      }
    });

    rowEl.addEventListener('dragend', function() {
      rowEl.classList.remove('dragging');
      draggedRowIdx = null;
    });

    rowEl.addEventListener('dragover', function(e) {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    });

    rowEl.addEventListener('drop', function(e) {
      e.preventDefault();
      if (draggedRowIdx === null || draggedRowIdx === index) return;
      var movedItem = arrayRef.splice(draggedRowIdx, 1)[0];
      if (movedItem) {
        arrayRef.splice(index, 0, movedItem);
        onReorder();
      }
    });
  }

  // =========================================================================
  // Filtering & Sorting Evaluators
  // =========================================================================

  function passesFilterRules(item) {
    if (activeFilterRules.length === 0) return true;

    var overallResult = true;

    for (var i = 0; i < activeFilterRules.length; i++) {
      var rule = activeFilterRules[i];
      var rulePassed = evaluateSingleFilterRule(item, rule);

      if (i === 0) {
        overallResult = rulePassed;
      } else {
        var conj = rule.conjunction || 'and';
        if (conj === 'or') {
          overallResult = overallResult || rulePassed;
        } else {
          overallResult = overallResult && rulePassed;
        }
      }
    }

    return overallResult;
  }

  function evaluateSingleFilterRule(item, rule) {
    var rawVal = getItemValue(item, rule.property);
    var pType = getPropertyType(rule.property);
    var op = rule.operator;
    var target = rule.value;

    if (op === 'is_empty') {
      if (rawVal === undefined || rawVal === null || rawVal === '') return true;
      if (Array.isArray(rawVal) && rawVal.length === 0) return true;
      return false;
    }
    if (op === 'is_not_empty') {
      if (rawVal === undefined || rawVal === null || rawVal === '') return false;
      if (Array.isArray(rawVal) && rawVal.length === 0) return false;
      return true;
    }

    if (pType === 'checkbox') {
      var isTrue = Boolean(rawVal) === true;
      if (op === 'is_checked') return isTrue;
      if (op === 'is_not_checked') return !isTrue;
      return true;
    }

    if (pType === 'number') {
      var numVal = Number(rawVal);
      var numTarget = Number(target);
      if (isNaN(numVal) || isNaN(numTarget)) return false;

      if (op === '=') return numVal === numTarget;
      if (op === '!=') return numVal !== numTarget;
      if (op === '>') return numVal > numTarget;
      if (op === '<') return numVal < numTarget;
      if (op === '>=') return numVal >= numTarget;
      if (op === '<=') return numVal <= numTarget;
      return true;
    }

    if (pType === 'date') {
      var dateVal = rawVal ? new Date(String(rawVal)).getTime() : NaN;
      var dateTarget = target ? new Date(String(target)).getTime() : NaN;
      if (isNaN(dateVal) || isNaN(dateTarget)) return false;

      if (op === 'is') {
        var d1 = new Date(dateVal).toISOString().slice(0, 10);
        var d2 = new Date(dateTarget).toISOString().slice(0, 10);
        return d1 === d2;
      }
      if (op === 'is_before') return dateVal < dateTarget;
      if (op === 'is_after') return dateVal > dateTarget;
      if (op === 'is_on_or_before') return dateVal <= dateTarget;
      if (op === 'is_on_or_after') return dateVal >= dateTarget;
      return true;
    }

    if (pType === 'list') {
      var arr = Array.isArray(rawVal) ? rawVal.map(function(x) { return String(x).toLowerCase(); }) : [String(rawVal != null ? rawVal : '').toLowerCase()];
      var searchStr = String(target != null ? target : '').toLowerCase();

      if (op === 'contains' || op === 'has_tag') {
        return arr.some(function(item) { return item.includes(searchStr); });
      }
      if (op === 'does_not_contain') {
        return !arr.some(function(item) { return item.includes(searchStr); });
      }
      if (op === 'contains_any') {
        var tokensAny = searchStr.split(/[,\\s]+/).filter(Boolean);
        return tokensAny.some(function(tok) {
          return arr.some(function(item) { return item.includes(tok); });
        });
      }
      if (op === 'contains_all') {
        var tokensAll = searchStr.split(/[,\\s]+/).filter(Boolean);
        return tokensAll.every(function(tok) {
          return arr.some(function(item) { return item.includes(tok); });
        });
      }
      if (op === 'does_not_contain_any') {
        var tokensNone = searchStr.split(/[,\\s]+/).filter(Boolean);
        return !tokensNone.some(function(tok) {
          return arr.some(function(item) { return item.includes(tok); });
        });
      }
      return true;
    }

    // Default: text / link
    var strVal = String(rawVal != null ? rawVal : '').toLowerCase();
    var strTarget = String(target != null ? target : '').toLowerCase();

    if (op === 'is') return strVal === strTarget;
    if (op === 'is_not') return strVal !== strTarget;
    if (op === 'contains') return strVal.includes(strTarget);
    if (op === 'does_not_contain') return !strVal.includes(strTarget);

    return true;
  }

  // =========================================================================
  // Card Rendering Engine
  // =========================================================================

  function renderCards() {
    if (!contentContainer) return;
    var view = base.views[currentViewIdx];
    if (!view) return;

    // Filter items
    var filtered = items.filter(passesFilterRules);

    // Filter by search query
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

    // Multi-level sorting
    if (activeSortRules.length > 0) {
      filtered.sort(function(a, b) {
        for (var i = 0; i < activeSortRules.length; i++) {
          var rule = activeSortRules[i];
          var valA = getItemValue(a, rule.property);
          var valB = getItemValue(b, rule.property);
          var isAsc = rule.direction.toUpperCase() === 'ASC';
          var cmp = compareValuesClient(valA, valB, isAsc);
          if (cmp !== 0) return cmp;
        }
        return 0;
      });
    }

    if (itemCountBadge) {
      itemCountBadge.textContent = filtered.length + ' item' + (filtered.length === 1 ? '' : 's');
    }

    contentContainer.innerHTML = '';

    if (filtered.length === 0) {
      var emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-state';
      emptyDiv.innerHTML = '<h3>No items found</h3><p>Try adjusting your search or filters.</p>';
      contentContainer.appendChild(emptyDiv);
      return;
    }

    // Grouping
    if (activeGroupRule && activeGroupRule.property) {
      var groupProp = activeGroupRule.property;
      var isGroupAsc = activeGroupRule.direction.toUpperCase() === 'ASC';

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
          grid.appendChild(createCardElement(item));
        });
        grpSection.appendChild(grid);

        contentContainer.appendChild(grpSection);
      });
    } else {
      var grid = document.createElement('div');
      grid.className = 'cards-grid';
      filtered.forEach(function(item) {
        grid.appendChild(createCardElement(item));
      });
      contentContainer.appendChild(grid);
    }
  }

  function createCardElement(item) {
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

    var order = activeOrder.length > 0 ? activeOrder : ['file.name', 'rating'];
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
      } else if (prop === 'badge' || prop === 'tags' || prop === 'file.tags') {
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

  function openSettings() {
    closeAllPopovers();
    if (settingsDrawer) settingsDrawer.classList.add('open');
    if (modalOverlay) modalOverlay.classList.add('open');
  }

  function closeSettings() {
    if (settingsDrawer) settingsDrawer.classList.remove('open');
    if (!noteModal || !noteModal.classList.contains('open')) {
      if (modalOverlay) modalOverlay.classList.remove('open');
    }
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
