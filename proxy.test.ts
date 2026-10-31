import { beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { encode } from "next-auth/jwt";
import proxy from "./proxy";

const secret = "test-secret";

async function sessionCookie(name: string) {
  const token = await encode({ token: { sub: "user-1" }, secret, salt: name });
  return `${name}=${token}`;
}

function request(path: string, init: { cookie: string; forwardedProto?: string }) {
  const headers = new Headers({ cookie: init.cookie });
  if (init.forwardedProto) {
    headers.set("x-forwarded-proto", init.forwardedProto);
  }
  // Behind a TLS-terminating reverse proxy the app itself is reached over http.
  return new NextRequest(`http://localhost:3000${path}`, { headers });
}

describe("proxy", () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = secret;
  });

  it("lets an authenticated request through over plain http", async () => {
    const res = await proxy(
      request("/app", { cookie: await sessionCookie("authjs.session-token") })
    );

    expect(res.headers.get("location")).toBeNull();
  });

  it("recognises the __Secure- session cookie behind an https proxy", async () => {
    const res = await proxy(
      request("/app", {
        cookie: await sessionCookie("__Secure-authjs.session-token"),
        forwardedProto: "https",
      })
    );

    expect(res.headers.get("location")).toBeNull();
  });

  it("redirects to login when no session cookie is present", async () => {
    const res = await proxy(request("/app", { cookie: "", forwardedProto: "https" }));

    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/auth/login?next=%2Fapp"
    );
  });
});
