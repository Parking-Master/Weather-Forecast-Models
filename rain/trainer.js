const tf = require('@tensorflow/tfjs-node');

__dirname = `/Users/Jackson/rain`;

const weatherData = require("./data");

(async () => {
  // Load and prepare your data
  const data = await weatherData.collect();
  console.log(data);
  
  // Extract features and labels
  const features = data.map(d => [d.temp, d.wind, d.humidity, d.pressure, d.visibility]);
  const labels = data.map(d => d.rain ? 1 : 0);
  
  // Check class distribution
  const labelCounts = labels.reduce((acc, label) => {
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  console.log('Class distribution:', labelCounts);

  // Convert data to tensors
  const xs = tf.tensor2d(features);
  const ys = tf.tensor1d(labels, 'int32');

  // Scale features (Min-Max Scaling)
  const xsMin = xs.min(0);
  const xsMax = xs.max(0);
  const xsScaled = xs.sub(xsMin).div(xsMax.sub(xsMin));

  // Define the model
  const model = tf.sequential();
  model.add(tf.layers.dense({ units: 16, activation: 'relu', inputShape: [5] })); // Increased units
  model.add(tf.layers.dropout({ rate: 0.2 })); // Added dropout layer
  model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
  
  // Compile the model
  model.compile({
    optimizer: tf.train.adam(0.0001), // Reduced learning rate
    loss: 'binaryCrossentropy', // Use the correct loss function
    metrics: ['accuracy']
  });
  
  // Train the model
  await model.fit(xsScaled, ys, {
    epochs: 100,
    batchSize: 32,
    validationSplit: 0.2,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        console.log(`Epoch: ${epoch}, Loss: ${logs.loss}, Accuracy: ${logs.acc}`);
      }
    }
  });

  // Save the model
  await model.save(`file://${__dirname}/model-1.0/`);
})();