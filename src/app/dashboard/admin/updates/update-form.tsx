"use client"

import { useMemo, useState, useTransition } from "react"
import { Loader2Icon, SendIcon } from "lucide-react"
import { toast } from "sonner"
import { Panel } from "@/components/dashboard/ui"
import { FormSelect } from "@/components/form-select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  renderUpdateEmail,
  UPDATE_AUDIENCES,
  UPDATE_BUTTONS,
  type UpdateAudience,
  type UpdateButton,
} from "@/lib/update-email"
import { sendUpdateAction } from "@/app/dashboard/admin/updates/actions"

const MESSAGE_LIMIT = 4000
const people = (count: number) =>
  `${count} ${count === 1 ? "person" : "people"}`

export function UpdateForm({
  sendId,
  counts,
  me,
  baseUrl,
  sender,
  ready,
  seeded,
}: {
  sendId: string
  counts: Record<UpdateAudience, number>
  me: { name: string; email: string }
  baseUrl: string
  sender: string
  ready: boolean
  seeded: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [asking, setAsking] = useState(false)
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [audience, setAudience] = useState<UpdateAudience>("everyone")
  const [button, setButton] = useState<UpdateButton>("profile")
  const filled = subject.trim().length >= 3 && message.trim().length > 0
  const preview = useMemo(
    () =>
      renderUpdateEmail(
        {
          subject: subject.trim() || "Your subject",
          message: message.trim() || "Your update appears here as you write.",
          button,
        },
        me,
        baseUrl
      ).html,
    [subject, message, button, me, baseUrl]
  )
  const send = (intent: "test" | "send") =>
    startTransition(async () => {
      const data = new FormData()
      for (const [key, value] of Object.entries({
        sendId,
        subject,
        message,
        audience,
        button,
        intent,
      }))
        data.set(key, value)
      const result = await sendUpdateAction(null, data)
      if (!result.ok) toast.error(result.error)
      else if (result.message) toast.success(result.message)
    })

  return (
    <div className="grid items-start gap-6 @5xl/main:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Panel title="Write the update">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="audience">Send to</FieldLabel>
            <FormSelect
              id="audience"
              name="audience"
              label="Send to"
              defaultValue={audience}
              onValueChange={(value) => setAudience(value as UpdateAudience)}
              items={(Object.keys(UPDATE_AUDIENCES) as UpdateAudience[]).map(
                (value) => ({
                  value,
                  label: `${UPDATE_AUDIENCES[value]} (${counts[value]})`,
                })
              )}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="subject">Subject</FieldLabel>
            <Input
              id="subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Add your contact number to your profile"
              maxLength={120}
              autoComplete="off"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="message">Message</FieldLabel>
            <Textarea
              id="message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Write the update. Leave a blank line between paragraphs. Links become clickable."
              maxLength={MESSAGE_LIMIT}
              className="min-h-48"
              aria-describedby="message-help"
            />
            <FieldDescription
              id="message-help"
              className="flex justify-between gap-4"
            >
              <span>Starts with “Hi” and the person’s first name.</span>
              <span className="tabular-nums">
                {message.length} / {MESSAGE_LIMIT}
              </span>
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="button">Button under the message</FieldLabel>
            <FormSelect
              id="button"
              name="button"
              label="Button under the message"
              defaultValue={button}
              onValueChange={(value) => setButton(value as UpdateButton)}
              items={(Object.keys(UPDATE_BUTTONS) as UpdateButton[]).map(
                (value) => ({
                  value,
                  label: UPDATE_BUTTONS[value]?.label ?? "No button",
                })
              )}
            />
          </Field>
          {seeded && (
            <p
              role="status"
              className="bg-muted text-muted-foreground rounded-lg px-4 py-3 text-sm leading-relaxed"
            >
              The persona switcher is on, so these are seeded accounts. Only the
              test send works here.
            </p>
          )}
          {!ready && (
            <p
              role="status"
              className="bg-muted text-muted-foreground rounded-lg px-4 py-3 text-sm leading-relaxed"
            >
              Sending is off until RESEND_API_KEY is set for this deployment.
              You can still write and preview.
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2 border-t pt-4 [&>button]:flex-1 sm:[&>button]:flex-none">
            <Button
              type="button"
              variant="outline"
              disabled={!ready || !filled || pending}
              onClick={() => send("test")}
            >
              Send a test to me
            </Button>
            <Button
              type="button"
              disabled={
                !ready || seeded || !filled || pending || counts[audience] === 0
              }
              aria-busy={pending}
              onClick={() => setAsking(true)}
            >
              {pending ? (
                <Loader2Icon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : (
                <SendIcon data-icon="inline-start" />
              )}
              Send to {people(counts[audience])}
            </Button>
          </div>
        </FieldGroup>
      </Panel>
      <Panel title="Preview" description={`As ${me.email} would receive it.`}>
        <dl className="mb-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">From</dt>
          <dd className="break-words">{sender}</dd>
          <dt className="text-muted-foreground">Subject</dt>
          <dd className="break-words">{subject.trim() || "Your subject"}</dd>
        </dl>
        <iframe
          title="Email preview"
          sandbox=""
          srcDoc={preview}
          className="h-[34rem] w-full rounded-lg border bg-white"
        />
      </Panel>
      <AlertDialog open={asking} onOpenChange={setAsking}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Send this update to {people(counts[audience])}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              “{subject.trim()}” goes to{" "}
              {UPDATE_AUDIENCES[audience].toLowerCase()}. An email cannot be
              recalled once it is sent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setAsking(false)
                send("send")
              }}
            >
              Send update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
