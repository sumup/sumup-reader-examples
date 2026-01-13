import { useCallback, useEffect, useMemo, useState } from "react";

const DEFAULT_AMOUNT = "10.00";
const DEFAULT_BACKEND_URL = "http://localhost:8080";

function resolveTransactionId(payload) {
  return payload?.data?.client_transaction_id || payload?.data?.clientTransactionId;
}

export default function App() {
  const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND_URL);
  const [pairingCode, setPairingCode] = useState("");
  const [readerName, setReaderName] = useState("");
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [readers, setReaders] = useState([]);
  const [message, setMessage] = useState(null);
  const [loadingLabel, setLoadingLabel] = useState(null);

  const baseUrl = useMemo(() => backendUrl.trim() || DEFAULT_BACKEND_URL, [backendUrl]);

  const fetchJson = useCallback(async (path, options) => {
    const response = await fetch(new URL(path, baseUrl).toString(), options);
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const errorMessage = payload?.error || "Request failed";
      throw new Error(errorMessage);
    }

    return payload;
  }, [baseUrl]);

  const loadReaders = useCallback(async () => {
    setLoadingLabel("Loading readers...");
    setMessage(null);

    try {
      const payload = await fetchJson("/readers");
      setReaders(payload?.items || []);
    } catch (error) {
      setMessage({ type: "error", text: `Error: ${error.message}` });
    } finally {
      setLoadingLabel(null);
    }
  }, [fetchJson]);

  useEffect(() => {
    loadReaders();
  }, [loadReaders]);

  const handleLinkReader = async (event) => {
    event.preventDefault();

    if (!pairingCode.trim() || !readerName.trim()) {
      setMessage({ type: "error", text: "Please provide a pairing code and reader name." });
      return;
    }

    setLoadingLabel("Linking reader...");
    setMessage(null);

    try {
      await fetchJson("/readers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pairing_code: pairingCode.trim(), name: readerName.trim() }),
      });

      setPairingCode("");
      setReaderName("");
      setMessage({ type: "success", text: "Reader linked successfully." });
      await loadReaders();
    } catch (error) {
      setMessage({ type: "error", text: `Error: ${error.message}` });
    } finally {
      setLoadingLabel(null);
    }
  };

  const handleStartCheckout = async (readerId) => {
    const parsedAmount = Number.parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setMessage({ type: "error", text: "Please enter a valid amount." });
      return;
    }

    setLoadingLabel("Starting checkout...");
    setMessage(null);

    try {
      const payload = await fetchJson(`/readers/${readerId}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: parsedAmount }),
      });

      const transactionId = resolveTransactionId(payload);
      if (transactionId) {
        setMessage({ type: "success", text: `Checkout started. Transaction ID: ${transactionId}` });
      } else {
        setMessage({ type: "success", text: "Checkout started on reader." });
      }
    } catch (error) {
      setMessage({ type: "error", text: `Error: ${error.message}` });
    } finally {
      setLoadingLabel(null);
    }
  };

  return (
    <main className="page">
      <section className="card">
        <header className="header">
          <p className="eyebrow">SumUp Card Readers</p>
          <h1>React Reader Checkout Starter</h1>
          <p className="subtitle">
            Pair a card reader, list existing devices, and trigger in-person checkouts from this UI.
          </p>
          <a className="link" href="https://virtual-solo.sumup.com/" target="_blank" rel="noreferrer">
            Open Virtual Solo
          </a>
        </header>

        <div className="panel">
          <label className="field">
            <span>Backend base URL</span>
            <input
              type="url"
              placeholder="http://localhost:8080"
              value={backendUrl}
              onChange={(event) => setBackendUrl(event.target.value)}
            />
          </label>
          <p className="hint">Defaults to http://localhost:8080.</p>
        </div>

        <form className="panel" onSubmit={handleLinkReader}>
          <div className="panel-header">
            <div>
              <h2>Link a reader</h2>
              <p>Use the pairing code displayed on the device.</p>
            </div>
          </div>
          <div className="grid">
            <label className="field">
              <span>Pairing code</span>
              <input
                type="text"
                placeholder="8-9 characters"
                value={pairingCode}
                onChange={(event) => setPairingCode(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Reader name</span>
              <input
                type="text"
                placeholder="Front Desk"
                value={readerName}
                onChange={(event) => setReaderName(event.target.value)}
              />
            </label>
          </div>
          <button type="submit" disabled={Boolean(loadingLabel)}>
            Link reader
          </button>
        </form>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Readers</h2>
              <p>Choose a reader to start a checkout.</p>
            </div>
            <button type="button" onClick={loadReaders} disabled={Boolean(loadingLabel)}>
              Refresh
            </button>
          </div>
          <div className="reader-list">
            {readers.length === 0 ? (
              <div className="empty">No readers linked yet.</div>
            ) : (
              readers.map((reader) => (
                <div className="reader-item" key={reader.id}>
                  <div className="reader-details">
                    <h3>
                      {reader.name || "Unnamed reader"}
                      <span className="badge">{reader.status || "unknown"}</span>
                    </h3>
                    <p className="meta">ID: {reader.id}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStartCheckout(reader.id)}
                    disabled={Boolean(loadingLabel)}
                  >
                    Start checkout
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Checkout amount</h2>
              <p>Applies to the next checkout you start.</p>
            </div>
          </div>
          <label className="field">
            <span>Amount (EUR)</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>
        </div>

        {loadingLabel ? <div className="message">{loadingLabel}</div> : null}
        {message ? <div className={`message ${message.type}`}>{message.text}</div> : null}
      </section>
    </main>
  );
}
