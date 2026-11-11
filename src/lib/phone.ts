import { z } from "zod"

const MOBILE = /^[6-9]\d{9}$/

export function normalizePhone(value: string): string {
  const digits = value.replace(/[\s\-().]/g, "")
  return digits.replace(/^(?:\+91|91|0)(?=[6-9]\d{9}$)/, "")
}

export function isPhone(value: string): boolean {
  return MOBILE.test(value)
}

export function formatPhone(phone: string): string {
  return isPhone(phone) ? `+91 ${phone.slice(0, 5)} ${phone.slice(5)}` : phone
}

export const phoneSchema = z
  .string()
  .transform(normalizePhone)
  .pipe(z.string().regex(MOBILE, "Enter a 10-digit mobile number"))
