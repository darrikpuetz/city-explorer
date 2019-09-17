'use strict'

const express = require('express');
require('dotenv').config();

const app = express();
app.use(express.static('public'));

const cors = require('cors');

app.use(cors());

const PORT = process.env.PORT || 3000;



app.listen(PORT, () => console.log(`listening on ${PORT}`));

function Locations(searchQuery, geoDataResults) {
  this.searchQuery = searchQuery;
  this.formattedQuery = geoDataResults.results[0].formatted_address;
  this.latitude = geoDataResults.results[0].geometry.location.lat;
  this.longitude = geoDataResults.results[0].geometry.location.lng;
}

app.get('/location', (request, response) => {
  try{
    let searchQuery = request.query.data;
    const geoDataResults = require('./data/geo.json');

    const locations = new Locations(searchQuery, geoDataResults);

    response.status(200).send(locations);
  }
  catch(err){
    console.error(err);
        
  }
});

app.use('*', (request, response) => response.status(404).send('Page does not exist pal');
