var IPGeolocationAPI        = require('ip-geolocation-api-javascript-sdk');
const config                = require('./config.json');
const ipKey                 = config.iploc 
var ipgeolocationApi        = new IPGeolocationAPI(ipKey.key, false); 
var GeolocationParams       = require('ip-geolocation-api-javascript-sdk/GeolocationParams.js');

// Get complete geolocation for the calling machine's IP address
// /ipgeolocationApi.getGeolocation( handleResponse );

var geolocationParams       = new GeolocationParams();
geolocationParams.setIPAddress('74.123.47.237');

// geolocationParams.setLang('ru');
ipgeolocationApi.getGeolocation( handleResponse, geolocationParams);

function handleResponse( data ){
    console.log( data )
}