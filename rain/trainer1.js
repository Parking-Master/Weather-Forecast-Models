const fs = require("fs");
const dates = require("./dates");

__dirname = `/Users/Jackson/rain`;

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

const API_KEY = "e1f10a1e78da46f5b10a1e78da96f525";
const AIRPORT_CODE = "KRSW";

async function collect() {
  try {
    const weatherData = [];
    for (let i = 0; i < dates.length; i++) {
      console.log("day", i);
      const weatherDataDayList = {};
      const liveWeatherData = await (await fetch(`https://api.weather.com/v1/location/${AIRPORT_CODE}:9:US/observations/historical.json?apiKey=${API_KEY}&units=e&startDate=${dates[i]}`)).json();
      let max_temp = Math.max(...liveWeatherData.observations.map(x => x.temp));
      let min_temp = Math.min(...liveWeatherData.observations.map(x => x.temp));
      let date = dates[i].replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");;
      let rain = liveWeatherData.observations.filter(x => x.precip_hrly > 0).length > 0;
      let temp = (max_temp + min_temp) / 2;
      let humidity = liveWeatherData.observations.map(x => x.rh || 0).reduce((a, b) => a + b) / liveWeatherData.observations.filter(x => (x !== 0 && x !== null)).length;

      weatherDataDayList.date = date;
      weatherDataDayList.rain = rain;
      weatherDataDayList.temp = temp;
      weatherDataDayList.humidity = humidity.toFixed(1) - 0;

      weatherData.push(weatherDataDayList);
    }
    fs.writeFileSync(`${__dirname}/year.json`, JSON.stringify(weatherData));
  } catch (error) {
    console.error("Error fetching weather data:", error);
  }
}

collect();