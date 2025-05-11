// Require modules here
const tf = require("@tensorflow/tfjs");
const fs = require("fs");

async function predict9(passedWeatherData) {
  // This prediction model version (9.0) uses a week of
  // previous weather data, combined with a past year of weather data
  // to recognize yearly and seasonal patterns, to produce next week's
  // weather data, along with the chance of rain for each day.
  // Pass an array of 7 objects, which all include the following:
  // date (mm-dd-yyyy), high temperature (F), low temperature (F), humidity (%), pressure (inHg), wind speed (mph), dew point (F), precipitation (inches), cloud cover (oktas), and season (0-3).

  async function predict3(weatherData) {
    async function learn() {
      const model = tf.sequential();
      model.add(tf.layers.dense({ units: 64, activation: "relu", inputShape: [7] }));
      model.add(tf.layers.dense({ units: 32, activation: "relu" }));
      model.add(tf.layers.dense({ units: 7, activation: "linear" }));
      
      model.compile({ optimizer: "adam", loss: "meanSquaredError" });
      
      const xTrain = tf.tensor2d(weatherData.slice(0, -1), [6, 7]);
      const yTrain = tf.tensor2d(weatherData.slice(1), [6, 7]);
      
      await model.fit(xTrain, yTrain, { epochs: 50, batchSize: 1, verbose: 0 });
      
      const tomorrowWeather = model.predict(tf.tensor2d([weatherData[weatherData.length - 1]], [1, 7]));
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
  
  let dummyData = passedWeatherData;
  
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

  const normParams = {
    max_temp: { min: 50, max: 110 },
    min_temp: { min: 40, max: 90 },
    humidity: { min: 0, max: 100 },
    pressure: { min: 28, max: 32 },
    wspd: { min: 0, max: 50 },
    season: { min: 0, max: 3 },
    dew_point: { min: 30, max: 80 },
    precipitation: { min: 0, max: 4 },
    cloud_cover: { min: 0, max: 8 }
  };

  function normalize(value, min, max) {
    return (value - min) / (max - min);
  }

  function denormalize(value, min, max) {
    return value * (max - min) + min;
  }

  for (let i = 0; i < 7; i++) {
    console.log(`Predicting day ${i + 1}...`);
    let weatherData = dummyData;
    let weatherDataAlt = weatherData.map(x => [x.max_temp, x.min_temp, x.humidity, x.pressure, x.wspd, x.dew_point, x.precipitation]);
    let additionalWeather = await predict3(weatherDataAlt);
  
    // Data quality-control goes here
    additionalWeather[3] = (30 + 30 + 30 + 30 + additionalWeather[3]) / 5;
  
    const X = weatherData.map(({ date, max_temp, min_temp, humidity, pressure, wspd, season, dew_point, precipitation, cloud_cover }) => {
      return [
        normalize(max_temp, normParams.max_temp.min, normParams.max_temp.max),
        normalize(min_temp, normParams.min_temp.min, normParams.min_temp.max),
        normalize(humidity, normParams.humidity.min, normParams.humidity.max),
        normalize(pressure, normParams.pressure.min, normParams.pressure.max),
        normalize(wspd, normParams.wspd.min, normParams.wspd.max),
        normalize(season, normParams.season.min, normParams.season.max),
        normalize(dew_point, normParams.dew_point.min, normParams.dew_point.max),
        normalize(precipitation, normParams.precipitation.min, normParams.precipitation.max),
        normalize(cloud_cover, normParams.cloud_cover.min, normParams.cloud_cover.max)
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

    const reshapedY = tf.tensor2d([y[y.length - 1]], [1, 5]);

    const model = tf.sequential();
    model.add(tf.layers.lstm({ units: 32, inputShape: [7, 9], returnSequences: false }));
    model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 5, activation: 'linear' }));
    model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });

    await model.fit(reshapedX, reshapedY, { epochs: 1000, verbose: 1 });

    const reshapedPredictionInput = tf.tensor3d([X], [1, 7, 9]);
    
    let prediction = model.predict(reshapedPredictionInput).dataSync();
    prediction = Object.values(prediction);

    prediction[0] = denormalize(prediction[0], normParams.max_temp.min, normParams.max_temp.max);
    prediction[1] = denormalize(prediction[1], normParams.min_temp.min, normParams.min_temp.max);
    prediction[2] = denormalize(prediction[2], normParams.dew_point.min, normParams.dew_point.max);
    prediction[3] = denormalize(prediction[3], normParams.precipitation.min, normParams.precipitation.max);
    prediction[4] = denormalize(prediction[4], normParams.cloud_cover.min, normParams.cloud_cover.max);
    prediction.push(additionalWeather[2]);
    prediction.push(additionalWeather[3]);
    prediction.push(additionalWeather[4]);
  
    let tomorrowDate = new Date(weatherData[0].date).setDate(new Date(weatherData[0].date).getDate() + 1);
    let tomorrowFormattedDate = new Date(tomorrowDate).toISOString().split("T")[0];
    let dummyPrediction = {
      date: tomorrowFormattedDate,
      max_temp: Math.round(prediction[0]),
      min_temp: Math.round(prediction[1]),
      dew_point: Math.round(prediction[2]),
      precipitation: Math.max(prediction[3].toFixed(2) - 0, 0),
      cloud_cover: Math.max(Math.min(Math.round(prediction[4]), 8), 0),
      humidity: Math.min(prediction[5].toFixed(2) - 0, 100),
      pressure: prediction[6].toFixed(2) - 0,
      wspd: Math.max(prediction[7].toFixed(3) - 0, 0),
      season: getSeasonFromDate(tomorrowFormattedDate)
    };

    let dummyRainData = i == 0 ? JSON.parse(atob(fs.readFileSync(`/home/pi/Weather Station/db/rain`).toString())) : JSON.parse(atob(fs.readFileSync(`/home/pi/Weather Station/db/predicted_rain`).toString()));
    dummyRainData.pop();
    dummyRainData.unshift({
      date: new Date(dummyPrediction.date).toISOString().slice(0, 10) + " 00:00:00",
      daily_rain: dummyPrediction.precipitation
    });
    fs.writeFileSync(`/home/pi/Weather Station/db/predicted_rain`, btoa(JSON.stringify(dummyRainData)));

    const rainPredictor = require("./rain/index");
    let chanceOfRain = await rainPredictor.predict(dummyPrediction);
    dummyPrediction.rain_chance = chanceOfRain;

    dummyData.pop();
    dummyData.unshift(dummyPrediction);
    console.log(`Predicted day ${i + 1}:`, dummyPrediction);
  }
  let prediction = dummyData;

  return prediction;
}

module.exports = { predict9 };
