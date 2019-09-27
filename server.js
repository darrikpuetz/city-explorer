'use strict'

// ------------ dependencies + setup ------------

require('dotenv').config();
const PORT = process.env.PORT || 3000;

const express = require('express');
const app = express();

const superagent = require('superagent');

app.use(express.static('public'));

const cors = require('cors');
app.use(cors());

const yelp = require('yelp-fusion');


// ---------- globals ------------

let lat = 0;
let lng = 0;
let currentCity = '';


// ------------ database connect ------------

const DATABASE_URL = process.env.DATABASE_URL;
const pg = require('pg');
const client = new pg.Client(DATABASE_URL);
client.on('error', errHandler);
client.connect()
  .then(()=>{
    app.listen(PORT, () => console.log(`listening on ${PORT}`));
  })
  .catch(error => errHandler(error));


// ---------- imports ------------

// do not fully grok these second lines which seems to only be for constructor functions,
// gotten from https://stackabuse.com/how-to-use-module-exports-in-node-js/  but it works

let locations = require('./locations.js');
let Locations = locations.Locations;

let weathers = require('./weather.js');
let Weather = weathers.Weather;

let events = require('./event.js');
let Event = events.Event;


// ------------ routes ------------

app.get('/location', newLocationCheck);
app.get('/weather',getWeather);
app.get('/movies', getMovies);
app.get('/yelp', getYelp);
app.get('/events', getEvents);

app.use('*', (request, response) => response.status(404).send('Location does not exist pal'));



// ---------- get/check/make location ------------

function newLocationCheck (request, response) {
  let searchQuery = request.query.data;
  let sqlQuery = `SELECT * FROM locations WHERE search_query='${searchQuery}'`;
  client.query(sqlQuery)
    .then(queryResult => {
      console.log(queryResult);
      if (queryResult.rowCount > 0) {
        currentCity = queryResult.rows[0].search_query;
        lat = queryResult.rows[0].latitude;
        lng = queryResult.rows[0].longitude;
        response.send(queryResult.rows[0])
        console.log('got info from database');
      }
      else {
        console.log('Making an API call');
        let url = `https://maps.googleapis.com/maps/api/geocode/json?address=${searchQuery}&key=${process.env.GEOCODE_API_KEY}`
        superagentGetLocation(url, searchQuery, response);
      }
    })
    .catch(err => errHandler(err, response));
}

function superagentGetLocation(url, searchQuery, response){
  superagent.get(url)
    .then(superagentResults => {
      let locations = newLocation(superagentResults, searchQuery)
      sendSQLLocation(searchQuery, locations);
      //send to database
      response.send(locations);
    })
}

function newLocation(superagentResults, searchQuery){
  let results = superagentResults.body.results[0];
  let locations = new Locations(searchQuery, results);
  lat = locations.latitude;
  lng = locations.longitude;
  currentCity = locations.searchQuery;
  return locations;
}



function sendSQLLocation(searchQuery, locations){
  let sql = 'INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4);'
  let values = [searchQuery, locations.formattedQuery, lat, lng];
  client.query(sql, values)
    .then(pgResults => {
      console.log('Asking Google, sending data to database');
    })
    .catch(error => errHandler(error));
}



// ---------- get location from darkSky

function getWeather(request, response) {

  let weatherUrl = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${lat},${lng}`;
  // console.log('weather url:');
  // console.log(weatherUrl);
  superagent.get(weatherUrl)
    .then(darkSkyObj => {

      let localForecast = darkSkyObj.body.daily.data.map(day => new Weather(day));
      response.send(localForecast);

    })
    .catch(error => {
      errHandler(error, request, response)
    });

}


// ----- events! -----

function getEvents(request, response){

  let url = `https://www.eventbriteapi.com/v3/events/search?location.longitude=${lng}&location.latitude=${lat}&expand=venue&token=${process.env.EVENT_API_KEY}`

  superagent.get(url)
    .then(results => {
      let eventsObj = results.body.events.map(anEventObj => {
        return new Event(anEventObj);
      });

      response.send(eventsObj);
    })
    .catch(err =>{
      errHandler(err, response);
    });
}



function getMovies(request, response){
  let url = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.MOVIE_API_KEY}&language=en-US&query=${currentCity}&page=1&include_adult=false`;
  superagentMovies(url, response);
}

function superagentMovies(url, response){
  superagent.get(url)
    .then(superagentResults => {

      response.send(newMovie(superagentResults));
    })
    .catch(error => console.log(error));
}


function newMovie(superagentResults){
  const movieResults = superagentResults.body;
  const moviesArray = movieResults.results.slice(0, 10).map(movie =>{
    let currentMovie = new Movie(movie);
    return currentMovie;
  })
  return moviesArray;
}


function errHandler(error, response) {
  console.log(error);
  // const errorObj = {
  //   status: 500,
  //   text: 'An error with the database has occurred. Please try again.'
  // };
  // response.status(500).send(errorObj);
}

function getYelp(request, response){

  const apiKey = process.env.YELP_API_KEY;

  const client2 = yelp.client(apiKey);

  const searchRequest = {
    term:'restaurant',
    location: currentCity
  };

  client2.search(searchRequest).then(yelpAPIResults => {
    response.send(newYelp(yelpAPIResults));
  }).catch(e => {
    console.log(e);
  });
}

function newYelp(yelpAPIResults){
  const yelpResult = yelpAPIResults.jsonBody.businesses;
  const yelpArray = yelpResult.slice(0, 20).map(restaurant =>{
    let currentRestaurant = new Restaurant(restaurant);
    return currentRestaurant;
  });
  return yelpArray;
}


// ---------- constructors (being moved external) ------------

// function Weather(whichDay) {
//   this.forecast = whichDay.summary;
//   this.time = new Date(whichDay.time * 1000).toDateString();
//   // console.log(this);
// }

function Restaurant(yelpData){
  this.name = yelpData.name;
  this.image_url = yelpData.image_url;
  this.price = yelpData.price;
  this.rating = yelpData.rating;
  this.url = yelpData.url;
}

// function Events(eventData) {
//   this.link = eventData.url;
//   this.name = eventData.name.text;
//   this.event_date = new Date(eventData.start.local).toDateString();
//   this.summary = eventData.summary;

// }

function Movie(movieData){
  this.title = movieData.title;
  this.overview = movieData.overview;
  this.average_votes = movieData.vote_average;
  this.total_votes = movieData.vote_count;
  this.image_url = `https://image.tmdb.org/t/p/w500/${movieData.poster_path}`;
  this.popularity = movieData.popularity;
  this.released_on = movieData.release_date;
}


// process.on('unhandledRejection', (reason, p) => {
//   console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
//   // application specific logging, throwing an error, or other logic here
// });
