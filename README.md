# D3.js-London-User-Group

Talks & code for the London D3.js user group.

### Running this
To run this you'll need to run the `setup.py` script that comes with
[Tornado][1], and then run `go.py` from the root directory, which will spawn
a webserver on port 8000 by default (change this with --port=nnnn)

Then navigate to [localhost:8000](http://localhost:8000) in your [WebSocket-capable][2]
web browser of choice.

### What's here so far?
1. Code for streaming realtime charts with D3 + WebSockets, with the server end in Python (using Tornado).
1. There is no #2.

[1]: http://www.tornadoweb.org
[2]: http://caniuse.com/websockets
