const savedCalculationsStorageKey = 'clout-saved-calculations';
const activeSavedCalculationIdStorageKey = 'clout-active-saved-calculation-id';
let pendingSaveAsContext = null;

function getSavedCalculationsFromLocalStorage() {
  try {
    const savedCalculationsJson = localStorage.getItem(savedCalculationsStorageKey);
    if (!savedCalculationsJson) {
      return [];
    }
    const savedCalculations = JSON.parse(savedCalculationsJson);
    return Array.isArray(savedCalculations) ? savedCalculations : [];
  } catch (error) {
    return [];
  }
}

function saveSavedCalculationsToLocalStorage(savedCalculations) {
  try {
    localStorage.setItem(savedCalculationsStorageKey, JSON.stringify(savedCalculations));
  } catch (error) {
    // Ignore localStorage write failures so app usage is not blocked.
  }
}

function getActiveSavedCalculationId() {
  try {
    return localStorage.getItem(activeSavedCalculationIdStorageKey);
  } catch (error) {
    return null;
  }
}

function setActiveSavedCalculationId(savedCalculationId) {
  try {
    if (!savedCalculationId) {
      localStorage.removeItem(activeSavedCalculationIdStorageKey);
      return;
    }
    localStorage.setItem(activeSavedCalculationIdStorageKey, savedCalculationId);
  } catch (error) {
    // Ignore localStorage write failures so app usage is not blocked.
  }
}

function toSnapshotObject(params) {
  const snapshot = {};
  params.forEach((value, key) => {
    snapshot[key] = value;
  });
  return snapshot;
}

function formatSavedCalculationSummary(savedValues) {
  const launchElevation = savedValues.launchElevation ?? '-';
  const launchVelocity = savedValues.launchVelocity ?? '-';
  const arrowWeight = savedValues.arrowWeight ?? '-';
  const windSpeed = savedValues.windSpeed ?? '-';
  const windDirection = savedValues.windDirection ?? '-';

  const advancedModeRawValue = savedValues.advancedMode;
  const isAdvancedModeEnabled = advancedModeRawValue === true || advancedModeRawValue === 'true';
  const advancedBadgeHtml = isAdvancedModeEnabled ? '<span class="badge text-bg-primary">A</span> ' : '';
  const formattedWindSpeed = windSpeed === '-' ? '-' : `${windSpeed}mph`;
  const formattedWindDirection = windDirection === '-' ? '-' : `${windDirection}<sup>o</sup>`;

  return `${advancedBadgeHtml}${launchElevation}<sup>o</sup>, ${launchVelocity}fps, ${arrowWeight}gr, ${formattedWindSpeed}, ${formattedWindDirection}`;
}

function applySavedCalculationToScreen(savedCalculation) {
  if (!savedCalculation || !savedCalculation.values || typeof savedCalculation.values !== 'object') {
    return;
  }

  const params = new URLSearchParams(Object.entries(savedCalculation.values));
  if (window.CloutUxState) {
    window.CloutUxState.applyInputOverrides(params, window.CloutUxState.getInputOverrideMap());
  }
  if (window.CloutUxCalcUi) {
    window.CloutUxCalcUi.applyAdvancedMode();
  }
  if (window.CloutUxState) {
    window.CloutUxState.syncHistoryToCurrentInputs();
  }
}

function deleteActiveSavedCalculationAndRestoreDefaults() {
  const activeSavedCalculationId = getActiveSavedCalculationId();
  if (!activeSavedCalculationId) {
    if (window.CloutUxCalcUi) {
      window.CloutUxCalcUi.restoreDefaultInputs();
    }
    renderSavedCalculationsList();
    return;
  }

  const remainingSavedCalculations = getSavedCalculationsFromLocalStorage()
    .filter((savedCalculation) => savedCalculation.id !== activeSavedCalculationId);
  saveSavedCalculationsToLocalStorage(remainingSavedCalculations);
  setActiveSavedCalculationId(null);

  if (window.CloutUxCalcUi) {
    window.CloutUxCalcUi.restoreDefaultInputs();
  }
  renderSavedCalculationsList();
}

function updateDeleteActiveSavedCalculationButton(activeSavedCalculation) {
  const deleteButton = document.getElementById('delete-active-saved-calculation');
  if (!deleteButton) {
    return;
  }

  const hasActiveSavedCalculation = Boolean(activeSavedCalculation);
  deleteButton.classList.toggle('d-none', !hasActiveSavedCalculation);
  deleteButton.disabled = !hasActiveSavedCalculation;
}

