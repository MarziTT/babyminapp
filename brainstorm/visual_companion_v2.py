import http.server, json, os, re, threading, time, uuid, webbrowser, urllib.parse, random
from urllib.parse import urlparse, parse_qs

class CompanionDB:
    def __init__(self, base_dir):
        self.base_dir = base_dir
        self.state_file = os.path.join(base_dir, "__companion_state__.json")
        self.load()
    def load(self):
        if os.path.exists(self.state_file):
            with open(self.state_file, "r", encoding="utf-8") as f: self.db = json.load(f)
        else: self.db = {"sessions": {}, "content": {}, "choices": {}}
    def save(self):
        with open(self.state_file, "w", encoding="utf-8") as f: json.dump(self.db, f, ensure_ascii=False, indent=2)
    def put_content(self, session_id, key, data):
        if session_id not in self.db["content"]: self.db["content"][session_id] = {}
        self.db["content"][session_id][key] = data; self.save()
    def get_content(self, session_id, key):
        return self.db["content"].get(session_id, {}).get(key, None)
    def clear_session(self, session_id):
        try: self.db["content"].pop(session_id, None); self.db["choices"].pop(session_id, None); self.save()
        except: pass
    def start_session(self, session_id):
        s = self.db["sessions"].get(session_id, {})
        if not s: s = {"id": session_id, "started": time.time(), "content_keys": []}; self.db["sessions"][session_id] = s; self.save()
        return s
    def record_content_key(self, session_id, key):
        s = self.start_session(session_id)
        if key not in s.get("content_keys", []):
            if "content_keys" not in s: s["content_keys"] = []
            s["content_keys"].append(key); self.save()
    def record_choice(self, session_id, key, value):
        if session_id not in self.db["choices"]: self.db["choices"][session_id] = {}
        self.db["choices"][session_id][key] = value; self.save()
    def get_choices(self, session_id):
        return self.db["choices"].get(session_id, {})

class CompanionHandler(http.server.SimpleHTTPRequestHandler):
    db = None
    def log_message(self, format, *args): pass
    def do_GET(self):
        p = urlparse(self.path)
        if p.path == "/ping": self._json({"status": "ok"})
        elif p.path == "/": self._serve_file("index_v2.html")
        elif p.path == "/state":
            q = parse_qs(p.query); sid = q.get("session", [None])[0]
            self._json({"session": sid, "choices": self.db.get_choices(sid) if sid else {}})
        elif p.path.startswith("/content/"):
            sid = p.path.split("/")[-1]
            s = self.db.start_session(sid)
            cl = []
            for ck in s.get("content_keys", []):
                cd = self.db.get_content(sid, ck)
                if cd: cl.append({"key": ck, "html": cd.get("html", ""), "title": cd.get("title", ""), "timestamp": cd.get("timestamp", time.time())})
            cl.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
            self._json({"session": sid, "content": cl})
        else: self._serve_file(p.path.lstrip("/"))
    def do_POST(self):
        p = urlparse(self.path)
        cl = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(cl) if cl > 0 else b""
        try: data = json.loads(body) if body else {}
        except: data = {}
        if p.path == "/push":
            html = data.get("html", ""); sid = data.get("session", "default")
            key = data.get("key", str(uuid.uuid4())[:8])
            self.db.start_session(sid); self.db.put_content(sid, key, {"html": html, "title": data.get("title", ""), "timestamp": time.time()})
            self.db.record_content_key(sid, key)
            self._json({"ok": True, "key": key, "session": sid})
        elif p.path == "/choose":
            sid = data.get("session", "default"); key = data.get("key", "choice"); value = data.get("value", "")
            self.db.record_choice(sid, key, value)
            self._json({"ok": True, "key": key, "value": value})
        elif p.path == "/clear":
            sid = data.get("session", "default"); self.db.clear_session(sid); self._json({"ok": True})
        else: self._json({"error": "unknown"}, 404)
    def _json(self, data, code=200):
        self.send_response(code); self.send_header("Content-Type", "application/json; charset=utf-8"); self.send_header("Access-Control-Allow-Origin", "*"); self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))
    def _serve_file(self, name):
        fp = os.path.join(os.path.dirname(__file__), name)
        if os.path.exists(fp):
            ct = "text/html"
            if name.endswith(".css"): ct = "text/css"
            elif name.endswith(".js"): ct = "application/javascript"
            self.send_response(200); self.send_header("Content-Type", ct); self.end_headers()
            with open(fp, "rb") as f: self.wfile.write(f.read())
        else: self._json({"error": "not found"}, 404)

def find_free_port(start=58217):
    for port in range(start, start+200):
        try:
            s = __import__("socket").socket(__import__("socket").AF_INET, __import__("socket").SOCK_STREAM); s.setsockopt(__import__("socket").SOL_SOCKET, __import__("socket").SO_REUSEADDR, 1); s.bind(("127.0.0.1", port)); s.close()
            return port
        except: continue
    return start

def main():
    base_dir = os.path.dirname(__file__)
    db = CompanionDB(base_dir)
    handler = CompanionHandler
    handler.db = db
    port = find_free_port(58217)
    server = http.server.HTTPServer(("127.0.0.1", port), handler)
    print(f"COMPANION_PORT={port}")
    try: server.serve_forever()
    except KeyboardInterrupt: pass

if __name__ == "__main__": main()
