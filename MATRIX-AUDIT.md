# MATRIX-AUDIT

Audit of the GitHub Actions **Matrix CI** grid (`ubuntu-latest` / `windows-latest` × Node `18` / `20` / `22`) on branch `fix/matrix-environment-failures`.

Passing combinations (no code change required for production): **ubuntu-latest + Node 18**, **ubuntu-latest + Node 20**.

There were no completed workflow runs on this fork when the audit started (Actions workflow became `active` after the last push). Failures below were reproduced locally on Windows with Node 22.17.1 against the same starter source, which is the same code the matrix jobs execute. Step names match `.github/workflows/ci.yml`.

---

## Combination 1 — `windows-latest` + Node 18

**Step:** `Run npm test`

**Exact error lines (getOutputPath / OS path separators):**
```
Expected: "...\\src\\output\\report.txt"
Received: "...\\src/output/report.txt"
```
Local reproduction:
```
Expected: "C:\\Users\\Saanvi Garg\\Desktop\\matrix-debug-drill\\src\\output\\report.txt"
Received: "C:\\Users\\Saanvi Garg\\Desktop\\matrix-debug-drill\\src/output/report.txt"
```

**Exact error lines (readTextFile / line endings):**
```
Expected: "line one\nline two\nline three\n"
Received: "line one\r\nline two\r\nline three\r\n"
```
Local `JSON.stringify` of `src/test-data/sample.txt`: `"line one\r\nline two\r\nline three\r\n"`

**Classification:** OS-specific (path concatenation with `/` literals; CRLF vs LF assertions)

**Planned fix:** Use `path.join` in `src/fileUtils.js`. In `src/fileUtils.test.js`, normalize `\r\n` to `\n` before comparing file contents.

---

## Combination 2 — `windows-latest` + Node 20

**Step:** `Run npm test`

**Exact error lines:** Same as Combination 1 (path `toBe` mismatch with mixed `/` vs `\`, and CRLF vs LF on `sample.txt`).

**Classification:** OS-specific

**Planned fix:** Same as Combination 1 (`path.join` + line-ending normalization). Node 20 still provides `crypto.createCipher`, so this combination does not hit the Node 22 API removal.

---

## Combination 3 — `windows-latest` + Node 22

**Step:** `Run npm test`

**Exact error lines:**

1. Path assertion (OS-specific), same as Combinations 1–2:
```
Expected: "...\\src\\output\\report.txt"
Received: "...\\src/output/report.txt"
```

2. Line endings (OS-specific):
```
Expected: "line one\nline two\nline three\n"
Received: "line one\r\nline two\r\nline three\r\n"
```

3. Crypto (runtime version) — same removal as Ubuntu Node 22:
```
TypeError: crypto.createCipher is not a function
```
at `src/cryptoUtils.js`:
```
const cipher = crypto.createCipher('aes-256-cbc', key);
```

**Classification:** OS-specific (paths, line endings) **and** runtime version (`createCipher` removed in Node 22)

**Planned fix:** Combinations 1–2 path/EOL fixes, plus replace `crypto.createCipher` / `crypto.createDecipher` with `createCipheriv` / `createDecipheriv`.

---

## Combination 4 — `ubuntu-latest` + Node 22

**Step:** `Run npm test`

**Exact error line:**
```
TypeError: crypto.createCipher is not a function
```
at `src/cryptoUtils.js:8` (`encryptValue`). Node.js removed the legacy `crypto.createCipher` / `crypto.createDecipher` APIs in Node 22 (they were deprecated earlier). Replacement: `crypto.createCipheriv` / `crypto.createDecipheriv` with an explicit key and IV.

**Classification:** Runtime version

**Planned fix:** Derive a 32-byte key with `crypto.scryptSync`, generate a random 16-byte IV, encrypt with `createCipheriv('aes-256-cbc', ...)`, prepend IV to the ciphertext, and decrypt with `createDecipheriv` after splitting the IV.

---

## Combinations that pass (documented for the grid)

| OS | Node | Result |
|----|------|--------|
| ubuntu-latest | 18 | Pass (`npm test`) |
| ubuntu-latest | 20 | Pass (`npm test`) |

No dependency-install failures (`npm ci`) were observed; all failures are in **`Run npm test`**.

---

## Fix plan by category (applied only after this audit)

| Category | Combinations | Change |
|----------|----------------|--------|
| OS-specific | windows + 18/20/22 | `path.join` in `fileUtils.js`; normalize CRLF in `fileUtils.test.js` |
| Runtime version | ubuntu + 22, windows + 22 | `createCipheriv` / `createDecipheriv` in `cryptoUtils.js` |
| Matrix strategy (after production fixes) | Node 24 experimental | `include` + `continue-on-error` + `fail-fast: false` |
