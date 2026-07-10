let isApplyingHistoryState = false;
const inputStateStorageKey = 'clout-last-used-inputs';
const savedCalculationsStorageKey = 'clout-saved-calculations';
const activeSavedCalculationIdStorageKey = 'clout-active-saved-calculation-id';

(function initializeBootstrapThemePreference() {
  try {
    const savedTheme = localStorage.getItem('clout-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-bs-theme', theme);
  } catch (error) {
    document.documentElement.setAttribute('data-bs-theme', 'dark');
  }
})();

const advancedResetFieldIds = [
  'initial-height',
  'slope-percent',
  'impact-height',
  'impact-angle',
  'wind-speed-height',
  'hellmann-constant',
  'gravity',
  'temperature',
  'pressure',
  'humidity',
  'air-density'
];

function resetInputToDefaultValue(fieldId) {
  const input = document.getElementById(fieldId);
  if (!input) {
    return;
  }

  if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
    input.value = input.defaultValue;
    return;
  }

  if (input instanceof HTMLSelectElement) {
    input.value = input.options[input.selectedIndex]?.defaultSelected ? input.options[input.selectedIndex].value : input.value;
  }
}

function setAdvancedVisibility(isAdvancedEnabled) {
  const advancedElements = document.querySelectorAll('[data-advanced-only]');
  advancedElements.forEach((element) => {
    element.classList.toggle('d-none', !isAdvancedEnabled);
  });
}

function applyAdvancedMode() {
  const advancedSwitch = document.getElementById('advanced-mode');
  const isAdvancedEnabled = Boolean(advancedSwitch && advancedSwitch.checked);

  if (!isAdvancedEnabled) {
    advancedResetFieldIds.forEach((fieldId) => resetInputToDefaultValue(fieldId));
  }

  setAdvancedVisibility(isAdvancedEnabled);
  calculateTrajectory();
}

function initializeAdvancedMode() {
  const advancedSwitch = document.getElementById('advanced-mode');
  if (!advancedSwitch) {
    return;
  }

  advancedSwitch.addEventListener('change', () => {
    applyAdvancedMode();
    syncHistoryToCurrentInputs();
  });

  applyAdvancedMode();
}

function getTrajectoryInputsFromDom() {
  const pressureHpa = parseFloat(document.getElementById('pressure').value);

  return {
    launchElevation: parseFloat(document.getElementById('launch-elevation').value),
    launchVelocity: parseFloat(document.getElementById('launch-velocity').value),
    initialHeight: parseFloat(document.getElementById('initial-height').value),
    slopePercent: parseFloat(document.getElementById('slope-percent').value),
    arrowWeight: parseFloat(document.getElementById('arrow-weight').value),
    longCda: parseFloat(document.getElementById('long-cda').value) / 1e6,
    latCda: parseFloat(document.getElementById('lat-cda').value) / 1e6,
    windSpeed: parseFloat(document.getElementById('wind-speed').value),
    windSpeedHeight: parseFloat(document.getElementById('wind-speed-height').value),
    windDirection: parseFloat(document.getElementById('wind-direction').value),
    hellmannConstant: parseFloat(document.getElementById('hellmann-constant').value),
    gravity: parseFloat(document.getElementById('gravity').value),
    temperatureC: parseFloat(document.getElementById('temperature').value),
    pressureHpa,
    pressure: UnitConverter.convertPressure(pressureHpa, 'hpa', 'kpa'),
    humidity: parseFloat(document.getElementById('humidity').value)
  };
}

