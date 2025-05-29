// @author Scott Fleming
// @email hawkwynd@gmail.com 
// @version 2.0 -- with new license key
// Now with geoipupdate installed
// --------------------------------------------

const config  = require('./config.json');
const getJSON = require('get-json');
const mysql   = require('mysql');
const moment  = require('moment');
const sc      = config.blotto;
const db      = config.mysql;
const con     = mysql.createConnection( db );
const lastUpdate = config.lastUpdate;
const author  = config.author;

// setup geolocation
var IPGeolocationAPI = require('ip-geolocation-api-javascript-sdk');
const ipKey          = config.iploc;
var ipgeolocationApi = new IPGeolocationAPI(ipKey.key, false); 
var GeolocationParams= require('ip-geolocation-api-javascript-sdk/GeolocationParams.js');

const hostnames = [];

const colours = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",
  
  fg: {
      black: "\x1b[30m",
      red: "\x1b[31m",
      green: "\x1b[32m",
      yellow: "\x1b[33m",
      blue: "\x1b[34m",
      magenta: "\x1b[35m",
      cyan: "\x1b[36m",
      white: "\x1b[37m",
      gray: "\x1b[90m",
      crimson: "\x1b[38m" // Scarlet
  },
  bg: {
      black: "\x1b[40m",
      red: "\x1b[41m",
      green: "\x1b[42m",
      yellow: "\x1b[43m",
      blue: "\x1b[44m",
      magenta: "\x1b[45m",
      cyan: "\x1b[46m",
      white: "\x1b[47m",
      gray: "\x1b[100m",
      crimson: "\x1b[48m"
  }
};


function runner(){

const dt = new Date();
	

   getJSON( sc.url + "/" + sc.path + "?sid=" + sc.sid + '&mode=' + sc.mode + '&pass=' + sc.pass)
  .then(function(resp) {
    
    let server     = Object.assign({}, resp); // clone resp so we don't kill the object when deleting listener and songs
    var serverStat = getserverStats(server);
    
    console.clear();
    console.log(colours.fg.yellow)
    console.log(`Mr. Blotto Shoutcast monitor v1.0 Server Uptime: ${secondsToHms(resp.streamuptime)}`, colours.reset );
    console.log(`Playing: ${resp.songtitle}`);
    
    // Got milk? Then spill it manski-babbles!
    if( resp.uniquelisteners > 0 ) {
      
      console.log(`Listeners: ${resp.uniquelisteners}`);
      console.log(`Average Time: ${secondsToHms(serverStat.averagetime)}`, colours.fg.gray);
      console.log(`----------------------------------------------`, colours.fg.yellow);
      
      var listeners = getListeners(resp);

      // remove dupes
      const obj = {}
      listeners.forEach(v => {
        if (!obj[v.hostname]) {
          obj[v.hostname] = {}
        }
        if (!obj[v.hostname][v.hostname]) {
          obj[v.hostname][v.city] = v;
        }
      })
      
      const result = [];

      Object.values(obj).forEach(nameObj =>
        Object.values(nameObj).forEach(surnObj => result.push(surnObj))
      );
      
      for( let listener of result){
        
        var geolocationParams = new GeolocationParams();
        
        geolocationParams.setIPAddress(listener.hostname);
        
        // do all the lookup shit now, using the javascript ip-geo stuff
        ipgeolocationApi.getGeolocation( function(response){

            listener.geo            = response
            listener.timestamp      = dt.toLocaleString();
            listener.connecttime    = secondsToHms(listener.connecttime);
            listener.referer        = listener.referer == '' ? 'DNAS' : 'HTML'
            listener.geo.region     = listener.geo.state_prov
            
            // Display listener info line
            console.log( listener.geo.city + ', ' +  listener.geo.region + ' ' + listener.connecttime + ' ' + listener.referer, colours.reset ) 
                
                var city      = listener.geo.city !==  null ? listener.geo.city : 'Masked';
                var state     = listener.geo.region !== null ? listener.geo.region : 'Masked';
                var latitude  = listener.geo.latitude 
                var longitude = listener.geo.longitude
                var referrer  = listener.referer
                var rightNow  = moment( Date.now()).format('YYYY-MM-DD HH:mm:ss' );
                
                // The values array for insert ON DUPLICATE KEY UPDATE
                var values = [listener.hostname, rightNow, listener.connecttime, city, state, listener.useragent, referrer, latitude,longitude, city, listener.connecttime,  listener.useragent ]
                var newSql = "INSERT INTO scBlotto ( hostname, timestamp, connecttime, city, region, useragent, referrer, latitude, longitude ) VALUES ( ?,?,?,?,?,?,?,?,? ) ON DUPLICATE KEY UPDATE city=?, connecttime=?, useragent=?";
                
                let q = con.query( newSql, values, (error, result)=>{
                if(error){
                             console.log( q.newSql )
                             console.error( error.message )
                }
                        
                     })   
                // stuff it in the table
                insertMysql( listener );  
                
        }, geolocationParams );

      }

      
    }else{
      // No listeners
      console.log(`\n${resp.uniquelisteners} listeners.`  );

    }
    
    
  }).catch(function(error){
    console.log(error);
  });
}

runner();

// loop it every X milliseconds 60000 = 1 minute, 300000 = 5 mins
setInterval(runner, 60000 );


  
// --------- FUNCTION FUNCTION, WHAT'S YOUR FUNCTION?? ------------

function getListeners(d){ return d.listeners; }

function getserverStats(s){
  delete(s.listeners);
  delete(s.songs);
  return s;
}

function secondsToHms(t) {
  t     = Number(t);
  var h =  pad(Math.floor(t / 3600));
  var m =  pad(Math.floor(t % 3600 / 60));
  var s = pad(Math.floor(t % 3600 % 60));
  
  return h + ":" + m + ":" + s;
}

function pad(n){ return n < 10 ? '0'+n : n }

function insertMysql( listener ) {

      var city      = listener.geo.city !==  null ? listener.geo.city : 'Masked';
      var region    = listener.geo.region !== null ? listener.geo.region : 'Masked';
      var country   = listener.geo.coutry !== null ? listener.geo.country : 'Masked';
      var rightNow  = moment( Date.now()).format('YYYY-MM-DD HH:mm:ss' );
      var ctime     = secondsToHms(listener.connecttime);
      var values    = [listener.hostname, rightNow, listener.connecttime, city, region, country, listener.useragent, rightNow, listener.connecttime,  listener.useragent ]
      var newSql    = "INSERT INTO scBlotto ( hostname, timestamp, connecttime, city, region, country, useragent ) VALUES ( ?,?,?,?,?,?,? ) ON DUPLICATE KEY UPDATE timestamp=?, connecttime=?, useragent=?";


      let q = con.query( newSql, values, (error, result )=>{

             if( error ){
                 console.log('Error fucker: ' + result )
                 console.error(  error.message )
             }
            
         })   
}

function secondsToHms(t) {
  t     = Number(t);
  var h =  pad(Math.floor(t / 3600));
  var m =  pad(Math.floor(t % 3600 / 60));
  var s = pad(Math.floor(t % 3600 % 60));

  return h + ":" + m + ":" + s;
}
