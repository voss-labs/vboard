"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Loader2Icon, SearchIcon } from "lucide-react"
import { Input } from "@/components/ui/input"

const DELAY = 250

export function PeopleSearch({ initial }: { initial: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [pending, startTransition] = useTransition()
  const [value, setValue] = useState(initial)
  const sent = useRef(initial)

  useEffect(() => {
    const query = value.trim()
    if (query === sent.current) return
    const timer = setTimeout(() => {
      sent.current = query
      startTransition(() =>
        router.replace(
          query ? `${pathname}?q=${encodeURIComponent(query)}` : pathname,
          { scroll: false }
        )
      )
    }, DELAY)
    return () => clearTimeout(timer)
  }, [value, pathname, router])

  return (
    <form
      role="search"
      className="relative min-w-0 flex-1 sm:max-w-sm"
      onSubmit={(event) => event.preventDefault()}
    >
      {pending ? (
        <Loader2Icon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2 animate-spin" />
      ) : (
        <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
      )}
      <Input
        type="search"
        name="q"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search name, email or roll no."
        aria-label="Search people"
        className="w-full pl-8"
      />
    </form>
  )
}
