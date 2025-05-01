// Require modules here
const tf = require("@tensorflow/tfjs");

async function predict4(weatherData) {
  return new Promise(function(resolve) {
    // This prediction model version (4.0) uses up to a past week
    // of hourly weather data to produce tomorrow's hourly weather data.
    // Pass an array (week) of 5 arrays (days), of 24 arrays (hours), which all
    // include the following for each hour:
    // high temperature (F), low temperature (F), humidity (%), pressure (inHg), and wind speed (m/s).

    let dataList = [];
    weatherData.forEach(async dailyWeather => {
      async function learn() {
        const model = tf.sequential();
        model.add(tf.layers.dense({ units: 64, activation: "relu", inputShape: [5] }));
        model.add(tf.layers.dense({ units: 32, activation: "relu" }));
        model.add(tf.layers.dense({ units: 5, activation: "linear" }));
        
        model.compile({ optimizer: "adam", loss: "meanSquaredError" });
        
        const xTrain = tf.tensor2d(dailyWeather.slice(0, -1), [23, 5]);
        const yTrain = tf.tensor2d(dailyWeather.slice(1), [23, 5]);
        
        await model.fit(xTrain, yTrain, { epochs: 50, batchSize: 1, verbose: 1 });
        
        const tomorrowWeather = await model.predict(tf.tensor2d(dailyWeather, [24, 5]));
        return tomorrowWeather;
      }
      let tomorrowWeather = (await learn()).dataSync();
      let length = dataList.push(tomorrowWeather);
      if (length === 7) {
        let data = dataList[0].reduce((acc, curr, index) => {
          if (index % 5 === 0) {
            acc.push([]);
          }
          acc[acc.length - 1].push(curr);
          return acc;
        }, []);
        resolve(data);
      }
    });
  });
}

module.exports = { predict4 };
