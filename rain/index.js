const precipitationPredictor = require("./precipitation_predictor");
const confidencePredictor = require("./confidence_predictor");

function calculateRainPrediction(highest_recorded_precipitation, area_size, confidence, predicted_precipitation) {
  const hP = highest_recorded_precipitation;
  const A = area_size;
  const C = confidence;
  const p = predicted_precipitation;

  /* Land coverage (between 0-1) */
  const L = p / hP;

  /* PoP (Probability of Precipitation) (between 0-1) */
  const PoP = L * C;

  return PoP * 100;
}

async function predict(predictedWeatherData, threshold = 0) {
  let weatherData = {
    temperature: (predictedWeatherData.max_temp + predictedWeatherData.min_temp) / 2,
    humidity: predictedWeatherData.humidity
  };

  let highest_recorded_precipitation = 1 + threshold; // Inches of rain
  let area_size = 8000; // Square feet
  let confidence = await confidencePredictor.compute(weatherData); // Confidence in how likely it is to rain (between 0-1)
  let predicted_precipitation = await precipitationPredictor.compute(); // Inches of rain

  let chanceOfRain = calculateRainPrediction(highest_recorded_precipitation, area_size, confidence, predicted_precipitation);

  return chanceOfRain;
}

module.exports = { predict: predict };