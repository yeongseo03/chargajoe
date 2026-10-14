"""Serve an Expo web export with history-route fallback for local previews."""

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit


class SpaHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        requested = unquote(urlsplit(self.path).path).lstrip("/")
        path = (Path(self.directory) / requested).resolve()
        root = Path(self.directory).resolve()
        if path.is_relative_to(root) and not path.exists() and "." not in Path(requested).name:
            self.path = "/index.html"
        super().do_GET()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    parser.add_argument("--port", type=int, required=True)
    args = parser.parse_args()
    handler = partial(SpaHandler, directory=str(args.directory.resolve()))
    print(f"Serving {args.directory} on http://localhost:{args.port}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", args.port), handler).serve_forever()