function updateSavedCalculationTitle(savedCalculations, activeSavedCalculationId) {
  const titleElement = document.getElementById('saved-calculation-title');
  if (!titleElement) {
    return;
  }

  const activeSavedCalculation = savedCalculations.find((savedCalculation) => savedCalculation.id === activeSavedCalculationId);
  updateDeleteActiveSavedCalculationButton(activeSavedCalculation);
  titleElement.textContent = activeSavedCalculation && activeSavedCalculation.name ? activeSavedCalculation.name : ' ';
}

function renderSavedCalculationsList() {
  const list = document.getElementById('saved-calculations-list');
  if (!list) {
    return;
  }

  const savedCalculationsModalElement = document.getElementById('savedCalculationsModal');

  const savedCalculations = getSavedCalculationsFromLocalStorage();
  const activeSavedCalculationId = getActiveSavedCalculationId();
  updateSavedCalculationTitle(savedCalculations, activeSavedCalculationId);
  list.innerHTML = '';

  if (!savedCalculations.length) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'list-group-item text-body-secondary';
    emptyItem.textContent = 'No saved calculations yet.';
    list.appendChild(emptyItem);
    return;
  }

  const sortedSavedCalculations = [...savedCalculations].sort((a, b) => {
    const nameA = typeof a.name === 'string' ? a.name : '';
    const nameB = typeof b.name === 'string' ? b.name : '';
    return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
  });

  sortedSavedCalculations.forEach((savedCalculation) => {
    const listItem = document.createElement('li');
    listItem.className = 'list-group-item';
    if (savedCalculation.id === activeSavedCalculationId) {
      listItem.classList.add('active');
    }
    listItem.style.cursor = 'pointer';
    listItem.addEventListener('click', () => {
      setActiveSavedCalculationId(savedCalculation.id);
      applySavedCalculationToScreen(savedCalculation);
      renderSavedCalculationsList();
      if (savedCalculationsModalElement && typeof window.bootstrap !== 'undefined') {
        const modal = bootstrap.Modal.getOrCreateInstance(savedCalculationsModalElement);
        modal.hide();
      }
    });

    const titleRow = document.createElement('div');
    titleRow.className = 'd-flex justify-content-between align-items-start gap-2';

    const title = document.createElement('div');
    const titleBold = document.createElement('strong');
    titleBold.textContent = savedCalculation.name;
    title.appendChild(titleBold);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = savedCalculation.id === activeSavedCalculationId ? 'btn btn-sm btn-light' : 'btn btn-sm btn-outline-danger';
    deleteButton.textContent = 'Delete';
    deleteButton.setAttribute('aria-label', `Delete ${savedCalculation.name}`);
    deleteButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      const remainingSavedCalculations = getSavedCalculationsFromLocalStorage()
        .filter((entry) => entry.id !== savedCalculation.id);
      saveSavedCalculationsToLocalStorage(remainingSavedCalculations);

      if (getActiveSavedCalculationId() === savedCalculation.id) {
        const nextActiveSavedCalculationId = remainingSavedCalculations.length ? remainingSavedCalculations[0].id : null;
        setActiveSavedCalculationId(nextActiveSavedCalculationId);
      }

      renderSavedCalculationsList();
    });

    titleRow.appendChild(title);
    titleRow.appendChild(deleteButton);

    const summary = document.createElement('div');
    summary.className = savedCalculation.id === activeSavedCalculationId ? 'text-white-50' : 'text-body-secondary';
    summary.innerHTML = formatSavedCalculationSummary(savedCalculation.values || {});

    listItem.appendChild(titleRow);
    listItem.appendChild(summary);
    list.appendChild(listItem);
  });
}

function openSaveAsModal(snapshot, defaultName) {
  const saveAsModalElement = document.getElementById('saveCalculationAsModal');
  const nameInput = document.getElementById('save-calculation-name-input');
  if (!saveAsModalElement || !nameInput || typeof window.bootstrap === 'undefined') {
    return;
  }

  pendingSaveAsContext = {
    snapshot,
    defaultName
  };

  nameInput.value = defaultName;
  const modal = bootstrap.Modal.getOrCreateInstance(saveAsModalElement);
  modal.show();
}

