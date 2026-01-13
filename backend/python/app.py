import os

from flask import Flask, jsonify, request
from sumup import Sumup
from sumup.readers import CreateReaderBody, CreateReaderCheckoutBody, CreateReaderCheckoutBodyTotalAmount

api_key = os.environ.get("SUMUP_API_KEY")
merchant_code = os.environ.get("SUMUP_MERCHANT_CODE")

if not api_key:
    raise SystemExit("Missing SUMUP_API_KEY env var.")

if not merchant_code:
    raise SystemExit("Missing SUMUP_MERCHANT_CODE env var.")

client = Sumup(api_key=api_key)

app = Flask(__name__)


def parse_amount(value):
    try:
        amount = float(value)
    except (TypeError, ValueError):
        return None

    if amount <= 0:
        return None

    return CreateReaderCheckoutBodyTotalAmount(currency="EUR", minor_unit=2, value=round(amount * 100))


@app.post("/readers")
def create_reader():
    data = request.get_json(silent=True) or {}
    pairing_code = str(data.get("pairing_code", "")).strip()
    name = str(data.get("name", "")).strip()

    if not pairing_code or not name:
        return jsonify({"error": "pairing_code and name are required"}), 400

    reader = client.readers.create(
        merchant_code,
        body=CreateReaderBody(pairing_code=pairing_code, name=name),
    )

    if hasattr(reader, "model_dump"):
        payload = reader.model_dump()
    else:
        payload = reader.dict()

    return jsonify(payload), 201


@app.get("/readers")
def list_readers():
    readers = client.readers.list(merchant_code)

    if hasattr(readers, "model_dump"):
        payload = readers.model_dump()
    else:
        payload = readers.dict()

    return jsonify(payload)


@app.post("/readers/<reader_id>/checkout")
def create_reader_checkout(reader_id):
    data = request.get_json(silent=True) or {}
    total_amount = parse_amount(data.get("amount"))

    if not total_amount:
        return jsonify({"error": "amount must be a positive number"}), 400

    checkout = client.readers.create_checkout(
        merchant_code,
        reader_id,
        body=CreateReaderCheckoutBody(
            total_amount=total_amount,
            description="Card reader checkout",
        ),
    )

    if hasattr(checkout, "model_dump"):
        payload = checkout.model_dump()
    else:
        payload = checkout.dict()

    return jsonify(payload), 201


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    app.run(host="0.0.0.0", port=port)