function validateInputs(inputs) {
  const errors = [];

  if (Number.isNaN(inputs.launchElevation) || inputs.launchElevation < 0 || inputs.launchElevation >= 90) {
    errors.push({ fieldId: 'launch-elevation', message: 'Launch angle must be between 0 and 90 degrees.' });
  }
  if (Number.isNaN(inputs.launchVelocity) || inputs.launchVelocity <= 0 || inputs.launchVelocity > 500) {
    errors.push({ fieldId: 'launch-velocity', message: 'Launch velocity must be greater than 0 and less than 500 ft/s.' });
  }
  if (Number.isNaN(inputs.initialHeight) || inputs.initialHeight < 0 || inputs.initialHeight > 200) {
    errors.push({ fieldId: 'initial-height', message: 'Initial height must be greater than 0 and less than 200 meters.' });
  }
  if (Number.isNaN(inputs.slopePercent) || inputs.slopePercent < -10 || inputs.slopePercent > 10) {
    errors.push({ fieldId: 'slope-percent', message: 'Slope must be between -10 and 10 percent.' });
  }
  if (Number.isNaN(inputs.arrowWeight) || inputs.arrowWeight < 0 || inputs.arrowWeight > 1000) {
    errors.push({ fieldId: 'arrow-weight', message: 'Arrow weight must be greater than 0 and less than 1000 grains.' });
  }
  if (Number.isNaN(inputs.longCda) || inputs.longCda < 0) {
    errors.push({ fieldId: 'long-cda', message: 'Longitudinal CdA must be greater than 0.' });
  }
  if (Number.isNaN(inputs.latCda) || inputs.latCda < 0) {
    errors.push({ fieldId: 'lat-cda', message: 'Lateral CdA must be greater than 0.' });
  }
  if (Number.isNaN(inputs.windSpeed) || inputs.windSpeed < 0 || inputs.windSpeed > 50) {
    errors.push({ fieldId: 'wind-speed', message: 'Wind speed must be greater than or equal to 0 and less than 50 mph.' });
  }
  if (Number.isNaN(inputs.windSpeedHeight) || inputs.windSpeedHeight <= 0 || inputs.windSpeedHeight > 50) {
    errors.push({ fieldId: 'wind-speed-height', message: 'Wind speed height must be greater than 0 and less than 50 meters.' });
  }
  if (Number.isNaN(inputs.windDirection) || inputs.windDirection < 0 || inputs.windDirection > 360) {
    errors.push({ fieldId: 'wind-direction', message: 'Wind direction must be between 0 and 360 degrees.' });
  }
  if (Number.isNaN(inputs.hellmannConstant) || inputs.hellmannConstant < 0 || inputs.hellmannConstant > 0.7) {
    errors.push({ fieldId: 'hellmann-constant', message: 'Hellman constant must be between 0 and 0.7.' });
  }
  if (Number.isNaN(inputs.gravity) || inputs.gravity <= 0 || inputs.gravity > 30) {
    errors.push({ fieldId: 'gravity', message: 'Gravity must be greater than 0 and less than or equal to 30 m/s².' });
  }
  if (Number.isNaN(inputs.temperatureC) || inputs.temperatureC < -50 || inputs.temperatureC > 100) {
    errors.push({ fieldId: 'temperature', message: 'Temperature must be greater than -50°C and less than 100°C.' });
  }
  if (Number.isNaN(inputs.pressureHpa) || inputs.pressureHpa < 800 || inputs.pressureHpa > 1200) {
    errors.push({ fieldId: 'pressure', message: 'Pressure must be greater than 800 hPa and less than 1200 hPa.' });
  }
  if (Number.isNaN(inputs.humidity) || inputs.humidity < 0 || inputs.humidity > 100) {
    errors.push({ fieldId: 'humidity', message: 'Humidity must be between 0% and 100%.' });
  }
  return errors;
}

