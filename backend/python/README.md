# Python example

## Setup

```sh
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

```sh
export SUMUP_API_KEY="your_api_key"
export SUMUP_MERCHANT_CODE="your_merchant_code"
```

## Run

```sh
python app.py
```

## Test

```sh
curl -X POST http://localhost:8080/readers \
  -H "Content-Type: application/json" \
  -d '{"pairing_code":"12345678","name":"Front Desk"}'
```

```sh
curl http://localhost:8080/readers
```

```sh
curl -X POST http://localhost:8080/readers/READER_ID/checkout \
  -H "Content-Type: application/json" \
  -d '{"amount": 10.0}'
```
