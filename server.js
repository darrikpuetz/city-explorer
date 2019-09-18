'use strict'

const express = require('express');
require('dotenv').config();

const app = express();
app.use(express.static('public'));

const superagent = require('superagent');
app.use(superagent());

const cors = require('cors');
app.use(cors());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`listening on ${ PORT }`));

function Locations(searchQuery, geoDataResults) {
  this.searchQuery = searchQuery;
  this.formattedQuery = geoDataResults.results[0].formatted_address;
  this.latitude = geoDataResults.results[0].geometry.location.lat;
  this.longitude = geoDataResults.results[0].geometry.location.lng;
}

function Weather(whichDay) {
  this.forecast = whichDay.daily.summary;
  this.time = new Date(whichDay.time).toDateString();
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
    let geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${searchQuery}&key=${GEOCODE_API_KEY}`;
    //SuperAgent Things Here
    superagent.get(geocodeUrl)
      .end((error, geocodeUrlStuff) => {
        const locations = new Locations(searchQuery, geocodeUrlStuff.body.results);
        response.send(locations);
      })
  } catch (error) {
    errHandler(error, 'events');
  }
});

//Weather query from Dark Sky
app.get('/weather', (request, response) => {
  try {
    let darkSkyURL = `https://api.darksky.net/forecast/${process.env.DARKSKY_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`;
    superagent.get(darkSkyURL)
      .end((err, darkSkyURLStuff) => {
        const currentWeather = makeWeather(darkSkyURLStuff.body);
        response.status(200).send(currentWeather);
      })
  } catch (error) {
    errHandler(error, 'events');
  }
});

app.get('/events', (request, response) => {
  try {
    let eventBriteURL = `https://www.eventbriteapi.com/v3/events/search?location.longitude=${request.query.data.longitude}&location.latitude=${request.query.data.latitude}&expand=venue`;
    superagent.get(eventBriteURL)
      .set('EventBrite Info', `${process.env.EVENTBRITE_API_KEY}`)
      .end((err, eventBriteURL) => {
        const eventBriteInfo = getEvents(eventBriteURL.body.events);
        response.send(eventBriteInfo);
      });
  } catch (error) {
    errHandler(error, 'events');
  }
});

function makeWeather(weatherText) {
  return weatherText.daily.data.map(day => new Weather(day));
}

function getEvents(eventMap) {
  let eventInput = eventMap.map(event => new Event(event));
  return eventInput.splice(0, 20);
}

function errHandler(response, request) {
  response.status(500).send({ status: 500, responseText: `Error on ${request}` });
}
app.use('*', (request, response) => response.status(404).send('Location does not exist pal'));
