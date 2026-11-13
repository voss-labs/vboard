import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { closeDatabase, withDb } from "@/db/context"

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  end: vi.fn(),
  transaction: vi.fn(),
}))
vi.mock("pg", () => ({
  Pool: class {
    connect = mocks.connect
    on = vi.fn()
    end = mocks.end
  },
}))
vi.mock("drizzle-orm/node-postgres", () => ({
  drizzle: () => ({ transaction: mocks.transaction }),
}))

const timeout = new Error("Connection terminated due to connection timeout")
const tx = { execute: vi.fn() }
const restricted = {
  query: vi.fn(),
  release: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
}

beforeEach(async () => {
  await closeDatabase()
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.spyOn(console, "warn").mockImplementation(() => {})
  vi.stubEnv("DATABASE_URL", "postgresql://vboard_app:test@localhost/vboard")
  restricted.query.mockResolvedValue({ rows: [{ valid: true }] })
  mocks.connect.mockResolvedValue(restricted)
  mocks.transaction.mockImplementation(
    async (work: (transaction: typeof tx) => unknown) => work(tx)
  )
})
afterEach(async () => {
  await closeDatabase()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe("withDb connection recovery", () => {
  it("does not remember a failed verification", async () => {
    mocks.connect.mockRejectedValueOnce(timeout).mockRejectedValueOnce(timeout)
    const failed = withDb(null, async () => "never")
    const settled = expect(failed).rejects.toThrow("connection timeout")
    await vi.runAllTimersAsync()
    await settled
    expect(mocks.transaction).not.toHaveBeenCalled()

    await expect(withDb(null, async () => "recovered")).resolves.toBe(
      "recovered"
    )
    expect(mocks.connect).toHaveBeenCalledTimes(4)
  })

  it("verifies the principal once and releases every connection", async () => {
    await withDb(null, async () => 1)
    await withDb(null, async () => 2)
    expect(restricted.query).toHaveBeenCalledTimes(1)
    expect(mocks.transaction).toHaveBeenCalledTimes(2)
    expect(restricted.release).toHaveBeenCalledTimes(3)
  })

  it("retries a transaction that could not open a connection", async () => {
    mocks.transaction.mockRejectedValueOnce(timeout)
    const work = vi.fn(async () => "saved")
    const result = withDb({ userId: "student" }, work)
    await vi.runAllTimersAsync()
    await expect(result).resolves.toBe("saved")
    expect(mocks.transaction).toHaveBeenCalledTimes(2)
    expect(work).toHaveBeenCalledTimes(1)
    expect(restricted.release).toHaveBeenCalledTimes(3)
  })

  it("never reruns work after the transaction started", async () => {
    const work = vi.fn(async () => {
      throw new Error("write failed")
    })
    await expect(withDb({ userId: "student" }, work)).rejects.toThrow(
      "write failed"
    )
    expect(mocks.transaction).toHaveBeenCalledTimes(1)
    expect(work).toHaveBeenCalledTimes(1)
  })
})
