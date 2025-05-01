function predict1(length, weatherData) {
  if (length === 3) {
    let yesterdayForecast = weatherData[0];
    let todayForecast = weatherData[1];
    let tomorrowForecast = {};

    // Use the current season, recent weather data,
    // and average data in the specified prediction length
    // to predict the weather tomorrow.
    
    // First, we'll take all weather data from yesterday, combine it with today,
    // then we'll use 1 of the 4 the seasons + average weather data in this location,
    // and then we'll predict the weather *tomorrow*.

    // 1. Combine yesterday's weather with today's weather
    let yesterdayTodayAverageForecast = {
      temperature: null,
      humidity: null,
      dew_point: null,
      winds: null,
      windGusts: null,
      chanceOfRain: null
    };

    yesterdayTodayAverageForecast.temperature = (yesterdayForecast.temperature + todayForecast.temperature) / 2;
    yesterdayTodayAverageForecast.humidity = (yesterdayForecast.humidity + todayForecast.humidity) / 2;
    console.log(yesterdayTodayAverageForecast)
  }
}

/* Input data should be in this format:
let weatherData = [
  {
    temperature: 76,
    humidity: 84.9
  },
  {
    temperature: 71,
    humidity: 72
  }
];
*/

module.exports = { predict1 };
