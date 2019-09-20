'use strict'

const express = require('express');
const superagent = require('superagent');
const app = express();
const cors = require('cors');
const PORT = process.env.PORT || 3000;
const pg = require('pg');
app.use(cors());
require('dotenv').config();
const client = new pg.Client(process.env.DATABASE_URL);
app.use(express.static('public'));


let lat = 0;
let lng = 0;




function Locations(searchQuery, geoDataResults) {
  this.searchQuery = searchQuery;
  this.formattedQuery = geoDataResults.formatted_address;
  this.latitude = geoDataResults.geometry.location.lat;
  this.longitude = geoDataResults.geometry.location.lng;
  lat = this.latitude;
  lng = this.longitude;

}


function Weather(whichDay) {
  this.forecast = whichDay.summary;
  this.time = new Date(whichDay.time * 1000).toDateString();
  console.log(this);
}


function Event(eventBriteStuff) {
  this.link = eventBriteStuff.url;
  this.name = eventBriteStuff.name.text;
  this.event_date = new Date(eventBriteStuff.start.local).toDateString();
  this.summary = eventBriteStuff.summary;
}


app.get('/location', (request, response) => {
  let searchQuery = request.query.data;
  let sqlQuery = `SELECT * FROM locations WHERE search_query='${searchQuery}'`;
  client.query(sqlQuery)
    .then(queryResult => {
      console.log(queryResult);
      if (queryResult.rowCount > 0) {
        response.send(queryResult.rows[0])
      }
      else {
        let url = `https://maps.googleapis.com/maps/api/geocode/json?address=${searchQuery}&key=${process.env.GEOCODE_API_KEY}`
        superagent.get(url)
          .then(superagentResults => {
            let results = superagentResults.body.results[0];
            let locations = new Locations(searchQuery, results);
            let sql = `INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4);`
            let values = [searchQuery, locations.formattedQuery, lat, lng];
            client.query(sql, values)
              .catch(error => errHandler(error, response));
            response.send(locations);
          })
      }
    })
    .catch(err => errHandler(err, response));
})




//Weather query from Dark Sky
app.get('/weather', (request, response) => {
  try {
    let darkSkyURL = `https://api.darksky.net/forecast/${process.env.DARKSKY_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`;
    superagent.get(darkSkyURL)
      .end((error, darkSkyURLStuff) => {
        const currentWeather = makeWeather(darkSkyURLStuff.body);
        response.status(200).send(currentWeather);
      })
  } catch (error) {
    errHandler(error, response);
  }
});

app.get('/events', (request, response) => {
  try {
    let eventBriteURL = `https://www.eventbriteapi.com/v3/events/search?location.longitude=${request.query.data.longitude}&location.latitude=${request.query.data.latitude}&expand=venue&token=${process.env.EVENTBRITE_API_KEY}`;
    superagent.get(eventBriteURL)
      .then((eventBriteData) => {
        const eventBriteInfo = getEvents(eventBriteData.body.events);
        response.send(eventBriteInfo);
      });
  } catch (error) {
    errHandler(error, response);
  }
});

function makeWeather(weatherText) {
  return weatherText.daily.data.map(day => new Weather(day));
}

function getEvents(eventMap) {
  let eventInput = eventMap.map(event => new Event(event));
  return eventInput.splice(0, 20);
}

function errHandler(error, response) {
  console.error(error);
  response.status(500).send(error);
}

client.connect()

app.listen(PORT, () => console.log(`listening on ${PORT}`));

app.use('*', (request, response) => response.status(404).send('Sorry this location does not exist'));
