"use client"

import { useMemo, useState } from "react"
import { ChevronRightIcon } from "lucide-react"
import { RecordTable } from "@/components/dashboard/record-table"
import { RegistrationBulkActions } from "@/components/dashboard/registration-bulk-actions"
import { RegistrationDetail } from "@/components/dashboard/registration-detail"
import {
  ANY,
  RegistrationsToolbar,
  STATUS_FILTERS,
} from "@/components/dashboard/registrations-toolbar"
import { EmptyState, StatusBadge } from "@/components/dashboard/ui"
import { useRegistrationDecisions } from "@/components/dashboard/use-registration-decisions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type {
  RegistrationAnswers,
  RegistrationQuestion,
} from "@/lib/registration-form"

export type RegistrationRow = {
  id: string
  name: string
  email: string
  rollNumber: string | null
  department: string | null
  division: string | null
  year: string | null
  bio: string | null
  status: string
  registeredAt: string
  answers: RegistrationAnswers
}

const DEFAULT_ANSWER_COLUMNS = 2

export function RegistrationsTable({
  rows: saved,
  questions,
  slug,
  postId,
  canDecide,
  canCheckIn,
  initialFilter,
}: {
  rows: RegistrationRow[]
  questions: RegistrationQuestion[]
  slug: string
  postId: string
  canDecide: boolean
  canCheckIn: boolean
  initialFilter: string
}) {
  const { rows, decide } = useRegistrationDecisions(saved, slug, postId)
  const choiceQuestions = questions.filter((q) => q.type === "choice")
  const [status, setStatus] = useState(
    STATUS_FILTERS.includes(initialFilter) ? initialFilter : "all"
  )
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [choices, setChoices] = useState<Record<string, string>>({})
  const [columns, setColumns] = useState(
    () =>
      new Set(choiceQuestions.slice(0, DEFAULT_ANSWER_COLUMNS).map((q) => q.id))
  )
  const [open, setOpen] = useState<{ id: string; index: number } | null>(null)
  const shownQuestions = choiceQuestions.filter((q) => columns.has(q.id))

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length }
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1
    return c
  }, [rows])

  const visible = rows.filter((r) => {
    if (status !== "all" && r.status !== status) return false
    if (
      choiceQuestions.some(
        (c) =>
          (choices[c.id] ?? ANY) !== ANY && r.answers[c.id] !== choices[c.id]
      )
    )
      return false
    const q = query.trim().toLowerCase()
    if (!q) return true
    return [
      r.name,
      r.email,
      r.rollNumber ?? "",
      ...Object.values(r.answers),
    ].some((v) => v.toLowerCase().includes(q))
  })

  const openRow = open ? (rows.find((r) => r.id === open.id) ?? null) : null
  const at = open ? visible.findIndex((r) => r.id === open.id) : -1
  const previous = open ? visible[(at < 0 ? open.index : at) - 1] : undefined
  const next = open ? visible[at < 0 ? open.index : at + 1] : undefined
  const show = (row: RegistrationRow | undefined) =>
    setOpen(
      row
        ? { id: row.id, index: visible.findIndex((r) => r.id === row.id) }
        : null
    )
  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  const clearFilters = () => {
    setStatus("all")
    setQuery("")
    setChoices({})
    setSelected(new Set())
  }

  const selectable = canDecide || canCheckIn
  const summary =
    visible.length === rows.length
      ? `${rows.length} ${rows.length === 1 ? "registration" : "registrations"}`
      : `${visible.length} of ${rows.length} registrations`
  const allSelected =
    visible.length > 0 && visible.every((r) => selected.has(r.id))
  const selectAll = (on: boolean) =>
    setSelected(on ? new Set(visible.map((r) => r.id)) : new Set())

  return (
    <div className="flex flex-col">
      <RegistrationsToolbar
        status={status}
        counts={counts}
        summary={summary}
        query={query}
        searchesAnswers={questions.length > 0}
        choiceQuestions={choiceQuestions}
        choices={choices}
        columns={columns}
        onStatus={(next) => {
          setStatus(next)
          setSelected(new Set())
        }}
        onQuery={(next) => {
          setQuery(next)
          setSelected(new Set())
        }}
        onChoice={(id, choice) => {
          setChoices((prev) => ({ ...prev, [id]: choice }))
          setSelected(new Set())
        }}
        onColumn={(id, shown) =>
          setColumns((prev) => {
            const next = new Set(prev)
            if (shown) next.add(id)
            else next.delete(id)
            return next
          })
        }
      />
      <div className="flex min-h-11 items-center gap-3 border-b px-4 md:hidden">
        {selectable && visible.length > 0 && (
          <label className="flex min-h-11 items-center gap-2 text-xs">
            <Checkbox
              checked={allSelected}
              onCheckedChange={selectAll}
              aria-label="Select all shown registrations"
            />
            Select all
          </label>
        )}
        <p className="text-muted-foreground ml-auto text-xs">{summary}</p>
      </div>
      {visible.length === 0 ? (
        <EmptyState
          className="m-4"
          title={
            rows.length === 0
              ? "No registrations yet"
              : "No registrations match"
          }
          body={
            rows.length === 0
              ? "Requests will appear here when people register."
              : "Try a different status, search or answer filter."
          }
          action={
            rows.length > 0 ? (
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <RecordTable>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-10 pl-6">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={selectAll}
                    aria-label="Select all shown registrations"
                  />
                </TableHead>
              )}
              <TableHead className={selectable ? "" : "pl-6"}>Name</TableHead>
              <TableHead>Roll no.</TableHead>
              {shownQuestions.map((c) => (
                <TableHead key={c.id}>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span
                          tabIndex={0}
                          className="block max-w-44 truncate outline-none"
                        />
                      }
                    >
                      {c.label}
                    </TooltipTrigger>
                    <TooltipContent>{c.label}</TooltipContent>
                  </Tooltip>
                </TableHead>
              ))}
              <TableHead>Registered</TableHead>
              <TableHead className={questions.length ? "" : "pr-6"}>
                Status
              </TableHead>
              {questions.length > 0 && (
                <TableHead className="w-10 pr-6">
                  <span className="sr-only">Answers</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((r) => (
              <TableRow
                key={r.id}
                data-state={selected.has(r.id) ? "selected" : undefined}
                className={
                  selectable
                    ? "max-md:grid-cols-[auto_minmax(0,1fr)] max-md:gap-x-0!"
                    : undefined
                }
              >
                {selectable && (
                  <TableCell className="pl-6">
                    <label className="flex size-11 items-center md:size-auto">
                      <Checkbox
                        checked={selected.has(r.id)}
                        onCheckedChange={(on) => toggle(r.id, on)}
                        aria-label={`Select ${r.name}`}
                      />
                    </label>
                  </TableCell>
                )}
                <TableCell
                  className={selectable ? "max-md:self-center" : "pl-6"}
                >
                  <div className="font-medium">{r.name}</div>
                  <div className="text-muted-foreground text-xs">{r.email}</div>
                </TableCell>
                <TableCell
                  data-label="Roll no."
                  className="max-md:col-span-full"
                >
                  <div>
                    <div className="tabular-nums">{r.rollNumber ?? "—"}</div>
                    <div className="text-muted-foreground text-xs md:whitespace-nowrap">
                      {[r.department, r.division && `Div ${r.division}`, r.year]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                </TableCell>
                {shownQuestions.map((c) => (
                  <TableCell
                    key={c.id}
                    data-label={c.label}
                    className="max-md:col-span-full"
                  >
                    <span
                      title={r.answers[c.id]}
                      className="min-w-0 wrap-anywhere md:block md:max-w-44 md:truncate"
                    >
                      {r.answers[c.id] ?? "—"}
                    </span>
                  </TableCell>
                ))}
                <TableCell
                  data-label="Registered"
                  className="text-muted-foreground max-md:col-span-full md:whitespace-nowrap!"
                >
                  {r.registeredAt}
                </TableCell>
                <TableCell
                  data-label="Status"
                  className={
                    questions.length
                      ? "max-md:col-span-full"
                      : "pr-6 max-md:col-span-full"
                  }
                >
                  <StatusBadge status={r.status} />
                </TableCell>
                {questions.length > 0 && (
                  <TableCell className="pr-6 max-md:col-span-full max-md:pt-1 md:text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full md:hidden"
                      onClick={() => show(r)}
                      aria-label={`View answers from ${r.name}`}
                    >
                      View answers
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="max-md:hidden"
                      onClick={() => show(r)}
                      aria-label={`View answers from ${r.name}`}
                    >
                      <ChevronRightIcon />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </RecordTable>
      )}
      {selectable && selected.size > 0 && (
        <RegistrationBulkActions
          selected={rows.filter((r) => selected.has(r.id))}
          canDecide={canDecide}
          canCheckIn={canCheckIn}
          onDecide={decide}
          onClear={() => setSelected(new Set())}
        />
      )}
      {questions.length > 0 && (
        <RegistrationDetail
          row={openRow}
          questions={questions}
          canDecide={canDecide}
          onDecide={decide}
          position={at < 0 ? null : at + 1}
          total={visible.length}
          onClose={() => setOpen(null)}
          onPrevious={previous ? () => show(previous) : undefined}
          onNext={next ? () => show(next) : undefined}
        />
      )}
    </div>
  )
}