function displayValidationErrors(errors) {
  const fieldIds = [
    'launch-elevation',
    'launch-velocity',
    'initial-height',
    'slope-percent',
    'arrow-weight',
    'long-cda',
    'lat-cda',
    'wind-speed',
    'wind-speed-height',
    'wind-direction',
    'hellmann-constant',
    'gravity',
    'temperature',
    'pressure',
    'humidity'
  ];

  fieldIds.forEach((fieldId) => {
    const input = document.getElementById(fieldId);
    const helper = document.getElementById(`${fieldId}-helper`);
    if (input) {
      input.setAttribute('aria-invalid', 'false');
      input.classList.remove('is-invalid', 'is-valid');
      if (!input.readOnly) {
        input.classList.add('is-valid');
      }
    }
    if (helper) {
      helper.textContent = '';
      helper.classList.remove('field-helper-error', 'field-helper-ok');
    }
  });

  if (!errors.length) {
    return;
  }

  errors.forEach((error) => {
    const input = document.getElementById(error.fieldId);
    const helper = document.getElementById(`${error.fieldId}-helper`);

    if (input) {
      input.setAttribute('aria-invalid', 'true');
      input.classList.remove('is-valid');
      input.classList.add('is-invalid');
    }
    if (helper) {
      helper.textContent = error.message;
      helper.classList.remove('field-helper-ok');
      helper.classList.add('field-helper-error');
    }
  });
}

function writeTrajectoryResults(result, atmosphereDensity) {
  const advancedSwitch = document.getElementById('advanced-mode');
  const isAdvancedEnabled = Boolean(advancedSwitch && advancedSwitch.checked);

  document.getElementById('impact-distance-m').value = result.impactX.toFixed(2);
  document.getElementById('impact-distance-yd').value = UnitConverter.convertLength(result.impactX, 'm', 'yd').toFixed(2);
  if (isAdvancedEnabled) {
    document.getElementById('impact-height').value = result.impactZ.toFixed(2);
    document.getElementById('impact-angle').value = result.impactAngle.toFixed(2);
  } else {
    resetInputToDefaultValue('impact-height');
    resetInputToDefaultValue('impact-angle');
  }
  document.getElementById('max-height').value = result.maxZ.toFixed(2);
  document.getElementById('flight-time').value = result.totalFlightTime.toFixed(2);
  document.getElementById('lateral-drift').value = result.impactY.toFixed(2);
  document.getElementById('air-density').value = atmosphereDensity.toFixed(3);
}

function setFlightTimeHelperMessage(message) {
  const input = document.getElementById('flight-time');
  const helper = document.getElementById('flight-time-helper');
  if (!input && !helper) {
    return;
  }

  if (input) {
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    input.classList.remove('is-invalid');
    if (message) {
      input.classList.add('is-invalid');
    }
  }

  if (helper) {
    helper.textContent = message;
    helper.classList.remove('field-helper-ok', 'field-helper-error');
    if (message) {
      helper.classList.remove('field-helper-ok');
      helper.classList.add('field-helper-error');
    }
  }
}

function calculateTrajectory() {
  const inputs = getTrajectoryInputsFromDom();

  const launchVelocityInput = document.getElementById('launch-velocity');
  if (launchVelocityInput && !Number.isNaN(inputs.launchVelocity)) {
    launchVelocityInput.value = inputs.launchVelocity.toFixed(0);
  }

  const errors = validateInputs(inputs);
  if (errors.length) {
    displayValidationErrors(errors);
    return;
  }

  displayValidationErrors([]);
  setFlightTimeHelperMessage('');

  let calculation;
  try {
    calculation = calculateTrajectoryCalc(inputs);
  } catch (error) {
    if (error instanceof Error) {
      setFlightTimeHelperMessage(error.message);
      return;
    }
    throw error;
  }

  const { result, atmosphereDensity } = calculation;
  if (!result || Number.isNaN(result.impactX) || Number.isNaN(result.impactY) || Number.isNaN(result.maxZ) || Number.isNaN(result.totalFlightTime)) {
    window.alert('Trajectory calculation returned invalid results');
    return;
  }

  writeTrajectoryResults(result, atmosphereDensity);
}

function simulateScore() {
  const accuracy = parseFloat(document.getElementById('archer-accuracy').value);
  const windGust = parseFloat(document.getElementById('wind-gust').value);
  const simulatedClouts = parseFloat(document.getElementById('simulated-clouts').value);
  const scoreType = document.getElementById('score-type').value;

  if ([accuracy, windGust, simulatedClouts].some((value) => Number.isNaN(value))) {
    return;
  }

  const trajectoryInputs = getTrajectoryInputsFromDom();
  const simulationResult = ScoreSim.simulateScoreCalc(accuracy, windGust, simulatedClouts, scoreType, trajectoryInputs);
  drawImpactPoints(simulationResult.shotCoordinates, simulationResult.averageScore);
}

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
  return `${launchElevation}degs, ${launchVelocity}fps, ${arrowWeight}gr`;
}

