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

  if (window.CloutUxCalcUi) {
    window.CloutUxCalcUi.preventFormSubmitReload();
    window.CloutUxCalcUi.initializeFieldHelpers();
    window.CloutUxCalcUi.initializeAdvancedMode();
    window.CloutUxCalcUi.initializeTrajectoryCanvas();
    window.CloutUxCalcUi.initializeGoalSeekModal();
    window.CloutUxCalcUi.initializeZeroModal();
    window.CloutUxCalcUi.initializeDragCalcModal();
    window.CloutUxCalcUi.initializeScoreSimulatorModal();
    window.CloutUxCalcUi.initializeResetButton();
  }

  initializeTooltips();

  if (window.CloutUxState) {
    window.CloutUxState.initializeLocalStorageSync();
  }
});
