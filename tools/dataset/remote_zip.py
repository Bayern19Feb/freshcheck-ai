"""Read individual files from a large remote .zip using HTTP range requests,
so only the photos we need are downloaded (not the whole multi-GB archive)."""
import io
import time

import requests


def resolve_redirect(url):
    """Follow redirects with curl (some sites block Python's HTTP client) and
    return the final download URL."""
    import subprocess
    out = subprocess.run(["curl", "-s", "-r", "0-0", "-o", "NUL" if __import__("os").name == "nt" else "/dev/null",
                          "-w", "%{redirect_url}", url], capture_output=True, text=True, check=True)
    return out.stdout.strip() or url


class HTTPRangeFile(io.RawIOBase):
    def __init__(self, url, session=None):
        self.session = session or requests.Session()
        self.session.headers["User-Agent"] = "Mozilla/5.0 (FreshCheck-AI school project dataset fetcher)"
        # Some hosts refuse HEAD, so ask for the first byte to learn the
        # final (redirected) URL and the total size from Content-Range.
        url = resolve_redirect(url)
        # stream=True so a server that ignores Range cannot make us download everything.
        r = self.session.get(url, headers={"Range": "bytes=0-0"}, allow_redirects=True, timeout=60, stream=True)
        r.raise_for_status()
        r.close()
        if r.status_code != 206 or "Content-Range" not in r.headers:
            raise IOError(f"Server does not support partial downloads (HTTP {r.status_code}); cannot read only parts of this zip.")
        self.url = r.url
        self.size = int(r.headers["Content-Range"].split("/")[1])
        self.pos = 0

    def seekable(self):
        return True

    def readable(self):
        return True

    def tell(self):
        return self.pos

    def seek(self, offset, whence=io.SEEK_SET):
        if whence == io.SEEK_SET:
            self.pos = offset
        elif whence == io.SEEK_CUR:
            self.pos += offset
        else:
            self.pos = self.size + offset
        return self.pos

    def read(self, n=-1):
        if n is None or n < 0:
            n = self.size - self.pos
        if n == 0 or self.pos >= self.size:
            return b""
        end = min(self.pos + n, self.size) - 1
        for attempt in range(8):
            try:
                r = self.session.get(self.url, headers={"Range": f"bytes={self.pos}-{end}"}, timeout=120)
                if r.status_code in (429, 500, 502, 503, 504):   # rate-limited or busy: wait and retry
                    wait = int(r.headers.get("Retry-After", "0") or 0) or min(60, 2 ** attempt * 2)
                    time.sleep(wait)
                    continue
                if r.status_code != 206:
                    raise IOError(f"Server did not honour range request (HTTP {r.status_code})")
                data = r.content
                break
            except requests.RequestException:
                if attempt == 7:
                    raise
                time.sleep(2 ** attempt)
        else:
            raise IOError("Server kept refusing range requests (rate limit)")
        self.pos += len(data)
        return data

    def readinto(self, b):
        data = self.read(len(b))
        b[: len(data)] = data
        return len(data)
