const paramKeys = ["max_temp","min_temp","max_humidity","min_humidity","max_pressure","min_pressure","max_wspd","min_wspd","max_dew_point","min_dew_point","precipitation","cloud_cover","day_of_year","month_of_year","season"];
let indexX = 0;
let indexY = 0;
let currentNormParams = null;

function normalize(value, normParams = null) {
  if (normParams == null) normParams = currentNormParams;
  if (indexX >= paramKeys.length) indexX = 0;
  let min = normParams[Object.keys(normParams)[indexX]].min;
  let max = normParams[Object.keys(normParams)[indexX]].max;
  indexX++;
  return (value - min) / (max - min);
}

function denormalize(value, normParams = null) {
  if (normParams == null) normParams = currentNormParams;
  if (indexY >= paramKeys.length) indexY = 0;
  let min = normParams[Object.keys(normParams)[indexY]].min;
  let max = normParams[Object.keys(normParams)[indexY]].max;
  indexY++;
  return value * (max - min) + min;
}

async function safeFetch() {
  try {
    const response = await fetch.apply(null, arguments);
    return response;
  } catch (err) {
    console.log("[normalizer.js]: Fetch error occured for url `" + arguments[0] + "`:", err);
    return null;
  }
}

async function params(predictionDate, years = 3, predictionDayOffset) {
  // Date format: YYYY-MM-DD
  let targetDate = new Date(predictionDate);

  const normParams = {
    max_temp: { min: 50, max: 110 },
    min_temp: { min: 40, max: 90 },
    max_humidity: { min: 0, max: 100 },
    min_humidity: { min: 0, max: 100 },
    max_pressure: { min: 28, max: 32 },
    min_pressure: { min: 28, max: 32 },
    max_wspd: { min: 0, max: 50 },
    min_wspd: { min: 0, max: 50 },
    max_dew_point: { min: 30, max: 80 },
    min_dew_point: { min: 30, max: 80 },
    precipitation: { min: 0, max: 4 },
    cloud_cover: { min: 0, max: 8 },
    day_of_year: { min: 1, max: 366 },
    month_of_year: { min: 1, max: 12 },
    season: { min: 0, max: 3 }
  };

  for (let y = 0; y < years; y++) {
    const API_KEY = "e1f10a1e78da46f5b10a1e78da96f525";
    const AIRPORT_CODE = "KGSP";
    let currentYear = targetDate.getFullYear();
    let historicYear = currentYear - y - 1;
    let historicDate = new Date(targetDate.toISOString().slice(0, 10) + "T00:00");
    historicDate.setFullYear(historicYear);
    let date = historicDate.toISOString().slice(0, 10);
    const historicWeatherData = await (await safeFetch(`https://archive-api.open-meteo.com/v1/archive?latitude=34.80311046391122&longitude=-82.14825272644435&start_date=${date}&end_date=${date}&hourly=temperature_2m,relative_humidity_2m,dewpoint_2m,wind_speed_10m,precipitation,pressure_msl,cloudcover&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timeformat=unixtime`)).json();
    const forecastData = await (await safeFetch(`https://api.weather.com/v3/wx/forecast/daily/7day?apiKey=${API_KEY}&geocode=34.74%2C-82.037&language=en-US&units=e&format=json`)).json();

    const dayData = {
      max_temp: Math.max(...historicWeatherData.hourly.temperature_2m),
      min_temp: Math.min(...historicWeatherData.hourly.temperature_2m),
      max_humidity: Math.max(...historicWeatherData.hourly.relative_humidity_2m).toFixed(1) - 0,
      min_humidity: Math.min(...historicWeatherData.hourly.relative_humidity_2m).toFixed(1) - 0,
      max_pressure: ((Math.max(...historicWeatherData.hourly.pressure_msl) * 0.02953).toFixed(2) - 0),
      min_pressure: ((Math.min(...historicWeatherData.hourly.pressure_msl) * 0.02953).toFixed(2) - 0),
      max_wspd: Math.max(...historicWeatherData.hourly.wind_speed_10m).toFixed(1) - 0,
      min_wspd: Math.min(...historicWeatherData.hourly.wind_speed_10m).toFixed(1) - 0,
      max_dew_point: Math.round(Math.max(...historicWeatherData.hourly.dewpoint_2m)),
      min_dew_point: Math.round(Math.min(...historicWeatherData.hourly.dewpoint_2m)),
      precipitation: historicWeatherData.hourly.precipitation.reduce((a, b) => a + b, 0).toFixed(2) - 0,
    };
    if (dayData.precipitation > 5) dayData.precipitation = 0.15;

    function boost(temperature) {
      let i = predictionDayOffset || new Date(new Date().getDate()) - targetDate.getDate() - 1;
      let correspondent = forecastData.calendarDayTemperatureMax[i];
      if (correspondent > temperature) {
        let offset = 3;
        return temperature + offset;
      }
      if (correspondent < temperature) {
        let offset = -3;
        return temperature + offset;
      }
      return temperature;
    }
    for (let n in normParams) {
      if (n === "max_temp") {
        if (y == 0 ? true : (dayData.max_temp > normParams[n].max)) normParams[n].max = dayData.max_temp + 1;
        if (y == 0 ? true : (Math.min(boost(dayData.max_temp - 1), normParams[n].max) < normParams[n].min)) normParams[n].min = Math.min(boost(dayData.max_temp - 1), normParams[n].max);
      }
      if (n === "min_temp") {
        if (y == 0 ? true : (dayData.min_temp > normParams[n].max)) normParams[n].max = dayData.min_temp + 1;
        if (y == 0 ? true : (dayData.min_temp < normParams[n].min)) normParams[n].min = dayData.min_temp - 1;
      }
      if (n === "max_humidity") {
        if (y == 0 ? true : (dayData.max_humidity > normParams[n].max)) normParams[n].max = Math.min(dayData.max_humidity + 3, 100);
        if (y == 0 ? true : (dayData.max_humidity < normParams[n].min)) normParams[n].min = Math.max(dayData.max_humidity - 3, 0);
      }
      if (n === "min_humidity") {
        if (y == 0 ? true : (dayData.min_humidity > normParams[n].max)) normParams[n].max = Math.min(dayData.min_humidity + 3, 100);
        if (y == 0 ? true : (dayData.min_humidity < normParams[n].min)) normParams[n].min = Math.max(dayData.min_humidity - 3, 0);
      }
      if (n === "max_pressure") {
        if (y == 0 ? true : (dayData.max_pressure > normParams[n].max)) normParams[n].max = dayData.max_pressure + .05;
        if (y == 0 ? true : (dayData.max_pressure < normParams[n].min)) normParams[n].min = dayData.max_pressure - .05;
      }
      if (n === "min_pressure") {
        if (y == 0 ? true : (dayData.min_pressure > normParams[n].max)) normParams[n].max = Math.min(dayData.min_pressure + .05, normParams["max_pressure"].min);
        if (y == 0 ? true : (dayData.min_pressure < normParams[n].min)) normParams[n].min = dayData.min_pressure - .05;
      }
      if (n === "max_wspd") {
        if (y == 0 ? true : (dayData.max_wspd > normParams[n].max)) normParams[n].max = Math.max(dayData.max_wspd + 2, 0);
        if (y == 0 ? true : (dayData.max_wspd < normParams[n].min)) normParams[n].min = Math.max(dayData.max_wspd - 2, 0);
      }
      if (n === "min_wspd") {
        if (y == 0 ? true : (dayData.min_wspd > normParams[n].max)) normParams[n].max = Math.max(dayData.min_wspd + 2, 0);
        if (y == 0 ? true : (dayData.min_wspd < normParams[n].min)) normParams[n].min = Math.max(dayData.min_wspd - 2, 0);
      }
      if (n === "max_dew_point") {
        if (y == 0 ? true : (dayData.max_dew_point > normParams[n].max)) normParams[n].max = Math.max(dayData.max_dew_point + 2, 0);
        if (y == 0 ? true : (dayData.max_dew_point < normParams[n].min)) normParams[n].min = Math.max(dayData.max_dew_point - 2, 0);
      }
      if (n === "min_dew_point") {
        if (y == 0 ? true : (dayData.min_dew_point > normParams[n].max)) normParams[n].max = Math.min(Math.max(dayData.min_dew_point + 2, 0), normParams["max_dew_point"].min);
        if (y == 0 ? true : (dayData.min_dew_point < normParams[n].min)) normParams[n].min = Math.max(dayData.min_dew_point - 2, 0);
      }
      if (n === "precipitation") {
        if (y == 0 ? true : (dayData.precipitation > normParams[n].max)) normParams[n].max = dayData.precipitation + .1;
        if (y == 0 ? true : (dayData.precipitation < normParams[n].min)) normParams[n].min = Math.max(dayData.precipitation - .1, 0);
      }
    }
  }
  console.log(normParams);

  currentNormParams = normParams;
  return normParams;
}

module.exports = { normalize: normalize, denormalize: denormalize, params: params };