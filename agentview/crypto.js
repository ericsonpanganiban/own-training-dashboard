// Locks one agent's scorecard with their work email and code, and unlocks it again (WebCrypto: PBKDF2 then AES-GCM).
// The published agent page holds only locked records; without the right email and code a record can't be read.
(function (root) {
  "use strict";
  const ITER = 250000;
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64 = (buf) => { let s = ""; new Uint8Array(buf).forEach((b) => (s += String.fromCharCode(b))); return btoa(s); };
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const norm = (email) => String(email || "").trim().toLowerCase();
  const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  async function recordId(email) {
    return hex(await crypto.subtle.digest("SHA-256", enc.encode("agent|" + norm(email)))).slice(0, 16);
  }
  async function keyFor(email, code, salt) {
    const base = await crypto.subtle.importKey("raw", enc.encode(norm(email) + "|" + String(code || "").trim()), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  async function lock(email, code, data) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await keyFor(email, code, salt), enc.encode(JSON.stringify(data)));
    return { id: await recordId(email), s: b64(salt), i: b64(iv), c: b64(ct) };
  }
  // Resolves the data, or null when the email or code is wrong.
  async function unlock(record, email, code) {
    try {
      const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(record.i) }, await keyFor(email, code, unb64(record.s)), unb64(record.c));
      return JSON.parse(dec.decode(pt));
    } catch (e) {
      return null;
    }
  }
  // A code that is hard to guess: 10 letters and digits without look-alikes, in groups (e.g. K7QM-4TXD-9R).
  function makeCode() {
    const A = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    const r = crypto.getRandomValues(new Uint8Array(10));
    const s = [...r].map((x) => A[x % A.length]).join("");
    return s.slice(0, 4) + "-" + s.slice(4, 8) + "-" + s.slice(8);
  }
  root.AgentLock = { lock, unlock, recordId, makeCode, norm };
})(typeof window !== "undefined" ? window : globalThis);
