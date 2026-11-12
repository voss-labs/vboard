"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import {
  ArchiveRestoreIcon,
  BanIcon,
  CircleCheckIcon,
  EllipsisIcon,
  ExternalLinkIcon,
  EyeOffIcon,
  PencilIcon,
  PinIcon,
  PinOffIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"
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
import { buttonVariants } from "@/components/ui/button-variants"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ActionResult } from "@/lib/action-result"
import {
  deletePostAction,
  setPostStatusAction,
  togglePinAction,
} from "@/app/dashboard/c/[slug]/posts/actions"

type Action = (
  prev: ActionResult | null,
  formData: FormData
) => Promise<ActionResult>

const CONFIRM = {
  cancel: {
    title: "Cancel this event?",
    description:
      "Registration closes and the event leaves public discovery. Existing registrations remain on record.",
    confirmLabel: "Cancel event",
  },
  delete: {
    title: "Delete this post?",
    description:
      "This post leaves discovery. Existing registrations remain in history.",
    confirmLabel: "Delete post",
  },
}

export function PostActions({
  slug,
  postId,
  postSlug,
  status,
  isEvent,
  isPinned,
  canWrite,
  canPublish,
  canDelete,
}: {
  slug: string
  postId: string
  postSlug: string
  status: string
  isEvent: boolean
  isPinned: boolean
  canWrite: boolean
  canPublish: boolean
  canDelete: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [asking, setAsking] = useState(false)
  const [kind, setKind] = useState<keyof typeof CONFIRM>("delete")
  const ask = (next: keyof typeof CONFIRM) => {
    setKind(next)
    setAsking(true)
  }
  const run = (action: Action, fields: Record<string, string> = {}) =>
    startTransition(async () => {
      const data = new FormData()
      data.set("slug", slug)
      data.set("postId", postId)
      for (const [key, value] of Object.entries(fields)) data.set(key, value)
      const result = await action(null, data)
      if (!result.ok) toast.error(result.error)
      else if (result.message) toast.success(result.message)
    })
  const setStatus = (next: string) => run(setPostStatusAction, { status: next })
  const published = status === "published"
  const closed = status === "cancelled" || status === "completed"
  const asked = CONFIRM[kind]

  return (
    <div className="flex flex-wrap items-center gap-2">
      {published && (
        <Link
          href={`/posts/${postSlug}`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <ExternalLinkIcon data-icon="inline-start" />
          View live
        </Link>
      )}
      {canWrite && (
        <Link
          href={`/dashboard/c/${slug}/posts/${postId}/edit`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <PencilIcon data-icon="inline-start" />
          Edit
        </Link>
      )}
      {canPublish && status === "draft" && (
        <Button
          size="sm"
          disabled={pending}
          onClick={() => setStatus("published")}
        >
          <SendIcon data-icon="inline-start" />
          Publish
        </Button>
      )}
      {(canPublish || canDelete) && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="icon-sm"
                disabled={pending}
                aria-busy={pending}
                aria-label="More actions"
              />
            }
          >
            <EllipsisIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            {canPublish && (
              <DropdownMenuGroup>
                {published && isEvent && (
                  <DropdownMenuItem onClick={() => setStatus("completed")}>
                    <CircleCheckIcon />
                    Mark completed
                  </DropdownMenuItem>
                )}
                {closed && (
                  <DropdownMenuItem onClick={() => setStatus("published")}>
                    <ArchiveRestoreIcon />
                    Reopen
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => run(togglePinAction)}>
                  {isPinned ? <PinOffIcon /> : <PinIcon />}
                  {isPinned ? "Unpin" : "Pin to the top"}
                </DropdownMenuItem>
                {published && (
                  <DropdownMenuItem onClick={() => setStatus("draft")}>
                    <EyeOffIcon />
                    Unpublish
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            )}
            {canPublish && (canDelete || (published && isEvent)) && (
              <DropdownMenuSeparator />
            )}
            <DropdownMenuGroup>
              {canPublish && published && isEvent && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => ask("cancel")}
                >
                  <BanIcon />
                  Cancel event
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => ask("delete")}
                >
                  <Trash2Icon />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <AlertDialog open={asking} onOpenChange={setAsking}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{asked.title}</AlertDialogTitle>
            <AlertDialogDescription>{asked.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (kind === "cancel") setStatus("cancelled")
                else run(deletePostAction)
                setAsking(false)
              }}
            >
              {asked.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
