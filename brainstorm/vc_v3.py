import http.server, json, os, time, socket

DB = {"html": "", "title": "", "ts": 0}

def free_port(start=58333):
    for p in range(start, start+50):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            s.bind(("127.0.0.1", p))
            s.close()
            return p
        except:
            continue
    return start

class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

    def do_GET(self):
        if self.path == "/ping":
            self._j({"ok": 1})
        elif self.path in ("/", "/view"):
            self._serve("view.html", "text/html")
        elif self.path == "/data":
            self._j(DB)
        else:
            path = self.path.lstrip("/")
            full = os.path.join(os.path.dirname(__file__), path)
            if os.path.isfile(full):
                ct = "text/css" if path.endswith(".css") else "text/html"
                self._serve(path, ct)
            else:
                self._j({"error": "not found"}, 404)

    def do_POST(self):
        cl = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(cl) if cl else b""
        try: d = json.loads(body)
        except: d = {}
        if self.path == "/push":
            DB["html"] = d.get("html", "")
            DB["title"] = d.get("title", "")
            DB["ts"] = time.time()
            self._j({"ok": 1})
        else:
            self._j({"error": "?"}, 404)

    def _j(self, d, c=200):
        self.send_response(c)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(d, ensure_ascii=False).encode())

    def _serve(self, name, ct):
        fp = os.path.join(os.path.dirname(__file__), name)
        if os.path.isfile(fp):
            self.send_response(200)
            self.send_header("Content-Type", ct)
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.end_headers()
            with open(fp, "rb") as f:
                self.wfile.write(f.read())
        else:
            self._j({"error": "not found"}, 404)

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    port = free_port(58333)
    print(f"PORT={port}", flush=True)
    httpd = http.server.HTTPServer(("127.0.0.1", port), H)
    httpd.serve_forever()
