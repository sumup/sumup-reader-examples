use axum::{
    extract::Path,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::{env, net::SocketAddr};
use sumup::{readers, Client};

#[derive(Deserialize)]
struct CreateReaderRequest {
    pairing_code: String,
    name: String,
}

#[derive(Deserialize)]
struct CreateReaderCheckoutRequest {
    amount: f64,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

#[tokio::main]
async fn main() {
    let api_key = env::var("SUMUP_API_KEY").expect("Missing SUMUP_API_KEY env var.");
    let merchant_code =
        env::var("SUMUP_MERCHANT_CODE").expect("Missing SUMUP_MERCHANT_CODE env var.");

    let client = Client::new().with_authorization(&api_key);

    let app = Router::new()
        .route(
            "/readers",
            get({
                let client = client.clone();
                let merchant_code = merchant_code.clone();
                move || {
                    let client = client.clone();
                    let merchant_code = merchant_code.clone();
                    async move {
                        match client.readers().list(&merchant_code).await {
                            Ok(readers) => Ok((axum::http::StatusCode::OK, Json(readers))),
                            Err(err) => {
                                eprintln!("Failed to list readers: {err}");
                                Err((
                                    axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                                    Json(ErrorResponse {
                                        error: "failed to list readers".to_string(),
                                    }),
                                ))
                            }
                        }
                    }
                }
            })
            .post({
                let client = client.clone();
                let merchant_code = merchant_code.clone();
                move |Json(payload): Json<CreateReaderRequest>| {
                    let client = client.clone();
                    let merchant_code = merchant_code.clone();
                    async move {
                        let pairing_code = payload.pairing_code.trim();
                        let name = payload.name.trim();

                        if pairing_code.is_empty() || name.is_empty() {
                            return Err((
                                axum::http::StatusCode::BAD_REQUEST,
                                Json(ErrorResponse {
                                    error: "pairing_code and name are required".to_string(),
                                }),
                            ));
                        }

                        let body = readers::CreateReaderBody {
                            pairing_code: pairing_code.to_string(),
                            name: name.to_string(),
                            metadata: None,
                        };

                        match client.readers().create(&merchant_code, body).await {
                            Ok(reader) => Ok((axum::http::StatusCode::CREATED, Json(reader))),
                            Err(err) => {
                                eprintln!("Failed to create reader: {err}");
                                Err((
                                    axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                                    Json(ErrorResponse {
                                        error: "failed to create reader".to_string(),
                                    }),
                                ))
                            }
                        }
                    }
                }
            }),
        )
        .route(
            "/readers/{id}/checkout",
            post({
                let client = client.clone();
                let merchant_code = merchant_code.clone();
                move |Path(reader_id): Path<String>,
                      Json(payload): Json<CreateReaderCheckoutRequest>| {
                    let client = client.clone();
                    let merchant_code = merchant_code.clone();
                    async move {
                        if !payload.amount.is_finite() || payload.amount <= 0.0 {
                            return Err((
                                axum::http::StatusCode::BAD_REQUEST,
                                Json(ErrorResponse {
                                    error: "amount must be a positive number".to_string(),
                                }),
                            ));
                        }

                        let request = readers::CreateReaderCheckoutRequest {
                            total_amount: readers::Money {
                                currency: "EUR".into(),
                                minor_unit: 2,
                                value: (payload.amount * 100.0).round() as i64,
                            },
                            affiliate: None,
                            card_type: None,
                            description: Some("Card reader checkout".into()),
                            installments: None,
                            return_url: None,
                            tip_rates: None,
                            tip_timeout: None,
                        };

                        match client
                            .readers()
                            .create_checkout(&merchant_code, &reader_id, request)
                            .await
                        {
                            Ok(checkout) => Ok((axum::http::StatusCode::CREATED, Json(checkout))),
                            Err(err) => {
                                eprintln!("Failed to create reader checkout: {err}");
                                Err((
                                    axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                                    Json(ErrorResponse {
                                        error: "failed to create reader checkout".to_string(),
                                    }),
                                ))
                            }
                        }
                    }
                }
            }),
        );

    let port: u16 = env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse()
        .expect("PORT must be a valid number");

    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    println!("Rust server listening on http://{addr}");

    axum::serve(tokio::net::TcpListener::bind(addr).await.unwrap(), app)
        .await
        .unwrap();
}
