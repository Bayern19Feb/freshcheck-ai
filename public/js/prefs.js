// Small preferences saved in localStorage. Every access is wrapped so the app
// still works when storage is blocked (some private-browsing modes).

const KEY = 'freshcheck.prefs.v1';
let memory = {};

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return memory;
  }
}

export function getPref(name, fallback) {
  const all = readAll();
  return name in all ? all[name] : fallback;
}

export function setPref(name, value) {
  const all = readAll();
  all[name] = value;
  memory = all;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

export function clearPrefs() {
  memory = {};
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}
