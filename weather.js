function Weather(day) {

  this.forecast = day.summary;
  this.time = new Date(day.time * 1000).toString().slice(0,15);
  // *1000 because weather from darksky is different from the whole rest of the internet

  this.created = Date.now();
  // for future data freshness functions

  // console.log(`weather: ${this.forecast} at ${this.time}`);
}

Weather.prototype = {
// TODO: Question: do render functions belong in here?
}

module.exports = {
  Weather: Weather
};


