// Require modules here
const tf = require("@tensorflow/tfjs");

async function predict11_24(weekData) {
  // This 24-hour prediction model version (11.0) uses a past
  // week of 24-hour weather data, up until the point
  // of the current hour and date. It will produce the
  // next 24 hours of weather data.
  // Pass an array of 7 arrays, each containing
  // 24 objects (representing hours), which all include
  // the following parameters:
  // date (mm-dd-yyyy), time (hour 0-23), temperature (F), humidity (%), pressure (inHg), wind speed (mph), precipitation (inches), cloud cover (oktas), dew point (F), and season (0-3).

  const epochs = 500;

  async function run(iteration) {
  let epochAverageTimes = [];

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
    temp: { min: 40, max: 100 },
    humidity: { min: 0, max: 100 },
    pressure: { min: 29.1, max: 30.5 },
    wspd: { min: 0, max: 50 },
    precipitation: { min: 0, max: 4 },
    cloud_cover: { min: 0, max: 8 },
    dew_point: { min: 40, max: 100 }
  };

  let targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + iteration);
  for (let y = 0; y < 5; y++) {
    const API_KEY = "e1f10a1e78da46f5b10a1e78da96f525";
    const AIRPORT_CODE = "KGSP";

    let currentYear = targetDate.getFullYear();
    let historicYear = currentYear - y - 1;
    let historicDate = new Date(targetDate.toISOString().slice(0, 10) + "T00:00");
    historicDate.setFullYear(historicYear);
    let date = historicDate.toISOString().slice(0, 10).replace(/-/g, "");

    let urlDate = date.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");;
    const historicWeatherData = await (await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=34.80311046391122&longitude=-82.14825272644435&start_date=${urlDate}&end_date=${urlDate}&hourly=temperature_2m,relative_humidity_2m,dewpoint_2m,wind_speed_10m,precipitation,pressure_msl,cloudcover&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timeformat=unixtime&timezone=America%2FNew_York`)).json();
    const dayData = {
      max_temp: Math.round(Math.max(...historicWeatherData.hourly.temperature_2m)),
      min_temp: Math.round(Math.min(...historicWeatherData.hourly.temperature_2m)),
      max_humidity: Math.max(...historicWeatherData.hourly.relative_humidity_2m),
      min_humidity: Math.min(...historicWeatherData.hourly.relative_humidity_2m),
      max_pressure: Math.max(...historicWeatherData.hourly.pressure_msl) * 0.0295,
      min_pressure: Math.min(...historicWeatherData.hourly.pressure_msl) * 0.0295,
      max_wspd: Math.max(...historicWeatherData.hourly.wind_speed_10m),
      min_wspd: Math.min(...historicWeatherData.hourly.wind_speed_10m),
      max_dew_point: Math.max(...historicWeatherData.hourly.dewpoint_2m),
      min_dew_point: Math.min(...historicWeatherData.hourly.dewpoint_2m),
      precipitation: historicWeatherData.hourly.precipitation.reduce((a, b) => a + b)
    };
    if (dayData.precipitation > 5) dayData.precipitation = 0.15;

    for (let n in dayData) {
      if (n === "max_temp") {
        if (y == 0 ? true : (dayData.max_temp > normParams["temp"].max)) normParams["temp"].max = dayData.max_temp + 2;
      }
      if (n === "min_temp") {
        if (y == 0 ? true : (dayData.min_temp > normParams["temp"].min)) normParams["temp"].min = dayData.min_temp - 2;
      }
      if (n === "max_humidity") {
        if (y == 0 ? true : (dayData.max_humidity > normParams["humidity"].max)) normParams["humidity"].max = Math.min(dayData.max_humidity + 3, 100);
      }
      if (n === "min_humidity") {
        if (y == 0 ? true : (dayData.min_humidity < normParams["humidity"].min)) normParams["humidity"].min = Math.max(dayData.min_humidity - 3, 0);
      }
      if (n === "max_pressure") {
        if (y == 0 ? true : (dayData.max_pressure > normParams["pressure"].max)) normParams["pressure"].max = dayData.max_pressure + .05;
      }
      if (n === "min_pressure") {
        if (y == 0 ? true : (dayData.min_pressure > normParams["pressure"].min)) normParams["pressure"].min = dayData.min_pressure - .05;
      }
      if (n === "max_wspd") {
        if (y == 0 ? true : (dayData.max_wspd > normParams["wspd"].max)) normParams["wspd"].max = Math.max(dayData.max_wspd + 2, 0);
      }
      if (n === "min_wspd") {
        if (y == 0 ? true : (dayData.min_wspd > normParams["wspd"].min)) normParams["wspd"].min = Math.max(dayData.min_wspd - 2, 0);
      }
      if (n === "max_dew_point") {
        if (y == 0 ? true : (dayData.max_dew_point > normParams["dew_point"].max)) normParams["dew_point"].max = Math.max(dayData.max_dew_point + 2, 0);
      }
      if (n === "min_dew_point") {
        if (y == 0 ? true : (dayData.min_dew_point > normParams["dew_point"].min)) normParams["dew_point"].min = Math.max(dayData.min_dew_point - 2, 0);
      }
      if (n === "precipitation") {
        if (y == 0 ? true : (dayData.precipitation > normParams[n].max)) normParams[n].max = dayData.precipitation + .1;
        if (y == 0 ? true : (dayData.precipitation < normParams[n].min)) normParams[n].min = Math.max(dayData.precipitation - .1, 0);
      }
    }
  }
  console.log(normParams)
  
  function normalize(value, min, max) {
    return (value - min) / (max - min);
  }
  
  function denormalize(value, min, max) {
    return value * (max - min) + min;
  }

  for (let y = 0; y < weekData.length; y++) {
    let dayData = weekData[y];
    let max_temperature = Math.max(...dayData.map(x => x.temp));
    let min_temperature = Math.min(...dayData.map(x => x.temp));
    let max_wspd = Math.max(...dayData.map(x => x.wspd));
    let max_pressure = Math.max(...dayData.map(x => x.pressure));
    let min_pressure = Math.min(...dayData.map(x => x.pressure));
    let max_cloud_cover = Math.max(...dayData.map(x => x.cloud_cover));
    let min_cloud_cover = Math.min(...dayData.map(x => x.cloud_cover));
    let max_dew_point = Math.max(...dayData.map(x => x.dew_point));
    let min_dew_point = Math.min(...dayData.map(x => x.dew_point));

    for (let n in normParams) {
      if (n === "temp") {
        if (y == 0 ? true : (max_temperature > normParams[n].max)) normParams[n].max = max_temperature + 3;
        if (y == 0 ? true : (min_temperature < normParams[n].min)) normParams[n].min = min_temperature - 3;
      }
      if (n === "wspd") {
        if (y == 0 ? true : (max_wspd > normParams[n].max)) normParams[n].max = max_wspd + 2;
      }
      if (n === "pressure") {
        if (y == 0 ? true : (max_pressure > normParams[n].max)) normParams[n].max = max_pressure + 0.1;
        if (y == 0 ? true : (min_pressure < normParams[n].min)) normParams[n].min = min_pressure - 0.1;
      }
      if (n === "cloud_cover") {
        if (y == 0 ? true : (max_cloud_cover > normParams[n].max)) normParams[n].max = max_cloud_cover + 1;
        if (y == 0 ? true : (min_cloud_cover < normParams[n].min)) normParams[n].min = min_cloud_cover - 1;
      }
      if (n === "dew_point") {
        if (y == 0 ? true : (max_dew_point > normParams[n].max)) normParams[n].max = max_dew_point + 3;
        if (y == 0 ? true : (min_dew_point < normParams[n].min)) normParams[n].min = min_dew_point - 3;
      }
    }
  }

  const flattenedData = weekData.flat();
  const features = ["temp", "humidity", "pressure", "wspd", "precipitation", "cloud_cover", "dew_point", "hourSin", "hourCos"];
  const normalizedData = {};

  features.forEach(feature => {
    if (feature === "hourSin" || feature === "hourCos") return;
    const values = flattenedData.map(hour => hour[feature]);
    const { min, max } = normParams[feature];
    normalizedData[feature] = values.map(v => normalize(v, min, max));
  });

  for (let i = 0; i < flattenedData.length; i++) {
    const hour = i % 24;
    normalizedData.hourSin = normalizedData.hourSin || [];
    normalizedData.hourCos = normalizedData.hourCos || [];
    normalizedData.hourSin.push(Math.sin(2 * Math.PI * hour / 24));
    normalizedData.hourCos.push(Math.cos(2 * Math.PI * hour / 24));
  }

  const inputData = [];
  const outputData = [];
  for (let i = 0; i < 7 - 1; i++) {
    const input = [];
    for (let j = 0; j < 24; j++) {
      const dataPoint = features.map(feature => normalizedData[feature][i * 24 + j]);
      input.push(dataPoint);
    }
    inputData.push(input);

    const output = [];
    for (let j = 0; j < 24; j++) {
      const dataPoint = features.slice(0, 7).map(feature => normalizedData[feature][(i + 1) * 24 + j]);
      output.push(dataPoint);
    }
    outputData.push(output);
  }

  const reshapedInput = tf.tensor3d(inputData);
  const reshapedOutput = tf.tensor3d(outputData);

  const model = tf.sequential();
  model.add(tf.layers.bidirectional({
    layer: tf.layers.lstm({ units: 64, returnSequences: true }),
    inputShape: [24, features.length]
  }));
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 7, activation: 'linear' }));
  
  model.compile({
    optimizer: tf.train.adam(0.001), // Adjust the learning rate
    loss: 'meanSquaredError'
  });

  let sub_startTime = null;
  await model.fit(reshapedInput, reshapedOutput, { epochs: epochs, verbose: 1, callbacks: {
    onEpochBegin: function(epoch) {
      sub_startTime = Date.now();
    },
    onEpochEnd: function(epoch) {
      let sub_endTime = Date.now();
      let epochTime = sub_endTime - sub_startTime;
      epochAverageTimes.push(epochTime);
      let epochAverageTime = epochAverageTimes.reduce((a, b) => a + b) / epochAverageTimes.length;
      let predictedTimeLeft = ((epochAverageTime / 1000) * (epochs - epoch)) / 60;

      console.log(`Epoch ${epoch} finished in ${epochTime}ms. About ${predictedTimeLeft} minutes left.`)
    }
  } });

  const lastWeekData = inputData[inputData.length - 1];
  const prediction = model.predict(tf.tensor3d([lastWeekData]));
  const predictionData = await prediction.array();

  const outputPrediction = [];
  for (let i = 0; i < 24; i++) {
    const hourData = {};

    // Add additional paremeters here
    let date = new Date();
    date.setHours(i/* + startHour*/, 0, 0);
    hourData.time = date.toLocaleTimeString("en-US", { hour: "numeric", hour12: true }).replace(" ", "");

    features.slice(0, 7).forEach((feature, index) => {
      const normalizedValue = predictionData[0][i][index];
      const { min, max } = normParams[feature];
      hourData[feature] = denormalize(normalizedValue, min, max);
    });
    outputPrediction.push(hourData);
  }

  return outputPrediction;
  }

  // Clean up data here
  let predictions = [];
  for (let i = 0; i < 2; i++) {
    let outputPrediction = await run(i);
    for (let index = 0; index < outputPrediction.length; index++) {
      let prediction = outputPrediction[index];
      outputPrediction[index].temp = Math.round(prediction.temp);
      outputPrediction[index].humidity = Math.min(prediction.humidity.toFixed(2) - 0, 100);
      outputPrediction[index].pressure = prediction.pressure.toFixed(2) - 0;
      outputPrediction[index].wspd = Math.max(prediction.wspd.toFixed(3) - 0, 0);
      outputPrediction[index].precipitation = Math.max(prediction.precipitation.toFixed(2) - 0, 0);
      outputPrediction[index].cloud_cover = Math.min(Math.max(Math.round(prediction.cloud_cover), 0), 8);
      outputPrediction[index].dew_point = prediction.dew_point.toFixed(2) - 0;

      // Rain prediction model
      const rainPredictor = require("./rain/index1");
      let chanceOfRain = await rainPredictor.predict(prediction.precipitation);
      outputPrediction[index].rain_chance = chanceOfRain;
    }
    predictions.push(outputPrediction);

    weekData.shift();
    weekData.push(outputPrediction);
  }
  predictions = predictions.flat();

  return predictions;
}

module.exports = { predict11_24 };
