const backendInput = document.getElementById("backend-url");
const pairingCodeInput = document.getElementById("pairing-code");
const readerNameInput = document.getElementById("reader-name");
const linkButton = document.getElementById("link-reader");
const refreshButton = document.getElementById("refresh-readers");
const readersList = document.getElementById("readers-list");
const amountInput = document.getElementById("amount");
const messageDiv = document.getElementById("message");
const loadingDiv = document.getElementById("loading");

const DEFAULT_BACKEND_URL = "http://localhost:8080";

const backendFromQuery = new URLSearchParams(window.location.search).get(
  "backend",
);
if (backendFromQuery) {
  backendInput.value = backendFromQuery;
} else {
  backendInput.value = DEFAULT_BACKEND_URL;
}

function showMessage(text, type) {
  messageDiv.textContent = text;
  messageDiv.className = `message ${type}`;
  messageDiv.style.display = "block";
}

function hideMessage() {
  messageDiv.style.display = "none";
  messageDiv.textContent = "";
  messageDiv.className = "message";
}

function setLoading(isLoading, label = "Working...") {
  loadingDiv.textContent = label;
  loadingDiv.style.display = isLoading ? "block" : "none";
  linkButton.disabled = isLoading;
  refreshButton.disabled = isLoading;
}

function backendBase() {
  return backendInput.value.trim() || DEFAULT_BACKEND_URL;
}

function resolveTransactionId(payload) {
  return (
    payload?.data?.client_transaction_id || payload?.data?.clientTransactionId
  );
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error || "Request failed";
    throw new Error(message);
  }

  return payload;
}

function renderReaders(items) {
  readersList.innerHTML = "";

  if (!items || items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No readers linked yet.";
    readersList.append(empty);
    return;
  }

  items.forEach((reader) => {
    const item = document.createElement("div");
    item.className = "reader-item";

    const name = reader?.name || "Unnamed reader";
    const status = reader?.status || "unknown";

    item.innerHTML = `
      <div class="reader-details">
        <h3>${name} <span class="badge">${status}</span></h3>
        <p class="meta">ID: ${reader?.id || "N/A"}</p>
      </div>
      <button type="button" class="checkout-button" data-reader-id="${reader?.id}">Start checkout</button>
    `;

    readersList.append(item);
  });
}

async function loadReaders() {
  setLoading(true, "Loading readers...");
  hideMessage();

  try {
    const payload = await fetchJson(
      new URL("/readers", backendBase()).toString(),
    );
    renderReaders(payload?.items || []);
  } catch (error) {
    showMessage(`Error: ${error.message}`, "error");
  } finally {
    setLoading(false);
  }
}

linkButton.addEventListener("click", async () => {
  const pairingCode = pairingCodeInput.value.trim();
  const name = readerNameInput.value.trim();

  if (!pairingCode || !name) {
    showMessage("Please provide a pairing code and a reader name.", "error");
    return;
  }

  setLoading(true, "Linking reader...");
  hideMessage();

  try {
    await fetchJson(new URL("/readers", backendBase()).toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pairing_code: pairingCode, name }),
    });

    pairingCodeInput.value = "";
    readerNameInput.value = "";
    showMessage("Reader linked successfully.", "success");
    await loadReaders();
  } catch (error) {
    showMessage(`Error: ${error.message}`, "error");
  } finally {
    setLoading(false);
  }
});

refreshButton.addEventListener("click", () => {
  loadReaders();
});

backendInput.addEventListener("change", () => {
  loadReaders();
});

readersList.addEventListener("click", async (event) => {
  const button = event.target.closest(".checkout-button");
  if (!button) {
    return;
  }

  const readerId = button.dataset.readerId;
  if (!readerId) {
    showMessage("Reader ID missing.", "error");
    return;
  }

  const amount = Number.parseFloat(amountInput.value);
  if (!Number.isFinite(amount) || amount <= 0) {
    showMessage("Please enter a valid amount.", "error");
    return;
  }

  setLoading(true, "Starting checkout...");
  hideMessage();

  try {
    const payload = await fetchJson(
      new URL(`/readers/${readerId}/checkout`, backendBase()).toString(),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount }),
      },
    );

    const transactionId = resolveTransactionId(payload);
    if (transactionId) {
      showMessage(
        `Checkout started. Transaction ID: ${transactionId}`,
        "success",
      );
    } else {
      showMessage("Checkout started on reader.", "success");
    }
  } catch (error) {
    showMessage(`Error: ${error.message}`, "error");
  } finally {
    setLoading(false);
  }
});

loadReaders();
