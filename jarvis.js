// @author Scott Fleming
// @email hawkwynd@gmail.com 
// Jarvis monitor app for Hawkwynd Radio

const config    = require('./config.json');
const getJSON   = require('get-json');
const mysql     = require('mysql');
const moment    = require('moment');
const { Console } = require('console');
const version   = config.version;
const hawkwyndRadio    = config.hawkwyndRadio;
const db        = config.keep;
const maxmindKey= config.maxmind.maxmindKey;
const Reader    = require('@maxmind/geoip2-node').Reader;
const options   = [];
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

// Make sure that you don't forget "colours.reset" at the so that you can reset the console back to it's original colours.
    
var logTotalCount = (err, rows) => {
    if (err) {
      console.log( err );
    } else {
      console.log( colours.fg.white,  `All time: ${rows[0].total}`, colours.reset);
    }
  };

  var logLastYesterday = (err, Yesterday) => {
    if (err) {
      console.log( err );
    } else {
        
        console.log( colours.fg.white, `Yesterday : ${Yesterday[0].total}`)
        // rows.forEach(element => {
        //     console.log( colours.fg.yellow, ` ${element.connecttime} ${element.city}, ${element.region} ${element.country}`, colours.reset);
        // });

    }
  };


  var logLastToday = (err, rows) => {
    if (err) {
      console.log( err );
    } else {
        
        console.log( colours.fg.white, `Today : ${rows[0].total}`)
        // rows.forEach(element => {
        //     console.log( colours.fg.yellow, ` ${element.connecttime} ${element.city}, ${element.region} ${element.country}`, colours.reset);
        // });

    }
  };


//   Functions functions, who's got the functions?

function runner(){
    
    console.clear(); // clears the screen 
    
    console.log( colours.fg.white, colours.bg.cyan, `   Hawkwynd Radio Monitor   `, colours.reset);

    const dt = new Date();
    
    getJSON( hawkwyndRadio.url + "/" + hawkwyndRadio.path + "?sid=" + hawkwyndRadio.sid + '&mode=' + hawkwyndRadio.mode + '&pass=' + hawkwyndRadio.pass).then( function(resp) {
        
        let server     = Object.assign({}, resp); // clone resp so we don't kill the object when deleting listener and songs
        var serverStat = getserverStats(server);

        console.log( colours.fg.cyan, `Now Playing:`, colours.fg.white, `${resp.songtitle}`, colours.reset);
        
    // -----------------------------------------------
    // If we have listeners, do processing of the data
    // -----------------------------------------------

    if( resp.uniquelisteners > 0 ) {

      var label = resp.uniquelisteners > 1 ? "Listeners" : "Listener";

      // console.log( colours.fg.cyan, `Avg time:   ` , colours.fg.white, `${secondsToHms(serverStat.averagetime)}`, colours.reset);
      console.log( colours.fg.cyan, `${label}:   `,  colours.fg.white, `${resp.uniquelisteners}` , colours.reset);
      console.log( colours.fg.white, `-----------------------------------`, colours.reset );
      // console.log( colours.fg.white, `...................................`, colours.reset );
      
      var listeners = getListeners(resp);

      // remove duplicate array elements
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
      
      
      // ---------------------------------------------------------------------------
      // Iterate array of listener and throw the data to the handleResponse function
      // ---------------------------------------------------------------------------

      for( let listener of result){
       
        // do we have a match in mysql table?
        lookupListener( listener.hostname , function ( err, result ){
            
            // we got a result back which means we have seen this hostname before
            // so dont bother using geoip on it, use the mysql result so conserve bandwidth
            // and keep our application in house.

            if( err ){
                console.log( 'lookupListener function error result ' + err  )
            }

            if ( result.length > 0 && (result[0].hasOwnProperty('city') ) ){
                handleResponse( result[0], listener )
            }else{

                // do the geo on the hostname because we don't have the hostname in the 
                // mysql table yet. 

                Reader.open('maxmindGeoLite/GeoLite2-City.mmdb', options).then( reader => {
                    handleResponse( reader.city( listener.hostname), listener );
                });


            }


        
        
        })


      }

      
    }else{
      
      // There are no listeners.
      console.log( colours.fg.red, `${resp.uniquelisteners} listeners.` , colours.reset );

    }
           



}).catch(function(error){
    console.log(error);
})



}


runner();
// loop it every X milliseconds 60000 = 1 minute
setInterval( runner, 60000);


