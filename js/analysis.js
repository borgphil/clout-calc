class OptimalResult {
  constructor(windSpeed, windAngle, score, pointWeight, turns, launchElevation, launchVelocity) {
    this.windSpeed = windSpeed;
    this.windAngle = windAngle;
    this.score = score;
    this.pointWeight = pointWeight;
    this.turns = turns;
    this.launchElevation = launchElevation;
    this.launchVelocity = launchVelocity;
    this.launchSpeed = launchVelocity;
  }
}

function findLaunchVelocityFps(bowEnergy, additionalMass, turnLetOff, numberOfTurns, arrowMass) {
  const newBowEnergy = bowEnergy * (1 - (numberOfTurns * turnLetOff) / 100);
  const effectiveMass = arrowMass + additionalMass;
  return Math.sqrt(newBowEnergy / effectiveMass);
}

function getScore(turns, pointWeight, bowEnergy, rotatingMass, turnLetOff, initialHeight, slope, wind, arrow, atmosphere) {
  const targetValue = 185;

  const baseArrowMassGrains = UnitConverter.convertMass(arrow.mass, 'kg', 'grains');
  const totalArrowMassGrains = baseArrowMassGrains + pointWeight;

  const launchVelocityFps = findLaunchVelocityFps(
    bowEnergy,
    rotatingMass,
    turnLetOff,
    turns,
    totalArrowMassGrains
  );

  const goalSeekInputs = {
    launchElevation: 20,
    launchVelocity: launchVelocityFps,
    initialHeight,
    slopePercent: slope,
    arrowWeight: totalArrowMassGrains,
    longCda: arrow.longDragArea,
    latCda: arrow.latDragArea,
    windSpeed: wind.windSpeed,
    windSpeedHeight: wind.windSpeedHeight,
    windDirection: wind.windDirection,
    hellmannConstant: wind.hellmannConstant,
    gravity: 9.80665,
    temperatureC: UnitConverter.convertTemperature(atmosphere.temperature, 'kelvin', 'celsius'),
    pressure: atmosphere.pressure,
    humidity: atmosphere.humidity
  };

  const elevationSeek = runGoalSeekCalc({
    trajectoryInputs: goalSeekInputs,
    parameterKey: 'launchElevation',
    parameterScale: 1,
    metricSelector: 'impact-distance-m',
    min: 0,
    max: 44.9,
    step: 0.1,
    targetValue
  });

  if (elevationSeek && Number.isFinite(elevationSeek.bestValue)) {
    goalSeekInputs.launchElevation = elevationSeek.bestValue;
  }

  const velocitySeek = runGoalSeekCalc({
    trajectoryInputs: goalSeekInputs,
    parameterKey: 'launchVelocity',
    parameterScale: 1,
    metricSelector: 'impact-distance-m',
    min: 50,
    max: 500,
    step: 1,
    targetValue
  });

  if (velocitySeek && Number.isFinite(velocitySeek.bestValue)) {
    goalSeekInputs.launchVelocity = velocitySeek.bestValue;
  }

  const simulationResult = ScoreSim.simulateScoreCalc(0.25, 5, 20, 'Metric', goalSeekInputs);

  return new OptimalResult(
    wind.windSpeed,
    wind.windDirection,
    simulationResult.averageScore,
    pointWeight,
    turns,
    goalSeekInputs.launchElevation,
    goalSeekInputs.launchVelocity
  );
}

function findOptimalScore(bowEnergy, rotatingMass, turnLetOff, initialHeight, slope, wind, arrow, atmosphere) {
  const turnsOptions = [0, 1,  2,  3,  4];
  const pointWeightOptions = [100, 150, 200, 250, 300];
  let bestResult = null;

  for (const turns of turnsOptions) {
    for (const pointWeight of pointWeightOptions) {
      const currentResult = getScore(
        turns,
        pointWeight,
        bowEnergy,
        rotatingMass,
        turnLetOff,
        initialHeight,
        slope,
        wind,
        arrow,
        atmosphere
      );
      if (!bestResult || currentResult.score > bestResult.score) {
        bestResult = currentResult;
      }
    }
  }

  return bestResult;
}

function formatOptimalResultHtml(optimalResult) {
  const roundedScore = Math.round(optimalResult.score);
  const roundedElevation = Math.round(optimalResult.launchElevation * 10) / 10;
  const roundedVelocityFps = Math.round(optimalResult.launchVelocity);
  return `${roundedScore}pts<br>${optimalResult.pointWeight}gr<br>${roundedElevation}<br>${roundedVelocityFps}fps<br>${optimalResult.turns}`;
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function runAnalysis() {
  const bowEnergy = parseFloat(document.getElementById('bow-energy')?.value ?? '');
  const rotatingMass = parseFloat(document.getElementById('rotating-mass')?.value ?? '');
  const turnLetOff = parseFloat(document.getElementById('turn-let-off')?.value ?? '');

  if (Number.isNaN(bowEnergy) || Number.isNaN(rotatingMass) || Number.isNaN(turnLetOff)) {
    return;
  }

  const windSpeeds = [5, 10, 15, 20];
  const windAngles = [0, 45, 90, 135, 180];
  const wind = new Wind(0, 10, 0, 0.15);
  const arrow = new Arrow(UnitConverter.convertMass(489, 'grains', 'kg'), 120 / 1e6, 900 / 1e6);
  const gravity = 9.80665;
  const atmosphere = new Atmosphere(
    UnitConverter.convertTemperature(20, 'celsius', 'kelvin'),
    UnitConverter.convertPressure(1013.25, 'hpa', 'kpa'),
    70
  );
  const initialHeight = 1.4;
  const slope = 0;
  const resultsTable = document.getElementById('analysis-results-table');
  const bodyRows = resultsTable?.querySelectorAll('tbody tr') ?? [];

  void gravity;

  if (!resultsTable || !bodyRows.length) {
    return;
  }

  bodyRows.forEach((row) => {
    row.querySelectorAll('td').forEach((cell) => {
      cell.innerHTML = '';
    });
  });

  for (const windSpeed of windSpeeds) {
    for (const windAngle of windAngles) {
      wind.windSpeed = windSpeed;
      wind.windDirection = windAngle;

      const optimalResult = await findOptimalScore(
        bowEnergy,
        rotatingMass,
        turnLetOff,
        initialHeight,
        slope,
        wind,
        arrow,
        atmosphere
      );

      const rowIndex = windSpeeds.indexOf(optimalResult.windSpeed);
      const colIndex = windAngles.indexOf(optimalResult.windAngle);
      if (rowIndex < 0 || colIndex < 0 || rowIndex >= bodyRows.length) {
        continue;
      }

      const cells = bodyRows[rowIndex].querySelectorAll('td');
      if (colIndex >= cells.length) {
        continue;
      }

      cells[colIndex].innerHTML = formatOptimalResultHtml(optimalResult);
      await delay(1000);
    }
  }
}

function initializeAnalysisPage() {
  const runAnalysisButton = document.getElementById('run-analysis-submit');
  if (runAnalysisButton) {
    runAnalysisButton.addEventListener('click', () => {
      void runAnalysis();
    });
  }
}

document.addEventListener('DOMContentLoaded', initializeAnalysisPage);
