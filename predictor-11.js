// Require modules here
const tf = require("@tensorflow/tfjs");

async function predict11(passedWeatherData) {
  /*
   * Model version: 11.0
   * Model name: Voldemort
   * Model accuracy: 75.6%
   * Prediction span: 1 week
   * Input span: 2 years
   * Input structure: 1 array/732 objects/16 properties
   * Input properties: 
   * - date (mm-dd-yyyy)
   * - high temperature (F)
   * - low temperature (F)
   * - high humidity (%)
   * - low humidity (%)
   * - high pressure (inHg)
   * - low pressure (inHg)
   * - high wind speed (mph)
   * - low wind speed (mph)
   * - high dew point (F)
   * - low dew point (F)
   * - total precipitation (inches)
   * - most frequent cloud cover (oktas)
   * - day of the year (1-366)
   * - month of the year (1-12)
   * - season (0-3)
   * 
   * Output properties:
   * - date (mm-dd-yyyy)
   * - high temperature (F)
   * - low temperature (F)
   * - high humidity (%)
   * - low humidity (%)
   * - high pressure (inHg)
   * - low pressure (inHg)
   * - high wind speed (mph)
   * - low wind speed (mph)
   * - high dew point (F)
   * - low dew point (F)
   * - total precipitation (inches)
   * - most frequent cloud cover (oktas)
   * - day of the year (1-366)
   * - month of the year (1-12)
   * - season (0-3)
   * - chance of rain (%)
   * 
   * Final estimated prediction time (for my 2015 8GB RAM macbook): 5 hours, 15 minutes
   * Notes:
   * > Uses input data from 2 years ago to today, and adds 5-year
   * > historical parameters for normalization for the best accuracy.
   * > Also uses Rain Prediction Model 2.0 for chance of rain predictions.
  */

  let dummyData = passedWeatherData;

  let epochAverageTimes = [];
  let sub_startTime = Date.now();

  const epochs = 125;

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
  async function safeFetch() {
    try {
      const response = await fetch.apply(null, arguments);
      return response;
    } catch (err) {
      console.log("[predictor.js]: Fetch error occured for url `" + arguments[0] + "`:", err);
      return null;
    }
  }

  const normParams = {
    max_temp: { min: 50, max: 110 },
    min_temp: { min: 40, max: 90 },
    max_humidity: { min: 0, max: 100 },
    min_humidity: { min: 0, max: 100 },
    max_pressure: { min: 28, max: 32 },
    min_pressure: { min: 28, max: 32 },
    max_wspd: { min: 0, max: 50 },
    min_wspd: { min: 0, max: 50 },
    max_dew_point: { min: 30, max: 80 },
    min_dew_point: { min: 30, max: 80 },
    precipitation: { min: 0, max: 4 },
    cloud_cover: { min: 0, max: 8 },
    day_of_year: { min: 1, max: 732 },
    month_of_year: { min: 1, max: 12 },
    season: { min: 0, max: 3 }
  };

  function normalize(value, min, max) {
    return (value - min) / (max - min);
  }

  function denormalize(value, min, max) {
    return value * (max - min) + min;
  }

  for (let i = 0; i < 7; i++) {
    console.log(`Predicting day ${i + 1}...`);

    let targetDate = new Date(new Date(dummyData[dummyData.length - 1].date).setDate(new Date(dummyData[dummyData.length - 1].date + "T00:00").getDate() + i));
    for (let y = 0; y < 5; y++) {
      const API_KEY = "e1f10a1e78da46f5b10a1e78da96f525";
      const AIRPORT_CODE = "KGSP";

      let currentYear = targetDate.getFullYear();
      let historicYear = currentYear - y - 1;
      let historicDate = new Date(targetDate.toISOString().slice(0, 10) + "T00:00");
      historicDate.setFullYear(historicYear);
      let date = historicDate.toISOString().slice(0, 10).replace(/-/g, "");

      const historicWeatherData = await (await safeFetch(`https://api.weather.com/v1/location/${AIRPORT_CODE}:9:US/observations/historical.json?apiKey=${API_KEY}&units=e&startDate=${date}`)).json();
      const dayData = {
        max_temp: Math.max(...historicWeatherData.observations.map(x => x.temp)),
        min_temp: Math.min(...historicWeatherData.observations.map(x => x.temp)),
        max_humidity: Math.max(...historicWeatherData.observations.map(x => x.rh)).toFixed(1) - 0,
        min_humidity: Math.min(...historicWeatherData.observations.map(x => x.rh)).toFixed(1) - 0,
        max_pressure: (Math.max(...historicWeatherData.observations.map(x => x.pressure)).toFixed(2) - 0) + 1,
        min_pressure: (Math.min(...historicWeatherData.observations.map(x => x.pressure)).toFixed(2) - 0) + 1,
        max_wspd: Math.max(...historicWeatherData.observations.map(x => x.wspd)).toFixed(1) - 0,
        min_wspd: Math.min(...historicWeatherData.observations.map(x => x.wspd)).toFixed(1) - 0,
        max_dew_point: Math.round(Math.max(...historicWeatherData.observations.map(x => x.dewPt))),
        min_dew_point: Math.round(Math.min(...historicWeatherData.observations.map(x => x.dewPt))),
        precipitation: historicWeatherData.observations.map(x => x.precip_hrly || 0).reduce((a, b) => a + b, 0).toFixed(2) - 0,
      };
      for (let n in normParams) {
        if (n === "max_temp") {
          if (y == 0 ? true : (dayData.max_temp > normParams[n].max)) normParams[n].max = dayData.max_temp + 1;
          if (y == 0 ? true : (dayData.max_temp < normParams[n].min)) normParams[n].min = dayData.max_temp - 2;
        }
        if (n === "min_temp") {
          if (y == 0 ? true : (dayData.min_temp > normParams[n].max)) normParams[n].max = dayData.min_temp + 1;
          if (y == 0 ? true : (dayData.min_temp < normParams[n].min)) normParams[n].min = dayData.min_temp - 1;
        }
        if (n === "max_humidity") {
          if (y == 0 ? true : (dayData.max_humidity > normParams[n].max)) normParams[n].max = Math.min(dayData.max_humidity + 3, 100);
          if (y == 0 ? true : (dayData.max_humidity < normParams[n].min)) normParams[n].min = Math.max(dayData.max_humidity - 3, 0);
        }
        if (n === "min_humidity") {
          if (y == 0 ? true : (dayData.min_humidity > normParams[n].max)) normParams[n].max = Math.min(dayData.min_humidity + 3, 100);
          if (y == 0 ? true : (dayData.min_humidity < normParams[n].min)) normParams[n].min = Math.max(dayData.min_humidity - 3, 0);
        }
        if (n === "max_pressure") {
          if (y == 0 ? true : (dayData.max_pressure > normParams[n].max)) normParams[n].max = dayData.max_pressure + .05;
          if (y == 0 ? true : (dayData.max_pressure < normParams[n].min)) normParams[n].min = dayData.max_pressure - .05;
        }
        if (n === "min_pressure") {
          if (y == 0 ? true : (dayData.min_pressure > normParams[n].max)) normParams[n].max = dayData.min_pressure + .05;
          if (y == 0 ? true : (dayData.min_pressure < normParams[n].min)) normParams[n].min = dayData.min_pressure - .05;
        }
        if (n === "max_wspd") {
          if (y == 0 ? true : (dayData.max_wspd > normParams[n].max)) normParams[n].max = Math.max(dayData.max_wspd + 2, 0);
          if (y == 0 ? true : (dayData.max_wspd < normParams[n].min)) normParams[n].min = Math.max(dayData.max_wspd - 2, 0);
        }
        if (n === "min_wspd") {
          if (y == 0 ? true : (dayData.min_wspd > normParams[n].max)) normParams[n].max = Math.max(dayData.min_wspd + 2, 0);
          if (y == 0 ? true : (dayData.min_wspd < normParams[n].min)) normParams[n].min = Math.max(dayData.min_wspd - 2, 0);
        }
        if (n === "max_dew_point") {
          if (y == 0 ? true : (dayData.max_dew_point > normParams[n].max)) normParams[n].max = Math.max(dayData.max_dew_point + 2, 0);
          if (y == 0 ? true : (dayData.max_dew_point < normParams[n].min)) normParams[n].min = Math.max(dayData.max_dew_point - 2, 0);
        }
        if (n === "min_dew_point") {
          if (y == 0 ? true : (dayData.min_dew_point > normParams[n].max)) normParams[n].max = Math.max(dayData.min_dew_point + 2, 0);
          if (y == 0 ? true : (dayData.min_dew_point < normParams[n].min)) normParams[n].min = Math.max(dayData.min_dew_point - 2, 0);
        }
        if (n === "precipitation") {
          if (y == 0 ? true : (dayData.precipitation > normParams[n].max)) normParams[n].max = dayData.precipitation + .1;
          if (y == 0 ? true : (dayData.precipitation < normParams[n].min)) normParams[n].min = Math.max(dayData.precipitation - .1, 0);
        }
      }
    }
    console.log(normParams)

    let weatherData = dummyData;
  
    const X = weatherData.map(({ max_temp, min_temp, max_humidity, min_humidity, max_pressure, min_pressure, max_wspd, min_wspd, max_dew_point, min_dew_point, precipitation, cloud_cover, day_of_year, month_of_year, season }) => {
      return [
        normalize(max_temp, normParams.max_temp.min, normParams.max_temp.max),
        normalize(min_temp, normParams.min_temp.min, normParams.min_temp.max),
        normalize(max_humidity, normParams.max_humidity.min, normParams.max_humidity.max),
        normalize(min_humidity, normParams.min_humidity.min, normParams.min_humidity.max),
        normalize(max_pressure, normParams.max_pressure.min, normParams.max_pressure.max),
        normalize(min_pressure, normParams.min_pressure.min, normParams.min_pressure.max),
        normalize(max_wspd, normParams.max_wspd.min, normParams.max_wspd.max),
        normalize(min_wspd, normParams.min_wspd.min, normParams.min_wspd.max),
        normalize(max_dew_point, normParams.max_dew_point.min, normParams.max_dew_point.max),
        normalize(min_dew_point, normParams.min_dew_point.min, normParams.min_dew_point.max),
        normalize(precipitation, normParams.precipitation.min, normParams.precipitation.max),
        normalize(cloud_cover, normParams.cloud_cover.min, normParams.cloud_cover.max),
        normalize(day_of_year, normParams.day_of_year.min, normParams.day_of_year.max),
        normalize(month_of_year, normParams.month_of_year.min, normParams.month_of_year.max),
        normalize(season, normParams.season.min, normParams.season.max)
      ];
    });

    const reshapedX = tf.tensor3d([X], [1, X.length, 15]);

    const y = weatherData.map(({ max_temp, min_temp, max_dew_point, min_dew_point, precipitation, cloud_cover }) => [
      normalize(max_temp, normParams.max_temp.min, normParams.max_temp.max),
      normalize(min_temp, normParams.min_temp.min, normParams.min_temp.max),
      normalize(max_dew_point, normParams.max_dew_point.min, normParams.max_dew_point.max),
      normalize(min_dew_point, normParams.min_dew_point.min, normParams.min_dew_point.max),
      normalize(precipitation, normParams.precipitation.min, normParams.precipitation.max),
      normalize(cloud_cover, normParams.cloud_cover.min, normParams.cloud_cover.max)
    ]);

    // Adjust the shape of y to match the output of the LSTM layer
    const reshapedY = tf.tensor3d([y], [1, y.length, 6]);

    const model = tf.sequential();
    model.add(tf.layers.bidirectional({
      layer: tf.layers.lstm({ units: 64, returnSequences: true }),
      inputShape: [732, 15]
    }));
    model.add(tf.layers.dropout({ rate: 0.2 }));
    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 6, activation: 'linear' }));
    
    model.compile({
      optimizer: tf.train.adam(0.001), // Adjust the learning rate
      loss: 'meanSquaredError'
    });

    let predictedTimeLeft = 0;
    let previousTimeLeft = 0;
    let firstMessage = true;
    let currentEpoch = 0;
    setInterval(() => {
      if (Math.round(predictedTimeLeft * 60) === previousTimeLeft) return;
      previousTimeLeft = Math.round(predictedTimeLeft * 60);
      let finishTime = new Date();
      let finishHours = (predictedTimeLeft / 60).toString().split(".")[0] - 0;
      let finishMinutes = predictedTimeLeft.toString().split(".")[0] - 0;

      finishTime.setHours(finishTime.getHours() + finishHours);
      finishTime.setMinutes(finishTime.getMinutes() + finishMinutes);
      const text = `${predictedTimeLeft.toString().split(".")[0]} ${predictedTimeLeft.toString().split(".")[0] == 1 ? "minute" : "minutes"} ${Math.round(("." + predictedTimeLeft.toString().split(".")[1] - 0) * 60)} seconds remaining. Finishes at ${finishTime.toLocaleTimeString()}.`;
      const terminalWidth = process.stdout.columns;
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
        onEpochEnd: function(epoch, logs) {
          let sub_endTime = Date.now();
          let epochTime = (sub_endTime - sub_startTime) / 1000;
          epochAverageTimes.push(epochTime);
          let epochAverageTime = epochAverageTimes.reduce((a, b) => a + b) / epochAverageTimes.length;
          predictedTimeLeft = ((epochAverageTime * (epochs - epoch))) / 60;
          currentEpoch = epoch;
        }
      }
    });

    const reshapedPredictionInput = tf.tensor3d([X], [1, 732, 15]);

    let prediction = model.predict(reshapedPredictionInput).dataSync();
    prediction = Object.values(prediction);
    prediction[0] = denormalize(prediction[0], normParams.max_temp.min, normParams.max_temp.max);
    prediction[1] = denormalize(prediction[1], normParams.min_temp.min, normParams.min_temp.max);
    prediction[2] = denormalize(prediction[2], normParams.max_humidity.min, normParams.max_humidity.max);
    prediction[3] = denormalize(prediction[3], normParams.min_humidity.min, normParams.min_humidity.max);
    prediction[4] = denormalize(prediction[4], normParams.max_pressure.min, normParams.max_pressure.max);
    prediction[5] = denormalize(prediction[5], normParams.min_pressure.min, normParams.min_pressure.max);
    prediction[6] = denormalize(prediction[6], normParams.max_wspd.min, normParams.max_wspd.max);
    prediction[7] = denormalize(prediction[7], normParams.min_wspd.min, normParams.min_wspd.max);
    prediction[8] = denormalize(prediction[8], normParams.max_dew_point.min, normParams.max_dew_point.max);
    prediction[9] = denormalize(prediction[9], normParams.min_dew_point.min, normParams.min_dew_point.max);
    prediction[10] = denormalize(prediction[10], normParams.precipitation.min, normParams.precipitation.max);
    prediction[11] = denormalize(prediction[11], normParams.cloud_cover.min, normParams.cloud_cover.max);

    let tomorrowDate = new Date(weatherData[weatherData.length - 1].date).setDate(new Date(weatherData[weatherData.length - 1].date).getDate() + 1);
    let tomorrowFormattedDate = new Date(tomorrowDate).toISOString().split("T")[0];
    let dummyPrediction = {
      date: tomorrowFormattedDate,
      max_temp: Math.round(prediction[0]),
      min_temp: Math.round(prediction[1]),
      max_humidity: Math.round(prediction[2]),
      min_humidity: Math.round(prediction[3]),
      max_pressure: prediction[4].toFixed(2) - 0,
      min_pressure: prediction[5].toFixed(2) - 0,
      max_wspd: prediction[6].toFixed(1) - 0,
      min_wspd: prediction[7].toFixed(1) - 0,
      max_dew_point: Math.round(prediction[8]),
      min_dew_point: Math.round(prediction[9]),
      precipitation: Math.abs(prediction[10].toFixed(2) - 0),
      cloud_cover: Math.min(Math.max(Math.round(prediction[11]), 0), 8),
      day_of_year: daysIntoYear(new Date(tomorrowFormattedDate)),
      month_of_year: new Date(tomorrowFormattedDate + "T00:00").getMonth() + 1,
      season: getSeasonFromDate(tomorrowFormattedDate),
      rain_chance: 0
    };

    // Rain prediction model
    const rainPredictor = require("./rain/index1");
    let chanceOfRain = await rainPredictor.predict(dummyPrediction.precipitation);
    dummyPrediction.rain_chance = chanceOfRain;

    dummyData.shift();
    dummyData.push(dummyPrediction);
    console.log(`Predicted day ${i + 1}:`, dummyPrediction);
  }
  let prediction = dummyData.slice(-7);

  return prediction;
}

module.exports = { predict11 };
