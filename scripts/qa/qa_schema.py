import json, urllib.request, urllib.error

BASE = "http://localhost:8000"
results = []

def call(path, method="GET", data=None, timeout=60):
    hdrs = {}
    body = None
    if data is not None:
        body = json.dumps(data).encode()
        hdrs["Content-Type"] = "application/json"
    req = urllib.request.Request(BASE + path, data=body, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except Exception as e:
        return -1, str(e)

def resolve_ref(ref, spec):
    node = spec
    for part in ref.lstrip("#/").split("/"):
        node = node[part]
    return node

def validate(schema, value, path=""):
    errs = []
    if not isinstance(schema, dict):
        return errs
    if "$ref" in schema:
        schema = resolve_ref(schema["$ref"], SCHEMA_SPEC)
    stype = schema.get("type")
    if stype == "object":
        if not isinstance(value, dict):
            return [f"{path}: expected object got {type(value).__name__}"]
        for k in schema.get("required", []):
            if k not in value:
                errs.append(f"{path}: missing required '{k}'")
        props = schema.get("properties", {})
        for k, sub in props.items():
            if k in value:
                errs += validate(sub, value[k], f"{path}.{k}")
    elif stype == "array":
        if not isinstance(value, list):
            return [f"{path}: expected array got {type(value).__name__}"]
        items = schema.get("items")
        if items:
            for i, v in enumerate(value[:5]):
                errs += validate(items, v, f"{path}[{i}]")
    elif stype == "integer":
        if not isinstance(value, int) or isinstance(value, bool):
            errs.append(f"{path}: expected int got {type(value).__name__}")
    elif stype == "number":
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            errs.append(f"{path}: expected number got {type(value).__name__}")
    elif stype == "string":
        if not isinstance(value, str):
            errs.append(f"{path}: expected string got {type(value).__name__}")
    elif stype == "boolean":
        if not isinstance(value, bool):
            errs.append(f"{path}: expected bool got {type(value).__name__}")
    return errs

# Load openapi spec; keep a global for $ref resolution during validation
SCHEMA_SPEC = json.loads(urllib.request.urlopen(BASE + "/openapi.json", timeout=20).read().decode())
spec = SCHEMA_SPEC

checks = [
    ("GET", "/api/health", None),
    ("GET", "/api/stats", None),
    ("GET", "/api/sources?limit=3", None),
    ("GET", "/api/graph", None),
    ("GET", "/api/timeline", None),
    ("GET", "/api/notes", None),
    ("POST", "/api/search", {"query": "vector database"}),
    ("POST", "/api/chat", {"question": "What sources do I have?"}),
    ("POST", "/api/compare", {"source_id_a": "b4402a027167fbbc", "source_id_b": "03cee9f86338cdd3"}),
]

for method, path, payload in checks:
    # find matching path+method in spec
    p = path.split("?")[0]
    entry = spec["paths"].get(p, {}).get(method.lower())
    if not entry:
        results.append((f"{method} {path}", False, "not in openapi"))
        continue
    resp200 = entry.get("responses", {}).get("200") or entry.get("responses", {}).get("default")
    schema = None
    if resp200:
        schema = resp200.get("content", {}).get("application/json", {}).get("schema")
    s, txt = call(path, method, payload, timeout=150)
    if s != 200:
        results.append((f"{method} {path}", False, f"status={s} {txt[:120]}"))
        continue
    try:
        body = json.loads(txt)
    except Exception as e:
        results.append((f"{method} {path}", False, f"invalid json {e}"))
        continue
    if schema is None:
        results.append((f"{method} {path}", True, "200, no schema declared"))
        continue
    errs = validate(schema, body, p)
    results.append((f"{method} {path}", not errs, "; ".join(errs) if errs else "schema OK"))

# docs endpoints
s, txt = call("/docs")
results.append(("GET /docs", s == 200, f"status={s}"))
s, txt = call("/openapi.json")
results.append(("GET /openapi.json", s == 200, f"status={s}"))

fails = [r for r in results if not r[1]]
for n, ok, d in results:
    print(("PASS " if ok else "FAIL ") + n + " :: " + str(d)[:220])
print(f"\n== {len(results)} schema checks, {len(fails)} failures ==")
