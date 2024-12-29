import os
import threading
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__)

# Global variables for score and time
score = {"home": 0, "away": 0}
start_time = None
paused = True
lock = threading.Lock()

# Define the path for the static files
BASE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../")


@app.route("/")
def index():
    return send_from_directory(os.path.join(BASE_DIR, "html"), "index.html")


@app.route("/<path:filename>.css")
def serve_css(filename):
    return send_from_directory(os.path.join(BASE_DIR, "css"), f"{filename}.css")


@app.route("/<path:filename>.js")
def serve_js(filename):
    return send_from_directory(os.path.join(BASE_DIR, "js"), f"{filename}.js")


@app.route("/score/home", methods=["POST"])
def score_home():
    global score
    data = request.get_json()
    points = data.get("points", 0)
    with lock:
        if score["home"] + points < 0:
            return jsonify({"error": "Score cannot go below 0."}), 400
        score["home"] += points
    return jsonify(score), 200


@app.route("/score/away", methods=["POST"])
def score_away():
    global score
    data = request.get_json()
    points = data.get("points", 0)
    with lock:
        if score["away"] + points < 0:
            return jsonify({"error": "Score cannot go below 0."}), 400
        score["away"] += points
    return jsonify(score), 200


@app.route("/score", methods=["GET"])
def get_score():
    return jsonify(score), 200


@app.route("/score/clean", methods=["POST"])
def clean():
    score["home"] = 0;
    score["away"] = 0;
    return jsonify(score), 200


@app.route("/refresh", methods=["GET"])
def refresh():
    global score
    with lock:
        score = {"home": 0, "away": 0}
    return jsonify(score), 200


@app.route("/time/start", methods=["POST"])
def start_time():
    global start_time, paused
    data = request.get_json()
    start_from = data.get("startFrom", 0)
    with lock:
        if paused:
            start_time = datetime.now() - timedelta(minutes=start_from)
            paused = False
    return time_status()

@app.route("/time/stop", methods=["POST"])
def stop_time():
    global start_time, paused
    with lock:
        start_time = None
        paused = True
    return time_status()


@app.route("/time/status", methods=["GET"])
def time_status():
    global start_time, paused
    with lock:
        if paused:
            return jsonify({"isRunning": False}), 200

        current_time = datetime.now() - start_time
        elapsed_minutes = int(current_time.total_seconds() / 60)
        return jsonify({"elapsedMins": elapsed_minutes + 1, "isRunning": True}), 200


if __name__ == "__main__":
    app.run(debug=True)
