#!/usr/bin/liquidsoap

# turn on logging, and open connections to telnet 1234
set("log.level", 3 ) # 3 is default
set("log.file.path","scheduled-radio.log")
set("server.telnet", true)
set("server.telnet.port", 1234)
set("harbor.bind_addr","0.0.0.0") 
set("harbor.timeout",60.)


# ***** FUNCTIONS **********

# When a new track begins, display alert
def new_track_alert( m ) =
  
  artist  = m["artist"]
  title   = m["title"]

  result = list.hd(  get_process_lines("/usr/bin/php info.php '#{title}' '#{artist}'" ) )

  log( label="Jarvis",  "--=== Now Playing: #{title} [ #{artist} ] ===--")
  log( label="Jarvis PHP", "#{result}" )

end

# Add skip command 
def add_skip_command(~command,s)
	server.register(
		usage="skip",
		description="Skip the current song in source.",
		command,
		fun(_) -> begin source.skip(s) "Skipped current playing song." end
	)
end

# For requests, add variable 'request_m' after the metadata
# def append_title_request(m) =
#   # Grab the current title
#   title     = m["title"]
#   # Set string to append to title
#   request_m = "[By Request]"

#   # return new title 
#   [("title","#{title} #{request_m}")]

# end

# ******* END FUNCTIONS **********

# set("harbor.icy_formats",["audio/mpeg","audio/aacp","audio/aac","audio/x-aac","audio/wav","audio/wave","audio/x-flac"])

# Turn back on if levels are out of whack
# enable liquidsoap to read mp3 metadata "REPLAY_GAIN" values

enable_replaygain_metadata()

# --------------------------------------------------------------------------------
# MainStream List reload=0 means never. Only reload when changes made to file.
# --------------------------------------------------------------------------------

MainStream  = playlist( id="main", mode="randomize", reload_mode="watch", reload=0, mime_type="audio/x-mpegurl", "/home/scott/radio/playlists/main.m3u" )
# MainStream  = playlist( id="main", mode="randomize", reload_mode="watch", reload=0, mime_type="audio/x-mpegurl", "/home/scott/Music/Christmas" )


# nrj: Compress and normalize, producing a more uniform and “full” sound.
jingles  = nrj( audio_to_stereo( playlist( id="jingles", mode="randomize", reload_mode="watch", reload=0,mime_type="audio/x-mpegurl", "/home/scott/Music/jingles") ) )


# define our station identifier Top Of The Hour
# ============================================
radioId             =  "/home/scott/radio/hawkad1.mp3"
bell4x              = "/home/scott/radio/bell-4x-short.mp3"

# Rush Hour Promo Jingle
rushHrPromoJingle   = single("/home/scott/radio/promos/Rush Hour - promo.flac")
bluesHrPromoJingle  = single("/home/scott/radio/promos/blues-hour-hawkwynd-radio.flac")
breakfastBeatles    = single("/home/scott/radio/promos/breakfast-with-beatles.flac")
# that_70s_hour_promo = single("/home/scott/radio/promos/that_70s_hour_promo.flac")

# define our station identifier track
clock = single( radioId )

# define 4:20 bell
bell  = single( bell4x )

# set our requests id, to accept requests the LR
requests = request.queue( id="requested" )

# Add string to title of a requested song [By Request]
# requests = map_metadata( append_title_request, requests )

# Live Stream input from MIXXX with a 0.5 second buffer 60s max for Friday Night Live
live = input.harbor( "live", port=8080, password="hackme", buffer=0.5, max=60.0 )

# Microphone (Speak over music) for announcements.
# micm = "http://hawkwynd.com:8000/listen.pls?sid=2"
# Buffer
# mic_buffer      = 2.
# mic_buffer_max  = 10.
# Volume
# background_volume = .25


# connection details
# microphone = nrj(audio_to_stereo(input.http(buffer=mic_buffer,max=mic_buffer_max, micm)))

# Band Playlists random selected by Jarvis
# ========================================

Beatles     = playlist( id="Beatles",mode="randomize",reload_mode="watch",reload=0,mime_type="audio/x-mpegurl", "/home/scott/Music/The Beatles" )
RushHr      = playlist( id="RushHr",mode="randomize",reload_mode="watch",reload=0,mime_type="audio/x-mpegurl", "/home/scott/radio/playlists/rush-hour.m3u" )
Blues       = playlist( id="Blues", mode="randomize", reload_mode="watch", reload=0, mime_type="audio/x-mpegurl","/home/scott/radio/playlists/blues.m3u")
Trifecta    = playlist( id="Trifecta", mode="normal", reload_mode="watch", reload=0, mime_type="audio/x-mpegurl","/home/scott/radio/playlists/trifecta.m3u")
RamseyLewis = playlist( id="RamseyLewis", mode="randomize", reload_mode="watch", reload=0, mime_type="audio/x-mpegurl", "/home/scott/Music/Ramsey_Lewis")

