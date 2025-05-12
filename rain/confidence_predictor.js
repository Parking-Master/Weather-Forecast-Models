const tf = require("@tensorflow/tfjs");
const fs = require("fs");

__dirname = `/home/pi/Weather Station/predictor/rain`;

const data = JSON.parse(fs.readFileSync(`${__dirname}/year.json`).toString());

const xs = data.map(d => [(d.temp - 70) / 30, (d.humidity - 70) / 30]);
const ys = data.map(d => d.rain ? 1 : 0);

const xsTensor = tf.tensor2d(xs);
const ysTensor = tf.tensor2d(ys, [ys.length, 1]);

const model = tf.sequential();
model.add(tf.layers.dense({ units: 16, activation: "elu", inputShape: [2] }));
model.add(tf.layers.dense({ units: 8, activation: "elu" }));
model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));

model.compile({
  optimizer: "adam",
  loss: "binaryCrossentropy",
  metrics: ["accuracy"]
});

async function trainModel() {
  await model.fit(xsTensor, ysTensor, {
    epochs: 200,
    batchSize: 5,
    shuffle: true
  });
}

async function predictRainConfidence(temp, humidity) {
  const normalizedTemp = (temp - 70) / 30;
  const normalizedHumidity = (humidity - 70) / 30;
  const inputTensor = tf.tensor2d([[normalizedTemp, normalizedHumidity]]);
  const prediction = model.predict(inputTensor);
  const confidence = (await prediction.data())[0];
  return confidence;
}

async function compute(predictedWeather) {
  await trainModel();
  let confidence = await predictRainConfidence(predictedWeather.temperature, predictedWeather.temperature);
  return confidence;
}

module.exports = { compute };