import sys
import os

# Under cPanel Passenger, this file bootstraps the FastAPI/Uvicorn app using the WSGI/ASGI wrapper.
# Since Passenger expects a 'application' variable representing a WSGI app,
# we wrap the FastAPI ASGI application with the a2wsgi WSGI middleware converter if needed,
# or direct passenger to use an ASGI server config.

sys.path.insert(0, os.path.dirname(__file__))

from app.main import app

# Standard entry point for Passenger (using a2wsgi converter if installed on cPanel node, 
# or standard ASGI application if running directly via python selector)
application = app
