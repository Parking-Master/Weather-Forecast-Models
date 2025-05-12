# Weather Forecast Models
I developed these 12 individual weather forecast models from scratch using only JavaScript and Tensorflow.js. I've been using them locally for a long time as a solution to innacurate weather forecasts by meteorologists. They are now open source. There are 9 daily forecast models and 3 hourly forecast models.

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
- **predictor6** Generates tommorow's forecast based on a pre-trained model that uses both seasonal and daily weather data.
  - Prediction parameters: date, high temperature, low temperature, humidity, pressure, wind speed, season
  - Total prediction time: ~12 minutes
- **predictor9** The first model to forecast an entire week of weather. Uses seasonal patterns combined with additional weather parameters for best accuracy. Also the first model to forecast chance of rain.
  - Prediction parameters: date, high temperature, low temperature, humidity, pressure, wind speed, dew point, precipitation, cloud cover, season
  - Total prediction time: ~18 minutes
- **predictor9-24** An add-on to predictor9 that seperately produces the next 24 hours of weather data.
  - Prediction parameters: date, current hour, temperature, humidity, pressure, wind speed, precipitation, cloud cover, dew point, season
  - Total prediction time: ~25 minutes
- **predictor10** Uses normalization and fine-tuning to get the most accuracy. First model to use monthly training data rather than weekly.
  - Prediction parameters: date, high temperature, low temperature, humidity, pressure, wind speed, precipitation, cloud cover, day of the year
  - Total prediction time: ~30 minutes
- **Voldemort** Uses 732 days of input data for advanced seasonal forecasting. Rather than fixed averages for input data, this model uses both HIGH and LOW for every input parameter for the greatest accuracy.
  - Prediction parameters: date, high temperature, low temperature, high humidity, low humidity, high pressure, low pressure, high wind speed, low wind speed, high dew point, low dew point, precipitation, cloud cover, day of the year, month of the year, season
  - Total prediction time: ~5 hours
- **predictor11-24** An add-on to Voldemort to produce hourly instead of daily forecasts.
  - Prediction parameters: date, current hour, temperature, humidity, pressure, wind speed, precipitation, cloud cover, dew point, season
  - Total prediction time: ~25 minutes
- **Dumbledore** The final and most accurate model created. Based off of Voldemort but without relying on external weather data, only local data. Includes automatic overfitting correction, custom tuning options, and chance of rain predictions.
  - Prediction parameters: date, high temperature, low temperature, high humidity, low humidity, high pressure, low pressure, high wind speed, low wind speed, high dew point, low dew point, precipitation, cloud cover, day of the year, month of the year, season
  - Total prediction time: ~55 minutes
 
### About
If you're still wondering what these are, they are simply your own weather forecasting models made in JavaScript. They are kind of like your average mobile weather app, except you can control the forecasts and you can fine tune them!

### Recommendations
If you're a beginner to Tensorflow.js, or you want a lightweight model with accuracy, use predictor3. If you would like to build your own model with a base or you just don't care about accuracy, use predictor2. If you have the computational power and want the best accuracy, use either Voldemort or Dumbledore. If you want hourly predictions, use predictor4, predictor9-24, or predictor11-24.

### Rain Predictions
How is the chance of rain predicted in some of these models? Well, it's actually very simple. It is based off of the meteorology concept of:
<sub><i>Amount of expected rain</i> &times; <i>The meteorologists' confidence</i></sub>

For example, if there's 1 inch of rain forecasted, and I think that I'm usually right when predicting the rain amount, then I can say something like:
<br>
<sub><i>1 &times; 0.9 = 90% chance of rain</i></sub>

Or if you want to be more advanced, then you have to do:
<br>
<sub><i>(p / ((A &times; 1 / 12) / (2000 / 3))) &times; C</i></sub>

Where:
- *p = the forecasted amount of rain*
- *A = the area size, in square feet*
- *C = the meteoroligists' confidence*

For example, with 2 inches of rain forecasted in an 8,000 square foot area, and forecasts being usually wrong, then do:
<br>
<sub><i>(2 / ((8000 &times; 1 / 12) / (2000 / 3))) &times; 0.30</i> = 60% chance of rain</sub>

Essentially:
- p / ((A &times; 1 / 12) / (2000 / 3)) - calculates how much rain needs to cover the area, then calculates how much rain will cover the area as a percentage
- &times; C - multiplies the previous result by the meteoroligists' confidence, giving the final PoP (Probability of Precipitation) formula.

The confidence percentage is automatically generated in these prediction models based off of past accuracy, using Tensorflow.js. If you find them to be innacurate then it is best to fine tune them, or even use your own confidence instead of the script.

# License
Like most Parking Master projects, this one is licensed under MIT, which basically means you can do anything with it!

© 2025 Parking Master.
