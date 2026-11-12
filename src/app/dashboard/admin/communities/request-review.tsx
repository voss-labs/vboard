"use client"

import { useState, useTransition } from "react"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { decideCommunityRequestAction } from "@/app/dashboard/admin/actions"

export function RequestReview({
  requestId,
  name,
  requesterName,
  blocked,
}: {
  requestId: string
  name: string
  requesterName: string
  blocked: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [asking, setAsking] = useState<"approve" | "reject" | null>(null)
  const [decision, setDecision] = useState<"approve" | "reject">("approve")
  const [note, setNote] = useState("")
  const ask = (next: "approve" | "reject") => {
    setDecision(next)
    setAsking(next)
  }
  const decide = () =>
    startTransition(async () => {
      const data = new FormData()
      data.set("requestId", requestId)
      data.set("decision", decision)
      data.set("note", note)
      const result = await decideCommunityRequestAction(null, data)
      if (!result.ok) toast.error(result.error)
      else if (result.message) toast.success(result.message)
    })
  const approving = decision === "approve"

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => ask("reject")}
      >
        Reject
      </Button>
      <Button
        size="sm"
        disabled={pending || blocked}
        aria-busy={pending}
        onClick={() => ask("approve")}
      >
        Approve
      </Button>
      <AlertDialog
        open={asking !== null}
        onOpenChange={(open) => {
          if (!open) setAsking(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {approving ? `Approve ${name}?` : `Reject ${name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {approving
                ? `The community goes live and ${requesterName} becomes its Lead.`
                : `${requesterName} sees the decision and your note, and can send a new request.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2">
            <Label htmlFor={`note-${requestId}`}>
              Note to {requesterName}
              <span className="text-muted-foreground text-xs font-normal">
                Optional
              </span>
            </Label>
            <Textarea
              id={`note-${requestId}`}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={400}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              variant={approving ? "default" : "destructive"}
              onClick={() => {
                decide()
                setAsking(null)
              }}
            >
              {approving ? "Approve" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
