import json, urllib.request, urllib.error, time

BASE = "http://localhost:8000"
results = []

def req(path, method="GET", data=None, headers=None, raw=None, timeout=30):
    url = BASE + path
    body = raw
    hdrs = dict(headers or {})
    if data is not None:
        body = json.dumps(data).encode()
        hdrs.setdefault("Content-Type", "application/json")
    r = urllib.request.Request(url, data=body, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(r, timeout=timeout) as resp:
            txt = resp.read().decode("utf-8", "replace")
            return resp.status, txt
    except urllib.error.HTTPError as e:
        txt = e.read().decode("utf-8", "replace")
        return e.code, txt
    except Exception as e:
        return -1, str(e)

def t(name, cond, detail=""):
    results.append((name, "PASS" if cond else "FAIL", detail[:300]))

# 1. path traversal in source id
for p in ["/api/sources/../../etc/passwd", "/api/sources/%2e%2e%2f%2e%2e%2fetc/passwd", "/api/sources/..%2f..%2fstore.json"]:
    s, txt = req(p)
    t(f"traversal {p[:40]}", s in (400, 404, 422) or (s >= 400), f"status={s}")

# 2. unknown routes / methods
s, txt = req("/api/nope"); t("404 unknown api", s == 404, f"status={s}")
s, txt = req("/api/stats", method="POST", data={}); t("405 POST on GET-only", s in (404, 405), f"status={s}")
s, txt = req("/api/sources", method="DELETE"); t("405 DELETE on list", s in (405, 404), f"status={s}")

# 3. validation errors
s, txt = req("/api/search", method="POST", data={"query": ""}); t("empty search query graceful", s == 200 and '"hits":[]' in txt, f"status={s} {txt[:80]}")
s, txt = req("/api/chat", method="POST", data={"question": ""}); t("empty question graceful (200, no citations)", s == 200 and '"citations":[]' in txt, f"status={s} {txt[:120]}")
s, txt = req("/health"); t("bare /health alias", s == 200 and '"status":"ok"' in txt, f"status={s} {txt[:80]}")
s, txt = req("/api/notes", method="POST", data={"title": ""}); t("empty note title", s in (400, 422), f"status={s}")

# 4. SSRF-ish web ingestion (short timeout; just check rejection or safe fetch)
for bad in ["http://169.254.169.254/latest/meta-data/", "file:///etc/passwd", "ftp://example.com/x", "http://localhost:8000/api/stats", "http://[::1]:6333/collections"]:
    s, txt = req("/api/web", method="POST", data={"url": bad}, timeout=25)
    rejected = s >= 400 or any(k in txt.lower() for k in ["invalid", "not allowed", "blocked", "unsupported", "private", "denied"])
    t(f"ssrf {bad[:42]}", rejected, f"status={s} {txt[:160]}")

# 5. XSS note persistence (stored + returned)
xss = "<script>alert('xss')</script>"
s, txt = req("/api/notes", method="POST", data={"title": xss, "body": "<img src=x onerror=alert(1)>"})
t("xss note accepted (no crash)", s in (200, 201, 400, 422), f"status={s}")
note_id = None
try:
    note_id = json.loads(txt).get("id")
except Exception:
    pass
s, txt = req("/api/notes")
t("xss note stored raw", (xss in txt), f"raw stored={xss in txt} (expected True=stored escaped by React)")

# 6. duplicate note spam guard? just check list size sane
s, txt = req("/api/notes")
try:
    n = len(json.loads(txt)); t("notes list sane", n < 50, f"count={n}")
except Exception as e:
    t("notes list parse", False, str(e))

# 7. concurrency burst (25 parallel-ish GETs)
t0 = time.time()
codes = []
for i in range(25):
    s, _ = req("/api/stats", timeout=15)
    codes.append(s)
dt = time.time() - t0
t("burst 25 GET /api/stats", all(c == 200 for c in codes), f"codes={set(codes)} in {dt:.1f}s")

# 8. search gibberish -> graceful 200 (vector search returns nearest neighbours)
s, txt = req("/api/search", method="POST", data={"query": "zzzqqqxxunknownzzz"})
ok = s == 200 and '"hits"' in txt
t("gibberish search graceful", ok, f"status={s} {txt[:150]}")

# 8b. workspace notes are searchable (plain-text match, source_type=note)
s, txt = req("/api/notes", method="POST", data={"title": "QA Regression Note", "body": "Token GRUMBLEFROG-77 lives only here."})
note2 = json.loads(txt).get("id") if s == 200 else None
s, txt = req("/api/search", method="POST", data={"query": "GRUMBLEFROG-77"})
t("note searchable", s == 200 and '"source_type":"note"' in txt, f"status={s} {txt[:150]}")
if note2:
    req(f"/api/notes/{note2}", method="DELETE")

# 9. malformed JSON body
s, txt = req("/api/search", method="POST", raw=b"{not json", headers={"Content-Type": "application/json"})
t("malformed json -> 4xx", s in (400, 422), f"status={s}")

# 10. note delete
s, txt = req(f"/api/notes/{note_id}", method="DELETE") if note_id else (0, "")
t("xss note cleanup", s == 200, f"status={s}")

# 11. delete nonexistent note/source
s, txt = req("/api/notes/does-not-exist", method="DELETE"); t("delete missing note 404", s == 404, f"status={s}")
s, txt = req("/api/sources/does-not-exist", method="DELETE"); t("delete missing source 404", s in (404,), f"status={s}")

# 12. non-numeric topK / bad query params
s, txt = req("/api/sources?limit=abc"); t("bad query param handled", s in (200, 400, 422), f"status={s}")
s, txt = req("/api/sources?limit=99999"); t("huge limit handled", s in (200, 400, 422), f"status={s} {txt[:80]}")

# report
fails = [r for r in results if r[1] == "FAIL"]
for n, st, d in results:
    if st == "FAIL":
        print(f"[FAIL] {n} :: {d}")
print(f"\n== {len(results)} checks, {len(fails)} failures ==")
