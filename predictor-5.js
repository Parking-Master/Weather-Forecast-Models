// Require modules here
const tf = require("@tensorflow/tfjs");
const keras = require("@tensorflow/tfjs-layers");

async function predict5(weatherData) {
  // This prediction model version (5.0) uses up to a week of
  // previous weather data to produce tomorrow's weather data.
  // Pass an array of 7 objects, which all include the following:
  // date (mm-dd-yyyy), high temperature (F), low temperature (F), humidity (%), pressure (inHg), wind speed (mph), and season (0-3).

  let weatherDataAlt = weatherData.map(x => [x.max_temp, x.min_temp, x.humidity, x.pressure, x.wspd]);
  let additionalWeather = await predict3(weatherDataAlt);

  // Data quality-control goes here
  additionalWeather[3] = (30 + 30 + 30 + 30 + additionalWeather[3]) / 5;

  function dy(date) {
    return (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 24 / 60 / 60 / 1000;
  }

  const X = weatherData.map(({ date, max_temp, min_temp, humidity, pressure, wspd, season }) => {
    const dateObj = new Date(parse(date, "yyyy-MM-dd", new Date()));
    return [
      max_temp,
      min_temp,
      humidity,
      pressure,
      wspd,
      dateObj.getMonth() + 1,
      dy(dateObj),
      dateObj.getHours(),
      season
    ];
  });
  const y = weatherData.map(({ max_temp, min_temp }) => [max_temp, min_temp]);

  const [trainX, testX] = tf.split(tf.tensor2d(X), [5, 2]);
  const [trainY, testY] = tf.split(tf.tensor2d(y), [5, 2]);

  const model = keras.sequential();
  model.add(keras.layers.dense({ units: 16, inputShape: [9], activation: "relu" }));
  model.add(keras.layers.dense({ units: 8, activation: "relu" }));
  model.add(keras.layers.dense({ units: 4, activation: "relu" }));
  model.add(keras.layers.dense({ units: 2, activation: "linear" }));
  model.compile({ optimizer: "adam", loss: "meanSquaredError" });

  await model.fit(trainX, trainY, { epochs: 1000, verbose: 0 });
  const tomorrowWeather = testX.slice(1, 1).dataSync();
  let prediction = model.predict(tf.tensor2d([tomorrowWeather])).dataSync();
  prediction = Object.values(prediction);
  prediction.push(additionalWeather[2]);
  prediction.push(additionalWeather[3]);
  prediction.push(additionalWeather[4]);

  return prediction;
}

module.exports = { predict5 };
