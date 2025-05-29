<?php

if (isset($argc)) {

    $title  = $argv[1];
    $artist = $argv[2];
    
    if( strpos($artist, 'Hawkwynd Radio') == false )
    {
        $default = "Received $title by $artist";
        
        $fields = [
            'title' => $title,
            'action' => 'soapUpdatePlays'
        ];
        
        $postdata = http_build_query( $fields );
        
        $ch = curl_init();
        curl_setopt($ch,CURLOPT_URL, 'http://stream.hawkwynd.com/keep/index.php');
        curl_setopt($ch,CURLOPT_POST, true);
        curl_setopt($ch,CURLOPT_POSTFIELDS, $postdata);
        curl_setopt($ch,CURLOPT_RETURNTRANSFER, true);
        
        $result = curl_exec($ch);
        $output = json_decode( $result, true );
        
        if( $output !== null && array_key_exists('id', $output) )
        {
            echo "(", $output['title'], ") plays:", $output['plays'], " last played:", $output['last_played'];
            
        } else{
            echo $default, " --  Check this song and update metadata."; 
        }
        
    }
        
    exit;
}