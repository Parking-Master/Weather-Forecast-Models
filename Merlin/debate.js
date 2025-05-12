function vote(prediction, normParams) {
  let conditions = [
    prediction.max_temp <= prediction.min_temp,
    prediction.max_pressure >= 30.6,
    (prediction.max_pressure - .15 >= normParams.max_pressure.max),
    prediction.max_humidity <= prediction.min_humidity,
    prediction.max_pressure <= prediction.min_pressure,
    prediction.max_dew_point <= prediction.min_dew_point,
    prediction.max_temp + 8 < normParams.max_temp.min,
    prediction.max_temp - prediction.min_temp >= 35
  ];
  let reasons = [
    "High temperature is lower than the low temperature.",
    "Pressure is unusually high.",
    "Pressure is signifigantly higher than the previous trend.",
    "High humidity is lower than the low humidity.",
    "High pressure is lower than the low pressure.",
    "High dew point is lower than the low dew point.",
    "High temperature is signifigantly lower than usual.",
    "Temperature difference is unrealistically high.",
  ];
  if (conditions.indexOf(true) > -1) {
    let conditionIndexes = conditions.map((x, i) => i).filter((x, i) => conditions[i] == true);
    let foundReasons = reasons.filter((x, i) => conditionIndexes.indexOf(i) > -1);
    return foundReasons || null;
  }
  return true;
}

module.exports = { vote: vote };