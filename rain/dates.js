process.env.TZ = "America/New_York";

const today = new Date();
const lastDates = [];

for (let i = 1; i <= 7; i++) {
  let previousDay = new Date(today.getTime() - (i * 24 * 60 * 60 * 1000));
  previousDay.setDate(previousDay.getDate());
  const formattedDate = previousDay.toISOString().slice(0, 10).replace(/-/g, "");
  lastDates.push(formattedDate);
}

module.exports = lastDates;