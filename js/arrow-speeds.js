const GRAIN_TO_KG = 0.00006479891;
const FPS_TO_MS = 0.3048;

/**
 * Fit the bow model using three measurements.
 *
 * All weights are supplied in grains.
 * Velocities are supplied in fps.
 *
 * Returns:
 *   E0                - Bow energy at 0 turns out, in joules
 *   energyLossPerTurn - Energy lost per turn, in joules/turn
 *   extraMassGrains   - Effective additional accelerating mass, in grains
 */
function fitBowModel(
  shaftWeightGrains,
  turns1, pointWeight1, velocity1,
  turns2, pointWeight2, velocity2,
  turns3, pointWeight3, velocity3
) {
  const shaftMassKg = shaftWeightGrains * GRAIN_TO_KG;

  const measurements = [
    [turns1, pointWeight1, velocity1],
    [turns2, pointWeight2, velocity2],
    [turns3, pointWeight3, velocity3]
  ];

  const A = [];
  const b = [];

  for (const [turns, pointGrains, velocityFps] of measurements) {
    const pointMassKg = pointGrains * GRAIN_TO_KG;
    const velocityMs = velocityFps * FPS_TO_MS;

    /*
     * Model:
     *
     * E0 - energyLossPerTurn * turns
     *
     * =
     *
     * 0.5 * (shaftMass + pointMass + extraMass) * velocity^2
     *
     * Rearranged:
     *
     * E0
     * - energyLossPerTurn * turns
     * - 0.5 * extraMass * velocity^2
     *
     * =
     *
     * 0.5 * (shaftMass + pointMass) * velocity^2
     */

    A.push([
      1,
      -turns,
      -0.5 * velocityMs * velocityMs
    ]);

    b.push(
      0.5 *
      (shaftMassKg + pointMassKg) *
      velocityMs * velocityMs
    );
  }

  const [E0, energyLossPerTurn, extraMassKg] = solve3x3(A, b);
  const extraMassGrains = extraMassKg / GRAIN_TO_KG;

  return {
    E0,
    energyLossPerTurn,
    extraMassGrains
  };
}

/**
 * Calculate launch velocity.
 *
 * All weights are supplied in grains.
 * Turns are supplied as turns wound out.
 * Velocity is returned in fps.
 */
function launchVelocity(
  shaftWeightGrains,
  pointWeightGrains,
  turnsOut,
  E0,
  energyLossPerTurn,
  extraMassGrains
) {
  const energy = E0 - energyLossPerTurn * turnsOut;

  if (energy <= 0) {
    throw new Error('Calculated stored energy is zero or negative.');
  }

  const totalMassKg =
    (shaftWeightGrains + pointWeightGrains + extraMassGrains) * GRAIN_TO_KG;

  const velocityMs = Math.sqrt((2 * energy) / totalMassKg);
  const velocityFps = velocityMs / FPS_TO_MS;

  return velocityFps;
}

/**
 * Solve a 3 x 3 system of simultaneous linear equations.
 *
 * A is a 3x3 matrix.
 * b is a 3-element vector.
 *
 * Returns [x, y, z].
 */
function solve3x3(A, b) {
  const M = A.map((row, i) => [
    row[0],
    row[1],
    row[2],
    b[i]
  ]);

  for (let i = 0; i < 3; i++) {
    let maxRow = i;

    for (let k = i + 1; k < 3; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
        maxRow = k;
      }
    }

    [M[i], M[maxRow]] = [M[maxRow], M[i]];

    if (Math.abs(M[i][i]) < 1e-12) {
      throw new Error('The three measurements cannot produce a unique solution.');
    }

    for (let k = i + 1; k < 3; k++) {
      const factor = M[k][i] / M[i][i];

      for (let j = i; j < 4; j++) {
        M[k][j] -= factor * M[i][j];
      }
    }
  }

  const x = new Array(3);

  for (let i = 2; i >= 0; i--) {
    let sum = M[i][3];

    for (let j = i + 1; j < 3; j++) {
      sum -= M[i][j] * x[j];
    }

    x[i] = sum / M[i][i];
  }

  return x;
}

function getInputValue(id) {
  const input = document.getElementById(id);
  const value = Number(input && input.value);

  if (!Number.isFinite(value)) {
    return 0;
  }

  return value;
}

