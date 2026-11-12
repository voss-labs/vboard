import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { mediaUrl } from "@/lib/media"
import { cn } from "@/lib/utils"

export function CommunityLogo({
  name,
  logoUrl,
  className,
}: {
  name: string
  logoUrl: string | null
  className?: string
}) {
  const source = mediaUrl(logoUrl)
  return (
    <Avatar className={cn("size-14 rounded-xl", className)} aria-hidden>
      {source && <AvatarImage src={source} alt="" className="rounded-xl" />}
      <AvatarFallback className="rounded-xl text-xl font-semibold">
        {name.charAt(0)}
      </AvatarFallback>
    </Avatar>
  )
}
