"use client"

import { useState } from "react"
import { ActionForm } from "@/components/action-form"
import { PosterField } from "@/components/dashboard/poster-field"
import { QuestionBuilder } from "@/components/dashboard/question-builder"
import { FormSelect } from "@/components/form-select"
import { SubmitButton } from "@/components/submit-button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import type { ActionResult } from "@/lib/action-result"
import type { RegistrationQuestion } from "@/lib/registration-form"

type Defaults = {
  title: string
  body: string
  visibility: "public" | "vit_only"
  isPinned: boolean
  isEvent: boolean
  startsAt: string
  endsAt: string
  location: string
  locationVisibility: "public" | "after_approval"
  registrationOpensAt: string
  registrationClosesAt: string
  capacity: string
  requiresApproval: boolean
  registrationQuestions: RegistrationQuestion[]
  posterUrl: string | null
}

export const EMPTY_POST: Defaults = {
  title: "",
  body: "",
  visibility: "public",
  isPinned: false,
  isEvent: true,
  startsAt: "",
  endsAt: "",
  location: "",
  locationVisibility: "public",
  registrationOpensAt: "",
  registrationClosesAt: "",
  capacity: "",
  requiresApproval: false,
  registrationQuestions: [],
  posterUrl: null,
}

export function PostForm({
  action,
  slug,
  postId,
  defaults,
  canPublish,
  mode,
  questionsLocked = false,
}: {
  action: (
    prev: ActionResult | null,
    formData: FormData
  ) => Promise<ActionResult>
  slug: string
  postId?: string
  defaults: Defaults
  canPublish: boolean
  mode: "create" | "edit"
  questionsLocked?: boolean
}) {
  const [isEvent, setIsEvent] = useState(defaults.isEvent)

  return (
    <ActionForm
      action={action}
      className="grid items-start gap-6 @5xl/main:grid-cols-[1.6fr_1fr] [&>[role=alert]]:col-span-full"
    >
      <input type="hidden" name="slug" value={slug} />
      {postId && <input type="hidden" name="postId" value={postId} />}
      <input type="hidden" name="isEvent" value={isEvent ? "on" : ""} />

      <div className="flex min-w-0 flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Content</CardTitle>
            <CardDescription>
              An event people can register for, or a plain announcement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Tabs
                value={isEvent ? "event" : "note"}
                onValueChange={(v) => setIsEvent(v === "event")}
              >
                <TabsList>
                  <TabsTrigger value="event">Event</TabsTrigger>
                  <TabsTrigger value="note">Announcement</TabsTrigger>
                </TabsList>
              </Tabs>
              <Field>
                <FieldLabel htmlFor="title">Title</FieldLabel>
                <Input
                  id="title"
                  name="title"
                  defaultValue={defaults.title}
                  placeholder={
                    isEvent ? "Intro to Rust workshop" : "Recruitment is open"
                  }
                  required
                  minLength={3}
                  maxLength={140}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="body">
                  {isEvent ? "About the event" : "Post"}
                </FieldLabel>
                <Textarea
                  id="body"
                  name="body"
                  defaultValue={defaults.body}
                  className="min-h-40"
                  required
                />
              </Field>
              <PosterField current={defaults.posterUrl} />
            </FieldGroup>
          </CardContent>
        </Card>
        {isEvent && (
          <Card>
            <CardHeader>
              <CardTitle>Event details</CardTitle>
              <CardDescription>
                Dates and times are India Standard Time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid gap-6 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="startsAt">Starts</FieldLabel>
                    <Input
                      id="startsAt"
                      name="startsAt"
                      type="datetime-local"
                      defaultValue={defaults.startsAt}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="endsAt">Ends</FieldLabel>
                    <Input
                      id="endsAt"
                      name="endsAt"
                      type="datetime-local"
                      defaultValue={defaults.endsAt}
                      required
                    />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="location">Location</FieldLabel>
                  <Input
                    id="location"
                    name="location"
                    defaultValue={defaults.location}
                    placeholder="Seminar Hall, B-Wing"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="locationVisibility">
                    Who sees the location
                  </FieldLabel>
                  <FormSelect
                    id="locationVisibility"
                    name="locationVisibility"
                    label="Who sees the location"
                    defaultValue={defaults.locationVisibility}
                    items={[
                      { value: "public", label: "Everyone" },
                      {
                        value: "after_approval",
                        label: "Only approved attendees",
                      },
                    ]}
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        )}
        {isEvent && (
          <Card>
            <CardHeader>
              <CardTitle>Registration questions</CardTitle>
              <CardDescription>
                Students answer these when they register. Organizers of this
                community read the answers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QuestionBuilder
                initial={defaults.registrationQuestions}
                locked={questionsLocked}
              />
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-6">
        {isEvent && (
          <Card>
            <CardHeader>
              <CardTitle>Registration</CardTitle>
              <CardDescription>Times are India Standard Time.</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="capacity">Capacity</FieldLabel>
                  <Input
                    id="capacity"
                    name="capacity"
                    type="number"
                    min={1}
                    defaultValue={defaults.capacity}
                    placeholder="Unlimited"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="registrationOpensAt">Opens</FieldLabel>
                  <Input
                    id="registrationOpensAt"
                    name="registrationOpensAt"
                    type="datetime-local"
                    defaultValue={defaults.registrationOpensAt}
                  />
                  <FieldDescription>
                    Blank opens it on publish.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="registrationClosesAt">Closes</FieldLabel>
                  <Input
                    id="registrationClosesAt"
                    name="registrationClosesAt"
                    type="datetime-local"
                    defaultValue={defaults.registrationClosesAt}
                  />
                  <FieldDescription>
                    Blank closes it when the event ends.
                  </FieldDescription>
                </Field>
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor="requiresApproval">
                      Approve each registration
                    </FieldLabel>
                    <FieldDescription>
                      Requests wait until an Organizer approves them.
                    </FieldDescription>
                  </FieldContent>
                  <Switch
                    id="requiresApproval"
                    name="requiresApproval"
                    defaultChecked={defaults.requiresApproval}
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Visibility</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="visibility">Who can see it</FieldLabel>
                <FormSelect
                  id="visibility"
                  name="visibility"
                  label="Who can see it"
                  defaultValue={defaults.visibility}
                  items={[
                    { value: "public", label: "Public — anyone" },
                    {
                      value: "vit_only",
                      label: "VIT only — signed-in students",
                    },
                  ]}
                />
              </Field>
              {canPublish && (
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor="isPinned">
                      Pin to the top of the feed
                    </FieldLabel>
                  </FieldContent>
                  <Switch
                    id="isPinned"
                    name="isPinned"
                    defaultChecked={defaults.isPinned}
                  />
                </Field>
              )}
            </FieldGroup>
          </CardContent>
        </Card>
      </div>
      <div className="bg-background/95 sticky bottom-0 z-10 col-span-full flex flex-wrap items-center justify-between gap-3 border-t py-3 backdrop-blur-sm sm:py-4">
        <p className="text-muted-foreground text-xs max-sm:sr-only">
          {mode === "create"
            ? "Save a draft to finish later, or publish when ready."
            : "Changes apply when you save."}
        </p>
        <div className="flex w-full gap-2 sm:w-auto sm:flex-wrap [&>button]:flex-1 sm:[&>button]:flex-none">
          {mode === "create" ? (
            <>
              {canPublish && (
                <SubmitButton
                  name="intent"
                  value="publish"
                  pendingLabel="Publishing…"
                >
                  Publish
                </SubmitButton>
              )}
              <SubmitButton name="intent" value="draft" variant="outline">
                Save draft
              </SubmitButton>
            </>
          ) : (
            <SubmitButton name="intent" value="save" pendingLabel="Saving…">
              Save changes
            </SubmitButton>
          )}
        </div>
      </div>
    </ActionForm>
  )
}
