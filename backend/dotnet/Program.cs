using System.Text.Json.Serialization;
using SumUp;

var apiKey = Environment.GetEnvironmentVariable("SUMUP_API_KEY");
var merchantCode = Environment.GetEnvironmentVariable("SUMUP_MERCHANT_CODE");

if (string.IsNullOrWhiteSpace(apiKey))
{
    throw new InvalidOperationException("Missing SUMUP_API_KEY env var.");
}

if (string.IsNullOrWhiteSpace(merchantCode))
{
    throw new InvalidOperationException("Missing SUMUP_MERCHANT_CODE env var.");
}

using var client = new SumUpClient(new SumUpClientOptions
{
    AccessToken = apiKey,
});

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapPost("/readers", async (CreateReaderRequest request) =>
{
    if (string.IsNullOrWhiteSpace(request.PairingCode) || string.IsNullOrWhiteSpace(request.Name))
    {
        return Results.BadRequest(new { error = "pairing_code and name are required" });
    }

    var readerResponse = await client.Readers.CreateAsync(
        merchantCode,
        new ReadersCreateRequest
        {
            PairingCode = request.PairingCode.Trim(),
            Name = request.Name.Trim(),
        }
    );

    return Results.Created($"/readers/{readerResponse.Data?.Id}", readerResponse.Data);
});

app.MapGet("/readers", async () =>
{
    var readersResponse = await client.Readers.ListAsync(merchantCode);
    return Results.Ok(readersResponse.Data);
});

app.MapPost("/readers/{readerId}/checkout", async (string readerId, CreateReaderCheckoutRequestBody request) =>
{
    if (request.Amount <= 0)
    {
        return Results.BadRequest(new { error = "amount must be a positive number" });
    }

    var checkoutResponse = await client.Readers.CreateCheckoutAsync(
        merchantCode,
        readerId,
        new CreateReaderCheckoutRequest
        {
            Description = "Card reader checkout",
            TotalAmount = new CreateReaderCheckoutRequestTotalAmount
            {
                Currency = "EUR",
                MinorUnit = 2,
                Value = (int)Math.Round(request.Amount * 100),
            },
        }
    );

    return Results.Created($"/readers/{readerId}/checkout", checkoutResponse.Data);
});

var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
app.Urls.Add($"http://localhost:{port}");

app.Run();

internal sealed record CreateReaderRequest(
    [property: JsonPropertyName("pairing_code")] string PairingCode,
    [property: JsonPropertyName("name")] string Name
);

internal sealed record CreateReaderCheckoutRequestBody(
    [property: JsonPropertyName("amount")] double Amount
);
