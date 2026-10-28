/**
 * flint kitchen sink — one real screen, every component.
 *
 * Run: bun run dev
 *
 * This is the reference for screenshots. It is deliberately a settings page
 * and not a component gallery: components that only look right in a gallery
 * are not ready.
 */

import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { render, useGpuixRequired, useWindowSize } from "@gpuix/react"

import { ThemeProvider, useTheme } from "@/lib/flint/theme-provider.js"
import { flintDark, flintLight } from "@/lib/flint/theme.js"
import { registerFlintFonts } from "@/lib/flint/fonts.js"
import { Text } from "@/lib/flint/text.js"
import { Icon } from "@/lib/flint/icon.js"
import { Button } from "@/components/ui/button.js"
import { Input } from "@/components/ui/input.js"
import { Textarea } from "@/components/ui/textarea.js"
import { Label } from "@/components/ui/label.js"
import { Checkbox } from "@/components/ui/checkbox.js"
import { Switch } from "@/components/ui/switch.js"
import { Badge } from "@/components/ui/badge.js"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card.js"
import { Dialog, DialogContent, DialogFooter, DialogHeading, DialogBody, DialogTrigger } from "@/components/ui/dialog.js"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.js"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.js"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.js"
import { Avatar } from "@/components/ui/avatar.js"
import { Separator } from "@/components/ui/separator.js"
import { Skeleton } from "@/components/ui/skeleton.js"
import { Progress } from "@/components/ui/progress.js"
import { Alert } from "@/components/ui/alert.js"
import { Accordion, AccordionItem } from "@/components/ui/accordion.js"

function Row({
  children,
  gap = 12,
  align = "center",
}: {
  children: ReactNode
  gap?: number
  align?: "center" | "start"
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: align === "start" ? "flex-start" : "center",
        gap,
      }}
    >
      {children}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, flexGrow: 1, flexBasis: 0 }}>
      <Label>{label}</Label>
      {children}
      {hint ? (
        <Text size="xs" tone="muted">
          {hint}
        </Text>
      ) : null}
    </div>
  )
}

