import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { emailConfigured, sendEmails } from "@/lib/resend"

vi.mock("server-only", () => ({}))

const fetchMock = vi.fn()
const email = (n: number) => ({
  to: `person${n}@vit.edu.in`,
  subject: "Update",
  html: "<p>Update</p>",
  text: "Update",
})
const emails = (count: number) =>
  Array.from({ length: count }, (_, n) => email(n))
const answer = (status: number) => new Response("{}", { status })

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal("fetch", fetchMock)
  vi.stubEnv("RESEND_API_KEY", "test-key")
  vi.stubEnv("EMAIL_FROM", "vboard <updates@example.org>")
  fetchMock.mockReset()
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

async function settle<T>(work: Promise<T>) {
  await vi.runAllTimersAsync()
  return work
}

describe("sendEmails", () => {
  it("is off without an API key", () => {
    vi.stubEnv("RESEND_API_KEY", "")
    expect(emailConfigured()).toBe(false)
  })

  it("sends one email per person in batches of 100 with a key per batch", async () => {
    fetchMock.mockImplementation(async () => answer(200))
    expect(await settle(sendEmails(emails(230), "send-1"))).toEqual({
      sent: 230,
      failure: null,
    })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    const [url, request] = fetchMock.mock.calls[2]
    expect(url).toBe("https://api.resend.com/emails/batch")
    expect(request.headers).toMatchObject({
      Authorization: "Bearer test-key",
      "Idempotency-Key": "update-send-1-2",
    })
    const body = JSON.parse(request.body)
    expect(body).toHaveLength(30)
    expect(body[0]).toEqual({
      from: "vboard <updates@example.org>",
      ...email(200),
    })
  })

  it("sends a test without an idempotency key", async () => {
    fetchMock.mockImplementation(async () => answer(200))
    await settle(sendEmails(emails(1)))
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty(
      "Idempotency-Key"
    )
  })

  it("retries a busy or failing service and then succeeds", async () => {
    fetchMock
      .mockImplementationOnce(async () => answer(429))
      .mockRejectedValueOnce(new Error("socket"))
      .mockImplementationOnce(async () => answer(200))
    expect(await settle(sendEmails(emails(2), "send-2"))).toEqual({
      sent: 2,
      failure: null,
    })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it("stops at the first refused batch and reports how many went out", async () => {
    fetchMock
      .mockImplementationOnce(async () => answer(200))
      .mockImplementationOnce(async () => answer(422))
    expect(await settle(sendEmails(emails(250), "send-3"))).toEqual({
      sent: 100,
      failure: "Resend answered 422.",
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
