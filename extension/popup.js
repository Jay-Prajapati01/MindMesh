const urlEl = document.getElementById("url");
const apiEl = document.getElementById("api");
const tokenEl = document.getElementById("token");
const saveEl = document.getElementById("save");
const statusEl = document.getElementById("status");

let currentUrl = "";

// Load the active tab URL and saved settings.
async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentUrl = tab?.url || "";
  urlEl.textContent = currentUrl;

  const stored = await chrome.storage.sync.get(["apiUrl"]);
  // The access token lives in local (not sync) storage so it is never
  // copied to other devices via Chrome sync.
  const local = await chrome.storage.local.get(["authToken"]);
  apiEl.value = stored.apiUrl || "http://localhost:8000";
  tokenEl.value = local.authToken || "";
}

function validateApiUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol === "https:") return { ok: true, origin: u.origin };
    if (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1") && u.port === "8000") {
      return { ok: true, origin: u.origin };
    }
    return { ok: false, error: "Only https:// or http://localhost:8000 are allowed" };
  } catch {
    return { ok: false, error: "Invalid URL" };
  }
}

// MV3 requires a host permission for the target origin before fetching it.
async function ensureHostPermission(origin) {
  const pattern = origin + "/*";
  try {
    const has = await chrome.permissions.contains({ origins: [pattern] });
    if (has) return true;
    return await chrome.permissions.request({ origins: [pattern] });
  } catch {
    return false;
  }
}

apiEl.addEventListener("change", async () => {
  const val = apiEl.value.trim();
  const check = validateApiUrl(val);
  if (check.ok) {
    chrome.storage.sync.set({ apiUrl: val });
    if (check.origin !== "http://localhost:8000") {
      const granted = await ensureHostPermission(check.origin);
      if (!granted) {
        statusEl.textContent = "Browser permission for this API origin was not granted.";
        statusEl.className = "status err";
      }
    }
  } else {
    apiEl.value = "http://localhost:8000";
    alert(check.error);
  }
});

tokenEl.addEventListener("change", () => {
  chrome.storage.local.set({ authToken: tokenEl.value.trim() });
});

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function pollJob(api, token, jobId) {
  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const res = await fetch(`${api}/api/jobs/${jobId}`, { headers: authHeaders(token) });
    if (res.status === 401) throw new Error("Session expired — paste a fresh access token.");
    if (!res.ok) throw new Error(`Status check failed (HTTP ${res.status})`);
    const job = await res.json();
    if (job.status === "completed") return job.result;
    if (job.status === "failed" || job.status === "cancelled") {
      throw new Error(job.error?.message || "Processing was cancelled.");
    }
    statusEl.textContent = "Processing… " + (job.status || "");
  }
  throw new Error("Processing is taking too long. Try again later.");
}

saveEl.addEventListener("click", async () => {
  const api = apiEl.value.trim().replace(/\/$/, "");
  const token = tokenEl.value.trim();
  if (!currentUrl || !api) return;

  const check = validateApiUrl(api);
  if (!check.ok) {
    statusEl.textContent = check.error;
    statusEl.className = "status err";
    return;
  }

  saveEl.disabled = true;
  statusEl.textContent = "Saving...";
  statusEl.className = "status";

  try {
    const res = await fetch(`${api}/api/web/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify({ url: currentUrl }),
    });
    if (res.status === 401) throw new Error("Sign-in required — paste an access token below.");
    if (res.status === 429) {
      const retry = res.headers.get("Retry-After");
      throw new Error(`Rate limited${retry ? `, retry in ${retry}s` : ""}.`);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (res.status === 202 && data.job_id) {
      statusEl.textContent = "Queued — processing…";
      const result = await pollJob(api, token, data.job_id);
      statusEl.textContent = `Saved (${result?.chunks_indexed ?? "…"} chunks)`;
      statusEl.className = "status ok";
    } else {
      statusEl.textContent = `Saved: ${data.title || currentUrl} (${data.chunks_indexed} chunks)`;
      statusEl.className = "status ok";
    }
  } catch (e) {
    statusEl.textContent = `Failed: ${e.message}`;
    statusEl.className = "status err";
  } finally {
    saveEl.disabled = false;
  }
});

init();
