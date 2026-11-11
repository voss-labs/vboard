"use client"

import { useState } from "react"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { slugify } from "@/lib/slug"

export function CommunityIdentityFields() {
  const [name, setName] = useState("")
  const [address, setAddress] = useState<string | null>(null)
  const slug = address ?? slugify(name)

  return (
    <>
      <Field>
        <FieldLabel htmlFor="name">Name</FieldLabel>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          minLength={2}
          maxLength={80}
          placeholder="Robotics Club"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="slug">Address</FieldLabel>
        <Input
          id="slug"
          name="slug"
          value={slug}
          onChange={(event) => setAddress(event.target.value.toLowerCase())}
          required
          maxLength={60}
          placeholder="robotics-club"
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <FieldDescription className="break-all">
          vboard.vosslabs.org/communities/{slug || "robotics-club"}
        </FieldDescription>
      </Field>
    </>
  )
}