function updateArrowSelectionResults() {
  const shaftWeightGrains = getInputValue('arrow-without-point-weight');

  const row1 = {
    turns: getInputValue('turns-row-1'),
    pointWeight: getInputValue('point-weight-row-1'),
    speed: getInputValue('launch-speed-row-1')
  };

  const row2 = {
    turns: getInputValue('turns-row-2'),
    pointWeight: getInputValue('point-weight-row-2'),
    speed: getInputValue('launch-speed-row-2')
  };

  const row3 = {
    turns: getInputValue('turns-row-3'),
    pointWeight: getInputValue('point-weight-row-3'),
    speed: getInputValue('launch-speed-row-3')
  };

  try {
    const model = fitBowModel(
      shaftWeightGrains,
      row1.turns, row1.pointWeight, row1.speed,
      row2.turns, row2.pointWeight, row2.speed,
      row3.turns, row3.pointWeight, row3.speed
    );

    const resultInputs = {
      'bow-energy-zero-turns': model.E0,
      'energy-loss-per-turn': model.energyLossPerTurn,
      'extra-mass-grains': model.extraMassGrains
    };

    Object.entries(resultInputs).forEach(([id, value]) => {
      const input = document.getElementById(id);
      if (input) {
        const decimals = id === 'bow-energy-zero-turns'
          ? 1
          : id === 'energy-loss-per-turn'
            ? 2
            : 1;
        input.value = Number(value).toFixed(decimals);
      }
    });

    const selectedTurnValue = getInputValue('select-arrow-turns');
    const selectedPointWeight = getInputValue('select-arrow-point-weight');
    const velocityInput = document.getElementById('select-arrow-velocity');

    if (velocityInput) {
      const velocity = launchVelocity(
        shaftWeightGrains,
        selectedPointWeight,
        selectedTurnValue,
        model.E0,
        model.energyLossPerTurn,
        model.extraMassGrains
      );

      velocityInput.value = Number(velocity).toFixed(1);
    }
  } catch (error) {
    console.warn('Arrow selection model calculation failed:', error);
  }
}

function applySelectedArrow() {
  const pointWeightInput = document.getElementById('select-arrow-point-weight');
  const velocityInput = document.getElementById('select-arrow-velocity');
  const shaftWeightInput = document.getElementById('arrow-without-point-weight');
  const arrowWeightInput = document.getElementById('arrow-weight');
  const launchVelocityInput = document.getElementById('launch-velocity');
  const modalElement = document.getElementById('arrowSelectionModal');

  if (!pointWeightInput || !velocityInput || !shaftWeightInput || !arrowWeightInput || !launchVelocityInput) {
    return;
  }

  const selectedPointWeight = Number(pointWeightInput.value);
  const computedVelocity = Number(velocityInput.value);
  const shaftWeight = Number(shaftWeightInput.value);

  if (!Number.isFinite(selectedPointWeight) || !Number.isFinite(computedVelocity) || !Number.isFinite(shaftWeight)) {
    return;
  }

  arrowWeightInput.value = selectedPointWeight + shaftWeight;
  launchVelocityInput.value = computedVelocity;

  if (window.CloutUxCalcUi && typeof window.CloutUxCalcUi.calculateTrajectory === 'function') {
    window.CloutUxCalcUi.calculateTrajectory();
  }

  if (window.CloutUxState && typeof window.CloutUxState.saveInputsToLocalStorage === 'function') {
    window.CloutUxState.saveInputsToLocalStorage();
  }

  if (modalElement && window.bootstrap && window.bootstrap.Modal) {
    const modal = window.bootstrap.Modal.getOrCreateInstance(modalElement);
    modal.hide();
  }
}

function initializeArrowSelectionModal() {
  const modal = document.getElementById('arrowSelectionModal');
  if (!modal) {
    return;
  }

  const submitButton = document.getElementById('select-arrow-submit');
  if (submitButton) {
    submitButton.removeEventListener('click', applySelectedArrow);
    submitButton.addEventListener('click', applySelectedArrow);
  }

  modal.addEventListener('shown.bs.modal', updateArrowSelectionResults);

  const fieldSelector = [
    '#arrow-without-point-weight',
    '#turns-row-1',
    '#point-weight-row-1',
    '#launch-speed-row-1',
    '#turns-row-2',
    '#point-weight-row-2',
    '#launch-speed-row-2',
    '#turns-row-3',
    '#point-weight-row-3',
    '#launch-speed-row-3',
    '#select-arrow-turns',
    '#select-arrow-point-weight'
  ].join(', ');

  document.querySelectorAll(fieldSelector).forEach((input) => {
    input.removeEventListener('input', updateArrowSelectionResults);
    input.removeEventListener('change', updateArrowSelectionResults);
    input.addEventListener('input', updateArrowSelectionResults);
    input.addEventListener('change', updateArrowSelectionResults);
  });

  updateArrowSelectionResults();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeArrowSelectionModal);
} else {
  initializeArrowSelectionModal();
}

window.ArrowSpeeds = {
  fitBowModel,
  launchVelocity,
  solve3x3,
  updateArrowSelectionResults,
  initializeArrowSelectionModal
};