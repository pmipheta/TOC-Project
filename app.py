"""Flask application entry point and HTTP routes."""

from flask import Flask, jsonify, render_template, request

from backend.masking import RULES, mask_data, mask_email, mask_with_highlights

app = Flask(__name__)


@app.get("/")
def index():
    """Render the masking form."""
    return render_template("index.html")


@app.post("/mask")
def mask():
    """Mask submitted form text and render the result page."""
    original = request.form.get("data", "").replace("\r\n", "\n").replace("\r", "\n")
    masked = mask_with_highlights(original)
    return render_template(
        "index.html",
        original=original,
        mask_text=masked["text"],
        highlights={
            "input_spans": masked["input_spans"],
            "output_spans": masked["output_spans"],
        },
    )


@app.post("/highlight")
def highlight():
    """Return masking-rule matches for live input highlighting."""
    if not request.is_json:
        return jsonify(error="Expected application/json"), 415

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or not isinstance(payload.get("text"), str):
        return jsonify(error="Expected a JSON object with a text string"), 400

    return jsonify(input_spans=mask_with_highlights(payload["text"])["input_spans"])


if __name__ == "__main__":
    app.run(debug=True)
