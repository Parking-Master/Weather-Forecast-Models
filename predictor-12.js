// Require modules here
const tf = require("@tensorflow/tfjs");
const cliColor = require("cli-color");

async function predict12(weatherData) {
  const outputDays = 10;
  const epochs = 20;

  let dummyData = weatherData;
  let epochAverageTimes = [];
  let sub_startTime = Date.now();

  // Additional global methods go here
  function formatPrediction(prediction, weatherData) {
    let tomorrowFormattedDate = methods.getTargetDate(weatherData);
    let calibration = {
      max_temp: +2.5,
      min_temp: -3,
      humidity: +7,
      pressure: +0.28,
      dew_point: -5
    };
    let dummyPrediction = {
      date: tomorrowFormattedDate,
      max_temp: Math.round(prediction[0] + calibration.max_temp),
      min_temp: Math.round(prediction[1] + calibration.min_temp),
      max_humidity: Math.min(Math.round(prediction[2]) + calibration.humidity, 100),
      min_humidity: Math.min(Math.round(prediction[3]) + calibration.humidity, 100),
      max_pressure: prediction[4].toFixed(2) - 0 + calibration.pressure,
      min_pressure: prediction[5].toFixed(2) - 0 + calibration.pressure,
      max_wspd: Math.max(prediction[6].toFixed(1) - 0, 0),
      min_wspd: Math.max(prediction[7].toFixed(1) - 0, 0),
      max_dew_point: Math.round(prediction[8]) + calibration.dew_point,
      min_dew_point: Math.round(prediction[9]) + calibration.dew_point,
      precipitation: Math.max(Math.abs(prediction[10].toFixed(2) - 0), 0),
      cloud_cover: Math.min(Math.max(Math.round(prediction[11]), 0), 8),
      day_of_year: methods.daysIntoYear(new Date(tomorrowFormattedDate)) + 1,
      month_of_year: new Date(tomorrowFormattedDate + "T00:00").getMonth() + 1,
      season: methods.getSeasonFromDate(tomorrowFormattedDate),
      rain_chance: 0
    }
    return dummyPrediction;
  }

  for (let predictionIndex = 0; predictionIndex < outputDays; predictionIndex++) {
    async function run() {
      // Step 1: Create the model and add the layers
      let model = tf.sequential();
    
      model.add(tf.layers.bidirectional({
        layer: tf.layers.lstm({
          units: 64,
          returnSequences: true
        }),
        inputShape: [732, 15],
        mergeMode: 'concat'
      }));
      // model.add(tf.layers.lstm({ units: 32, returnSequences: true }));
      model.add(tf.layers.dense({ units: 32, activation: "relu", kernelRegularizer: tf.regularizers.l2({ l2: 0.02 }) }));
      model.add(tf.layers.dense({ units: 16, activation: "relu", kernelRegularizer: tf.regularizers.l2({ l2: 0.02 }) }));
      model.add(tf.layers.dense({ units: 8, activation: "relu", kernelRegularizer: tf.regularizers.l2({ l2: 0.02 }) }));
      model.add(tf.layers.dense({ units: 15, activation: "linear" }));
      model.add(tf.layers.dropout({ rate: 0.35 }));
      model.compile({
        optimizer: "adam",
        loss: "meanSquaredError"
      });
    
      // Step 2: Reshape the input data and normalize it
      const targetDate = methods.getTargetDate(dummyData);
      let normParams = await normalizer.params(targetDate, 3, predictionIndex);
    
      const X = dummyData.map(({ max_temp, min_temp, max_humidity, min_humidity, max_pressure, min_pressure, max_wspd, min_wspd, max_dew_point, min_dew_point, precipitation, cloud_cover, day_of_year, month_of_year, season }) => {
        return [
          normalizer.normalize(max_temp),
          normalizer.normalize(min_temp),
          normalizer.normalize(max_humidity),
          normalizer.normalize(min_humidity),
          normalizer.normalize(max_pressure),
          normalizer.normalize(min_pressure),
          normalizer.normalize(max_wspd),
          normalizer.normalize(min_wspd),
          normalizer.normalize(max_dew_point),
          normalizer.normalize(min_dew_point),
          normalizer.normalize(precipitation),
          normalizer.normalize(cloud_cover),
          normalizer.normalize(day_of_year),
          normalizer.normalize(month_of_year),
          normalizer.normalize(season)
        ];
      }).slice(0, -1);
    
      // Step 3: Train the model with the new input data
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
  
        finishTime.setMinutes(finishTime.getMinutes() + finishMinutes);
        const text = `${cliColor.greenBright(predictedTimeLeft.toString().split(".")[0])} ${predictedTimeLeft.toString().split(".")[0] == 1 ? "minute" : "minutes"} ${cliColor.greenBright(Math.round(("." + predictedTimeLeft.toString().split(".")[1] - 0) * 60).toString())} seconds remaining. Finishes at ${finishTime.toLocaleTimeString()}.`;
        const terminalWidth = process.stdout.columns;
        const clearLine = " ".repeat(terminalWidth - text.length);
  
        process.stdout.write(`${firstMessage ? "\n" : "\r"}${text}${clearLine}${currentEpoch + 2 >= epochs ? "\n\n" : ""}`);
  
        firstMessage = false;
      }, 50);
  
      const reshapedX = tf.tensor3d([X], [1, X.length, 15]);
  
      const trainY = [dummyData[dummyData.length - 1]];
      let Y = trainY.map(({ max_temp, min_temp, max_humidity, min_humidity, max_pressure, min_pressure, max_wspd, min_wspd, max_dew_point, min_dew_point, precipitation, cloud_cover, day_of_year, month_of_year, season }) => {
        return [
          normalizer.normalize(max_temp),
          normalizer.normalize(min_temp),
          normalizer.normalize(max_humidity),
          normalizer.normalize(min_humidity),
          normalizer.normalize(max_pressure),
          normalizer.normalize(min_pressure),
          normalizer.normalize(max_wspd),
          normalizer.normalize(min_wspd),
          normalizer.normalize(max_dew_point),
          normalizer.normalize(min_dew_point),
          normalizer.normalize(precipitation),
          normalizer.normalize(cloud_cover),
          normalizer.normalize(day_of_year),
          normalizer.normalize(month_of_year),
          normalizer.normalize(season)
        ];
      });
      Y = Y[0];
      const reshapedY = tf.tensor3d([X.slice(1).concat([Y])], [1, X.length, 15]);
      await model.fit(reshapedX, reshapedY, {
        batchSize: 1,
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
    
      // Step 4: Make the prediction
      const reshapedPredictionInput = tf.tensor3d([X], [1, 732, 15]);
    
      let finalPrediction = model.predict(reshapedPredictionInput).dataSync();
      let denormalizedPrediction = [];
      for (let i = 0; i < finalPrediction.length; i++) {
        denormalizedPrediction.push(normalizer.denormalize(finalPrediction[i]));
      }
    
      // Step 5: Format the data and return the result
      let result = formatPrediction(denormalizedPrediction, dummyData);
      let vote = debate.vote(result, {
        max_temp: { min: Math.min(...dummyData.slice(-7).map(x => x.max_temp)), max: Math.max(...dummyData.slice(-7).map(x => x.max_temp)) },
        min_temp: { min: Math.min(...dummyData.slice(-7).map(x => x.min_temp)), max: Math.max(...dummyData.slice(-7).map(x => x.min_temp)) },
        max_pressure: { min: Math.min(...dummyData.slice(-7).map(x => x.max_pressure)), max: Math.max(...dummyData.slice(-7).map(x => x.max_pressure)) },
        min_pressure: { min: Math.min(...dummyData.slice(-7).map(x => x.min_pressure)), max: Math.max(...dummyData.slice(-7).map(x => x.min_pressure)) }
      });
      if (!vote) {
        console.log(cliColor.red("Model was overfitted."));
        console.log(cliColor.red(`${vote.length} reason${vote.length == 1 ? "" : "s"} caused the model to overfit:`));
        for (let k = 0; k < vote.length; k++) {
          console.log(cliColor.white(`> ${vote[k]}`));
        }
        console.log(cliColor.red("Retrying prediction."));
        return await run();
      }
      return result;
    }
    let result = await run();

    // Rain prediction model
    const rainPredictor = require("./rain/index1");
    let chanceOfRain = await rainPredictor.predict(result.precipitation);
    result.rain_chance = chanceOfRain;

    console.log(`Predicted day ${predictionIndex + 1}:`, result);
    
    dummyData.shift();
    dummyData.push(result);
  }
  let prediction = dummyData.slice(-outputDays);

  return prediction;
}

module.exports = { predict12 };