function renderSavedCalculationsList() {
  const list = document.getElementById('saved-calculations-list');
  if (!list) {
    return;
  }

  const savedCalculations = getSavedCalculationsFromLocalStorage();
  const activeSavedCalculationId = getActiveSavedCalculationId();
  list.innerHTML = '';

  if (!savedCalculations.length) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'list-group-item text-body-secondary';
    emptyItem.textContent = 'No saved calculations yet.';
    list.appendChild(emptyItem);
    return;
  }

  savedCalculations.forEach((savedCalculation) => {
    const listItem = document.createElement('li');
    listItem.className = 'list-group-item';
    if (savedCalculation.id === activeSavedCalculationId) {
      listItem.classList.add('active');
    }

    const title = document.createElement('div');
    const titleBold = document.createElement('strong');
    titleBold.textContent = savedCalculation.name;
    title.appendChild(titleBold);

    const summary = document.createElement('div');
    summary.className = savedCalculation.id === activeSavedCalculationId ? 'text-white-50' : 'text-body-secondary';
    summary.textContent = formatSavedCalculationSummary(savedCalculation.values || {});

    listItem.appendChild(title);
    listItem.appendChild(summary);
    list.appendChild(listItem);
  });
}

function saveCurrentCalculation(isSaveAsRequested) {
  const snapshot = toSnapshotObject(buildPersistedQueryParams());
  const savedCalculations = getSavedCalculationsFromLocalStorage();
  const activeSavedCalculationId = getActiveSavedCalculationId();

  if (isSaveAsRequested || !activeSavedCalculationId) {
    const defaultName = `Calculation ${savedCalculations.length + 1}`;
    const enteredName = window.prompt('Enter a name for this saved calculation:', defaultName);
    if (enteredName === null) {
      return;
    }
    const trimmedName = enteredName.trim();
    const name = trimmedName || defaultName;
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
  const savedCalculationsModal = document.getElementById('savedCalculationsModal');

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

  renderSavedCalculationsList();
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
    return;
  }

  const storedParams = getStoredInputParams();
  const overrideMap = {
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
  calculateTrajectory();
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
    applyAdvancedMode();
  } finally {
    isApplyingHistoryState = false;
  }
}

function preventFormSubmitReload() {
  const forms = document.querySelectorAll('form');
  forms.forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
    });
  });
}

function initializeFieldHelpers() {
  overrideInputsFromQuery();
  displayValidationErrors([]);
  calculateTrajectory();
}

function sanitizeGoalSeekTargetInput(event) {
  const value = event.target.value;
  if (value === '') {
    return;
  }

  const sanitized = value.replace(/[^0-9.\-]/g, '');
  if (sanitized !== value) {
    event.target.value = sanitized;
  }
  event.target.dataset.userEdited = 'true';
}

