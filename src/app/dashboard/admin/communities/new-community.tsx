"use client"

import { useState } from "react"
import { PlusIcon } from "lucide-react"
import { ActionForm } from "@/components/action-form"
import { CommunityIdentityFields } from "@/components/community-identity-fields"
import { SubmitButton } from "@/components/submit-button"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { createCommunityAction } from "@/app/dashboard/admin/actions"

export function NewCommunity() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button />}>
        <PlusIcon data-icon="inline-start" />
        New community
      </SheetTrigger>
      <SheetContent className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <SheetHeader className="border-b pr-12">
          <SheetTitle>New community</SheetTitle>
          <SheetDescription>
            It goes live at once. Its Lead builds the team from there.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <ActionForm
            key={String(open)}
            action={createCommunityAction}
            onDone={() => setOpen(false)}
          >
            <FieldGroup>
              <CommunityIdentityFields />
              <Field>
                <FieldLabel htmlFor="description">
                  About
                  <span className="text-muted-foreground text-xs font-normal">
                    Optional
                  </span>
                </FieldLabel>
                <Textarea id="description" name="description" maxLength={600} />
              </Field>
              <Field>
                <FieldLabel htmlFor="leadEmail">
                  Lead email
                  <span className="text-muted-foreground text-xs font-normal">
                    Optional
                  </span>
                </FieldLabel>
                <Input
                  id="leadEmail"
                  name="leadEmail"
                  type="email"
                  placeholder="name.surname@vit.edu.in"
                />
                <FieldDescription>
                  The Lead must have signed in to vboard once.
                </FieldDescription>
              </Field>
              <div className="flex justify-end border-t pt-4">
                <SubmitButton pendingLabel="Creating…">
                  Create community
                </SubmitButton>
              </div>
            </FieldGroup>
          </ActionForm>
        </div>
      </SheetContent>
    </Sheet>
  )
}
