import { withDb } from "@/db"
import { RecordTable } from "@/components/dashboard/record-table"
import { ActionForm } from "@/components/action-form"
import { ConfirmSubmit } from "@/components/confirm-submit"
import { AutoSubmitSelect } from "@/components/dashboard/role-select"
import { EmptyState, Panel, RoleBadge } from "@/components/dashboard/ui"
import { FormSelect } from "@/components/form-select"
import { SubmitButton } from "@/components/submit-button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { listMembers } from "@/db/queries/members"
import { initials } from "@/lib/identity"
import {
  assignableCommunityRoles,
  canChangeMember,
  COMMUNITY_ROLE_DESCRIPTION,
  COMMUNITY_ROLE_LABEL,
  type CommunityRole,
} from "@/lib/rbac"
import { requireCommunityAccess } from "@/lib/session"
import {
  addMemberAction,
  changeMemberRoleAction,
  removeMemberAction,
} from "@/app/dashboard/c/[slug]/team/actions"

export default async function TeamPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const access = await requireCommunityAccess(slug, "member:read")
  const members = await withDb({ userId: access.user.id }, async (ctx) =>
    listMembers(ctx, access.community.id)
  )
  const assignable = assignableCommunityRoles(access.user.siteRole, access.role)
  const canManage = access.can("member:manage")
  const actor = { siteRole: access.user.siteRole, communityRole: access.role }

  return (
    <div className="flex flex-col gap-6">
      <Panel
        title="Team"
        description={`${members.length} ${members.length === 1 ? "person helps" : "people help"} run ${access.community.name}.`}
        flush
      >
        {canManage && (
          <ActionForm
            action={addMemberAction}
            className="border-b px-4 py-4 md:px-6"
          >
            <input type="hidden" name="slug" value={slug} />
            <div className="flex flex-col gap-3 @2xl/main:flex-row @2xl/main:items-end">
              <div className="grid min-w-0 flex-1 gap-1.5">
                <Label htmlFor="email">Add someone by VIT email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="name.surname@vit.edu.in"
                />
              </div>
              <div className="grid gap-1.5 @2xl/main:w-44">
                <Label htmlFor="role">Role</Label>
                <FormSelect
                  id="role"
                  name="role"
                  label="Role"
                  defaultValue={
                    assignable.includes("organizer")
                      ? "organizer"
                      : assignable[0]
                  }
                  items={assignable.map((r) => ({
                    value: r,
                    label: COMMUNITY_ROLE_LABEL[r],
                  }))}
                />
              </div>
              <SubmitButton pendingLabel="Adding…">Add member</SubmitButton>
            </div>
            <p className="text-muted-foreground mt-2 text-xs">
              They must have signed in to vboard once.{" "}
              {access.role === "lead"
                ? "Only Super admin appoints Leads."
                : "Super admin can appoint Leads."}
            </p>
          </ActionForm>
        )}
        {members.length === 0 ? (
          <EmptyState
            title="No team members"
            body="Add an existing vboard account to start building this team."
            className="m-4"
          />
        ) : (
          <RecordTable>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Member</TableHead>
                <TableHead>Roll no.</TableHead>
                <TableHead className={canManage ? "" : "pr-6"}>Role</TableHead>
                {canManage && (
                  <TableHead className="pr-6">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => {
                const editable =
                  canManage &&
                  canChangeMember(actor, {
                    role: m.role,
                    isSelf: m.userId === access.user.id,
                  })
                return (
                  <TableRow key={m.id}>
                    <TableCell className="pl-6">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="size-9 max-md:hidden">
                          <AvatarFallback className="text-xs font-medium">
                            {initials(m.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 font-medium">
                            {m.name}
                            {m.userId === access.user.id && (
                              <Badge variant="secondary">You</Badge>
                            )}
                          </div>
                          <div className="text-muted-foreground text-xs break-all">
                            {m.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell data-label="Roll no." className="tabular-nums">
                      {m.rollNumber ?? "—"}
                    </TableCell>
                    <TableCell
                      data-label="Role"
                      className={canManage ? "" : "pr-6"}
                    >
                      {editable ? (
                        <AutoSubmitSelect
                          action={changeMemberRoleAction}
                          hidden={{ slug, memberId: m.id }}
                          name="role"
                          label={`Role for ${m.name}`}
                          current={m.role}
                          options={(assignable.includes(m.role)
                            ? assignable
                            : [m.role, ...assignable]
                          ).map((r) => ({
                            value: r,
                            label: COMMUNITY_ROLE_LABEL[r],
                          }))}
                        />
                      ) : (
                        <RoleBadge role={m.role} />
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell className="pr-6 md:text-right">
                        {editable && (
                          <ActionForm
                            action={removeMemberAction}
                            className="inline"
                          >
                            <input type="hidden" name="slug" value={slug} />
                            <input type="hidden" name="memberId" value={m.id} />
                            <ConfirmSubmit
                              label="Remove"
                              variant="ghost"
                              title={`Remove ${m.name}?`}
                              description="They lose access to this community's dashboard straight away."
                              confirmLabel="Remove"
                            />
                          </ActionForm>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </RecordTable>
        )}
      </Panel>

      <dl className="grid gap-x-8 gap-y-4 px-1 @2xl/main:grid-cols-2">
        {(["lead", "organizer"] as CommunityRole[]).map((r) => (
          <div key={r} className="grid gap-1.5">
            <dt>
              <RoleBadge role={r} />
            </dt>
            <dd className="text-muted-foreground text-sm leading-relaxed">
              {COMMUNITY_ROLE_DESCRIPTION[r]}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
