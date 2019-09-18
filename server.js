'use strict'

const express = require('express');
require('dotenv').config();

const app = express();
app.use(express.static('public'));

const superagent = require('superagent');

const cors = require('cors');
app.use(cors());

const PORT = process.env.PORT || 3000;

function Locations(searchQuery, geoDataResults) {
  this.searchQuery = searchQuery;
  this.formattedQuery = geoDataResults.formatted_address;
  this.latitude = geoDataResults.geometry.location.lat;
  this.longitude = geoDataResults.geometry.location.lng;
}

function Weather(whichDay) {
  this.forecast = whichDay.summary;
  this.time = new Date(whichDay.time*1000).toDateString();
  console.log(this);
}

function Event(eventBriteStuff) {
  this.link = eventBriteStuff.url;
  this.name = eventBriteStuff.name.text;
  this.event_date = new Date(eventBriteStuff.start.local).toDateString();
  this.summary = eventBriteStuff.summary;
}

app.get('/location', (request, response) => {
  try {
    let searchQuery = request.query.data;
    let geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${searchQuery}&key=${process.env.GOOGLE_API_KEY}`;
    //SuperAgent Things Here
    superagent.get(geocodeUrl)
      .then((geocodeUrlStuff) => {
        const locations = new Locations(searchQuery, geocodeUrlStuff.body.results[0]);
        console.log(locations);
        response.send(locations);
      })
  } catch (error) {
    errHandler(error, response);
  }
});

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
app.use('*', (request, response) => response.status(404).send('Location does not exist pal'));
app.listen(PORT, () => console.log(`listening on ${ PORT }`));
