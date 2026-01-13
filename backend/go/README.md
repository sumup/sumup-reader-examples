# Go example

## Setup

```sh
export SUMUP_API_KEY="your_api_key"
export SUMUP_MERCHANT_CODE="your_merchant_code"
```

## Run

```sh
go run .
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
