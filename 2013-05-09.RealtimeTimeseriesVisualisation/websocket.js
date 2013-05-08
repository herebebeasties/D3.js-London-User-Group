function WebSocketDataProvider(ws_url, func_process_json) {
    var connection = new WebSocket(ws_url);
    var ping_interval_millis = 2000;
    
    connection.onopen = function() {
        connection.send_keep = true;
        setTimeout(connection.ping, ping_interval_millis);
    };

    // Send a keep-alive ping every ping_interval ms,
    // when the connection is open
    connection.ping = function() {
        if (connection.readyState == connection.OPEN)
            connection.send('');
        if (connection.readyState != connection.CLOSED)
            setTimeout(connection.ping, ping_interval_millis);
    };

    // Handle message
    connection.onmessage = function(msg) {
        if (!msg.data) return;
        func_process_json(JSON.parse(msg.data));
    };

    // Log errors for diagnostics
    connection.onerror = function(error) {
        console.log('WebSocket error: ' + error);
    };

    // Reconnect if WebSocket dies
    connection.onclose = function(e) {
        console.log('WebSocket closed ' + (e.wasClean ? 'cleanly' : 'uncleanly'));
        setTimeout(function(){WebSocketDataProvider(ws_url, func_process_json);}, 5000);
    };
}
