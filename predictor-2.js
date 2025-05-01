// Require modules here
const tf = require("@tensorflow/tfjs");

async function predict2(weatherData) {
  // This prediction model version (2.0) uses up to a week of
  // previous weather data to produce tomorrow's weather data.
  // Pass an array of 5 arrays, which all include the following:
  // temperature (F), humidity (%), pressure (inHg), and wind speed (m/s).

  async function learn() {
    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 64, activation: "relu", inputShape: [4] }));
    model.add(tf.layers.dense({ units: 32, activation: "relu" }));
    model.add(tf.layers.dense({ units: 4, activation: "linear" }));
    
    model.compile({ optimizer: "adam", loss: "meanSquaredError" });
    
    const xTrain = tf.tensor2d(weatherData.slice(0, -1));
    const yTrain = tf.tensor2d(weatherData.slice(1));
    
    await model.fit(xTrain, yTrain, { epochs: 50, batchSize: 1, verbose: 1 });
    
    const tomorrowWeather = await model.predict(tf.tensor2d([weatherData[weatherData.length - 1]]));
    return tomorrowWeather;
  }

  for (let i = 0; i < 3; i++) {
    await learn();
    if (i + 1 >= 3) {
      let tomorrowWeather = (await learn()).dataSync();
      return tomorrowWeather;
    }
  }
}

module.exports = { predict2 };