function runGoalSeek() {
  const setSelect = document.getElementById('goal-seek-set');
  const targetInput = document.getElementById('goal-seek-target');
  const changeSelect = document.getElementById('goal-seek-change');
  if (!setSelect || !targetInput || !changeSelect) {
    return;
  }

  const targetValue = parseFloat(targetInput.value);
  if (Number.isNaN(targetValue)) {
    targetInput.focus();
    return;
  }

  const metricFieldId = setSelect.value === 'impact-distance-yd' ? 'impact-distance-yd' : 'impact-distance-m';
  const parameterConfig = {
    'launch-elevation': { inputId: 'launch-elevation', parameterKey: 'launchElevation', parameterScale: 1, min: 0, max: 44.9, step: 0.1 },
    'launch-velocity': { inputId: 'launch-velocity', parameterKey: 'launchVelocity', parameterScale: 1, min: 50, max: 500, step: 1 },
    'long-cda': { inputId: 'long-cda', parameterKey: 'longCda', parameterScale: 1e-6, min: 1, max: 1000, step: 1 }
  };
  const config = parameterConfig[changeSelect.value];
  if (!config) {
    return;
  }

  const input = document.getElementById(config.inputId);
  if (!input) {
    return;
  }

  const trajectoryInputs = getTrajectoryInputsFromDom();
  const precision = config.step < 1 ? 1 : 0;
  const goalSeekResult = runGoalSeekCalc({
    trajectoryInputs,
    parameterKey: config.parameterKey,
    parameterScale: config.parameterScale,
    metricSelector: metricFieldId,
    min: config.min,
    max: config.max,
    step: config.step,
    targetValue
  });

  if (goalSeekResult && Number.isFinite(goalSeekResult.bestValue)) {
    input.value = goalSeekResult.bestValue.toFixed(precision);
    calculateTrajectory();
    reloadWithQueryParams();
  }

  if (typeof window.bootstrap !== 'undefined') {
    const modalElement = document.getElementById('goalSeekModal');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
      modal.hide();
    }
  }
}

function initializeGoalSeekModal() {
  const setSelect = document.getElementById('goal-seek-set');
  const targetInput = document.getElementById('goal-seek-target');
  const changeSelect = document.getElementById('goal-seek-change');
  const submitButton = document.getElementById('goal-seek-submit');
  const modalElement = document.getElementById('goalSeekModal');

  if (setSelect) {
    setSelect.addEventListener('change', () => {
      if (targetInput) {
        const defaultValue = setSelect.value === 'impact-distance-yd' ? 180 : 185;
        targetInput.value = defaultValue;
        delete targetInput.dataset.userEdited;
      }
      reloadWithQueryParams();
    });
  }
  if (targetInput) {
    targetInput.addEventListener('input', sanitizeGoalSeekTargetInput);
    targetInput.addEventListener('change', reloadWithQueryParams);
  }
  if (changeSelect) {
    changeSelect.addEventListener('change', reloadWithQueryParams);
  }
  if (submitButton) {
    submitButton.addEventListener('click', runGoalSeek);
  }
  if (modalElement) {
    modalElement.addEventListener('shown.bs.modal', () => {
      if (!setSelect || !targetInput) {
        return;
      }
      const defaultValue = setSelect.value === 'impact-distance-yd' ? 180 : 185;
      targetInput.value = defaultValue;
      delete targetInput.dataset.userEdited;
    });
  }
}

function initializeScoreSimulatorModal() {
  const scoreInputs = ['archer-accuracy', 'wind-gust', 'simulated-clouts', 'score-type'];
  const submitButton = document.getElementById('score-simulate-submit');

  scoreInputs.forEach((fieldId) => {
    const input = document.getElementById(fieldId);
    if (input) {
      input.addEventListener('change', reloadWithQueryParams);
    }
  });

  if (submitButton) {
    submitButton.addEventListener('click', simulateScore);
  }
}

function initializeTooltips() {
  var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"], [data-bs-title]'));
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  // Only run calculator-specific wiring on the main calculator page.
  if (!document.getElementById('launch-elevation')) {
    return;
  }

  preventFormSubmitReload();
  initializeFieldHelpers();
  initializeAdvancedMode();
  initializeGoalSeekModal();
  initializeScoreSimulatorModal();
  initializeSavedCalculationsMenu();
  initializeTooltips();
  initializeLocalStorageSync();
  syncHistoryToCurrentInputs();

  // Remove one-shot reset flag from URL after defaults are restored.
  const params = new URLSearchParams(window.location.search);
  if (params.get('reset') === 'true') {
    params.delete('reset');
    const cleanedQuery = params.toString();
    const cleanedUrl = `${window.location.pathname}${cleanedQuery ? `?${cleanedQuery}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', cleanedUrl);
  }

  window.addEventListener('popstate', () => {
    applyStateFromQueryParams();
  });
});
