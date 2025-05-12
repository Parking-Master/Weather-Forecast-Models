const tf = require("@tensorflow/tfjs");
const fs = require("fs");
const format = require("../../utils/format");

__dirname = `/home/pi/Weather Station`;

const precipitationData = format.decode(fs.readFileSync(`${__dirname}/db/predicted_rain`).toString()).map(x => x.daily_rain);

const inputTensor = tf.tensor2d([precipitationData]);

const model = tf.sequential();
model.add(tf.layers.dense({ units: 10, activation: "relu", inputShape: [7], name: "dense9999" }));
model.add(tf.layers.dense({ units: 1, activation: "sigmoid", name: "dense9998" }));

model.compile({
  optimizer: tf.train.adam(),
  loss: "binaryCrossentropy",
  metrics: ["accuracy"]
});

const trainingData = tf.tensor2d([
  precipitationData,
  // Add more training samples here
]);

const labels = tf.tensor2d([
  [1],
  // Add corresponding labels here
]);

async function trainModel() {
  await model.fit(trainingData, labels, {
    epochs: 1000,
    batchSize: 1
  });
}

async function compute() {
  await trainModel();
  const prediction = model.predict(inputTensor).dataSync()[0];
  return prediction;
}

module.exports = { compute: compute };