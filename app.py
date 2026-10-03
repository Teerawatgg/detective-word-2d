"""Detective Word 2D — web server.

The whole game runs in the browser. This server only sends two things:
  /          templates/index.html
  /static/…  the CSS and JavaScript in static/

Run locally:  python app.py   then open http://127.0.0.1:5000
On Vercel, vercel.json sends every request to this same app.
"""
from flask import Flask, render_template

app = Flask(__name__)


@app.after_request
def disable_browser_cache(response):
    """Always serve the newest files.

    The game is updated often and played on shared classroom machines, so a
    browser must never keep an old copy of a script or of the stylesheet.
    """
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


@app.get("/")
def index():
    return render_template("index.html")


if __name__ == "__main__":
    app.run(debug=True)
