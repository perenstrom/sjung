// Stand-in for `next/headers`: the request's cookie jar, where the Default
// group is kept. Swap it in with
// `vi.mock("next/headers", () => import("../support/cookie-jar"))` and clear
// `cookieJar` in a `beforeEach`.

export const cookieJar = new Map<string, string>();

export async function cookies() {
  return {
    get: (name: string) => (cookieJar.has(name) ? { value: cookieJar.get(name) } : undefined),
    set: (name: string, value: string) => cookieJar.set(name, value),
    delete: (name: string) => cookieJar.delete(name),
  };
}
