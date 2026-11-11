"use client"

import { useState } from "react"
import { ActionForm } from "@/components/action-form"
import { CommunityIdentityFields } from "@/components/community-identity-fields"
import { SubmitButton } from "@/components/submit-button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { submitCommunityRequestAction } from "@/app/dashboard/start-community/actions"

const PURPOSE_MIN = 20
const PURPOSE_MAX = 600

export function CommunityRequestForm({
  email,
  phone,
}: {
  email: string
  phone: string
}) {
  const [purpose, setPurpose] = useState("")

  return (
    <ActionForm action={submitCommunityRequestAction}>
      <FieldGroup>
        <CommunityIdentityFields />
        <Field>
          <FieldLabel htmlFor="description">
            About
            <span className="text-muted-foreground text-xs font-normal">
              Optional
            </span>
          </FieldLabel>
          <Textarea
            id="description"
            name="description"
            maxLength={600}
            placeholder="What students see on the community page"
          />
        </Field>
        <Field>
          <div className="flex items-baseline justify-between gap-3">
            <FieldLabel htmlFor="purpose">What will it do?</FieldLabel>
            <span className="text-muted-foreground text-xs tabular-nums">
              {purpose.length}/{PURPOSE_MAX}
            </span>
          </div>
          <Textarea
            id="purpose"
            name="purpose"
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
            required
            minLength={PURPOSE_MIN}
            maxLength={PURPOSE_MAX}
            placeholder="The events you plan to run, who is involved, and any faculty in charge"
          />
          <FieldDescription>
            Only the reviewer reads this. It is not shown on the community page.
          </FieldDescription>
        </Field>
        <div className="grid gap-5 @md/field-group:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="contactPhone">Contact number</FieldLabel>
            <Input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              defaultValue={phone}
              required
              maxLength={20}
              placeholder="98765 43210"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="contactEmail">Contact email</FieldLabel>
            <Input
              id="contactEmail"
              name="contactEmail"
              type="email"
              autoComplete="email"
              defaultValue={email}
              required
              maxLength={254}
            />
          </Field>
          <FieldDescription className="@md/field-group:col-span-2">
            How the reviewer reaches you about this request. Only the reviewer
            sees them.
          </FieldDescription>
        </div>
        <div className="flex justify-end border-t pt-4">
          <SubmitButton
            pendingLabel="Sending…"
            disabled={purpose.trim().length < PURPOSE_MIN}
          >
            Send for review
          </SubmitButton>
        </div>
      </FieldGroup>
    </ActionForm>
  )
}
