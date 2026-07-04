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

apiEl.addEventListener("change", () => {
  chrome.storage.sync.set({ apiUrl: apiEl.value.trim() });
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
