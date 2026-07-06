function drawImpactPoints(shotCoordinates, averageScore) {
  const scoreSimulatorForm = document.getElementById('scoreSimulatorForm');
  if (!scoreSimulatorForm) {
    return;
  }

  const scoreTypeElement = document.getElementById('score-type');
  const scoreType = scoreTypeElement ? scoreTypeElement.value : 'Imperial';
  const isMetric = scoreType === 'Metric';
  const rings = isMetric ? ScoreSim.METRIC : ScoreSim.IMPERIAL;

  const host = scoreSimulatorForm;
  if (!host) {
    return;
  }

  let svg = document.getElementById('score-impact-diagram');
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'score-impact-diagram');
    svg.setAttribute('role', 'img');
    svg.style.display = 'block';
    svg.style.width = '100%';
    svg.style.maxWidth = '420px';
    svg.style.marginTop = '0.75rem';
    svg.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    svg.style.borderRadius = '8px';
    svg.style.background = 'rgba(0, 0, 0, 0.25)';
    host.insertAdjacentElement('afterend', svg);
  }

  const size = 320;
  const padding = 20;
  const center = size / 2;
  const maxRingDistance = rings[rings.length - 1].maxDistance;
  const chartRadius = center - padding;
  const scale = chartRadius / maxRingDistance;
  const windDirectionInput = document.getElementById('wind-direction');
  const windSpeedInput = document.getElementById('wind-speed');
  const windDirection = windDirectionInput ? parseFloat(windDirectionInput.value) : 0;
  const windSpeedMph = windSpeedInput ? parseFloat(windSpeedInput.value) : Number.NaN;

  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('width', `${size}`);
  svg.setAttribute('height', `${size}`);
  svg.replaceChildren();

  const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
  title.textContent = `Simulated impact points (${scoreType})`;
  svg.appendChild(title);

  
  if (averageScore !== undefined && averageScore !== null) {
    const numericScore = parseFloat(averageScore);
    if (!Number.isNaN(numericScore)) {
      const scoreLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      scoreLabel.setAttribute('x', `${size + 6}`);
      scoreLabel.setAttribute('y', '24');
      scoreLabel.setAttribute('text-anchor', 'end');
      scoreLabel.setAttribute('fill', 'rgba(255, 255, 255, 0.95)');
      scoreLabel.setAttribute('font-size', '22');
      scoreLabel.setAttribute('font-weight', '600');
      scoreLabel.textContent = `${Math.round(numericScore)}pts`;
      svg.appendChild(scoreLabel);
    }
  }
  

  const axisColor = 'rgba(255, 255, 255, 0.35)';
  const horizontalAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  horizontalAxis.setAttribute('x1', '0');
  horizontalAxis.setAttribute('y1', `${center}`);
  horizontalAxis.setAttribute('x2', `${size}`);
  horizontalAxis.setAttribute('y2', `${center}`);
  horizontalAxis.setAttribute('stroke', axisColor);
  horizontalAxis.setAttribute('stroke-width', '1');
  svg.appendChild(horizontalAxis);

  const verticalAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  verticalAxis.setAttribute('x1', `${center}`);
  verticalAxis.setAttribute('y1', '0');
  verticalAxis.setAttribute('x2', `${center}`);
  verticalAxis.setAttribute('y2', `${size}`);
  verticalAxis.setAttribute('stroke', axisColor);
  verticalAxis.setAttribute('stroke-width', '1');
  svg.appendChild(verticalAxis);

  for (let i = rings.length - 1; i >= 0; i--) {
    const ring = rings[i];
    const ringCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ringCircle.setAttribute('cx', `${center}`);
    ringCircle.setAttribute('cy', `${center}`);
    ringCircle.setAttribute('r', `${ring.maxDistance * scale}`);
    ringCircle.setAttribute('fill', ring.color);
    ringCircle.setAttribute('fill-opacity', '0.18');
    ringCircle.setAttribute('stroke', 'rgba(255, 255, 255, 0.45)');
    ringCircle.setAttribute('stroke-width', '0.8');
    svg.appendChild(ringCircle);
  }

  if (!Number.isNaN(windDirection)) {
    const windAngleRad = (windDirection * Math.PI) / 180;
    const arrowEndX = center + Math.sin(windAngleRad) * chartRadius;
    const arrowEndY = center - Math.cos(windAngleRad) * chartRadius;

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'wind-arrowhead');
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '8');
    marker.setAttribute('refY', '5');
    marker.setAttribute('markerWidth', '6');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('orient', 'auto-start-reverse');
    const markerPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    markerPath.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
    markerPath.setAttribute('fill', 'rgba(255, 255, 255, 0.9)');
    marker.appendChild(markerPath);
    defs.appendChild(marker);
    svg.appendChild(defs);

    const windArrow = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    windArrow.setAttribute('x1', `${center}`);
    windArrow.setAttribute('y1', `${center}`);
    windArrow.setAttribute('x2', `${arrowEndX}`);
    windArrow.setAttribute('y2', `${arrowEndY}`);
    windArrow.setAttribute('stroke', 'rgba(255, 255, 255, 0.9)');
    windArrow.setAttribute('stroke-width', '1.6');
    windArrow.setAttribute('marker-end', 'url(#wind-arrowhead)');
    svg.appendChild(windArrow);

    if (!Number.isNaN(windSpeedMph)) {
      const labelDistance = 10;
      const labelX = arrowEndX + Math.sin(windAngleRad) * labelDistance;
      const labelY = arrowEndY - Math.cos(windAngleRad) * labelDistance;
      const windLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      windLabel.setAttribute('x', `${labelX}`);
      windLabel.setAttribute('y', `${labelY}`);
      windLabel.setAttribute('fill', 'rgba(255, 255, 255, 0.9)');
      windLabel.setAttribute('font-size', '10');
      windLabel.setAttribute('text-anchor', Math.sin(windAngleRad) >= 0 ? 'start' : 'end');
      windLabel.textContent = `${windSpeedMph.toFixed(1)} mph`;
      svg.appendChild(windLabel);
    }
  }

  if (Array.isArray(shotCoordinates)) {
    for (const shot of shotCoordinates) {
      const horizontal = isMetric ? shot.dy : UnitConverter.convertLength(shot.dy, 'm', 'ft');
      const vertical = isMetric ? shot.dx : UnitConverter.convertLength(shot.dx, 'm', 'ft');

      const shotCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      shotCircle.setAttribute('cx', `${center + horizontal * scale}`);
      shotCircle.setAttribute('cy', `${center - vertical * scale}`);
      shotCircle.setAttribute('r', '2.2');
      shotCircle.setAttribute('fill', '#ffffff');
      shotCircle.setAttribute('fill-opacity', '0.10');
      svg.appendChild(shotCircle);
    }
  }

}
