"use client"

import { useActionState, useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"
import type { ActionResult } from "@/lib/action-result"

type Action = (
  prev: ActionResult | null,
  formData: FormData
) => Promise<ActionResult>

export function ActionForm({
  action,
  children,
  className,
  onDone,
}: {
  action: Action
  children: React.ReactNode
  className?: string
  onDone?: () => void
}) {
  const form = useRef<HTMLFormElement>(null)
  const allowReset = useRef(false)
  const [state, formAction] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => {
      const result = await action(prev, formData)
      if (!result.ok) toast.error(result.error)
      else if (result.message) toast.success(result.message)
      return result
    },
    null
  )
  const onDoneRef = useRef(onDone)
  const attachForm = useCallback((element: HTMLFormElement | null) => {
    form.current = element
    if (!element) return
    const preserveValues = (event: Event) => {
      if (!allowReset.current) event.preventDefault()
    }
    element.addEventListener("reset", preserveValues)
    return () => element.removeEventListener("reset", preserveValues)
  }, [])

  useEffect(() => {
    onDoneRef.current = onDone
  })

  useEffect(() => {
    if (!state?.ok) return
    allowReset.current = true
    form.current?.reset()
    allowReset.current = false
    onDoneRef.current?.()
  }, [state])

  return (
    <form ref={attachForm} action={formAction} className={className}>
      {children}
      {state && !state.ok && (
        <p
          role="alert"
          className="border-destructive/25 bg-destructive/5 text-destructive mt-4 rounded-lg border px-4 py-3 text-sm leading-relaxed"
        >
          {state.error}
        </p>
      )}
    </form>
  )
}
