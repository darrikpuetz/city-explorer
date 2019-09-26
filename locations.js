function Locations(searchQuery, geoDataResults) {
  this.searchQuery = searchQuery;
  this.formattedQuery = geoDataResults.formatted_address;
  this.latitude = geoDataResults.geometry.location.lat;
  this.longitude = geoDataResults.geometry.location.lng;
  console.log('made location with' + searchQuery);
}


module.exports = {
  Locations: Locations
};


