// Require modules here
const tf = require("@tensorflow/tfjs");

async function predict9_24(weekData) {
  // This 24-hour prediction model version (9.0) uses a past
  // week of 24-hour weather data, up until the point
  // of the current hour and date. It will produce the
  // next 24 hours of weather data.
  // Pass an array of 7 arrays, each containing
  // 24 objects (representing hours), which all include
  // the following parameters:
  // date (mm-dd-yyyy), time (hour 0-23), temperature (F), humidity (%), pressure (inHg), wind speed (mph), precipitation (inches), cloud cover (oktas), dew point (F), and season (0-3).

  async function run() {
  let epochAverageTimes = [];
  const normParams = {
    temp: { min: 40, max: 100 },
    humidity: { min: 0, max: 100 },
    pressure: { min: 29.1, max: 30.5 },
    wspd: { min: 0, max: 50 },
    precipitation: { min: 0, max: 4 },
    cloud_cover: { min: 0, max: 8 },
    dew_point: { min: 40, max: 100 }
  };
  
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
  model.add(tf.layers.lstm({
    units: 50,
    returnSequences: true,
    inputShape: [24, features.length]
  }));
  model.add(tf.layers.timeDistributed({ 
    layer: tf.layers.dense({ units: 7 })
  }));

  model.compile({ optimizer: "adam", loss: "meanSquaredError" });

  let sub_startTime = null;
  await model.fit(reshapedInput, reshapedOutput, { epochs: 500, verbose: 1, callbacks: {
    onEpochBegin: function(epoch) {
      sub_startTime = Date.now();
    },
    onEpochEnd: function(epoch) {
      let sub_endTime = Date.now();
      let epochTime = sub_endTime - sub_startTime;
      epochAverageTimes.push(epochTime);
      let epochAverageTime = epochAverageTimes.reduce((a, b) => a + b) / epochAverageTimes.length;
      let predictedTimeLeft = ((epochAverageTime / 1000) * (500 - epoch)) / 60;

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
    date.setHours(i, 0, 0);
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
    let outputPrediction = await run();
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

module.exports = { predict9_24 };
