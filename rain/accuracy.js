const fs = require("fs");

function dates(add = 0) {
  const today = new Date();
  const lastDates = [];

  for (let i = 1; i <= 7; i++) {
    let previousDay = new Date(today.getTime() - (i * 24 * 60 * 60 * 1000));
    previousDay.setDate(previousDay.getDate() + add);
    previousDay.setHours(previousDay.getHours() - 4);
    const formattedDate = previousDay.toISOString().slice(0, 10).replace(/-/g, "");
    lastDates.push(formattedDate);
  }

  return lastDates;
}
function calculateAccuracy(actual, predicted) {
  if (actual === 0 && predicted === 0) {
    return 100;
  }
  if (actual === 0 && predicted !== 0) {
    return 0;
  }
  const accuracy = (1 - Math.abs(actual - predicted) / Math.max(actual, predicted)) * 100;

  return Math.max(0, Math.min(100, accuracy));
}

let pastPredictionDatesObject = dates().reverse();

let pastActualDates = pastPredictionDatesObject.map(date => new Date(date.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")).toLocaleDateString().replace(/\//g, "-"));
let pastPredictionDate = pastActualDates.map(date => date.replace(/-/g, ""))[0];
let predictionFile = JSON.parse(fs.readFileSync(`/home/pi/Weather Station/predictor/predictions/prediction-13.0-${pastPredictionDate}.json`).toString());
let predictionRain = predictionFile.map(day => day.precipitation);
let weekAccuracy = [];
for (let d = 0; d < 7; d++) {
  let pastActualDate = pastActualDates[d];
  let actualFile = JSON.parse(fs.readFileSync(`/home/pi/Weather Station/db/archive/days/${pastActualDate}.json`).toString());
  let actualRain = Object.values(actualFile).map(x => x.r || 0).reduce((a, b) => a + b);
  let predictedRain = predictionRain[d];
  let accuracy = calculateAccuracy(actualRain, predictedRain);

  weekAccuracy.push(Math.round(accuracy * 10) / 10);
}

module.exports = weekAccuracy;