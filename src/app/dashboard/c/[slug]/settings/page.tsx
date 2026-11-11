import Link from "next/link"
import { ExternalLinkIcon } from "lucide-react"
import { ActionForm } from "@/components/action-form"
import { CommunityLogo } from "@/components/community-logo"
import { Panel } from "@/components/dashboard/ui"
import { SubmitButton } from "@/components/submit-button"
import { buttonVariants } from "@/components/ui/button-variants"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { IMAGE_ACCEPT, isStoredMedia } from "@/lib/media"
import { requireCommunityAccess } from "@/lib/session"
import { updateCommunityAction } from "@/app/dashboard/c/[slug]/settings/actions"

export default async function CommunitySettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { community } = await requireCommunityAccess(slug, "community:update")

  return (
    <div className="grid items-start gap-6 @5xl/main:grid-cols-[minmax(0,1fr)_22rem]">
      <Panel
        title="Community details"
        description="How the community appears on its public page and its posts."
      >
        <ActionForm
          key={[community.name, community.description, community.logoUrl].join(
            "|"
          )}
          action={updateCommunityAction}
        >
          <input type="hidden" name="slug" value={slug} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
                name="name"
                defaultValue={community.name}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="description">About</FieldLabel>
              <Textarea
                id="description"
                name="description"
                defaultValue={community.description}
                maxLength={600}
              />
              <FieldDescription>
                Shown on the community page and in the directory. Up to 600
                characters.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="logoFile">Logo</FieldLabel>
              <div className="flex flex-col gap-4 @md/field-group:flex-row @md/field-group:items-start">
                <CommunityLogo
                  name={community.name}
                  logoUrl={community.logoUrl}
                  className="size-16 shrink-0"
                />
                <div className="grid min-w-0 flex-1 gap-3">
                  <div className="grid gap-1.5">
                    <Input
                      id="logoFile"
                      name="logoFile"
                      type="file"
                      accept={IMAGE_ACCEPT}
                      aria-describedby="logoFile-help"
                    />
                    <FieldDescription id="logoFile-help">
                      PNG, JPEG or WebP, up to 2 MiB. Uploading replaces the
                      current logo.
                    </FieldDescription>
                  </div>
                  <div className="grid gap-1.5">
                    <Input
                      id="logoUrl"
                      name="logoUrl"
                      type="url"
                      aria-label="Logo image URL"
                      defaultValue={
                        isStoredMedia(community.logoUrl)
                          ? ""
                          : (community.logoUrl ?? "")
                      }
                      placeholder="Or paste a public image URL"
                    />
                  </div>
                  {community.logoUrl && (
                    <label className="flex w-fit items-center gap-2 text-sm">
                      <Switch id="removeLogo" name="removeLogo" />
                      Remove the current logo
                    </label>
                  )}
                </div>
              </div>
            </Field>
            <div className="flex justify-end border-t pt-4">
              <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
            </div>
          </FieldGroup>
        </ActionForm>
      </Panel>
      <Panel title="On the public site">
        <div className="flex flex-col gap-5">
          <div className="flex min-w-0 gap-3">
            <CommunityLogo
              name={community.name}
              logoUrl={community.logoUrl}
              className="size-12 shrink-0"
            />
            <div className="min-w-0 space-y-1">
              <p className="leading-snug font-semibold break-words">
                {community.name}
              </p>
              <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed break-words">
                {community.description || "No description yet."}
              </p>
            </div>
          </div>
          <div className="grid gap-1 border-t pt-4">
            <p className="text-muted-foreground text-xs">Address</p>
            <p className="text-sm break-all">
              vboard.vosslabs.org/communities/{community.slug}
            </p>
            <p className="text-muted-foreground text-xs">
              It stays the same when the name changes.
            </p>
          </div>
          <Link
            href={`/communities/${community.slug}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ExternalLinkIcon data-icon="inline-start" />
            Open public page
          </Link>
        </div>
      </Panel>
    </div>
  )
}
