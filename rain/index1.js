const tf = require("@tensorflow/tfjs");
const weekAccuracy = require("./accuracy");

const confidencePredictor = {
  compute: async function(accuracyLevels) {
    const normalizedData = accuracyLevels.map(value => value / 100);

    // Define the model
    const model = tf.sequential();

    // Add layers to the model
    model.add(tf.layers.dense({units: 10, activation: 'relu', inputShape: [7]}));
    model.add(tf.layers.dense({units: 5, activation: 'relu'}));
    model.add(tf.layers.dense({units: 1, activation: 'sigmoid'}));

    // Compile the model
    model.compile({optimizer: 'adam', loss: 'meanSquaredError'});

    // Example training data (replace with your own data)
    const xs = tf.tensor2d([
      [1.0, 2.0, 0.0, 2.3876, 1.0, 3.6, 0.5],
      // Add more training samples here
    ]);

    const ys = tf.tensor2d([
      [1], // 1 for rain, 0 for no rain
      // Add corresponding labels here
    ]);

    // Train the model
    async function trainModel() {
      await model.fit(xs, ys, {
        epochs: 1000,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            // console.log(`Epoch ${epoch}: loss = ${logs.loss}`);
          }
        }
      });

      // Make a prediction
      const input = tf.tensor2d([normalizedData]);
      const prediction = await model.predict(input).dataSync()[0];
      return prediction;
    }

    // Start training and prediction
    return await trainModel();
  }
};

function calculateRainPrediction(area_size, confidence, predicted_precipitation) {
  const A = area_size;
  const C = confidence;
  const p = predicted_precipitation;

  const hP = (A * 1 / 12) / (2000 / 3); // Required inches of rain to cover 100% of area

  /* Land coverage (between 0-1) */
  const L = p / hP;

  /* PoP (Probability of Precipitation) (between 0-1) */
  const PoP = L * C;

  return PoP * 100;
}

async function predict(predicted_precipitation) {
  let area_size = 8000; // Square feet
  let accuracyLevels = weekAccuracy; // How accurate rain predictions have been on the past week
  let confidence = await confidencePredictor.compute(accuracyLevels); // Confidence in how likely it is to rain (between 0-1)

  let chanceOfRain = calculateRainPrediction(area_size, confidence, predicted_precipitation);

  return Math.min(chanceOfRain, 100);
}

module.exports = { predict: predict };