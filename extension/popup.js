const urlEl = document.getElementById("url");
const apiEl = document.getElementById("api");
const saveEl = document.getElementById("save");
const statusEl = document.getElementById("status");

let currentUrl = "";

// Load the active tab URL and the saved backend URL.
async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentUrl = tab?.url || "";
  urlEl.textContent = currentUrl;

  const stored = await chrome.storage.sync.get("apiUrl");
  apiEl.value = stored.apiUrl || "http://localhost:8000";
}

function validateApiUrl(url: string): { ok: boolean; error?: string } {
  try {
    const u = new URL(url);
    if (u.protocol === "https:") return { ok: true };
    if (u.protocol === "http:" && u.hostname === "localhost" && u.port === "8000") return { ok: true };
    return { ok: false, error: "Only https:// or http://localhost:8000 are allowed" };
  } catch {
    return { ok: false, error: "Invalid URL" };
  }
}

apiEl.addEventListener("change", () => {
  const val = apiEl.value.trim();
  const check = validateApiUrl(val);
  if (check.ok) {
    chrome.storage.sync.set({ apiUrl: val });
  } else {
    apiEl.value = "http://localhost:8000";
    alert(check.error);
  }
});

saveEl.addEventListener("click", async () => {
  const api = apiEl.value.trim().replace(/\/$/, "");
  if (!currentUrl || !api) return;

  saveEl.disabled = true;
  statusEl.textContent = "Saving...";
  statusEl.className = "status";

  try {
    const res = await fetch(`${api}/api/web/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: currentUrl }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    statusEl.textContent = `Saved: ${data.title || currentUrl} (${data.chunks_indexed} chunks)`;
    statusEl.className = "status ok";
  } catch (e) {
    statusEl.textContent = `Failed: ${e.message}`;
    statusEl.className = "status err";
  } finally {
    saveEl.disabled = false;
  }
});

init();