function Settings({ dark, onToggleTheme }: { dark: boolean; onToggleTheme: () => void }) {
  const theme = useTheme()
  const c = theme.colors
  const [tab, setTab] = useState(process.env.FLINT_TAB ?? "general")
  const [name, setName] = useState("Alpenglow")
  const [about, setAbout] = useState("A desktop client for the field research team. Built on GPUIX.")
  const [role, setRole] = useState("editor")
  const [alerts, setAlerts] = useState(true)
  const [beta, setBeta] = useState(false)
  const [invite, setInvite] = useState("")
  const [saved, setSaved] = useState(false)
  const { width } = useWindowSize()
  const narrow = width < 760

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", backgroundColor: c.background }}>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          height: 48,
          paddingLeft: 20,
          paddingRight: 16,
          borderBottomWidth: 1,
          borderColor: c.border,
        }}
      >
        <Row gap={10}>
          <Icon name="sparkle" size={16} color={c.primary} />
          <Text size="md" weight="semibold">
            flint
          </Text>
          <Badge variant="outline">0.1</Badge>
        </Row>
        <Row gap={8}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={onToggleTheme}>
                <Icon name={dark ? "sun" : "moon"} size={15} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Switch to {dark ? "light" : "dark"} theme</TooltipContent>
          </Tooltip>
          {narrow ? null : (
            <Button variant="secondary" size="sm">
              Docs
            </Button>
          )}
        </Row>
      </div>

      <div style={{ display: "flex", flexDirection: "row", flexGrow: 1, minHeight: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, flexGrow: 1, padding: narrow ? 14 : 20, overflowY: "scroll" }}>
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Text size="xl" weight="semibold">
                Workspace settings
              </Text>
              <Text size="sm" tone="muted">
                Changes apply to every member of Alpenglow.
              </Text>
            </div>
            <Row gap={8}>
              <Button variant="ghost" size="sm">
                Cancel
              </Button>
              <Button size="sm" loading={saved} onClick={() => setSaved(true)}>
                {saved ? "Saving" : "Save changes"}
              </Button>
            </Row>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>Profile</CardTitle>
                  <CardDescription>How the workspace appears to people you invite.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Row gap={12} align="start">
                    <Field label="Workspace name">
                      <Input value={name} onChange={(event) => setName(event.value ?? "")} />
                    </Field>
                    <Field label="Default role" hint="Applied to new members until changed.">
                      <Select value={role} onValueChange={setRole} items={[
                        { value: "viewer", label: "Viewer" },
                        { value: "editor", label: "Editor" },
                        { value: "admin", label: "Admin" },
                      ]}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pick a role" />
                          <Icon name="chevronsUpDown" size={13} color={c.mutedForeground} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </Row>
                  <Field label="About" hint="Markdown is not rendered here, and that is on purpose.">
                    <Textarea value={about} onChange={(event) => setAbout(event.value ?? "")} />
                  </Field>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>
                    <Checkbox checked={alerts} onCheckedChange={setAlerts} label="Email me when a member joins" />
                    <Row gap={10}>
                      <Switch checked={beta} onCheckedChange={setBeta} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <Text size="base">Beta channel</Text>
                        <Text size="xs" tone="muted">
                          New components arrive here three weeks early.
                        </Text>
                      </div>
                    </Row>
                  </div>
                </CardContent>
                <CardFooter>
                  <Text size="xs" tone="muted" style={{ flexGrow: 1 }}>
                    Last saved 4 minutes ago
                  </Text>
                  <Button variant="outline" size="sm">
                    Export
                  </Button>
                </CardFooter>
              </Card>

            </TabsContent>

            <TabsContent value="members">
              <Card>
                <CardHeader>
                  <CardTitle>Members</CardTitle>
                  <CardDescription>3 people have access.</CardDescription>
                </CardHeader>
                <CardContent>
                  {[
                    ["Ada Sørensen", "Owner", "admin"],
                    ["Bram de Vries", "Editor", "editor"],
                    ["Chen Wei", "Viewer", "viewer"],
                  ].map(([person, seat]) => (
                    <div
                      key={person}
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        height: 36,
                        paddingLeft: 8,
                        paddingRight: 8,
                        borderRadius: theme.radius.xs,
                        hover: { backgroundColor: c.accent },
                      }}
                    >
                      <Row gap={10}>
                        <Avatar name={person ?? ""} size={22} />
                        <Text size="base">{person}</Text>
                      </Row>
                      <Row gap={10}>
                        <Badge variant={seat === "admin" ? "default" : "secondary"}>{seat}</Badge>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Icon name="minus" size={14} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remove from workspace</TooltipContent>
                        </Tooltip>
                      </Row>
                    </div>
                  ))}
                </CardContent>
                <CardFooter>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Icon name="plus" size={14} color={c.primaryForeground} />
                        Invite
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeading>Invite a member</DialogHeading>
                      <DialogBody>They get an email with a link that expires in 48 hours.</DialogBody>
                      <Field label="Email">
                        <Input
                          value={invite}
                          placeholder="name@studio.com"
                          onChange={(event) => setInvite(event.value ?? "")}
                          autoFocus
                        />
                      </Field>
                      <DialogFooter>
                        <Button variant="ghost" size="sm">
                          Cancel
                        </Button>
                        <Button size="sm" disabled={!invite.includes("@")}>
                          Send invite
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Workspace health</CardTitle>
                  <CardDescription>Separator, Skeleton, Progress, Alert, Avatar, Accordion.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert
                    tone="success"
                    title="Invites are working"
                    description="Three members joined this week, none bounced."
                  />
                  <Progress value={64} label="Storage used" showValue />
                  <Separator label="Delivery" />
                  <Row gap={10}>
                    <Avatar name="Ada Sørensen" />
                    <Avatar name="Bram de Vries" />
                    <Avatar name="Chen Wei" size={24} />
                    <Skeleton width={140} height={12} />
                  </Row>
                  <Accordion defaultValue="delivery">
                    <AccordionItem value="delivery" title="Weekly digest">
                      <Text size="sm" tone="muted">Goes out on Mondays at 09:00.</Text>
                    </AccordionItem>
                    <AccordionItem value="retention" title="Retention">
                      <Text size="sm" tone="muted">Deleted workspaces are kept for 30 days.</Text>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="billing">
              <Card variant="outline">
                <CardHeader>
                  <CardTitle>Billing</CardTitle>
                  <CardDescription>Not wired in this example. The layout still has to hold.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Row gap={10}>
                    <Input placeholder="Card number" leading={<Icon name="info" size={14} color={c.mutedForeground} />} />
                    <Input placeholder="MM / YY" style={{ width: 110 }} />
                  </Row>
                </CardContent>
                <CardFooter>
                  <Button variant="secondary" size="sm">
                    Update card
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          height: 32,
          paddingLeft: 20,
          paddingRight: 16,
          borderTopWidth: 1,
          borderColor: c.border,
        }}
      >
        <Text size="xs" tone="muted">
          {`Medeo Sans · 13 px · flint ${dark ? "dark" : "light"}`}
        </Text>
        <Row gap={6}>
          <Icon name="dot" size={8} color={c.success} />
          <Text size="xs" tone="muted">
            Connected
          </Text>
        </Row>
      </div>
    </div>
  )
}

const marker = process.env.MARKER ?? "#FF00FF"

function App() {
  const [dark, setDark] = useState(process.env.THEME !== "light")

  return (
    <ThemeProvider theme={dark ? flintDark : flintLight}>
      <Fonts />
      <div style={{ width: "100%", height: "100%", position: "relative" }}>
        <Settings dark={dark} onToggleTheme={() => setDark(!dark)} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, backgroundColor: marker }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, backgroundColor: marker }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 1, backgroundColor: marker }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 1, backgroundColor: marker }} />
      </div>
    </ThemeProvider>
  )
}

function Fonts() {
  const renderer = useGpuixRequired()
  useEffect(() => {
    registerFlintFonts(renderer, { dir: "./fonts" }).catch((error: unknown) => {
      console.warn("[flint] Medeo fonts not registered:", error instanceof Error ? error.message : error)
    })
  }, [renderer])
  return null
}

console.log("[flint] rendering")
render(<App />, {
  title: "flint — kitchen sink",
  width: 960,
  height: Number(process.env.HEIGHT ?? 640),
  minWidth: 680,
  minHeight: 520,
  focus: process.env.GPUIX_BACKGROUND !== "1",
})
