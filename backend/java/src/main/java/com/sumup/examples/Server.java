package com.sumup.examples;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sumup.sdk.SumUpClient;
import com.sumup.sdk.SumUpEnvironment;
import com.sumup.sdk.models.CheckoutCreateRequest;
import com.sumup.sdk.models.Currency;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.util.Map;
import java.util.UUID;

public class Server {
  private static final ObjectMapper MAPPER = new ObjectMapper();

  public static void main(String[] args) throws Exception {
    String apiKey = System.getenv("SUMUP_API_KEY");
    String merchantCode = System.getenv("SUMUP_MERCHANT_CODE");

    if (apiKey == null || apiKey.isBlank()) {
      throw new IllegalStateException("Missing SUMUP_API_KEY env var.");
    }

    if (merchantCode == null || merchantCode.isBlank()) {
      throw new IllegalStateException("Missing SUMUP_MERCHANT_CODE env var.");
    }

    SumUpClient client =
        SumUpClient.builder().environment(SumUpEnvironment.PRODUCTION).accessToken(apiKey).build();

    int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
    HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);

    server.createContext(
        "/checkouts", exchange -> handleCreateCheckout(exchange, client, merchantCode));
    server.setExecutor(null);
    server.start();

    System.out.println("Java server listening on http://localhost:" + port);
  }

  private static void handleCreateCheckout(
      HttpExchange exchange, SumUpClient client, String merchantCode) throws IOException {
    if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
      exchange.sendResponseHeaders(404, -1);
      return;
    }

    double amount;
    try (InputStream body = exchange.getRequestBody()) {
      Map<String, Object> payload = MAPPER.readValue(body, Map.class);
      Object amountValue = payload.get("amount");
      amount = amountValue instanceof Number ? ((Number) amountValue).doubleValue() : Double.NaN;
    } catch (Exception e) {
      sendJson(exchange, 400, Map.of("error", "invalid json"));
      return;
    }

    if (!Double.isFinite(amount) || amount <= 0) {
      sendJson(exchange, 400, Map.of("error", "amount must be a positive number"));
      return;
    }

    try {
      CheckoutCreateRequest request =
          CheckoutCreateRequest.builder()
              .amount((float) amount)
              .currency(Currency.EUR)
              .checkoutReference("checkout-" + UUID.randomUUID())
              .merchantCode(merchantCode)
              .build();

      var checkout = client.checkouts().createCheckout(request);
      sendJson(exchange, 201, checkout);
    } catch (Exception e) {
      e.printStackTrace();
      sendJson(exchange, 500, Map.of("error", "failed to create checkout"));
    }
  }

  private static void sendJson(HttpExchange exchange, int status, Object payload)
      throws IOException {
    byte[] body = MAPPER.writeValueAsBytes(payload);
    exchange.getResponseHeaders().set("Content-Type", "application/json");
    exchange.sendResponseHeaders(status, body.length);
    try (OutputStream os = exchange.getResponseBody()) {
      os.write(body);
    }
  }
}
