import { vi } from "vitest";

/** Shared PocketBase client mock: every test file mocks src/lib/pocketbase with this shape. */
export function makePbMock() {
  const collections: Record<string, Record<string, ReturnType<typeof vi.fn>>> = {};
  const collection = vi.fn((name: string) => {
    if (!collections[name]) {
      collections[name] = {
        getList: vi.fn().mockResolvedValue({ page: 1, perPage: 20, totalItems: 0, totalPages: 0, items: [] }),
        getFullList: vi.fn().mockResolvedValue([]),
        getOne: vi.fn(),
        getFirstListItem: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn().mockResolvedValue(true),
        subscribe: vi.fn().mockResolvedValue(() => Promise.resolve()),
      };
    }
    return collections[name];
  });
  // Mirrors the SDK's parameter binding closely enough for assertions on exact filter strings.
  const filter = vi.fn((expr: string, params: Record<string, unknown> = {}) =>
    expr.replace(/\{:(\w+)\}/g, (_, k) => (typeof params[k] === "string" ? `'${params[k]}'` : String(params[k]))),
  );
  return {
    collection,
    collections,
    filter,
    send: vi.fn(),
    files: { getURL: vi.fn(() => "https://files.test/x"), getToken: vi.fn().mockResolvedValue("tok") },
    authStore: { isValid: true, record: { id: "u1" }, onChange: vi.fn(() => () => {}) },
  };
}

export type PbMock = ReturnType<typeof makePbMock>;
