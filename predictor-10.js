// Require modules here
const tf = require("@tensorflow/tfjs");

async function predict10(passedWeatherData) {
  // This prediction model version (10.0) uses 30 days of
  // previous weather data to recognize patterns over a
  // monthly span, to produce next week's weather data,
  // along with the chance of rain for each day.
  // Pass an array of 30 objects, which all include the following:
  // date (mm-dd-yyyy), high temperature (F), low temperature (F), humidity (%), pressure (inHg), wind speed (mph), dew point (F), precipitation (inches), cloud cover (oktas), and day of the year (1-366).

  let dummyData = passedWeatherData;

  let epochAverageTimes = [];
  let sub_startTime = Date.now();

  const epochs = 500;

  function getSeasonFromDate(dateString) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const [year, month, day] = dateString.split('-').map(Number);
    const monthName = months[month - 1];

    if (monthName === 'March' || monthName === 'April' || monthName === 'May') {
      return 1;
    } else if (monthName === 'June' || monthName === 'July' || monthName === 'August') {
      return 2;
    } else if (monthName === 'September' || monthName === 'October' || monthName === 'November') {
      return 3;
    } else {
      return 0;
    }
  }
  function daysIntoYear(date){
    return (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 24 / 60 / 60 / 1000;
  }

  const normParams = {
    max_temp: { min: 50, max: 110 },
    min_temp: { min: 40, max: 90 },
    humidity: { min: 0, max: 100 },
    pressure: { min: 28, max: 32 },
    wspd: { min: 0, max: 50 },
    dew_point: { min: 30, max: 80 },
    precipitation: { min: 0, max: 4 },
    cloud_cover: { min: 0, max: 8 },
    day_of_year: { min: 1, max: 366 }
  };

  for (let y = 0; y < dummyData.length; y++) {
    let dayData = dummyData[y];
    for (let n in normParams) {
      if (n === "max_temp") {
        if (y == 0 ? true : (dayData.max_temp > normParams[n].max)) normParams[n].max = dayData.max_temp + 3;
        if (y == 0 ? true : (dayData.max_temp < normParams[n].min)) normParams[n].min = dayData.max_temp - 3;
      }
      if (n === "min_temp") {
        if (y == 0 ? true : (dayData.min_temp > normParams[n].max)) normParams[n].max = dayData.min_temp + 3;
        if (y == 0 ? true : (dayData.min_temp < normParams[n].min)) normParams[n].min = dayData.min_temp - 3;
      }
      if (n === "wspd") {
        if (y == 0 ? true : (dayData.wspd > normParams[n].max)) normParams[n].max = dayData.wspd + 2;
        if (y == 0 ? true : (dayData.wspd < normParams[n].min)) normParams[n].min = (dayData.wspd - 2) < 0 ? 0 : (dayData.wspd - 2);
      }
      if (n === "pressure") {
        if (y == 0 ? true : (dayData.pressure > normParams[n].max)) normParams[n].max = dayData.pressure + .05;
        if (y == 0 ? true : (dayData.pressure < normParams[n].min)) normParams[n].min = dayData.pressure - .05;
      }
      if (n === "precipitation") {
        if (y == 0 ? true : (dayData.precipitation > normParams[n].max)) normParams[n].max = dayData.precipitation + .1;
        if (y == 0 ? true : (dayData.precipitation < normParams[n].min)) normParams[n].min = (dayData.precipitation - .1) < 0 ? 0 : (dayData.precipitation - .1);
      }
      if (n === "dew_point") {
        if (y == 0 ? true : (dayData.dew_point > normParams[n].max)) normParams[n].max = dayData.dew_point + 3;
        if (y == 0 ? true : (dayData.dew_point < normParams[n].min)) normParams[n].min = dayData.dew_point - 3;
      }
    }
  }

  function normalize(value, min, max) {
    return (value - min) / (max - min);
  }

  function denormalize(value, min, max) {
    return value * (max - min) + min;
  }

  for (let i = 0; i < 7; i++) {
    console.log(`Predicting day ${i + 1}...`);
    let weatherData = dummyData;
  
    const X = weatherData.map(({ max_temp, min_temp, humidity, pressure, wspd, dew_point, precipitation, cloud_cover, day_of_year }) => {
      return [
        normalize(max_temp, normParams.max_temp.min, normParams.max_temp.max),
        normalize(min_temp, normParams.min_temp.min, normParams.min_temp.max),
        normalize(humidity, normParams.humidity.min, normParams.humidity.max),
        normalize(pressure, normParams.pressure.min, normParams.pressure.max),
        normalize(wspd, normParams.wspd.min, normParams.wspd.max),
        normalize(dew_point, normParams.dew_point.min, normParams.dew_point.max),
        normalize(precipitation, normParams.precipitation.min, normParams.precipitation.max),
        normalize(cloud_cover, normParams.cloud_cover.min, normParams.cloud_cover.max),
        normalize(day_of_year, normParams.day_of_year.min, normParams.day_of_year.max)
      ];
    });

    const reshapedX = tf.tensor3d([X], [1, X.length, 9]);

    const y = weatherData.map(({ max_temp, min_temp, dew_point, precipitation, cloud_cover }) => [
      normalize(max_temp, normParams.max_temp.min, normParams.max_temp.max),
      normalize(min_temp, normParams.min_temp.min, normParams.min_temp.max),
      normalize(dew_point, normParams.dew_point.min, normParams.dew_point.max),
      normalize(precipitation, normParams.precipitation.min, normParams.precipitation.max),
      normalize(cloud_cover, normParams.cloud_cover.min, normParams.cloud_cover.max)
    ]);

    // Adjust the shape of y to match the output of the LSTM layer
    const reshapedY = tf.tensor3d([y], [1, y.length, 5]);

    const model = tf.sequential();
    model.add(tf.layers.lstm({ units: 64, inputShape: [30, 9], returnSequences: true }));
    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 5, activation: 'linear' }));
    model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });

    let predictedTimeLeft = 0;
    let previousTimeLeft = 0;
    let firstMessage = true;
    let currentEpoch = 0;
    setInterval(() => {
      if (Math.round(predictedTimeLeft * 60) === previousTimeLeft) return;
      previousTimeLeft = Math.round(predictedTimeLeft * 60);
      const terminalWidth = process.stdout.columns;
      const text = `Prediction model: About ${predictedTimeLeft.toString().split(".")[0]} ${predictedTimeLeft.toString().split(".")[0] == 1 ? "minute" : "minutes"} ${Math.round(("." + predictedTimeLeft.toString().split(".")[1] - 0) * 60)} seconds remaining...`;
      const clearLine = " ".repeat(terminalWidth - text.length);
      process.stdout.write(`${firstMessage ? "\n" : "\r"}${text}${clearLine}${currentEpoch + 2 >= epochs ? "\n\n" : ""}`);

      firstMessage = false;
    }, 50);
    await model.fit(reshapedX, reshapedY, {
      epochs: epochs,
      verbose: 0,
      callbacks: {
        onEpochBegin: function(epoch) {
          sub_startTime = Date.now();
        },
        onEpochEnd: function(epoch) {
          let sub_endTime = Date.now();
          let epochTime = (sub_endTime - sub_startTime) / 1000;
          epochAverageTimes.push(epochTime);
          let epochAverageTime = epochAverageTimes.reduce((a, b) => a + b) / epochAverageTimes.length;
          predictedTimeLeft = ((epochAverageTime * (epochs - epoch))) / 60;
          currentEpoch = epoch;
        }
      }
    });

    const reshapedPredictionInput = tf.tensor3d([X], [1, 30, 9]);

    let prediction = model.predict(reshapedPredictionInput).dataSync();
    prediction = Object.values(prediction);
    prediction[0] = denormalize(prediction[0], normParams.max_temp.min, normParams.max_temp.max);
    prediction[1] = denormalize(prediction[1], normParams.min_temp.min, normParams.min_temp.max);
    prediction[2] = denormalize(prediction[2], normParams.humidity.min, normParams.humidity.max);
    prediction[3] = denormalize(prediction[3], normParams.pressure.min, normParams.pressure.max);
    prediction[4] = denormalize(prediction[4], normParams.wspd.min, normParams.wspd.max);
    prediction[5] = denormalize(prediction[5], normParams.dew_point.min, normParams.dew_point.max);
    prediction[6] = denormalize(prediction[6], normParams.precipitation.min, normParams.precipitation.max);
    prediction[7] = denormalize(prediction[7], normParams.cloud_cover.min, normParams.cloud_cover.max);

    let tomorrowDate = new Date(weatherData[weatherData.length - 1].date).setDate(new Date(weatherData[weatherData.length - 1].date).getDate() + (i == 0 ? 0 : 1));
    let tomorrowFormattedDate = new Date(tomorrowDate).toISOString().split("T")[0];
    let dummyPrediction = {
      date: tomorrowFormattedDate,
      max_temp: Math.round(prediction[0]),
      min_temp: Math.round(prediction[1]),
      humidity: prediction[2].toFixed(2) - 0,
      pressure: prediction[3].toFixed(2) - 0,
      wspd: prediction[4].toFixed(3) - 0,
      dew_point: Math.round(prediction[5]),
      precipitation: Math.abs(prediction[6].toFixed(2) - 0),
      cloud_cover: Math.abs(Math.round(prediction[7])),
      day_of_year: daysIntoYear(new Date(tomorrowFormattedDate + "T00:00:00")),
      rain_chance: 0
    };

    const rainPredictor = require("./rain/index");
    let chanceOfRain = await rainPredictor.predict(dummyPrediction);
    dummyPrediction.rain_chance = chanceOfRain;

    dummyData.shift();
    dummyData.push(dummyPrediction);
    console.log(`Predicted day ${i + 1}:`, dummyPrediction);
  }
  let prediction = dummyData.slice(-7);

  return prediction;
}

module.exports = { predict10 };
