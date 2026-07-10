const inputStateStorageKey = 'clout-last-used-inputs';
let isApplyingHistoryState = false;

function getStoredInputParams() {
  try {
    const storedStateJson = localStorage.getItem(inputStateStorageKey);
    if (!storedStateJson) {
      return new URLSearchParams();
    }

    const storedState = JSON.parse(storedStateJson);
    if (!storedState || typeof storedState !== 'object') {
      return new URLSearchParams();
    }

    return new URLSearchParams(Object.entries(storedState));
  } catch (error) {
    return new URLSearchParams();
  }
}

function saveInputsToLocalStorage(params = buildPersistedQueryParams()) {
  try {
    const serializedState = {};
    params.forEach((value, key) => {
      serializedState[key] = value;
    });
    localStorage.setItem(inputStateStorageKey, JSON.stringify(serializedState));
  } catch (error) {
    // Ignore localStorage write failures (private mode, quota, etc.) so UX still works.
  }
}

function applyInputOverrides(params, overrideMap) {
  for (const [paramName, elementId] of Object.entries(overrideMap)) {
    if (!params.has(paramName)) {
      continue;
    }

    const input = document.getElementById(elementId);
    if (!input) {
      continue;
    }

    if (input.readOnly) {
      continue;
    }

    const paramValue = params.get(paramName);
    if (paramValue === null) {
      continue;
    }

    if (input instanceof HTMLInputElement && input.type === 'checkbox') {
      input.checked = paramValue === 'true';
    } else if (input instanceof HTMLInputElement && input.type === 'number') {
      const numeric = parseFloat(paramValue);
      if (Number.isNaN(numeric)) {
        continue;
      }
      input.value = numeric;
    } else {
      input.value = paramValue;
    }

    input.removeAttribute('readonly');
  }
}

function getInputOverrideMap() {
  return {
    advancedMode: 'advanced-mode',
    launchElevation: 'launch-elevation',
    launchVelocity: 'launch-velocity',
    initialHeight: 'initial-height',
    slopePercent: 'slope-percent',
    arrowWeight: 'arrow-weight',
    longCda: 'long-cda',
    latCda: 'lat-cda',
    windSpeed: 'wind-speed',
    windSpeedHeight: 'wind-speed-height',
    windDirection: 'wind-direction',
    hellmannConstant: 'hellmann-constant',
    gravity: 'gravity',
    temperature: 'temperature',
    pressure: 'pressure',
    humidity: 'humidity',
    goalSeekSet: 'goal-seek-set',
    goalSeekTarget: 'goal-seek-target',
    goalSeekChange: 'goal-seek-change',
    archerAccuracy: 'archer-accuracy',
    windGust: 'wind-gust',
    simulatedClouts: 'simulated-clouts',
    scoreType: 'score-type'
  };
}

function overrideInputsFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const isResetRequested = params.get('reset') === 'true';

  if (isResetRequested) {
    try {
      localStorage.removeItem(inputStateStorageKey);
    } catch (error) {
      // Ignore localStorage failures so reset still continues.
    }

    // Force a true reset back to default HTML values.
    if (window.CloutUxSaved) {
      window.CloutUxSaved.setActiveSavedCalculationId(null);
    }
    if (window.CloutUxCalcUi) {
      window.CloutUxCalcUi.restoreDefaultInputs();
    }
    return;
  }

  const storedParams = getStoredInputParams();
  const overrideMap = getInputOverrideMap();

  // Restore previously used values first, then let URL params win.
  applyInputOverrides(storedParams, overrideMap);
  applyInputOverrides(params, overrideMap);
}

function buildPersistedQueryParams() {
  const fields = document.querySelectorAll('input[name], select[name], textarea[name]');
  if (!fields.length) {
    return new URLSearchParams();
  }

  const params = new URLSearchParams();
  const advancedSwitch = document.getElementById('advanced-mode');
  if (advancedSwitch instanceof HTMLInputElement && advancedSwitch.type === 'checkbox' && advancedSwitch.name) {
    params.set(advancedSwitch.name, advancedSwitch.checked ? 'true' : 'false');
  }

  Array.from(fields).forEach((element) => {
    if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLSelectElement) && !(element instanceof HTMLTextAreaElement)) {
      return;
    }
    if (!element.name) {
      return;
    }
    if (element instanceof HTMLInputElement && (element.type === 'button' || element.type === 'submit' || element.type === 'reset')) {
      return;
    }
    if (element.id === 'advanced-mode') {
      return;
    }
    if (element.readOnly) {
      return;
    }
    if (element instanceof HTMLInputElement && element.type === 'checkbox') {
      params.set(element.name, element.checked ? 'true' : 'false');
    } else {
      params.set(element.name, element.value);
    }
  });

  return params;
}

function reloadWithQueryParams() {
  if (isApplyingHistoryState) {
    return;
  }

  const params = buildPersistedQueryParams();
  saveInputsToLocalStorage(params);
  const queryString = params.toString();
  const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}${window.location.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextUrl !== currentUrl) {
    window.history.pushState(null, '', nextUrl);
  }

  if (window.CloutUxCalcUi) {
    window.CloutUxCalcUi.calculateTrajectory();
  }
}

function syncHistoryToCurrentInputs() {
  const params = buildPersistedQueryParams();
  saveInputsToLocalStorage(params);
  const queryString = params.toString();
  const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}${window.location.hash}`;
  window.history.replaceState(null, '', nextUrl);
}

function initializeLocalStorageSync() {
  const editableFields = document.querySelectorAll('input[name], select[name], textarea[name]');
  editableFields.forEach((field) => {
    if (!(field instanceof HTMLInputElement) && !(field instanceof HTMLSelectElement) && !(field instanceof HTMLTextAreaElement)) {
      return;
    }
    if (!field.name || field.readOnly) {
      return;
    }

    field.addEventListener('input', () => {
      saveInputsToLocalStorage();
    });

    field.addEventListener('change', () => {
      saveInputsToLocalStorage();
    });
  });
}

function applyStateFromQueryParams() {
  isApplyingHistoryState = true;
  try {
    overrideInputsFromQuery();
    if (window.CloutUxCalcUi) {
      window.CloutUxCalcUi.applyAdvancedMode();
    }
  } finally {
    isApplyingHistoryState = false;
  }
}

function cleanupResetFlagFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('reset') !== 'true') {
    return;
  }

  params.delete('reset');
  const cleanedQuery = params.toString();
  const cleanedUrl = `${window.location.pathname}${cleanedQuery ? `?${cleanedQuery}` : ''}${window.location.hash}`;
  window.history.replaceState(null, '', cleanedUrl);
}

window.CloutUxState = {
  getStoredInputParams,
  saveInputsToLocalStorage,
  applyInputOverrides,
  getInputOverrideMap,
  overrideInputsFromQuery,
  buildPersistedQueryParams,
  reloadWithQueryParams,
  syncHistoryToCurrentInputs,
  initializeLocalStorageSync,
  applyStateFromQueryParams,
  cleanupResetFlagFromUrl
};
