"use client"

import { Fragment } from "react"
import { Columns3Icon, ListFilterIcon, SearchIcon, XIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { RegistrationQuestion } from "@/lib/registration-form"

export const STATUS_FILTERS = [
  "all",
  "pending",
  "approved",
  "attended",
  "rejected",
  "cancelled",
  "no_show",
]
export const ANY = "all"

export type ChoiceQuestion = Extract<RegistrationQuestion, { type: "choice" }>

export function RegistrationsToolbar({
  status,
  counts,
  summary,
  query,
  searchesAnswers,
  choiceQuestions,
  choices,
  columns,
  onStatus,
  onQuery,
  onChoice,
  onColumn,
}: {
  status: string
  counts: Record<string, number>
  summary: string
  query: string
  searchesAnswers: boolean
  choiceQuestions: ChoiceQuestion[]
  choices: Record<string, string>
  columns: Set<string>
  onStatus: (status: string) => void
  onQuery: (query: string) => void
  onChoice: (questionId: string, choice: string) => void
  onColumn: (questionId: string, shown: boolean) => void
}) {
  const active = choiceQuestions.filter((q) => (choices[q.id] ?? ANY) !== ANY)

  return (
    <div className="flex min-w-0 flex-col gap-3 border-b px-4 py-4 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Tabs
          value={status}
          onValueChange={(value) => onStatus(String(value))}
          className="min-w-0"
        >
          <TabsList className="h-auto w-full max-w-full justify-start gap-1 overflow-x-auto group-data-horizontal/tabs:h-auto md:w-fit">
            {STATUS_FILTERS.map((f) => (
              <TabsTrigger
                key={f}
                value={f}
                className="h-auto min-h-11 flex-none gap-1.5 px-2.5 text-xs capitalize md:min-h-7"
              >
                {f === "no_show" ? "No-show" : f}
                <span className="text-muted-foreground tabular-nums">
                  {counts[f] ?? 0}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <p
          className="text-muted-foreground ml-auto shrink-0 text-xs max-md:hidden"
          aria-live="polite"
        >
          {summary}
        </p>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-full sm:max-w-sm sm:basis-64">
          <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={
              searchesAnswers
                ? "Search people or answers"
                : "Search name, email or roll no."
            }
            aria-label="Search registrations"
            className="pl-8"
          />
        </div>
        {choiceQuestions.length > 0 && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-none"
                  />
                }
              >
                <ListFilterIcon data-icon="inline-start" />
                Filter answers
                {active.length > 0 && (
                  <Badge variant="secondary" className="tabular-nums">
                    {active.length}
                  </Badge>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-80 max-w-[calc(100vw-2rem)]"
              >
                {choiceQuestions.map((q, index) => (
                  <Fragment key={q.id}>
                    {index > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="leading-snug wrap-anywhere">
                        {q.label}
                      </DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={choices[q.id] ?? ANY}
                        onValueChange={(value) => onChoice(q.id, String(value))}
                      >
                        <DropdownMenuRadioItem value={ANY} closeOnClick={false}>
                          Any answer
                        </DropdownMenuRadioItem>
                        {q.options.map((option) => (
                          <DropdownMenuRadioItem
                            key={option}
                            value={option}
                            closeOnClick={false}
                            className="wrap-anywhere"
                          >
                            {option}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuGroup>
                  </Fragment>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="max-md:hidden"
                  />
                }
              >
                <Columns3Icon data-icon="inline-start" />
                Columns
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-80">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    Answers shown in the table
                  </DropdownMenuLabel>
                  {choiceQuestions.map((q) => (
                    <DropdownMenuCheckboxItem
                      key={q.id}
                      checked={columns.has(q.id)}
                      onCheckedChange={(shown) => onColumn(q.id, shown)}
                      closeOnClick={false}
                      className="wrap-anywhere"
                    >
                      {q.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
      {active.length > 0 && (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {active.map((q) => (
            <Badge
              key={q.id}
              variant="secondary"
              title={`${q.label}: ${choices[q.id]}`}
              className="h-auto max-w-full min-w-0 gap-1 py-0.5 pr-0.5 font-normal"
            >
              <span className="text-muted-foreground max-w-40 min-w-0 truncate">
                {q.label}
              </span>
              <span className="max-w-56 min-w-0 truncate font-medium">
                {choices[q.id]}
              </span>
              <button
                type="button"
                onClick={() => onChoice(q.id, ANY)}
                aria-label={`Remove filter ${q.label}`}
                className="hover:bg-foreground/10 focus-visible:ring-ring/50 grid size-6 shrink-0 place-content-center rounded-full outline-none focus-visible:ring-3 max-md:size-9"
              >
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
