# Java example

## Setup

```sh
export SUMUP_API_KEY="your_api_key"
export SUMUP_MERCHANT_CODE="your_merchant_code"
```

## Run

```sh
gradle run
```

## Test

```sh
curl -X POST http://localhost:8080/checkouts \
  -H "Content-Type: application/json" \
  -d '{"amount": 10.0}'
```
