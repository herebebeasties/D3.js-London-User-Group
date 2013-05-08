#!/usr/bin/env python

import logging
import tornado.escape
import tornado.ioloop
import tornado.options
import tornado.web
import tornado.websocket
import os.path
import uuid
import mimetypes
import threading
import time
import random
import signal
import sys

from tornado.options import define, options

define("port", default=8000, help="run on the given port", type=int)

class Point:
    def __init__(self, graph_id, timestamp, value):
        self.graph_id, self.timestamp, self.value = graph_id, timestamp, value

class Event:
    def __init__(self):
        self.handlers = set()

    def handle(self, handler):
        self.handlers.add(handler)
        return self

    def unhandle(self, handler):
        try:
            self.handlers.remove(handler)
        except:
            raise ValueError("Handler is not handling this event, so cannot unhandle it.")
        return self

    def fire(self, *args, **kargs):
        for handler in self.handlers:
            handler(*args, **kargs)

    def getHandlerCount(self):
        return len(self.handlers)

    __iadd__ = handle
    __isub__ = unhandle
    __call__ = fire
    __len__  = getHandlerCount

class Timeseries:
    def __init__(self):
        self.onAdd = Event()
        self.points = []
        self.max_size = 200
    
    def add(self, point):
        self.points.append(point)
        self.onAdd(point)
        if len(self.points) > self.max_size:
            self.points = self.points[-self.max_size:]

class Application(tornado.web.Application):
    def __init__(self):
        handlers = [
            (r"/GraphSocket", GraphSocketHandler),
            (r"/(.*)", OtherHandler),
        ]
        settings = dict(
            cookie_secret="afjdiwoehfu12hfiuwenfisndf",
            static_path=os.path.dirname(__file__),
            xsrf_cookies=True,
        )
        tornado.web.Application.__init__(self, handlers, **settings)

class OtherHandler(tornado.web.RequestHandler):
    def get(self, path):
        if not path:
            path = 'index.html'

        if not os.path.exists(path) or os.path.isdir(path):
            path = os.path.join(path, 'index.html')
        
        if not os.path.exists(path):
            raise tornado.web.HTTPError(404)

        mime_type = mimetypes.guess_type(path)
        self.set_header("Content-Type", mime_type[0] or 'text/plain')

        outfile = open(path)
        for line in outfile:
            self.write(line)
        self.finish()

waiters = set()
timeseries = Timeseries()

def send_updates(point):
    for waiter in waiters:
        try:
            waiter.write_message(point.__dict__)
        except:
            logging.error("Error sending message", exc_info=True)

def send_history(waiter):
    try:
        for point in timeseries.points:
            waiter.write_message(point.__dict__)
    except:
        logging.error("Error sending message", exc_info=True)


class GraphSocketHandler(tornado.websocket.WebSocketHandler):

    def allow_draft76(self):
        # for iOS 5.0 Safari
        return True

    def open(self):
        waiters.add(self)
        logging.info("connected")
        send_history(self)

    def on_close(self):
        waiters.remove(self)
        logging.info("disconnected")

    def on_message(self, message):
        logging.info("got ping %r", message)

class TimerClass(threading.Thread):
    def __init__(self, timeseries):
        threading.Thread.__init__(self)
        self.timeseries = timeseries
        self.event = threading.Event()
        self.current = 0

    def run(self):
        while not self.event.is_set():
            self.current += random.randrange(-2, 3);
            self.current = min(10, max(0, self.current))
            self.timeseries.add(Point("foo", time.time() * 1000, self.current))
            self.event.wait( 1 )

    def stop(self):
        self.event.set()

timer = []
timer = TimerClass(timeseries)

def main():
    tornado.options.parse_command_line()
    app = Application()
    app.listen(options.port)
    timeseries.onAdd += send_updates
    timer.start()
    signal.signal(signal.SIGINT, signal_handler)

    logging.info("Listening on http://localhost:%i/" % options.port)
    tornado.ioloop.IOLoop.instance().start()

def signal_handler(signal, frame):
    timer.stop()
    print ""
    sys.exit(0)

if __name__ == "__main__":
    main()