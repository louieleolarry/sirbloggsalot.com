const assert = require("assert");

const {
  decodeSessionCookie,
  encodeSessionCookie,
  parseCookies,
  publicUser,
  roleForEmail,
} = require("../server");

const encoded = encodeSessionCookie("session-123");
assert.strictEqual(decodeSessionCookie(encoded), "session-123");
assert.strictEqual(decodeSessionCookie(`${encoded}x`), "");

const cookies = parseCookies(`theme=light; sirbloggs_session=${encodeURIComponent(encoded)}`);
assert.strictEqual(cookies.sirbloggs_session, encoded);

assert.deepStrictEqual(publicUser(null), null);
assert.deepStrictEqual(publicUser({ id: "1", email: "a@example.com", name: "A", picture: "", role: "client", extra: true }), {
  id: "1",
  email: "a@example.com",
  name: "A",
  picture: "",
  role: "client",
});
assert.strictEqual(roleForEmail("person@example.com"), "client");

console.log("Auth helper checks passed.");
