class OptimalResult {
  constructor(windSpeed, windAngle, score, pointWeight, turns, launchElevation, launchSpeed) {
    this.windSpeed = windSpeed;
    this.windAngle = windAngle;
    this.score = score;
    this.pointWeight = pointWeight;
    this.turns = turns;
    this.launchElevation = launchElevation;
    this.launchSpeed = launchSpeed;
  }
}

function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  const factor = 10 ** decimals;
  const value = Math.random() * (max - min) + min;
  return Math.round(value * factor) / factor;
}

function pickRandom(options) {
  return options[Math.floor(Math.random() * options.length)];
}

function getScore(turns, pointWeight, wind) {
  const randomScore = randomInteger(80, 270);
  const randomElevation = randomFloat(15, 21, 2);
  const randomLaunchSpeed = randomFloat(150, 250, 2);

  return new OptimalResult(
    wind.windSpeed,
    wind.windDirection,
    randomScore,
    pointWeight,
    turns,
    randomElevation,
    randomLaunchSpeed
  );
}

function findOptimalScore(bowEnergy, rotatingMass, turnLetOff, initialHeight, slope, wind, arrow, atmosphere) {
  // Keep these for future optimization logic integration.
  void bowEnergy;
  void rotatingMass;
  void turnLetOff;
  void initialHeight;
  void slope;
  void arrow;
  void atmosphere;

  const turnsOptions = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4];
  const pointWeightOptions = [100, 150, 200, 250, 300];
  let bestResult = null;

  for (const turns of turnsOptions) {
    for (const pointWeight of pointWeightOptions) {
      const currentResult = getScore(turns, pointWeight, wind);
      if (!bestResult || currentResult.score > bestResult.score) {
        bestResult = currentResult;
      }
    }
  }

  return bestResult;
}

function formatOptimalResultHtml(optimalResult) {
  return `${optimalResult.score}pts<br>${optimalResult.pointWeight}gr<br>${optimalResult.launchElevation}<br>${optimalResult.turns}`;
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
