"use client"

import { usePathname } from "next/navigation"

export function CommunitySection({
  base,
  children,
}: {
  base: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  if (pathname.startsWith(`${base}/posts/`)) return null
  return children
}
