"""Helpers for finding downloadable files on Mendeley Data and Zenodo.
Mendeley sits behind a filter that blocks Python's HTTP client, so JSON is
fetched with curl (which is always available on Windows 10+, macOS and Linux)."""
import json
import subprocess


def curl_json(url):
    out = subprocess.run(["curl", "-s", "-L", url], capture_output=True, check=True)
    return json.loads(out.stdout.decode("utf-8"))


def mendeley_files(dataset_id):
    """Return [{filename, size, url}] for the latest version of a Mendeley dataset."""
    meta = curl_json(f"https://data.mendeley.com/public-api/datasets/{dataset_id}")
    files = curl_json(f"https://data.mendeley.com/public-api/datasets/{dataset_id}/files?folder_id=root&version={meta['version']}")
    return [{"filename": f["filename"], "size": f.get("size", 0), "url": f["content_details"]["download_url"]} for f in files]


def zenodo_files(record_id):
    rec = curl_json(f"https://zenodo.org/api/records/{record_id}")
    return [{"filename": f["key"], "size": f["size"], "url": f["links"]["self"]} for f in rec["files"]]
