"use client"

import { useMemo, useState } from "react"
import { SearchIcon } from "lucide-react"
import { RecordTable } from "@/components/dashboard/record-table"
import { RegistrationBulkActions } from "@/components/dashboard/registration-bulk-actions"
import { RegistrationDetail } from "@/components/dashboard/registration-detail"
import { EmptyState, StatusBadge } from "@/components/dashboard/ui"
import { FormSelect } from "@/components/form-select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  status: string
  registeredAt: string
  answers: RegistrationAnswers
}

const FILTERS = [
  "all",
  "pending",
  "approved",
  "attended",
  "rejected",
  "cancelled",
  "no_show",
]
const ANY = "all"

function answeredChoices(
  question: Extract<RegistrationQuestion, { type: "choice" }>,
  rows: RegistrationRow[]
): string[] {
  const earlier = rows
    .map((row) => row.answers[question.id])
    .filter((answer) => answer && !question.options.includes(answer))
  return [...new Set([...question.options, ...earlier])]
}

export function RegistrationsTable({
  rows,
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
  const [filter, setFilter] = useState(
    FILTERS.includes(initialFilter) ? initialFilter : "all"
  )
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [choices, setChoices] = useState<Record<string, string>>({})
  const [resetKey, setResetKey] = useState(0)
  const [open, setOpen] = useState<{ id: string; index: number } | null>(null)
  const choiceQuestions = questions.filter((q) => q.type === "choice")

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length }
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1
    return c
  }, [rows])

  const visible = rows.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false
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

  const selectable = canDecide || canCheckIn

  return (
    <div className="flex flex-col">
      <div className="flex min-w-0 flex-col gap-3 border-b px-4 py-4 md:px-6">
        <Tabs
          value={filter}
          onValueChange={(v) => {
            setFilter(String(v))
            setSelected(new Set())
          }}
        >
          <TabsList className="h-auto w-full max-w-full justify-start gap-1 overflow-x-auto group-data-horizontal/tabs:h-auto md:flex-wrap md:overflow-visible">
            {FILTERS.map((f) => (
              <TabsTrigger
                key={f}
                value={f}
                className="h-auto min-h-11 flex-none px-2.5 text-xs capitalize md:min-h-8"
              >
                {f === "no_show" ? "No-show" : f}
                <span className="text-muted-foreground tabular-nums">
                  {counts[f] ?? 0}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:max-w-sm">
            <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelected(new Set())
              }}
              placeholder={
                questions.length
                  ? "Name, email, roll no. or answer"
                  : "Name, email, roll no."
              }
              aria-label="Search registrations"
              className="pl-8"
            />
          </div>
          {choiceQuestions.map((c) => (
            <FormSelect
              key={`${c.id}-${resetKey}`}
              name={`choice-${c.id}`}
              label={`Filter by ${c.label}`}
              defaultValue={choices[c.id] ?? ANY}
              className="w-full min-w-0 sm:w-auto sm:max-w-xs"
              onValueChange={(value) => {
                setChoices((prev) => ({ ...prev, [c.id]: value }))
                setSelected(new Set())
              }}
              items={[
                { value: ANY, label: `All: ${c.label}` },
                ...answeredChoices(c, rows).map((option) => ({
                  value: option,
                  label: option,
                })),
              ]}
            />
          ))}
        </div>
      </div>

      {selectable && (
        <RegistrationBulkActions
          slug={slug}
          postId={postId}
          selected={selected}
          visibleIds={visible.map((r) => r.id)}
          canDecide={canDecide}
          canCheckIn={canCheckIn}
          onSelectedChange={setSelected}
        />
      )}

      <p
        className="text-muted-foreground border-b px-4 py-2 text-xs md:px-6"
        aria-live="polite"
      >
        {visible.length} of {rows.length} registrations
        {selected.size > 0
          ? " · Decisions apply to every selected attendee."
          : ""}
      </p>
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
              <Button
                variant="outline"
                onClick={() => {
                  setFilter("all")
                  setQuery("")
                  setChoices({})
                  setResetKey((key) => key + 1)
                  setSelected(new Set())
                }}
              >
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
                  <span className="sr-only">Selection</span>
                </TableHead>
              )}
              <TableHead className={selectable ? "" : "pl-6"}>Name</TableHead>
              <TableHead>Roll no.</TableHead>
              <TableHead>Dept</TableHead>
              {choiceQuestions.map((c) => (
                <TableHead key={c.id} title={c.label}>
                  <span className="block max-w-48 truncate">{c.label}</span>
                </TableHead>
              ))}
              <TableHead>Registered</TableHead>
              <TableHead className={questions.length ? "" : "pr-6"}>
                Status
              </TableHead>
              {questions.length > 0 && (
                <TableHead className="pr-6">
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
                  className="tabular-nums max-md:col-span-full"
                >
                  {r.rollNumber ?? "—"}
                </TableCell>
                <TableCell
                  data-label="Department"
                  className="max-md:col-span-full"
                >
                  {r.department ?? "—"}
                </TableCell>
                {choiceQuestions.map((c) => (
                  <TableCell
                    key={c.id}
                    data-label={c.label}
                    className="max-md:col-span-full"
                  >
                    <span
                      title={r.answers[c.id]}
                      className="min-w-0 wrap-anywhere md:block md:max-w-48 md:truncate"
                    >
                      {r.answers[c.id] ?? "—"}
                    </span>
                  </TableCell>
                ))}
                <TableCell
                  data-label="Registered"
                  className="text-muted-foreground max-md:col-span-full"
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
                      className="w-full md:w-auto"
                      onClick={() => show(r)}
                      aria-label={`View answers from ${r.name}`}
                    >
                      <span className="md:hidden">View answers</span>
                      <span className="max-md:hidden">View</span>
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </RecordTable>
      )}
      {questions.length > 0 && (
        <RegistrationDetail
          row={openRow}
          questions={questions}
          slug={slug}
          postId={postId}
          canDecide={canDecide}
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
