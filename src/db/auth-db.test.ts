import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { authDb, closeAuthDatabase, verifyAuthDatabase } from "@/db/auth-db"

const mocks = vi.hoisted(() => ({
  configure: vi.fn(),
  connect: vi.fn(),
  query: vi.fn(),
  release: vi.fn(),
  end: vi.fn(),
  database: { query: { user: {} } },
}))
vi.mock("pg", () => ({
  Pool: class {
    constructor(config: unknown) {
      mocks.configure(config)
    }
    connect = mocks.connect
    on = vi.fn()
    end = mocks.end
  },
}))
vi.mock("drizzle-orm/node-postgres", () => ({ drizzle: () => mocks.database }))

beforeEach(async () => {
  await closeAuthDatabase()
  vi.clearAllMocks()
  vi.stubEnv(
    "DATABASE_URL",
    "postgresql://vboard_app:test@localhost/vboard_test_auth"
  )
  vi.stubEnv(
    "AUTH_DATABASE_URL",
    "postgresql://owner:ignored@localhost/ignored"
  )
  mocks.connect.mockResolvedValue({
    query: mocks.query,
    release: mocks.release,
    on: vi.fn(),
    removeListener: vi.fn(),
  })
  mocks.query.mockResolvedValue({ rows: [{ valid: true }] })
})
afterEach(async () => {
  await closeAuthDatabase()
  vi.unstubAllEnvs()
})

describe("single runtime database authentication adapter", () => {
  it("uses only DATABASE_URL and verifies vboard_app before adapter access", async () => {
    expect(() => Reflect.get(authDb, "query")).toThrow(
      "verification must complete"
    )
    await verifyAuthDatabase()
    expect(mocks.configure).toHaveBeenCalledWith(
      expect.objectContaining({ connectionString: process.env.DATABASE_URL })
    )
    expect(mocks.query).toHaveBeenCalledWith(expect.any(String), ["vboard_app"])
    expect(Reflect.get(authDb, "query")).toBe(mocks.database.query)
  })

  it("requires the explicit runtime URL despite an obsolete auth URL", async () => {
    vi.stubEnv("DATABASE_URL", "")
    await expect(verifyAuthDatabase()).rejects.toThrow(
      "DATABASE_URL is not set"
    )
    expect(mocks.configure).not.toHaveBeenCalled()
    expect(() => Reflect.get(authDb, "query")).toThrow(
      "verification must complete"
    )
  })

  it("rejects owner or otherwise privileged credentials before opening the adapter", async () => {
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://owner:rejected@localhost/vboard_test_auth"
    )
    mocks.query.mockResolvedValue({ rows: [{ valid: false }] })
    await expect(verifyAuthDatabase()).rejects.toThrow("restricted vboard_app")
    expect(() => Reflect.get(authDb, "query")).toThrow(
      "verification must complete"
    )
  })

  it("does not remember a failed verification", async () => {
    mocks.query.mockRejectedValueOnce(new Error("connection lost"))
    await expect(verifyAuthDatabase()).rejects.toThrow("connection lost")
    expect(() => Reflect.get(authDb, "query")).toThrow(
      "verification must complete"
    )
    await verifyAuthDatabase()
    expect(mocks.query).toHaveBeenCalledTimes(2)
    expect(Reflect.get(authDb, "query")).toBe(mocks.database.query)
  })
})
