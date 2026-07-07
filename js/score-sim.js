class ScoreSim {
  static METRIC = [
    { maxDistance: 1.5, score: 5 , color: 'yellow'},
    { maxDistance: 3, score: 4 , color: 'red'},
    { maxDistance: 4.5, score: 3 , color: 'blue'},
    { maxDistance: 6, score: 2 , color: 'black'},
    { maxDistance: 7.5, score: 1 , color: 'lightgray'}
  ];

  static IMPERIAL = [
    { maxDistance: 1.5, score: 5 , color: 'yellow'},
    { maxDistance: 3, score: 4 , color: 'red'},
    { maxDistance: 6, score: 3 , color: 'blue'},
    { maxDistance: 9, score: 2 , color: 'black'},
    { maxDistance: 12, score: 1 , color: 'lightgray'}
  ];

  static calculateScore(distance, scoreType) {
    const isMetric = scoreType === 'Metric';
    const scoreBreakpoints = isMetric ? ScoreSim.METRIC : ScoreSim.IMPERIAL;
    const distanceForScoring = isMetric ? distance : UnitConverter.convertLength(distance, 'm', 'ft');

    for (const breakpoint of scoreBreakpoints) {
      if (distanceForScoring < breakpoint.maxDistance) {
        return breakpoint.score;
      }
    }

    return 0;
  }

  static simulateShot(accuracy, windGust, shotContext) {
    const {
      launchElevation,
      launchVelocityMps,
      initialHeight,
      slopePercent,
      arrow,
      atmosphere,
      gravity,
      windSpeed,
      windDirection,
      windSpeedHeight,
      hellmannConstant,
      centerX,
      centerY,
      scoreType
    } = shotContext;

    const offsetAngle = (Math.random() *360) * Math.PI / 180;
    const offsetDistance = Math.random() * accuracy;
    const elevationOffset = Math.sin(offsetAngle) * offsetDistance; 
    const leftRightOffset = Math.cos(offsetAngle) * offsetDistance;


    const deltaWindSpeed = Math.random() * windGust;
    const deltaWindAngle = (Math.random() *360) * Math.PI / 180;
    const modifiedWindX = windSpeed * Math.cos((windDirection * Math.PI) / 180) + deltaWindSpeed * Math.cos(deltaWindAngle);
    const modifiedWindY = windSpeed * Math.sin((windDirection * Math.PI) / 180) + deltaWindSpeed * Math.sin(deltaWindAngle);
    const modifiedWindSpeed = Math.sqrt(modifiedWindX * modifiedWindX + modifiedWindY * modifiedWindY);
    const modifiedWindDirection = (Math.atan2(modifiedWindY, modifiedWindX) * (180 / Math.PI) + 360) % 360;
    const modifiedWindSpeedMps = UnitConverter.convertSpeed(modifiedWindSpeed, 'mph', 'm/s');
    const modifiedWind = new Wind(modifiedWindSpeedMps, windSpeedHeight, modifiedWindDirection, hellmannConstant);

    try {
      const simulatedResult = TrajectoryCalculator.calculate(
        launchElevation + elevationOffset,
        launchVelocityMps,
        initialHeight,
        slopePercent,
        arrow,
        modifiedWind,
        atmosphere.airDensity,
        gravity,
        0.01,
        30
      );

      const simulatedImpactX = simulatedResult.impactX;
      const simulatedImpactY = simulatedResult.impactY + Math.tan((leftRightOffset * Math.PI) / 180) * simulatedResult.impactX;

      const dx = simulatedImpactX - centerX;
      const dy = simulatedImpactY - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const calculatedScore = ScoreSim.calculateScore(distance, scoreType);

      return { dx, dy, calculatedScore };
    } catch (e) {
      return { dx: 0, dy: 0, calculatedScore: 0 };
    }
  }

  static simulateScoreCalc(accuracy, windGust, simulatedClouts, scoreType, inputs) {
    const shots = 72 * simulatedClouts;

    const launchVelocityMps = UnitConverter.convertSpeed(inputs.launchVelocity, 'ft/s', 'm/s');
    const windSpeedMps = UnitConverter.convertSpeed(inputs.windSpeed, 'mph', 'm/s');
    const arrowMass = UnitConverter.convertMass(inputs.arrowWeight, 'grains', 'kg');

    const atmosphere = new Atmosphere(
      UnitConverter.convertTemperature(inputs.temperatureC, 'celsius', 'kelvin'),
      inputs.pressure,
      inputs.humidity
    );
    const arrow = new Arrow(arrowMass, inputs.longCda, inputs.latCda);

    const wind = new Wind(windSpeedMps, inputs.windSpeedHeight, inputs.windDirection, inputs.hellmannConstant);
    const baselineResult = TrajectoryCalculator.calculate(
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

    const shotContext = {
      launchElevation: inputs.launchElevation,
      launchVelocityMps,
      initialHeight: inputs.initialHeight,
      slopePercent: inputs.slopePercent,
      arrow,
      atmosphere,
      gravity: inputs.gravity,
      windSpeed: inputs.windSpeed,
      windDirection: inputs.windDirection,
      windSpeedHeight: inputs.windSpeedHeight,
      hellmannConstant: inputs.hellmannConstant,
      centerX: baselineResult.impactX,
      centerY: baselineResult.impactY,
      scoreType
    };

    let totalScore = 0;
    const shotCoordinates = [];
    for (let i = 0; i < shots; i++) {
      const shotResult = ScoreSim.simulateShot(accuracy, windGust, shotContext);
      totalScore += shotResult.calculatedScore;
      shotCoordinates.push({ dx: shotResult.dx, dy: shotResult.dy });
    }

    return {
      averageScore: totalScore / simulatedClouts,
      shotCoordinates
    };
  }
}
