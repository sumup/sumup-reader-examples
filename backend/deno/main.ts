import SumUp from "@sumup/sdk";

const apiKey = Deno.env.get("SUMUP_API_KEY");
const merchantCode = Deno.env.get("SUMUP_MERCHANT_CODE");

if (!apiKey) {
  console.error("Missing SUMUP_API_KEY env var.");
  Deno.exit(1);
}

if (!merchantCode) {
  console.error("Missing SUMUP_MERCHANT_CODE env var.");
  Deno.exit(1);
}

const client = new SumUp({ apiKey });

const port = Number(Deno.env.get("PORT") ?? "8080");

function parseAmount(value: unknown) {
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

Deno.serve({ port }, async (req) => {
  const url = new URL(req.url);
  const segments = url.pathname.split("/").filter(Boolean);

  if (segments.length === 1 && segments[0] === "readers") {
    if (req.method === "GET") {
      try {
        const readers = await client.readers.list(merchantCode);
        return Response.json(readers);
      } catch (error) {
        console.error("Failed to list readers:", error);
        return Response.json({ error: "failed to list readers" }, {
          status: 500,
        });
      }
    }

    if (req.method !== "POST") {
      return new Response("Not found", { status: 404 });
    }

    let payload: { pairing_code?: string; name?: string };
    try {
      payload = (await req.json()) as { pairing_code?: string; name?: string };
    } catch {
      return Response.json({ error: "invalid json" }, { status: 400 });
    }

    const pairingCode = String(payload.pairing_code ?? "").trim();
    const name = String(payload.name ?? "").trim();
    if (!pairingCode || !name) {
      return Response.json(
        { error: "pairing_code and name are required" },
        { status: 400 },
      );
    }

    try {
      const reader = await client.readers.create(merchantCode, {
        pairing_code: pairingCode,
        name,
      });

      return Response.json(reader, { status: 201 });
    } catch (error) {
      console.error("Failed to create reader:", error);
      return Response.json({ error: "failed to create reader" }, {
        status: 500,
      });
    }
  }

  if (
    segments.length === 3 && segments[0] === "readers" &&
    segments[2] === "checkout"
  ) {
    if (req.method !== "POST") {
      return new Response("Not found", { status: 404 });
    }

    let payload: { amount?: number };
    try {
      payload = (await req.json()) as { amount?: number };
    } catch {
      return Response.json({ error: "invalid json" }, { status: 400 });
    }

    const totalAmount = parseAmount(payload.amount);
    if (!totalAmount) {
      return Response.json({ error: "amount must be a positive number" }, {
        status: 400,
      });
    }

    const readerId = segments[1];
    if (!readerId) {
      return Response.json({ error: "readerId is required" }, { status: 400 });
    }

    try {
      const checkout = await client.readers.createCheckout(
        merchantCode,
        readerId,
        {
          total_amount: totalAmount,
          description: "Card reader checkout",
        },
      );

      return Response.json(checkout, { status: 201 });
    } catch (error) {
      console.error("Failed to create reader checkout:", error);
      return Response.json({ error: "failed to create reader checkout" }, {
        status: 500,
      });
    }
  }

  return new Response("Not found", { status: 404 });
});

console.log(`Deno server listening on http://localhost:${port}`);
