class Vector3D {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  add(other) {
    return new Vector3D(this.x + other.x, this.y + other.y, this.z + other.z);
  }

  subtract(other) {
    return new Vector3D(this.x - other.x, this.y - other.y, this.z - other.z);
  }

  multiplyByScalar(scalar) {
    return new Vector3D(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  dot(other) {
    return this.x * other.x + this.y * other.y + this.z * other.z;
  }

  magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  normalize() {
    const mag = this.magnitude();
    if (mag === 0) {
      return new Vector3D(0, 0, 0);
    }
    return this.multiplyByScalar(1 / mag);
  }

  rotate_x(theta) {
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const y = this.y * cos - this.z * sin;
    const z = this.y * sin + this.z * cos;
    return new Vector3D(this.x, y, z);
  }

  rotate_y(theta) {
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const x = this.x * cos + this.z * sin;
    const z = -this.x * sin + this.z * cos;
    return new Vector3D(x, this.y, z);
  }

  rotate_z(theta) {
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const x = this.x * cos - this.y * sin;
    const y = this.x * sin + this.y * cos;
    return new Vector3D(x, y, this.z);
  }

  clone() {
    return new Vector3D(this.x, this.y, this.z);
  }

  toString() {
    return `x:${this.x.toFixed(2)} y:${this.y.toFixed(2)} z:${this.z.toFixed(2)}`;
  }
}

class UnitConverter {
  static conversion_factors = {
    length: {
      m: 1.0,
      ft: 0.3048,
      yd: 0.9144
    },
    mass: {
      kg: 1.0,
      grains: 0.00006479891
    },
    speed: {
      'm/s': 1.0,
      mph: 0.44704,
      'ft/s': 0.3048
    },
    pressure: {
      kpa: 1.0,
      hpa: 0.1
    }
  };

  static convert(category, value, fromUnit, toUnit) {
    const categoryFactors = UnitConverter.conversion_factors[category];
    if (!categoryFactors) {
      throw new Error(`Unsupported category: ${category}`);
    }

    const fromFactor = categoryFactors[fromUnit];
    const toFactor = categoryFactors[toUnit];

    if (fromFactor === undefined) {
      throw new Error(`Unsupported from-unit: ${fromUnit}`);
    }
    if (toFactor === undefined) {
      throw new Error(`Unsupported to-unit: ${toUnit}`);
    }

    return (value * fromFactor) / toFactor;
  }

  static convertLength(value, fromUnit, toUnit) {
    return UnitConverter.convert('length', value, fromUnit, toUnit);
  }

  static convertMass(value, fromUnit, toUnit) {
    return UnitConverter.convert('mass', value, fromUnit, toUnit);
  }

  static convertSpeed(value, fromUnit, toUnit) {
    return UnitConverter.convert('speed', value, fromUnit, toUnit);
  }

  static convertPressure(value, fromUnit, toUnit) {
    return UnitConverter.convert('pressure', value, fromUnit, toUnit);
  }

  static convertTemperature(value, fromUnit, toUnit) {
    const normalize = (unit) => {
      switch (unit.toLowerCase()) {
        case 'c':
        case 'celsius':
          return 'celsius';
        case 'f':
        case 'fahrenheit':
          return 'fahrenheit';
        case 'k':
        case 'kelvin':
          return 'kelvin';
        default:
          throw new Error(`Unsupported temperature unit: ${unit}`);
      }
    };

    const from = normalize(fromUnit);
    const to = normalize(toUnit);

    const toKelvin = (val, unit) => {
      switch (unit) {
        case 'celsius':
          return val + 273.15;
        case 'fahrenheit':
          return (val + 459.67) * (5 / 9);
        case 'kelvin':
          return val;
      }
    };

    const fromKelvin = (kelvin, unit) => {
      switch (unit) {
        case 'celsius':
          return kelvin - 273.15;
        case 'fahrenheit':
          return kelvin * (9 / 5) - 459.67;
        case 'kelvin':
          return kelvin;
      }
    };

    const kelvin = toKelvin(value, from);
    return fromKelvin(kelvin, to);
  }
}

class Wind {
  constructor(windSpeed, windSpeedHeight, windDirection, hellmannConstant) {
    this.windSpeed = windSpeed;
    this.windSpeedHeight = windSpeedHeight;
    this.windDirection = windDirection;
    this.hellmannConstant = hellmannConstant;
  }

  getWindVectorAtHeight(height) {
    if (height < 0) {
      return new Vector3D(0, 0, 0);
    }

    const referenceHeight = this.windSpeedHeight;
    const exponent = this.hellmannConstant;
    const speed = this.windSpeed * Math.pow(height / referenceHeight, exponent);
    const radians = (Math.PI / 180) * this.windDirection;
    const x = speed * Math.cos(radians);
    const y = speed * Math.sin(radians);
    return new Vector3D(x, y, 0);
  }
}

class Atmosphere {
  constructor(temperature, pressure, humidity) {
    this.temperature = temperature;
    this.pressure = pressure;
    this.humidity = humidity;
    this.airDensity = this.calculateAirDensity();
  }

  calculateAirDensity() {
    const T = this.temperature;
    const p = this.pressure * 1000;
    let rh = this.humidity;

    if (rh > 1) {
      rh = rh / 100;
    }

    const es = 6.112 * Math.exp((17.67 * (T - 273.15)) / (T - 29.65));
    const e = rh * es * 100;
    const pd = p - e;
    const R_d = 287.058;
    const R_v = 461.495;

    return (pd / (R_d * T)) + (e / (R_v * T));
  }
}

class Arrow {
  constructor(mass, longDragArea, latDragArea) {
    this.mass = mass;
    this.longDragArea = longDragArea;
    this.latDragArea = latDragArea;
  }
}

class TrajectoryCalculator {
  static calculateNetForce(position, velocity, arrow, wind, airDensity, gravity) {
    const gravitationalForce = new Vector3D(0, 0, gravity * arrow.mass * -1);
    const relativeVelocity = velocity.subtract(wind.getWindVectorAtHeight(position.z));

    let dragForceX = 0.0;
    let dragForceY = 0.0;
    let dragForceZ = 0.0;

    if (relativeVelocity.x !== 0) {
      dragForceX = -(0.5 * arrow.longDragArea * airDensity) * Math.abs(relativeVelocity.x) * relativeVelocity.x;
    }

    if (relativeVelocity.y !== 0) {
      dragForceY = -(0.5 * arrow.latDragArea * airDensity) * Math.abs(relativeVelocity.y) * relativeVelocity.y;
    }

    if (relativeVelocity.z !== 0) {
      dragForceZ = -(0.5 * arrow.longDragArea * airDensity) * Math.abs(relativeVelocity.z) * relativeVelocity.z;
    }

    const dragForce = new Vector3D(dragForceX, dragForceY, dragForceZ);
    return gravitationalForce.add(dragForce);
  }

  static calculateAcceleration(position, velocity, arrow, wind, airDensity, gravity) {
    const netForce = TrajectoryCalculator.calculateNetForce(position, velocity, arrow, wind, airDensity, gravity);
    return new Vector3D(netForce.x / arrow.mass, netForce.y / arrow.mass, netForce.z / arrow.mass);
  }

  static initializeLaunchState(launchElevation, launchVelocity, initialHeight) {
    const launchElevationRadians = (Math.PI / 180) * launchElevation;
    const position = new Vector3D(0, 0, initialHeight);
    const velocity = new Vector3D(
      launchVelocity * Math.cos(launchElevationRadians),
      0,
      launchVelocity * Math.sin(launchElevationRadians)
    );
    return { position, velocity };
  }

  static integrateRK4(position, velocity, arrow, wind, airDensity, gravity, timeStep) {
    const k1v = TrajectoryCalculator.calculateAcceleration(position, velocity, arrow, wind, airDensity, gravity).multiplyByScalar(timeStep);
    const k1p = velocity.multiplyByScalar(timeStep);

    const k2v = TrajectoryCalculator.calculateAcceleration(
      position.add(k1p.multiplyByScalar(0.5)),
      velocity.add(k1v.multiplyByScalar(0.5)),
      arrow,
      wind,
      airDensity,
      gravity
    ).multiplyByScalar(timeStep);
    const k2p = velocity.add(k1v.multiplyByScalar(0.5)).multiplyByScalar(timeStep);

    const k3v = TrajectoryCalculator.calculateAcceleration(
      position.add(k2p.multiplyByScalar(0.5)),
      velocity.add(k2v.multiplyByScalar(0.5)),
      arrow,
      wind,
      airDensity,
      gravity
    ).multiplyByScalar(timeStep);
    const k3p = velocity.add(k2v.multiplyByScalar(0.5)).multiplyByScalar(timeStep);

    const k4v = TrajectoryCalculator.calculateAcceleration(
      position.add(k3p),
      velocity.add(k3v),
      arrow,
      wind,
      airDensity,
      gravity
    ).multiplyByScalar(timeStep);
    const k4p = velocity.add(k3v).multiplyByScalar(timeStep);

    const nextVelocity = velocity.add(
      k1v.add(k2v.multiplyByScalar(2)).add(k3v.multiplyByScalar(2)).add(k4v).multiplyByScalar(1 / 6)
    );
    const nextPosition = position.add(
      k1p.add(k2p.multiplyByScalar(2)).add(k3p.multiplyByScalar(2)).add(k4p).multiplyByScalar(1 / 6)
    );

    return { nextPosition, nextVelocity };
  }

  static calculateGroundHeight(slopePercent, x) {
    return (x * slopePercent) / 100;
  }

  static simulateTrajectory(position, velocity, slopePercent, arrow, wind, airDensity, gravity, timeStep, maxSimulationTime) {
    let currentPosition = position.clone();
    let currentVelocity = velocity.clone();
    let previousPosition = currentPosition.clone();
    let previousVelocity = currentVelocity.clone();
    let flightTime = 0;
    let maxZ = currentPosition.z;

    while (currentPosition.z >= TrajectoryCalculator.calculateGroundHeight(slopePercent, currentPosition.x)) {
      previousPosition = currentPosition.clone();
      previousVelocity = currentVelocity.clone();

      const { nextPosition, nextVelocity } = TrajectoryCalculator.integrateRK4(
        currentPosition,
        currentVelocity,
        arrow,
        wind,
        airDensity,
        gravity,
        timeStep
      );

      currentPosition = nextPosition.clone();
      currentVelocity = nextVelocity.clone();

      if (currentPosition.z > maxZ) {
        maxZ = currentPosition.z;
      }

      flightTime += timeStep;
      if (flightTime > maxSimulationTime) {
        throw new Error('Simulation exceeded maximum allowed time of 30s.');
      }
    }

    return { previousPosition, currentPosition, previousVelocity, currentVelocity, maxZ, flightTime };
  }

  static interpolateImpact(slopePercent, previousPosition, currentPosition, previousVelocity, currentVelocity, timeStep, flightTime) {
    const f = (previousPosition.z - TrajectoryCalculator.calculateGroundHeight(slopePercent, previousPosition.x)) /
              ((previousPosition.z - TrajectoryCalculator.calculateGroundHeight(slopePercent, previousPosition.x)) -
               (currentPosition.z - TrajectoryCalculator.calculateGroundHeight(slopePercent, currentPosition.x)));

    const impactX = previousPosition.x + f * (currentPosition.x - previousPosition.x);
    const impactY = previousPosition.y + f * (currentPosition.y - previousPosition.y);
    const impactZ = previousPosition.z + f * (currentPosition.z - previousPosition.z);
    const impactPosition = new Vector3D(impactX, impactY, impactZ);

    const impactVx = previousVelocity.x + f * (currentVelocity.x - previousVelocity.x);
    const impactVy = previousVelocity.y + f * (currentVelocity.y - previousVelocity.y);
    const impactVz = previousVelocity.z + f * (currentVelocity.z - previousVelocity.z);
    const impactVelocity = new Vector3D(impactVx, impactVy, impactVz);

    const totalFlightTime = flightTime - timeStep + f * timeStep;
    return { impactPosition, impactVelocity, totalFlightTime };
  }

  static calculateImpactAngle(velocity) {
    return Math.atan2(velocity.z, velocity.x) * (180 / Math.PI);
  }

  static calculate(launchElevation, launchVelocity, initialHeight, slopePercent, arrow, wind, airDensity, gravity, timeStep, maxSimulationTime) {
    const { position, velocity } = TrajectoryCalculator.initializeLaunchState(
      launchElevation,
      launchVelocity,
      initialHeight
    );

    const {
      previousPosition,
      currentPosition,
      previousVelocity,
      currentVelocity,
      maxZ,
      flightTime,
    } = TrajectoryCalculator.simulateTrajectory(
      position,
      velocity,
      slopePercent,
      arrow,
      wind,
      airDensity,
      gravity,
      timeStep,
      maxSimulationTime
    );

    const { impactPosition, impactVelocity, totalFlightTime } = TrajectoryCalculator.interpolateImpact(
      slopePercent,
      previousPosition,
      currentPosition,
      previousVelocity,
      currentVelocity,
      timeStep,
      flightTime
    );

    const impactAngle = TrajectoryCalculator.calculateImpactAngle(impactVelocity);

    return new TrajectoryResult(impactPosition.x, impactPosition.y, impactPosition.z, impactAngle, maxZ, totalFlightTime);
  }
}

class TrajectoryResult {
  constructor(impactX, impactY, impactZ, impactAngle, maxZ, totalFlightTime) {
    this.impactX = impactX;
    this.impactY = impactY;
    this.impactZ = impactZ;
    this.impactAngle = impactAngle;
    this.maxZ = maxZ;
    this.totalFlightTime = totalFlightTime;
  }
}

function calculateTrajectoryCalc(inputs) {
  const launchVelocityMps = UnitConverter.convertSpeed(inputs.launchVelocity, 'ft/s', 'm/s');
  const windSpeedMps = UnitConverter.convertSpeed(inputs.windSpeed, 'mph', 'm/s');
  const arrowMass = UnitConverter.convertMass(inputs.arrowWeight, 'grains', 'kg');

  const atmosphere = new Atmosphere(
    UnitConverter.convertTemperature(inputs.temperatureC, 'celsius', 'kelvin'),
    inputs.pressure,
    inputs.humidity
  );
  const wind = new Wind(windSpeedMps, inputs.windSpeedHeight, inputs.windDirection, inputs.hellmannConstant);
  const arrow = new Arrow(arrowMass, inputs.longCda, inputs.latCda);

  const result = TrajectoryCalculator.calculate(
    inputs.launchElevation,
    launchVelocityMps,
    inputs.initialHeight,
    inputs.slopePercent,
    arrow,
    wind,
    atmosphere.airDensity,
    inputs.gravity,
    0.01,
    30
  );

  return { result, atmosphereDensity: atmosphere.airDensity };
}

function runGoalSeekCalc(params) {
  const {
    trajectoryInputs,
    parameterKey,
    parameterScale,
    metricSelector,
    min,
    max,
    step,
    targetValue
  } = params;

  if (!trajectoryInputs || !parameterKey) {
    return null;
  }

  const evaluateCandidate = (candidate) => {
    const candidateInputs = {
      ...trajectoryInputs,
      [parameterKey]: candidate * scale
    };

    let calculation;
    try {
      calculation = calculateTrajectoryCalc(candidateInputs);
    } catch (error) {
      return null;
    }

    const currentMetric = metricSelect === 'impact-distance-yd'
      ? UnitConverter.convertLength(calculation.result.impactX, 'm', 'yd')
      : calculation.result.impactX;

    const currentResult = parseFloat(currentMetric);
    if (Number.isNaN(currentResult)) {
      return null;
    }

    return currentResult;
  };

  const metricSelect = metricSelector === 'impact-distance-yd' ? 'impact-distance-yd' : 'impact-distance-m';
  const scale = Number.isFinite(parameterScale) ? parameterScale : 1;

  let bestValue = NaN;
  let bestResult = NaN;
  let bestDifference = Number.POSITIVE_INFINITY;

  for (let candidate = min; candidate <= max; candidate += step) {
    const currentResult = evaluateCandidate(candidate);
    if (!Number.isFinite(currentResult)) {
      continue;
    }

    const difference = Math.abs(currentResult - targetValue);
    if (difference < bestDifference) {
      bestDifference = difference;
      bestValue = candidate;
      bestResult = currentResult;
    }
  }

  let searchHalfWindow = step;
  let refinementStep = step / 10;
  const maxRefinementRounds = 4;

  for (let round = 0; round < maxRefinementRounds && refinementStep > 0; round += 1) {
    if (!Number.isFinite(bestValue)) {
      break;
    }

    const rangeMin = Math.max(min, bestValue - searchHalfWindow);
    const rangeMax = Math.min(max, bestValue + searchHalfWindow);

    for (let candidate = rangeMin; candidate <= rangeMax + (refinementStep / 2); candidate += refinementStep) {
      const clampedCandidate = Math.min(max, Math.max(min, candidate));
      const currentResult = evaluateCandidate(clampedCandidate);
      if (!Number.isFinite(currentResult)) {
        continue;
      }

      const difference = Math.abs(currentResult - targetValue);
      if (difference < bestDifference) {
        bestDifference = difference;
        bestValue = clampedCandidate;
        bestResult = currentResult;
      }
    }

    searchHalfWindow = refinementStep;
    refinementStep /= 10;
  }

  if (!Number.isFinite(bestValue)) {
    return null;
  }

  return { bestValue, bestResult, bestDifference };
}