function saveFromModalNameInput() {
  const nameInput = document.getElementById('save-calculation-name-input');
  const saveAsModalElement = document.getElementById('saveCalculationAsModal');
  if (!nameInput || !saveAsModalElement || !pendingSaveAsContext) {
    return;
  }

  const { snapshot, defaultName } = pendingSaveAsContext;
  const enteredName = nameInput.value.trim();
  const name = enteredName || defaultName;

  const savedCalculations = getSavedCalculationsFromLocalStorage();
  const savedCalculation = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    values: snapshot,
    updatedAt: Date.now()
  };

  savedCalculations.unshift(savedCalculation);
  saveSavedCalculationsToLocalStorage(savedCalculations);
  setActiveSavedCalculationId(savedCalculation.id);
  renderSavedCalculationsList();

  pendingSaveAsContext = null;
  const modal = bootstrap.Modal.getOrCreateInstance(saveAsModalElement);
  modal.hide();
}

function saveCurrentCalculation(isSaveAsRequested) {
  if (!window.CloutUxState) {
    return;
  }

  const snapshot = toSnapshotObject(window.CloutUxState.buildPersistedQueryParams());
  const savedCalculations = getSavedCalculationsFromLocalStorage();
  const activeSavedCalculationId = getActiveSavedCalculationId();

  if (isSaveAsRequested || !activeSavedCalculationId) {
    const defaultName = `Calculation ${savedCalculations.length + 1}`;
    openSaveAsModal(snapshot, defaultName);
    return;
  }

  const existingIndex = savedCalculations.findIndex((savedCalculation) => savedCalculation.id === activeSavedCalculationId);
  if (existingIndex < 0) {
    saveCurrentCalculation(true);
    return;
  }

  savedCalculations[existingIndex] = {
    ...savedCalculations[existingIndex],
    values: snapshot,
    updatedAt: Date.now()
  };

  saveSavedCalculationsToLocalStorage(savedCalculations);
  renderSavedCalculationsList();
}

function initializeSavedCalculationsMenu() {
  const loadMenuItem = document.getElementById('menu-load');
  const saveMenuItem = document.getElementById('menu-save');
  const saveAsMenuItem = document.getElementById('menu-save-as');
  const deleteActiveSavedCalculationButton = document.getElementById('delete-active-saved-calculation');
  const savedCalculationsModal = document.getElementById('savedCalculationsModal');
  const saveCalculationAsModal = document.getElementById('saveCalculationAsModal');
  const saveCalculationAsSubmitButton = document.getElementById('save-calculation-as-submit');
  const saveCalculationNameInput = document.getElementById('save-calculation-name-input');

  if (savedCalculationsModal) {
    savedCalculationsModal.addEventListener('show.bs.modal', () => {
      renderSavedCalculationsList();
    });
  }

  if (loadMenuItem) {
    loadMenuItem.addEventListener('click', () => {
      renderSavedCalculationsList();
    });
  }

  if (saveMenuItem) {
    saveMenuItem.addEventListener('click', (event) => {
      event.preventDefault();
      saveCurrentCalculation(false);
    });
  }

  if (saveAsMenuItem) {
    saveAsMenuItem.addEventListener('click', (event) => {
      event.preventDefault();
      saveCurrentCalculation(true);
    });
  }

  if (deleteActiveSavedCalculationButton) {
    deleteActiveSavedCalculationButton.addEventListener('click', () => {
      deleteActiveSavedCalculationAndRestoreDefaults();
    });
  }

  if (saveCalculationAsSubmitButton) {
    saveCalculationAsSubmitButton.addEventListener('click', () => {
      saveFromModalNameInput();
    });
  }

  if (saveCalculationNameInput) {
    saveCalculationNameInput.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') {
        return;
      }
      event.preventDefault();
      saveFromModalNameInput();
    });
  }

  if (saveCalculationAsModal) {
    saveCalculationAsModal.addEventListener('hidden.bs.modal', () => {
      pendingSaveAsContext = null;
    });

    saveCalculationAsModal.addEventListener('shown.bs.modal', () => {
      if (saveCalculationNameInput) {
        saveCalculationNameInput.focus();
        saveCalculationNameInput.select();
      }
    });
  }

  renderSavedCalculationsList();
}

window.CloutUxSaved = {
  initializeSavedCalculationsMenu,
  setActiveSavedCalculationId
};
