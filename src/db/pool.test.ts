import type { Pool } from "pg"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { retryConnect, verifyPrincipal, withClient } from "@/db/pool"

const timeout = new Error("Connection terminated due to connection timeout")

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(console, "warn").mockImplementation(() => {})
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("retryConnect", () => {
  it("tries once more when the connection never opened", async () => {
    const attempt = vi
      .fn<(connected: () => void) => Promise<string>>()
      .mockRejectedValueOnce(timeout)
      .mockResolvedValueOnce("ready")
    const result = retryConnect(attempt)
    await vi.runAllTimersAsync()
    await expect(result).resolves.toBe("ready")
    expect(attempt).toHaveBeenCalledTimes(2)
    expect(console.warn).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining("retrying once"),
      timeout.message
    )
  })

  it("never repeats work that started on an open connection", async () => {
    const attempt = vi.fn(async (connected: () => void) => {
      connected()
      throw new Error("statement failed")
    })
    await expect(retryConnect(attempt)).rejects.toThrow("statement failed")
    expect(attempt).toHaveBeenCalledTimes(1)
    expect(console.warn).not.toHaveBeenCalled()
  })

  it("gives up after the second failed connection", async () => {
    const attempt = vi
      .fn<(connected: () => void) => Promise<string>>()
      .mockRejectedValue(timeout)
    const result = retryConnect(attempt)
    const settled = expect(result).rejects.toThrow("connection timeout")
    await vi.runAllTimersAsync()
    await settled
    expect(attempt).toHaveBeenCalledTimes(2)
  })
})

describe("verifyPrincipal", () => {
  function pool(connect: ReturnType<typeof vi.fn>) {
    return { connect } as unknown as Pool
  }
  function client(valid: boolean) {
    return {
      query: vi.fn().mockResolvedValue({ rows: [{ valid }] }),
      release: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn(),
    }
  }

  it("survives one failed connection and releases the client", async () => {
    const restricted = client(true)
    const connect = vi
      .fn()
      .mockRejectedValueOnce(timeout)
      .mockResolvedValueOnce(restricted)
    const result = verifyPrincipal(pool(connect))
    await vi.runAllTimersAsync()
    await expect(result).resolves.toBeUndefined()
    expect(connect).toHaveBeenCalledTimes(2)
    expect(restricted.release).toHaveBeenCalledOnce()
  })

  it("rejects a privileged role without asking again", async () => {
    const privileged = client(false)
    const connect = vi.fn().mockResolvedValue(privileged)
    await expect(verifyPrincipal(pool(connect))).rejects.toThrow(
      "restricted vboard_app"
    )
    expect(connect).toHaveBeenCalledTimes(1)
    expect(privileged.release).toHaveBeenCalledOnce()
  })
})

describe("withClient", () => {
  it("listens for a dead connection while the client is checked out", async () => {
    const events: string[] = []
    const client = {
      on: vi.fn(() => events.push("listen")),
      removeListener: vi.fn(() => events.push("stop listening")),
      release: vi.fn(() => events.push("release")),
    }
    const connect = vi.fn().mockResolvedValue(client)
    await expect(
      withClient({ connect } as unknown as Pool, async () => {
        events.push("work")
        throw new Error("Connection terminated unexpectedly")
      })
    ).rejects.toThrow("terminated unexpectedly")
    expect(events).toEqual(["listen", "work", "stop listening", "release"])
    expect(client.on).toHaveBeenCalledWith("error", expect.any(Function))
  })
})