# A stream from another source, or shoutcast/Icecast server

# FreqCastSource = mksafe( input.http( max=25., "http://116.202.246.47:8504" ) )
# 
# output.dummy( id="DUMMY_STREAM_OUTPUT", fallible=true, FreqCastSource )


# Rotating Mainstream playlist (ever-growing)
# ===========================================

# rotation 
rotating    = rotate( weights = [ 1, 3 ], [ jingles, MainStream  ] )

# set up play for radio, do not interupt current track playing
# for requests, jingles. If a broadcast comes in from

# live feed, start immediately on song change, and at the end, return to rotating
# uncomment this line, and add greystone to the list of sources if you ever do a live show remotely.
# greystone = input.http("http://hawkwynd.com:8000/listen.pls?sid=2")
# password for greystone: scootre:#2


radio = fallback( track_sensitive = true,
  [ live, requests, switch( 
    [

        ####################### Regular Scheduling ##################
            
            # Trifecta plays at 2hr intervals
            # 15 minute window for Trifectas 
            

            ({ (08h-08h15m) }, Trifecta ),    
            # ({ (10h-10h15m) }, Trifecta ),    
            ({ (12h-12h15m) }, Trifecta ),    
            # ({ (14h-14h15m) }, Trifecta ),    
            ({ (16h-16h15m) }, Trifecta ),    
            # ({ (20h-20h15m) }, Trifecta ),    
            # ({ (22h-22h15m) }, Trifecta ),    
            # ({ (0h-0h15m) }, Trifecta ), 


            # Saturday & Sunday 6am-7am Ramsey Lewis hour
            ( { (6w-0w) and 06h-07h }, rotate( weights=[1, 3 ],[ jingles, RamseyLewis  ] )), 
            
            # Sunday 8a-10am Breakfast With the Beatles
            ({ (0w) and 08h-10h }, rotate( weights=[ 1, 3 ],[ breakfastBeatles, Beatles ] )),
            
            # Sunday 12-2pm The Blues Hour
            ({ (0w) and 12h-14h } , rotate( weights=[ 1, 3 ],[ bluesHrPromoJingle, Blues ] ) ),

            ### M-F Weekday Schedule ###

            # 5:15pm - 6:15pm   - Hawkwynd Radio Rush Hour
            ( { ( 1w-5w ) and 17h15m-18h15m }, rotate( weights=[ 1, 3 ],[ rushHrPromoJingle, RushHr ] ) ),
            
            # 11pm - midnight - Ramsey Lewis Hour
            ( {( 1w-5w) and 23h0m-0h0m }, rotate(weights=[1,3], [jingles, RamseyLewis])),

            # test 1230 - 1245 Tuesday relay of Frequency Cast UK stream 
            # ( { (6w) and 12h0m-12h15m }, FreqCastSource )

        
    ]
    ),
        # All other times/days play main playlist, track sensitive to requests and live feed.
        rotating
])

# radio = notify_metadata( urgency="low", icon="stock_smiley-22", title="Jarvis - Now Playing", time=3000, radio )

# When a new track is loaded, display OSD of now playing
radio = on_track( id="playlist", new_track_alert, radio )

# queue_when_this_amount_is_left = 5.

# radio = on_end( delay=queue_when_this_amount_is_left , my_php_func, radio )

# At the top of the hour, play a specific radio identifier over the playing track
radio  = add([ radio, switch( [ ( {0m0s}, clock ) ] ) ] )

# 16:20:00 play bell ring file over the playing track
radio  = add([ radio, switch( [ ( {16h20m0s}, bell ) ] ) ] )

# Talk over stream using microphone mount.
# radio = smooth_add(delay=0.8, p=background_volume, normal=radio, special=microphone)

# Normalize the playback of our stream
radio = normalize( radio )

# Add a skip command for use via telnet
add_skip_command( command="skip", radio )

# Send to Shoutcast Server 
output.shoutcast(
    %mp3,
    host        = "35.174.26.109", 
    name        = "Hawkwynd Radio", 
    url         = "http://stream.hawkwynd.com", 
    genre       = "Classic Rock",  
    port        = 8000, 
    password    = "scootre",
    public      = true,
    fallible    = true,
    radio
)

# shoot it to the soundcard as well
out(radio)
