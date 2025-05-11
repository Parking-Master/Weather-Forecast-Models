# Weather Forecast Models
I developed these 14 individual weather forecast models from scratch using only JavaScript and Tensorflow.js. I've been using them locally for a long time as a solution to innacurate weather forecasts by meteorologists. They are now open source. There are 12 daily forecast models and 2 hourly forecast models.

### Inspiration
I know a lot of people who absolutely despise weather apps because of their completely innacurate forecasts ;) so that's why I bought a weather station and fine-tuned my own forecast model to get the most accurate weather forecasts. Fine-tuning is recommended for whatever area you plan to use these models in, since that's how I made them accurate in the first place.

### Models
- **predictor1** A simple start to meteorology and weather forecasting. Uses only math and logic to predict basic weather to make tomorrow's forecast.
  - Prediction parameters: temperature, humidity
  - Total prediction time: Instant
- **predictor2** The first model to use machine learning. Uses tensorflow.js to predict basic weather parameters and make tomorrow's forecast.
  - Prediction parameters: temperature, humidity, pressure, wind speed
  - Total prediction time: <1 minute
- **predictor3** Runs a cycle of predictions 3 times and also includes HIGH and LOW temperatures for better accuracy. Generates tomorrow's forecast.
  - Prediction parameters: high temperature, low temperature, humidity, pressure, wind speed
  - Total prediction time: <1 minute
- **predictor4** The first hourly forecast model. Predicts the next 24 hours of weather data. Recommended for beginners to tensorflow since this model balances accuracy with speed.
  - Prediction parameters: high temperature, low temperature, humidity, pressure, wind speed
  - Total prediction time: ~3 minutes
- **predictor5** Uses the current date and season for better accuracy to produce tomorrow's forecast. Better accuracy but longer times.
  - Prediction parameters: date, high temperature, low temperature, humidity, pressure, wind speed, season
  - Total prediction time: ~8 minutes
- **predictor6** Generates tommorow's forecast based on a pre-trained model that uses yearly weather data, combined
  - Prediction parameters: date, high temperature, low temperature, humidity, pressure, wind speed, season
  - Total prediction time: ~20 minutes
