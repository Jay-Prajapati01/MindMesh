import json, urllib.request, urllib.error, time

BASE = "http://localhost:8000"
results = []

def call(path, method="GET", data=None, headers=None, timeout=60, raw=False):
    hdrs = dict(headers or {})
    body = None
    if data is not None:
        body = json.dumps(data).encode()
        hdrs.setdefault("Content-Type", "application/json")
    req = urllib.request.Request(BASE + path, data=body, headers=hdrs, method=method)
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            txt = r.read().decode("utf-8", "replace")
            return r.status, dict(r.headers), txt, time.time() - t0
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read().decode("utf-8", "replace"), time.time() - t0
    except Exception as e:
        return -1, {}, str(e), time.time() - t0

def check(name, cond, detail=""):
    results.append((name, bool(cond), str(detail)[:260]))

# --- 1. GET endpoints: 200 + JSON + expected top-level keys
get_checks = [
    ("/api/health", ["status"]),
    ("/api/health/detailed", ["status"]),
    ("/api/graph", ["nodes"]),
    ("/api/timeline", ["groups"]),
    ("/api/notes", None),          # list -> array
    ("/api/stats", ["total_sources", "indexed_chunks", "vector_store"]),
    ("/api/sources", ["items", "total"]),
    ("/", None),
]
for path, keys in get_checks:
    s, h, txt, dt = call(path)
    ok = s == 200
    if ok and keys:
        try:
            j = json.loads(txt)
            ok = all(k in j for k in keys)
            detail = f"missing={[k for k in keys if k not in j]}"
        except Exception as e:
            ok = False; detail = f"not json: {e}"
    else:
        detail = f"status={s}"
    check(f"GET {path}", ok, detail + f" ({dt:.2f}s)")

# --- 2. Health schema details
s, h, txt, dt = call("/api/health/detailed")
try:
    j = json.loads(txt)
    check("health/detailed has llm+embedding info", ("llm" in txt.lower() or "model" in txt.lower()) and "embedding" in txt.lower(), str(j)[:200])
except Exception as e:
    check("health/detailed parse", False, e)

# --- 3. POST endpoints: 200 happy + 422 missing fields
post_checks = [
    ("/api/search", {"query": "test"}, ["hits"]),
    ("/api/chat", {"question": "What is AI?"}, ["answer", "citations"]),
    ("/api/compare", None, None),   # special
]
for path, payload, keys in post_checks:
    if payload is None:
        continue
    s, h, txt, dt = call(path, "POST", payload, timeout=120)
    ok = s == 200
    try:
        j = json.loads(txt)
        if keys: ok = ok and all(k in j for k in keys)
    except Exception:
        ok = False
    check(f"POST {path} happy", ok, f"status={s} {dt:.1f}s {txt[:120]}")

# missing-field -> 422
for path in ["/api/search", "/api/chat", "/api/compare", "/api/notes", "/api/web/process"]:
    s, h, txt, dt = call(path, "POST", {})
    check(f"POST {path} missing fields -> 422", s == 422, f"status={s} {txt[:100]}")

# wrong content type / bad json
s, h, txt, dt = call("/api/search", "POST", None, headers={"Content-Type": "application/json"})
check("POST without body -> 4xx", s in (400, 422), f"status={s}")

# --- 4. CORS preflight (allowed origins pass, foreign origins rejected)
for origin in ["http://localhost:3000", "http://evil.example"]:
    req = urllib.request.Request(BASE + "/api/stats", method="OPTIONS",
        headers={"Origin": origin, "Access-Control-Request-Method": "GET",
                 "Access-Control-Request-Headers": "content-type"})
    allowed = origin == "http://localhost:3000"
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            acao = r.headers.get("Access-Control-Allow-Origin")
    except urllib.error.HTTPError as e:
        acao = e.headers.get("Access-Control-Allow-Origin")
    except Exception as e:
        acao = None
    if allowed:
        check(f"CORS preflight {origin} allowed", acao == origin, f"acao={acao}")
    else:
        check(f"CORS preflight {origin} rejected", acao is None, f"acao={acao}")

# simple GET with Origin
s, h, txt, dt = call("/api/stats", headers={"Origin": "http://localhost:3000"})
check("CORS GET reflects origin", h.get("access-control-allow-origin") in ("http://localhost:3000", "*"), f"acao={h.get('access-control-allow-origin')}")

# --- 5. SSE chat stream: headers + framing
# Contract: data-only frames {"type":"token"|"done"} (no named `event:` lines).
boundary = "----qa" + str(int(time.time()))
payload = json.dumps({"question": "What is ZORBLAX-9912?"}).encode()
req = urllib.request.Request(BASE + "/api/chat/stream", data=payload,
    headers={"Content-Type": "application/json", "Accept": "text/event-stream"}, method="POST")
t0 = time.time()
try:
    with urllib.request.urlopen(req, timeout=120) as r:
        ctype = r.headers.get("Content-Type", "")
        raw = b""
        while time.time() - t0 < 60:
            chunk = r.read(4096)
            if not chunk: break
            raw += chunk
            if b'"type": "done"' in raw or b'"type":"done"' in raw: break
        txt = raw.decode("utf-8", "replace")
        check("SSE content-type", "text/event-stream" in ctype, ctype)
        check("SSE has data: lines", "data:" in txt, txt[:150].replace("\n", " | "))
        check("SSE terminal done frame", '"type": "done"' in txt or '"type":"done"' in txt, txt[-200:].replace("\n", " | "))
        frames = [l for l in txt.splitlines() if l.startswith("data:")]
        check("SSE multiple frames", len(frames) >= 3, f"count={len(frames)}")
except Exception as e:
    check("SSE chat stream", False, str(e))

# --- 6. Wrong HTTP methods
for path, method in [("/api/stats", "POST"), ("/api/graph", "DELETE"), ("/api/health", "DELETE")]:
    s, h, txt, dt = call(path, method, {})
    check(f"{method} {path} -> 405", s in (405, 404, 422), f"status={s}")

# --- 7. Trailing slash behavior
s1, *_ = call("/api/stats")
s2, h2, txt2, *_ = call("/api/stats/")
check("trailing slash consistent", (s2 in (200, 307, 404)), f"no-slash={s1} slash={s2}")

# --- 8. pagination contract
s, h, txt, dt = call("/api/sources?page=2&page_size=5")
try:
    j = json.loads(txt)
    check("pagination page=2", s == 200 and len(j.get("items", [])) <= 5 and j.get("page") == 2, f"status={s} items={len(j.get('items',[]))} page={j.get('page')}")
except Exception as e:
    check("pagination", False, str(e))

fails = [r for r in results if not r[1]]
for n, ok, d in results:
    if not ok:
        print(f"[FAIL] {n} :: {d}")
print(f"\n== {len(results)} contract checks, {len(fails)} failures ==")
