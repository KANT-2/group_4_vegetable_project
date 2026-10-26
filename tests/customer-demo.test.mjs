import test from "node:test";
import assert from "node:assert/strict";
import { encodeCustomerDemo, decodeCustomerDemo } from "../src/lib/customer-demo-session.ts";

test("customer preview session rejects tampering and expiry and never works in production", () => {
  const previous = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "development";
    const profile = { nickname: "qwer", name: "", email: "", phone: "", recipient: "", postalCode: "", address: "", addressDetail: "", expires: Date.now() + 60000 };
    const cookie = encodeCustomerDemo(profile);
    assert.deepEqual(decodeCustomerDemo(cookie), profile);
    assert.equal(decodeCustomerDemo(`${cookie}0`), null);
    assert.equal(decodeCustomerDemo(encodeCustomerDemo({ ...profile, expires: Date.now() - 1000 })), null);
    process.env.NODE_ENV = "production";
    assert.equal(decodeCustomerDemo(cookie), null);
    assert.throws(() => encodeCustomerDemo(profile));
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});
