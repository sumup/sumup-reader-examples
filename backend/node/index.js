import SumUp from "@sumup/sdk";
import express from "express";

const apiKey = process.env.SUMUP_API_KEY;
const merchantCode = process.env.SUMUP_MERCHANT_CODE;

if (!apiKey) {
  console.error("Missing SUMUP_API_KEY env var.");
  process.exit(1);
}

if (!merchantCode) {
  console.error("Missing SUMUP_MERCHANT_CODE env var.");
  process.exit(1);
}

const client = new SumUp({ apiKey });

const app = express();
app.use(express.json());

function parseAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return {
    currency: "EUR",
    minor_unit: 2,
    value: Math.round(amount * 100),
  };
}

app.post("/readers", async (req, res) => {
  const pairingCode = String(req.body?.pairing_code ?? "").trim();
  const name = String(req.body?.name ?? "").trim();

  if (!pairingCode || !name) {
    return res
      .status(400)
      .json({ error: "pairing_code and name are required" });
  }

  try {
    const reader = await client.readers.create(merchantCode, {
      pairing_code: pairingCode,
      name,
    });

    return res.status(201).json(reader);
  } catch (error) {
    console.error("Failed to create reader:", error);
    return res.status(500).json({ error: "failed to create reader" });
  }
});

app.get("/readers", async (_req, res) => {
  try {
    const readers = await client.readers.list(merchantCode);
    return res.json(readers);
  } catch (error) {
    console.error("Failed to list readers:", error);
    return res.status(500).json({ error: "failed to list readers" });
  }
});

app.post("/readers/:readerId/checkout", async (req, res) => {
  const amount = parseAmount(req.body?.amount);
  if (!amount) {
    return res.status(400).json({ error: "amount must be a positive number" });
  }

  const readerId = String(req.params.readerId ?? "").trim();
  if (!readerId) {
    return res.status(400).json({ error: "readerId is required" });
  }

  try {
    const checkout = await client.readers.createCheckout(
      merchantCode,
      readerId,
      {
        total_amount: amount,
        description: "Card reader checkout",
      },
    );

    return res.status(201).json(checkout);
  } catch (error) {
    console.error("Failed to create reader checkout:", error);
    return res.status(500).json({ error: "failed to create reader checkout" });
  }
});

const port = Number(process.env.PORT) || 8080;
app.listen(port, () => {
  console.log(`Node server listening on http://localhost:${port}`);
});
