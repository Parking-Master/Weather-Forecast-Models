methods = {
  getSeasonFromDate: function(dateString) {
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
  },
  daysIntoYear: function(date){
    return (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 24 / 60 / 60 / 1000;
  },
  getTargetDate: function(weatherData) {
    let tomorrowDate = new Date(weatherData[weatherData.length - 1].date).setDate(new Date(weatherData[weatherData.length - 1].date).getDate() + 1);
    let tomorrowFormattedDate = new Date(tomorrowDate).toISOString().split("T")[0];
    return tomorrowFormattedDate;
  },
  groupDays: function(originalArray, chunkSize) {
    const result = [];
    for (let i = 0; i < originalArray.length; i += chunkSize) {
      result.push(originalArray.slice(i, i + chunkSize));
    }
    return result;
  }
};

module.exports = methods;