// --------- FUNCTION FUNCTION, WHAT'S YOUR FUNCTION?? ------------

function lookupListener( hostname, callback ) {

    var con = mysql.createConnection( db );
    var sql = "SELECT * FROM listeners WHERE hostname in(?)";
    let q = con.query( sql, hostname, (error, result )=> {
        
        if(error){
            console.log( q.sql )
            console.error( error.message )
        }
        
        // console.log( result )
        // By convention, in Nodejs we always pass an error object first in the callback. 
        // In this case since there is no error to capture, we pass null in its place.

        callback (null, result )

        
    })   
    // shut the door on your way out, else you 
    // get too many connection errors.

    con.end()
}


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
     var con       = mysql.createConnection( db );
     var rightNow  = moment( Date.now()).format('YYYY-MM-DD HH:mm:ss' );

     var values = [
            listener.hostname, 
            rightNow, 
            listener.connecttime, 
            listener.city, 
            listener.region, 
            listener.country,
            listener.useragent, 
            listener.referer,
            listener.latitude,
            listener.longitude,
            rightNow, 
            listener.connecttime,  
            listener.useragent 
    ]
      
      var newSql = "INSERT INTO listeners ( hostname, timestamp, connecttime, city, region, country, useragent, referrer, latitude, longitude ) VALUES ( ?,?,?,?,?,?,?,?,?,? ) ON DUPLICATE KEY UPDATE timestamp=?, connecttime=?, useragent=?";

      let q = con.query( newSql, values, (error, result)=>{
             if(error){
                 console.log( q.newSql )
                 console.error( error.message )
             }
         })   

    // console.log( q.sql )
    con.end(function(e){
        // console.log('Connection ended.')
    })
}




function mysql_real_escape_string (str) {
    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
        switch (char) {
            case "\0":
                return "\\0";
            case "\x08":
                return "\\b";
            case "\x09":
                return "\\t";
            case "\x1a":
                return "\\z";
            case "\n":
                return "\\n";
            case "\r":
                return "\\r";
            case "\"":
            case "'":
            case "\\":
            case "%":
                return "\\"+char; // prepends a backslash to backslash, percent,
                                  // and double/single quotes
            default:
                return char;
        }
    });
  }

  function handleResponse( data, listener ) {
    

    // console.log( data );

        // console.log( data.city.hasOwnProperty('names') ? 'Found a city name' : 'Unknown City' )
        //  console.log(data )
        // if we get data from the local mysql lookup, we will use that instead of 
        // data from the geoip results, which would be empty anyway because we 
        // didn't obtain that call because we already have the data from mysql
        
        const dt                = new Date();
        
        listener.timestamp      = dt.toLocaleString();
        listener.connecttime    = secondsToHms(listener.connecttime);
        // console.log( data.city );
        listener.city           = data.hasOwnProperty('city') && ( data.city.length > 1 ) ?  data.city : "Unknown" 
        listener.city           = data.hasOwnProperty('city') && (data.city.hasOwnProperty('names')) ? data.city.names.en : listener.city
        listener.region         = data.hasOwnProperty('region') ? data.region : data.subdivisions.length < 1 ? "Unknown" : data.subdivisions[0].isoCode
        listener.referer        = listener.referer == '' ? 'DNAS' : 'HTML'
        listener.country        = data.hasOwnProperty('country') ? ( data.country.hasOwnProperty('isoCode') ? data.country.isoCode : data.country) : data.country 
        listener.latitude       = data.hasOwnProperty('latitude') ? data.latitude : data.hasOwnProperty('location') ? data.location.latitude : '0';
        listener.longitude      = data.hasOwnProperty('longitude') ? data.longitude : data.hasOwnProperty('location') ? data.location.longitude : '0';
            
        // max length for useragent = 10 characters
        listener.useragent      = listener.useragent.substr(0, 10)

        // drop unwanted keys, since we don't use them
        delete listener.uid;
        delete listener.xff;
        delete listener.triggers;
        delete listener.type;
        delete listener.grid

        // update or insert our listener record
        insertMysql( listener );  
        
        // throw the pretty row to the console
        
        // console.log( colours.fg.white,  listener.connecttime, '\t' + listener.city + ', ' + listener.region +' '+ listener.country, `\t` ,listener.referer, listener.useragent, colours.reset )
        console.log( colours.fg.white,  listener.city +',' + listener.region , listener.country , colours.fg.yellow, listener.useragent, colours.fg.green, listener.connecttime, colours.reset )
}  