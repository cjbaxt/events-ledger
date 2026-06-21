const KEY = "el_editor";
const PASSPHRASE = "tinfoil";

export function isEditor(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(KEY) === "true";
}

export function unlock(input: string): boolean {
  if (input.trim() === PASSPHRASE) {
    localStorage.setItem(KEY, "true");
    window.dispatchEvent(new Event("editor-change"));
    return true;
  }
  return false;
}

export function lock(): void {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("editor-change"));
}
