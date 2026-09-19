"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Plus,
  SlidersHorizontal,
  Settings,
  Lock,
  ArrowUpRight,
  MessageCircle,
  Compass,
  History,
  ChevronRight,
  ArrowRight,
  PenLine,
  Check,
  Info,
  Copy,
  Bookmark,
  Trash2,
  Download,
  Archive,
  RotateCcw,
  LoaderCircle,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { ThemeToggle } from "./theme";
import { ScreenshotImport } from "./screenshot-import";
import { prepareScreenshotMessages } from "@/lib/screenshot-import";
import { z } from "zod";
import { workspaceSchema, reviewSchema } from "@/lib/validation";
import { readApiResponse } from "@/lib/api-response";
import type { ModelContext, ModelTool } from "@/lib/webmcp";
import { seedWorkspace } from "@/lib/seed";
import { DEFAULT_MODELS, hasTaskTuning, REVIEW_TASKS } from "@/lib/ai-config";
import type {
  Workspace,
  Profile,
  Message,
  Move,
  Decision,
} from "@/lib/types";
import {
  Modal,
  Field,
  Pick,
  IntentionForm,
  ContextForm,
  MessageForm,
  OutcomeForm,
} from "./forms";
const workspaceResponse = z.object({ data: workspaceSchema, version: z.number().int().nonnegative() });
const reviewResponse = z.object({ review: reviewSchema });
const uid = () => crypto.randomUUID();
const formatDate = (date: string) =>
  date
    ? new Date(date).toLocaleDateString("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Date unknown";
function PeopleButton({
  p,
  active,
  onClick,
}: {
  p: Profile;
  active: boolean;
  onClick: () => void;
}) {
  const { setOpenMobile } = useSidebar();
  return (
    <button
      className={"person " + (active ? "selected" : "")}
      onClick={() => {
        onClick();
        setOpenMobile(false);
      }}
    >
      <span className={"avatar " + p.color}>{p.name[0]}</span>
      <span>
        <strong>{p.name}</strong>
        <small>{p.stage}</small>
      </span>
      {active && <ChevronRight size={16} />}
    </button>
  );
}
function blankProfile(): Profile {
  return {
    id: uid(),
    name: "",
    age: "",
    met: "",
    stage: "New match",
    current: "Not recorded yet.",
    stated: "No stated preference recorded.",
    context: "",
    boundary: "None stated",
    adult: false,
    archived: false,
    color: "green",
    intention: {
      status: "",
      role: "",
      secondary: "",
      objective: "",
      custom: "",
      pace: "Natural and unhurried",
      boundaries: "No repeated persuasion after a decline.",
      confirmed: false,
      version: 0,
    },
    messages: [],
    decisions: [],
    review: null,
    revision: 1,
  };
}
function NavigationAction({
  onClick,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpenMobile } = useSidebar();
  return (
    <button
      {...props}
      onClick={(event) => {
        setOpenMobile(false);
        onClick?.(event);
      }}
    >
      {children}
    </button>
  );
}
export default function BetweenApp() {
  const [data, setData] = useState<Workspace>(seedWorkspace);
  const [id, setId] = useState("");
  const [tab, setTab] = useState("chat");
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Loading your workspace…");
  const [storageError, setStorageError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"standard" | "perspectives">("standard");
  const [selectedId, setSelectedId] = useState("");
  const [modal, setModal] = useState("");
  const [newProfile, setNewProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState<Message | undefined>();
  const [outcome, setOutcome] = useState<Decision | null>(null);
  const [deleting, setDeleting] = useState<{
    type: "profile" | "message" | "decision";
    id: string;
  } | null>(null);
  const [contextOpen, setContextOpen] = useState(false);
  const [archived, setArchived] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [provider, setProvider] = useState<"openai" | "gemini">("openai");
  const [model, setModel] = useState(DEFAULT_MODELS.openai);
  const [apiKey, setApiKey] = useState("");
  const [consent, setConsent] = useState(false);
  const [style, setStyle] = useState("");
  const [retention, setRetention] =
    useState<Workspace["retention"]>("until-deleted");
  const [analysisError, setAnalysisError] = useState("");
  const [questionAnswer, setQuestionAnswer] = useState("");
  const dataRef = useRef(data);
  const version = useRef(0);
  const saving = useRef(false);
  const [savingNow, setSavingNow] = useState(false);
  const analysisTicket = useRef(0);
  const visibleProfiles = data.profiles.filter(
    (profile) => profile.archived === archived,
  );
  const p =
    visibleProfiles.find((profile) => profile.id === id) || visibleProfiles[0];
  const review = p?.review?.origin === "live" ? p.review : null;
  const stale = !!(
    p &&
    review &&
    (review.revision !== p.revision ||
      review.goalVersion !== p.intention.version)
  );
  const selected =
    p?.messages.find((m) => m.id === selectedId) || p?.messages.at(-1);
  const controlsDisabled = !ready || savingNow || !!storageError;
  useEffect(() => {
    let alive = true;
    const ticket = analysisTicket;
    fetch("/api/workspace")
      .then(async (r) => {
        const result = workspaceResponse.parse(await readApiResponse(r));
        if (alive) {
          dataRef.current = result.data;
          setData(result.data);
          version.current = result.version;
          setSaveStatus("All changes saved");
          setReady(true);
        }
      })
      .catch((e) => {
        if (alive) {
          setStorageError(e.message);
          setSaveStatus("Storage unavailable");
        }
      });
    return () => {
      alive = false;
      ticket.current++;
    };
  }, []);
  const [displayedProfileId, setDisplayedProfileId] = useState(p?.id);
  if (displayedProfileId !== p?.id) {
    setDisplayedProfileId(p?.id);
    setSelectedId("");
    setAnalysisError("");
    setQuestionAnswer("");
    setMode("standard");
    setDrafts({});
  }
  useEffect(() => {
    analysisTicket.current++;
  }, [p?.id]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (saving.current || storageError) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [storageError]);
  async function persist(next: Workspace) {
    if (!ready || saving.current || storageError) {
      toast.error("Wait for saving to finish, or resolve the storage error.");
      return false;
    }
    return saveData(next);
  }
  async function saveData(next: Workspace) {
    saving.current = true;
    setSavingNow(true);
    setSaveStatus("Saving…");
    dataRef.current = next;
    setData(next);
    try {
      const r = await fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: next, version: version.current }),
      });
      const result = workspaceResponse.parse(await readApiResponse(r));
      version.current = result.version;
      if (result.data) {
        dataRef.current = result.data;
        setData(result.data);
      }
      setStorageError("");
      setSaveStatus("All changes saved");
      return true;
    } catch (e) {
      setStorageError(
        e instanceof Error
          ? e.message
          : "Could not save. Your work is still here.",
      );
      setSaveStatus("Changes not saved");
      return false;
    } finally {
      saving.current = false;
      setSavingNow(false);
    }
  }
  async function updateProfile(next: Profile, notice = "Saved") {
    const ok = await persist({
      ...dataRef.current,
      profiles: dataRef.current.profiles.map((x) =>
        x.id === next.id ? next : x,
      ),
    });
    if (ok) toast.success(notice);
    return ok;
  }
  function invalidate(next: Profile) {
    analysisTicket.current++;
    return {
      ...next,
      revision: next.revision + 1,
      decisions: next.decisions.map((d) => ({ ...d, needsReview: true })),
    };
  }
  function clearDerived(next: Profile): Profile {
    return {
      ...next,
      review: null,
      example: undefined,
      stated: "Source removed. Add a new sourced statement if needed.",
      context: "",
      decisions: next.decisions.map((d) => ({
        ...d,
        sourceIds: [],
        reading: "Source removed",
        move: {
          ...d.move,
          title: "Source removed",
          description: "",
          draft: "",
          fit: "",
          tradeoff: "",
          assumption: "",
          timing: "",
          stop: "",
          branches: [],
          sourceIds: [],
        },
        expectation: "Source removed",
        preparedDraft: "",
        outcomeMessageId: undefined,
        actualText: "",
        outcome: "",
        revision: "Source removed",
        needsReview: true,
      })),
    };
  }
  async function deleteItem() {
    if (!deleting || !p) return;
    let next: Workspace;
    if (deleting.type === "profile") {
      next = {
        ...dataRef.current,
        profiles: dataRef.current.profiles.filter((x) => x.id !== deleting.id),
      };
    } else {
      const changed =
        deleting.type === "message"
          ? clearDerived(
              invalidate({
                ...p,
                messages: p.messages.filter((m) => m.id !== deleting.id),
              }),
            )
          : {
              ...p,
              decisions: p.decisions.filter((d) => d.id !== deleting.id),
            };
      next = {
        ...dataRef.current,
        profiles: dataRef.current.profiles.map((x) =>
          x.id === p.id ? changed : x,
        ),
      };
    }
    if (await persist(next)) {
      toast.success("Deleted from your workspace");
      setDrafts({});
      setDeleting(null);
      setModal("");
    }
  }
  function exportJSON(value: unknown, name: string) {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = name + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Your workspace export is ready to download");
  }
  function openSettings() {
    setRetention(data.retention);
    setModal("settings");
  }
  function viewSource(ids: string[]) {
    setTab("chat");
    setSelectedId(ids[0] || "");
    setTimeout(
      () =>
        document
          .getElementById("source-" + ids[0])
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      80,
    );
  }
  async function runReview() {
    if (!p || busy) return;
    if (!p.intention.confirmed) {
      setModal("intention");
      return;
    }
    if (!apiKey || !consent) {
      openSettings();
      return;
    }
    if (p.boundary !== "None stated") {
      toast.info("Respect the recorded boundary. No deeper review is needed.");
      return;
    }
    if (
      review?.origin === "live" &&
      !stale &&
      review.mode === mode &&
      review.selectedMessageId === (selected?.id || "")
    ) {
      toast.info("No new evidence. The reading has not changed.");
      return;
    }
    if (controlsDisabled) return;
    const snapshot = structuredClone(p),
      ticket = ++analysisTicket.current;
    setBusy(true);
    setAnalysisError("");
    try {
      const r = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: snapshot,
          style: data.style,
          selectedId: selected?.id || "",
          mode,
          consent,
          config: { provider, model, key: apiKey },
        }),
      });
      const result = reviewResponse.parse(await readApiResponse(r));
      if (ticket !== analysisTicket.current) {
        toast.info(
          "The context changed during review. This result was not saved.",
        );
        return;
      }
      const current = dataRef.current.profiles.find(
        (x) => x.id === snapshot.id,
      );
      if (
        !current ||
        current.revision !== snapshot.revision ||
        current.intention.version !== snapshot.intention.version
      )
        return;
      await updateProfile(
        { ...current, review: result.review },
        "New review saved",
      );
    } catch (e) {
      if (ticket === analysisTicket.current)
        setAnalysisError(
          e instanceof Error ? e.message : "No new analysis was produced.",
        );
    } finally {
      setBusy(false);
    }
  }
  async function saveDecision(move: Move) {
    if (!p || !review || stale) return;
    const d: Decision = {
      id: uid(),
      date: new Date().toISOString(),
      goal: structuredClone(p.intention),
      stage: p.stage,
      sourceIds: [...move.sourceIds],
      reading: review.summary,
      move: structuredClone(move),
      preparedDraft: drafts[move.id] ?? move.draft,
      expectation:
        "No leading expectation. Possible observable branches: " +
        move.branches.join(" "),
      actualAction: "Not recorded",
      actualText: "",
      outcome: "",
      outcomeKind: "Unknown",
      revision: "",
    };
    if (
      await updateProfile(
        { ...p, decisions: [...p.decisions, d] },
        "Decision saved. No action is assumed.",
      )
    )
      setTab("history");
  }
  async function saveOutcome(d: Decision) {
    if (!p) return;
    d = { ...d, checkedInAt: new Date().toISOString() };
    let messages = p.messages;
    let sourceIds = d.sourceIds;
    const old = p.decisions.find((x) => x.id === d.id);
    if (old?.outcomeMessageId && old.outcome !== d.outcome) {
      messages = messages.filter((m) => m.id !== old.outcomeMessageId);
      sourceIds = sourceIds.filter((x) => x !== old.outcomeMessageId);
      d = { ...d, outcomeMessageId: undefined };
    }
    if (
      d.outcome &&
      ["Actual reply", "Offline event"].includes(d.outcomeKind)
    ) {
      const existing = messages.find(
        (m) => m.text === d.outcome && m.speaker === "her",
      );
      const source = existing || {
        id: uid(),
        speaker: "her" as const,
        text: d.outcome,
        date: d.outcomeDate || "",
        kind:
          d.outcomeKind === "Actual reply"
            ? ("Message" as const)
            : ("Event" as const),
      };
      if (!existing) messages = [...messages, source];
      sourceIds = [...new Set([...sourceIds, source.id])];
      d = { ...d, outcomeMessageId: source.id };
    }
    let next = {
      ...p,
      messages,
      decisions: p.decisions.map((x) =>
        x.id === d.id ? { ...d, sourceIds } : x,
      ),
    };
    if (messages !== p.messages) next = invalidate(next);
    if (
      await updateProfile(
        next,
        "Check-in saved; observations stay separate from interpretation.",
      )
    )
      setOutcome(null);
  }
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: ModelTool) => {
      try {
        Promise.resolve(
          context.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => {});
      } catch {}
    };
    register({
      name: "list_connections",
      description:
        "List profile aliases and stages in the current private workspace.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async () => ({
        profiles: dataRef.current.profiles.map((p) => ({
          id: p.id,
          name: p.name,
          stage: p.stage,
          archived: p.archived,
        })),
      }),
    });
    register({
      name: "open_connection",
      description:
        "Navigate to a connection and tab; does not edit or analyze data.",
      inputSchema: {
        type: "object",
        properties: {
          profileId: { type: "string" },
          tab: {
            type: "string",
            enum: ["chat", "understand", "moves", "history"],
          },
        },
        required: ["profileId", "tab"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (value: unknown) => {
        const input = z.object({ profileId: z.string(), tab: z.enum(["chat", "understand", "moves", "history"]) }).parse(value);
        const connection = dataRef.current.profiles.find(
          (p) => p.id === input.profileId,
        );
        if (
          !connection ||
          !["chat", "understand", "moves", "history"].includes(input.tab)
        )
          throw Error("Unknown profile or tab");
        setArchived(connection.archived);
        setId(input.profileId);
        setTab(input.tab);
        await new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        );
        return { profileId: input.profileId, tab: input.tab };
      },
    });
    register({
      name: "start_connection_creation",
      description:
        "Open the adult confirmation and intention form. Does not save a profile.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async () => {
        setNewProfile(blankProfile());
        await new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        );
        return { state: "form_open", saved: false };
      },
    });
    return () => lifecycle.abort();
  }, []);
  const contextual = p && (
    <>
      <div className="context-title">THE BIGGER PICTURE</div>
      <section className="intention-card">
        <div className="card-label">
          <span>MY INTENTION</span>
          <button
            aria-label="Edit intention"
            disabled={controlsDisabled}
            onClick={() => {
              setContextOpen(false);
              setModal("intention");
            }}
          >
            <PenLine size={15} />
          </button>
        </div>
        <h3>{p.intention.status || "Choose your intention"}</h3>
        <div className="role-chip">
          {p.intention.role || "Not chosen"}
          {p.intention.secondary && ` · ${p.intention.secondary}`}
        </div>
        <div className="intention-line" />
        <small>What I’d like next</small>
        <p>{p.intention.objective || "Explore without a fixed next step."}</p>
      </section>
      <div className="context-block">
        <div>
          <h4>What exists</h4>
          <p>{p.current}</p>
          <span className="sub-label">Present situation</span>
        </div>
      </div>
      <div className="context-block">
        <div>
          <h4>What she said</h4>
          <p>{p.stated}</p>
          <span className="sub-label">User-recorded statement</span>
        </div>
      </div>
      <div className="context-block">
        <div>
          <h4>An open question</h4>
          <p>
            {review?.unknown ||
              "Her intentions remain unknown unless she has stated them."}
          </p>
          <span className="sub-label">It’s okay not to know yet.</span>
        </div>
      </div>
      {p.boundary !== "None stated" && (
        <div className="boundary-note">
          <ShieldCheck size={17} />
          <span>{p.boundary}. Respect this boundary.</span>
        </div>
      )}
      <button
        className="evidence-button"
        onClick={() => {
          setModal("evidence");
          setContextOpen(false);
        }}
      >
        Evidence & hypotheses <ArrowUpRight size={16} />
      </button>
    </>
  );
  return (
    <SidebarProvider
      style={{ "--sidebar-width": "252px" } as React.CSSProperties}
    >
      <Toaster position="bottom-right" richColors />
      <Sidebar className="people-sidebar">
        <SidebarHeader>
          <Link className="brand" href="/" aria-label="Between home">
            <span className="brand-mark" aria-hidden="true">
              b
            </span>
            between
            <span className="brand-period">.</span>
          </Link>
          <p className="brand-caption">Your conversation workspace</p>
        </SidebarHeader>
        <SidebarContent>
          <div className="people-title">
            <span>{archived ? "Archived" : "Connections"}</span>
            <span className="count">{visibleProfiles.length}</span>
          </div>
          <div className="people-list">
            {data.profiles
              .filter((x) => x.archived === archived)
              .map((x) => (
                <PeopleButton
                  p={x}
                  active={x.id === p?.id}
                  onClick={() => setId(x.id)}
                  key={x.id}
                />
              ))}
          </div>
          <NavigationAction
            className="add-person"
            disabled={controlsDisabled}
            onClick={() => setNewProfile(blankProfile())}
          >
            <Plus size={17} /> New connection
          </NavigationAction>
          <div className="side-separator" />
          <NavigationAction
            className="side-link"
            onClick={() => {
              setStyle(data.style);
              setModal("style");
            }}
          >
            <SlidersHorizontal size={18} />
            My style
          </NavigationAction>
          <NavigationAction className="side-link" onClick={openSettings}>
            <Settings size={18} />
            Settings
          </NavigationAction>
          {(archived || data.profiles.some((profile) => profile.archived)) && (
            <button
              className="side-link"
              onClick={() => setArchived(!archived)}
            >
              <Archive size={18} />
              {archived ? "Active connections" : "Archived"}
            </button>
          )}
        </SidebarContent>
        <SidebarFooter>
          <ThemeToggle />
          <div className="private-note">
            <Lock size={13} /> Private to your account
          </div>
          <p className="copyright">© {new Date().getFullYear()} Between</p>
        </SidebarFooter>
      </Sidebar>
      <main className="main-shell">
        <div className="topbar">
          <div className="breadcrumb">
            <SidebarTrigger aria-label="Open navigation" />
            <span>{archived ? "Archived" : "Connections"}</span>
            <ChevronRight size={14} />
            <strong>{p?.name || "Your connections"}</strong>
          </div>
          <div className="topbar-status">
            <span className="save-status" aria-live="polite">
              {!ready || savingNow ? (
                <LoaderCircle className="spinning" size={12} />
              ) : storageError ? (
                <Info size={12} />
              ) : (
                <Check size={12} />
              )}{" "}
              {saveStatus}
            </span>
          </div>
        </div>
        {storageError && (
          <div className="error-banner" role="alert">
            <p>{storageError}</p>
            <div>
              <button
                onClick={() =>
                  ready ? saveData(dataRef.current) : location.reload()
                }
              >
                Retry
              </button>
              <button onClick={() => exportJSON(data, "between-unsaved-work")}>
                Export current work
              </button>
            </div>
          </div>
        )}
        {p ? (
          <>
            <div className="profile-heading">
              <div className="profile-title">
                <span className={"avatar large " + p.color}>{p.name[0]}</span>
                <div>
                  <h1>
                    {p.name}
                    <span className="stage-tag">{p.stage}</span>
                  </h1>
                  <p>
                    {p.met || "Connection"} <span>·</span>{" "}
                    {p.age ? `${p.age} years old` : "Adults confirmed"}{" "}
                    {p.archived && " · Archived"}
                  </p>
                </div>
              </div>
              <div className="heading-actions">
                <button
                  className="button secondary mobile-context"
                  onClick={() => setContextOpen(true)}
                >
                  Context
                </button>
                <button
                  className="button secondary"
                  disabled={controlsDisabled}
                  onClick={() => setModal("context")}
                >
                  <Plus size={16} />
                  Add context
                </button>
                <button
                  className="icon-button"
                  aria-label="Connection options"
                  onClick={() => setModal("profile")}
                >
                  <Settings size={17} />
                </button>
              </div>
            </div>
            <div className="intention-mobile">
              <button onClick={() => setModal("intention")}>
                {p.intention.status} <PenLine size={12} />
              </button>
            </div>
            <div className="workspace-grid">
              <section className="center-pane">
                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList variant="line" className="profile-tabs">
                    <TabsTrigger value="chat">Chat</TabsTrigger>
                    <TabsTrigger value="understand">Understand</TabsTrigger>
                    <TabsTrigger value="moves">Moves</TabsTrigger>
                    <TabsTrigger value="history">
                      History{" "}
                      {p.decisions.length > 0 && (
                        <span className="tab-count">{p.decisions.length}</span>
                      )}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="understand">
                    <div className="section-heading">
                      <div>
                        <h2>What the messages support</h2>
                      </div>
                      <button
                        className="review-tag"
                        onClick={() =>
                          setMode(
                            mode === "standard" ? "perspectives" : "standard",
                          )
                        }
                      >
                        {mode === "standard"
                          ? "Standard review"
                          : "Perspective review"}
                        <ChevronDown size={12} />
                      </button>
                    </div>
                    {p.boundary !== "None stated" ? (
                      <div className="boundary-card">
                        <ShieldCheck size={27} />
                        <h3>
                          {p.boundary === "No contact"
                            ? "No further contact."
                            : "Respect the boundary she has stated."}
                        </h3>
                        <p>
                          {p.boundary === "Friendship only"
                            ? "Choose genuine friendship or step back. A romantic goal does not change her stated preference."
                            : "Leave the invitation and give her space. A warmer message alone does not undo this boundary."}
                        </p>
                        <button
                          className="button secondary"
                          onClick={() => setModal("context")}
                        >
                          View recorded context
                        </button>
                      </div>
                    ) : (
                      <>
                        {selected ? (
                          <div className="quote-card">
                            <div className="quote-label">
                              <span
                                className={
                                  "avatar mini " +
                                  (selected.speaker === "you"
                                    ? "blue"
                                    : p.color)
                                }
                              >
                                {selected.speaker === "you" ? "Y" : p.name[0]}
                              </span>
                              <strong>
                                {selected.speaker === "you" ? "You" : p.name}
                              </strong>
                              <span>
                                {selectedId
                                  ? "Selected message"
                                  : "Latest message"}
                              </span>
                            </div>
                            <blockquote>“{selected.text}”</blockquote>
                            <button
                              className="text-link"
                              onClick={() => viewSource([selected.id])}
                            >
                              View in conversation <ArrowUpRight size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="empty-state">
                            <MessageCircle size={30} />
                            <h3>Start with a little context</h3>
                            <p>
                              Add a relevant exchange or describe the situation.
                            </p>
                            <button
                              className="button primary"
                              disabled={controlsDisabled}
                              onClick={() => {
                                setEditing(undefined);
                                setModal("messages");
                              }}
                            >
                              Add conversation
                            </button>
                          </div>
                        )}
                        {stale && (
                          <div className="notice">
                            <Info size={17} />
                            <span>
                              Needs review · Your intention or evidence changed.
                              This is the previous reading.
                            </span>
                          </div>
                        )}
                        {review ? (
                          <>
                            <div className="reading">
                              <h3>The most supported reading</h3>
                              <p className="lead-reading">{review.summary}</p>
                              <div className="claims">
                                {review.claims
                                  .slice(0, mode === "perspectives" ? 4 : 2)
                                  .map((c, i) => (
                                    <div className="claim" key={i}>
                                      <span
                                        className={
                                          "evidence-label " +
                                          c.label.toLowerCase()
                                        }
                                      >
                                        {c.label}
                                      </span>
                                      <p>{c.text}</p>
                                      {c.sourceIds.length > 0 && (
                                        <button
                                          aria-label={`View source for claim ${i + 1}`}
                                          onClick={() =>
                                            viewSource(c.sourceIds)
                                          }
                                        >
                                          <ArrowUpRight size={15} />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                              </div>
                              <div className="unknown">
                                <Info size={17} />
                                <div>
                                  <strong>What’s still unknown</strong>
                                  <p>{review.unknown}</p>
                                </div>
                              </div>
                            </div>
                            {mode === "perspectives" && (
                              <div className="perspective-section">
                                <div className="section-subheading">
                                  <h3>Different readings. One useful step.</h3>
                                  <span className="evidence-label plausible">
                                    {review.status?.startsWith("Partial")
                                      ? "Partial review"
                                      : "Same-model role review"}
                                  </span>
                                </div>
                                <p>{review.disagreement}</p>
                                {review.perspectives.map((x, i) => (
                                  <details key={i}>
                                    <summary>
                                      {x.name}
                                      <ChevronDown size={15} />
                                    </summary>
                                    <p>{x.reading}</p>
                                  </details>
                                ))}
                                {review.origin === "live" &&
                                  review.mode === "standard" && (
                                    <p className="inline-note">
                                      Run a perspective review for independent
                                      reading passes. These have not run yet.
                                    </p>
                                  )}
                              </div>
                            )}
                            {review.moves[0] && (
                              <div className="next-card">
                                <div className="eyebrow">
                                  <Compass size={15} /> YOUR NEXT MOVE
                                </div>
                                <h3>{review.moves[0].title}</h3>
                                <p>{review.moves[0].description}</p>
                                <button
                                  className="button primary"
                                  onClick={() => setTab("moves")}
                                >
                                  Explore your moves <ArrowRight size={16} />
                                </button>
                                <span className="next-note">
                                  You choose what feels like you.
                                </span>
                              </div>
                            )}
                            {review.question && (
                              <details className="context-question">
                                <summary>
                                  One useful question
                                  <ChevronDown size={15} />
                                </summary>
                                <p>{review.question}</p>
                                <Field
                                  label="Your answer · it’s okay not to know"
                                  value={questionAnswer}
                                  onChange={setQuestionAnswer}
                                />
                                <div className="button-row">
                                  <button
                                    className="button secondary"
                                    disabled={
                                      controlsDisabled || !questionAnswer.trim()
                                    }
                                    onClick={async () => {
                                      if (
                                        await updateProfile(
                                          invalidate({
                                            ...p,
                                            context:
                                              p.context +
                                              "\nQuestion: " +
                                              review.question +
                                              "\nYour answer: " +
                                              questionAnswer,
                                          }),
                                          "Context added; advice needs review.",
                                        )
                                      )
                                        setQuestionAnswer("");
                                    }}
                                  >
                                    Save answer
                                  </button>
                                  <button
                                    className="text-link"
                                    onClick={() => {
                                      toast.info(
                                        "Continue using the assumptions listed on each move.",
                                      );
                                      setTab("moves");
                                    }}
                                  >
                                    Continue without this
                                  </button>
                                </div>
                              </details>
                            )}
                          </>
                        ) : (
                          selected && (
                            <div className="empty-state compact">
                              <h3>Ready for a fresh reading</h3>
                              <p>
                                Review the evidence with your selected AI
                                provider. No analysis has been produced yet.
                              </p>
                            </div>
                          )
                        )}
                        <div className="review-actions">
                          <button
                            className="button secondary"
                            disabled={
                              controlsDisabled || busy || !p.messages.length
                            }
                            onClick={runReview}
                          >
                            {busy && (
                              <LoaderCircle className="spinning" size={15} />
                            )}{" "}
                            {busy
                              ? "Reviewing the evidence…"
                              : stale
                                ? "Update the reading"
                                : "Run live review"}
                          </button>
                          <button
                            className="text-link"
                            onClick={() =>
                              setMode(
                                mode === "standard"
                                  ? "perspectives"
                                  : "standard",
                              )
                            }
                          >
                            {mode === "standard"
                              ? "Compare perspectives"
                              : "Use standard review"}
                          </button>
                        </div>
                        {analysisError && (
                          <p className="form-error" role="alert">
                            {analysisError}
                          </p>
                        )}
                        <p className="analysis-footnote">
                          <Lock size={12} />
                          {review?.origin === "live"
                            ? `${review.status} · ${provider === "openai" ? "OpenAI" : "Gemini"}`
                            : "No review yet. Add messages, then connect your AI provider in Settings."}
                        </p>
                      </>
                    )}
                  </TabsContent>
                  <TabsContent value="chat">
                    <div className="section-heading">
                      <div>
                        <h2>Conversation</h2>
                      </div>
                      <div className="button-row chat-import-actions">
                      <button
                        className="button secondary"
                        disabled={controlsDisabled}
                        onClick={() => {
                          setEditing(undefined);
                          setModal("messages");
                        }}
                      >
                        <Plus size={15} />
                        Add messages
                      </button>
                      <button className="button secondary" disabled={controlsDisabled} onClick={() => setModal("screenshot")}>Upload screenshot</button>
                      </div>
                    </div>
                    <p className="inline-note">
                      Select a message to explore it. This is a record of your
                      conversation, not a messaging service.
                    </p>
                    <div className="messages">
                      {p.messages.map((m) => (
                        <div
                          id={"source-" + m.id}
                          key={m.id}
                          className={
                            "message-wrap " +
                            m.speaker +
                            (selectedId === m.id ? " source-selected" : "")
                          }
                        >
                          <button
                            className={"message " + m.speaker}
                            onClick={() => {
                              setSelectedId(m.id);
                              setTab("understand");
                            }}
                          >
                            <small>
                              {m.speaker === "you" ? "You" : p.name} · {m.source === "screenshot" ? "Screenshot" : m.kind}
                            </small>
                            <p>{m.text}</p>
                            <span className="message-date">
                              {formatDate(m.date)}
                            </span>
                          </button>
                          <div className="message-actions">
                            <button
                              aria-label={`Edit message: ${m.text.slice(0, 30)}`}
                              disabled={controlsDisabled}
                              onClick={() => {
                                setEditing(m);
                                setModal("messages");
                              }}
                            >
                              <PenLine size={13} />
                            </button>
                            <button
                              aria-label={`Delete message: ${m.text.slice(0, 30)}`}
                              disabled={controlsDisabled}
                              onClick={() =>
                                setDeleting({ type: "message", id: m.id })
                              }
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {!p.messages.length && (
                      <div className="empty-state">
                        <MessageCircle size={28} />
                        <h3>No conversation yet</h3>
                        <p>
                          Add a few relevant messages, or describe what happened
                          in person.
                        </p>
                        <button
                          className="button primary"
                          disabled={controlsDisabled}
                          onClick={() => {
                            setEditing(undefined);
                            setModal("messages");
                          }}
                        >
                          Add conversation
                        </button>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="moves">
                    <div className="section-heading">
                      <div>
                        <span className="eyebrow">INTENTION INTO ACTION</span>
                        <h2>Choose your next step</h2>
                      </div>
                    </div>
                    <button
                      className="goal-strip"
                      onClick={() => setModal("intention")}
                    >
                      <Compass size={17} />
                      <span>
                        {p.intention.status} · {p.intention.role}
                      </span>
                      <PenLine size={14} />
                    </button>
                    {p.boundary !== "None stated" ? (
                      <div className="boundary-card">
                        <ShieldCheck size={28} />
                        <h3>Give the boundary room.</h3>
                        <p>
                          {p.boundary}. Do not send another invitation or look
                          for another channel. Your own goal can change; her
                          boundary still applies.
                        </p>
                      </div>
                    ) : stale ? (
                      <div className="empty-state">
                        <RotateCcw size={26} />
                        <h3>Your moves need a fresh look</h3>
                        <p>
                          The evidence or intention changed. The previous
                          decision snapshots remain in History.
                        </p>
                        <button
                          className="button primary"
                          onClick={() => setTab("understand")}
                        >
                          Review the changes
                        </button>
                      </div>
                    ) : review?.moves.length ? (
                      review.moves.map((m, i) => (
                        <div
                          className={
                            "move-card " + (i === 0 ? "recommended" : "")
                          }
                          key={m.id}
                        >
                          <span className="eyebrow">
                            {i === 0
                              ? "01 / BEST FIT FOR YOUR INTENTION"
                              : `${String(i + 1).padStart(2, "0")} / ANOTHER WAY`}
                          </span>
                          <h3>{m.title}</h3>
                          <p>{m.description}</p>
                          {m.draft ? (
                            <>
                              <label
                                className="draft-label"
                                htmlFor={"draft-" + m.id}
                              >
                                YOUR DRAFT · MAKE IT YOURS
                              </label>
                              <textarea
                                id={"draft-" + m.id}
                                className="draft-input"
                                value={drafts[m.id] ?? m.draft}
                                onChange={(e) =>
                                  setDrafts({
                                    ...drafts,
                                    [m.id]: e.target.value,
                                  })
                                }
                              />
                              <button
                                className="text-link"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(
                                      drafts[m.id] ?? m.draft,
                                    );
                                    toast.success(
                                      "Copied. Nothing has been sent or recorded as sent.",
                                    );
                                  } catch {
                                    toast.error(
                                      "Clipboard unavailable. Select and copy the draft manually.",
                                    );
                                  }
                                }}
                              >
                                <Copy size={14} />
                                Copy draft
                              </button>
                            </>
                          ) : (
                            <div className="nonmessage-action">
                              <Compass size={17} />
                              <p>
                                {m.timing} {m.assumption}
                              </p>
                            </div>
                          )}
                          <div className="move-tradeoff">
                            <strong>The trade-off</strong>
                            <p>{m.tradeoff}</p>
                          </div>
                          <details className="move-details">
                            <summary>
                              Why this fits & what could happen
                              <ChevronDown size={15} />
                            </summary>
                            <dl>
                              <dt>Why it fits</dt>
                              <dd>{m.fit}</dd>
                              <dt>Assumption</dt>
                              <dd>{m.assumption}</dd>
                              <dt>Timing</dt>
                              <dd>{m.timing}</dd>
                              <dt>Stop condition</dt>
                              <dd>{m.stop}</dd>
                            </dl>
                            <ul>
                              {m.branches.map((b, n) => (
                                <li key={n}>{b}</li>
                              ))}
                            </ul>
                            {m.sourceIds.length > 0 && (
                              <button
                                className="text-link"
                                onClick={() => viewSource(m.sourceIds)}
                              >
                                Open evidence <ArrowUpRight size={14} />
                              </button>
                            )}
                          </details>
                          <button
                            className={
                              "button " + (i === 0 ? "primary" : "secondary")
                            }
                            disabled={controlsDisabled}
                            onClick={() => saveDecision(m)}
                          >
                            <Bookmark size={15} />
                            Save this decision
                          </button>
                          <span className="save-move-note">
                            Records the recommendation, not an action.
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">
                        <Compass size={28} />
                        <h3>A little evidence comes first</h3>
                        <p>
                          Add context and review it before choosing a tailored
                          move.
                        </p>
                        <button
                          className="button primary"
                          onClick={() => setTab("understand")}
                        >
                          Understand the exchange
                        </button>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="history">
                    <div className="section-heading">
                      <div>
                        <span className="eyebrow">ROOM TO LEARN</span>
                        <h2>Decisions and outcomes</h2>
                      </div>
                      <span className="review-tag">
                        {p.decisions.length} decisions
                      </span>
                    </div>
                    {p.decisions.length ? (
                      <>
                        <p className="inline-note">
                          What you knew then. What you did. What changed.
                        </p>
                        <div className="timeline">
                          {p.decisions.map((d, i) => (
                            <article className="decision-card" key={d.id}>
                              <div className="timeline-node">{i + 1}</div>
                              <div className="decision-meta">
                                <span>{formatDate(d.date)}</span>
                                <span
                                  className={
                                    "evidence-label " +
                                    (d.needsReview ? "plausible" : "explicit")
                                  }
                                >
                                  {d.needsReview
                                    ? "Needs review"
                                    : d.outcomeKind === "Unknown"
                                      ? "Outcome unknown"
                                      : d.outcomeKind}
                                </span>
                              </div>
                              <h3>{d.move.title}</h3>
                              <p>{d.reading}</p>
                              {d.outcome && (
                                <blockquote>“{d.outcome}”</blockquote>
                              )}
                              {d.revision && (
                                <div className="revision">
                                  <strong>What changed</strong>
                                  <p>{d.revision}</p>
                                </div>
                              )}
                              <details className="move-details">
                                <summary>
                                  Open the original snapshot
                                  <ChevronDown size={15} />
                                </summary>
                                <dl>
                                  <dt>Intention at the time</dt>
                                  <dd>
                                    {d.goal.status} · {d.goal.role}
                                  </dd>
                                  <dt>Stage at the time</dt>
                                  <dd>{d.stage}</dd>
                                  <dt>Original recommendation</dt>
                                  <dd>
                                    {d.move.draft ||
                                      d.move.description ||
                                      "Source removed"}
                                  </dd>
                                  {d.preparedDraft &&
                                    d.preparedDraft !== d.move.draft && (
                                      <>
                                        <dt>Prepared draft before action</dt>
                                        <dd>{d.preparedDraft}</dd>
                                      </>
                                    )}
                                  <dt>Original expectation</dt>
                                  <dd>{d.expectation}</dd>
                                  <dt>Actual action</dt>
                                  <dd>
                                    {d.actualAction}
                                    {d.actualText && `: ${d.actualText}`}
                                  </dd>
                                  <dt>Observed outcome</dt>
                                  <dd>
                                    {d.outcome || d.outcomeKind || "Unknown"}
                                  </dd>
                                  {d.checkedInAt && (
                                    <>
                                      <dt>Last check-in</dt>
                                      <dd>{formatDate(d.checkedInAt)}</dd>
                                    </>
                                  )}
                                </dl>
                                {d.sourceIds.length > 0 && (
                                  <button
                                    className="text-link"
                                    onClick={() => viewSource(d.sourceIds)}
                                  >
                                    Open source message{" "}
                                    <ArrowUpRight size={14} />
                                  </button>
                                )}
                              </details>
                              <div className="button-row">
                                <button
                                  className="button secondary"
                                  disabled={controlsDisabled}
                                  onClick={() => setOutcome(d)}
                                >
                                  <PenLine size={14} />
                                  Record outcome
                                </button>
                                <button
                                  className="icon-button"
                                  aria-label={"Delete decision " + (i + 1)}
                                  disabled={controlsDisabled}
                                  onClick={() =>
                                    setDeleting({ type: "decision", id: d.id })
                                  }
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="empty-state">
                        <History size={30} />
                        <h3>Your decisions will live here</h3>
                        <p>
                          Save a move, record what happened, and see what
                          changes.
                        </p>
                        <button
                          className="button primary"
                          onClick={() => setTab("moves")}
                        >
                          Explore moves
                        </button>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </section>
              <aside className="context-pane">{contextual}</aside>
            </div>
          </>
        ) : (
          <div className="empty-state all-empty">
            <h1>
              {ready
                ? archived
                  ? "No archived connections."
                  : "Start with one connection."
                : storageError
                  ? "Your workspace is unavailable."
                  : "Opening your workspace…"}
            </h1>
            <p>
              Keep the messages, your intention, and what happened next in one
              private place.
            </p>
            <button
              className="button primary"
              disabled={controlsDisabled}
              onClick={() =>
                archived ? setArchived(false) : setNewProfile(blankProfile())
              }
            >
              {archived ? "Back to connections" : "Add your first connection"}
            </button>
          </div>
        )}
      </main>
      <Sheet open={contextOpen} onOpenChange={setContextOpen}>
        <SheetContent className="context-sheet">
          <SheetHeader>
            <SheetTitle>Connection context</SheetTitle>
            <SheetDescription>
              Your intention, the present situation, and the evidence.
            </SheetDescription>
          </SheetHeader>
          <div>{contextual}</div>
        </SheetContent>
      </Sheet>
      {newProfile && (
        <IntentionForm
          profile={newProfile}
          isNew
          onClose={() => setNewProfile(null)}
          onSave={async (next) => {
            if (
              await persist({
                ...dataRef.current,
                profiles: [...dataRef.current.profiles, next],
              })
            ) {
              setId(next.id);
              setArchived(false);
              setNewProfile(null);
              setTab("chat");
              toast.success("Connection created");
            }
          }}
        />
      )}
      {p && modal === "intention" && (
        <IntentionForm
          profile={p}
          onClose={() => setModal("")}
          onSave={async (next) => {
            analysisTicket.current++;
            const updated = {
              ...next,
              decisions: next.decisions.map((d) => ({
                ...d,
                needsReview: true,
              })),
            };
            if (
              await updateProfile(
                updated,
                "Intention updated; your evidence stays the same.",
              )
            )
              setModal("");
          }}
        />
      )}
      {p && modal === "context" && (
        <ContextForm
          profile={p}
          onClose={() => setModal("")}
          onSave={async (next) => {
            if (
              await updateProfile(
                invalidate(next),
                "Context saved; previous advice needs review.",
              )
            )
              setModal("");
          }}
        />
      )}
      {p && modal === "screenshot" && (
        <ScreenshotImport
          key={p.id}
          profile={p}
          config={{ provider, model, key: apiKey }}
          onClose={() => setModal("")}
          onSettings={openSettings}
          onSave={async (rows) => {
            const current = dataRef.current.profiles.find((profile) => profile.id === p.id);
            if (!current) throw Error("This connection is no longer available.");
            const { messages, duplicates } = prepareScreenshotMessages(rows, current.messages);
            if (!messages.length) throw Error("These messages are already in this conversation.");
            const ok = await updateProfile(invalidate({ ...current, messages: [...current.messages, ...messages] }),
              `${messages.length} ${messages.length === 1 ? "message" : "messages"} imported${duplicates ? `; ${duplicates} duplicate${duplicates === 1 ? "" : "s"} skipped` : ""}`);
            if (ok) { setModal(""); setTab("chat"); setSelectedId(messages[0].id); }
            return ok;
          }}
        />
      )}
      {p && modal === "messages" && (
        <MessageForm
          profile={p}
          editing={editing}
          onClose={() => setModal("")}
          onSave={async (ms) => {
            const messages = editing
              ? p.messages.map((m) => (m.id === editing.id ? ms[0] : m))
              : [...p.messages, ...ms];
            let next = invalidate({ ...p, messages });
            if (editing)
              next = {
                ...next,
                review: null,
                example: undefined,
                decisions: next.decisions.map((d) =>
                  d.sourceIds.includes(editing.id)
                    ? {
                        ...d,
                        reading:
                          "Source corrected; previous reading withdrawn.",
                        expectation: "Source corrected; forecast needs review.",
                        revision:
                          "Revisit this decision with the corrected source.",
                        needsReview: true,
                      }
                    : d,
                ),
              };
            if (
              await updateProfile(
                next,
                editing
                  ? "Source corrected; dependent advice withdrawn."
                  : "Messages added",
              )
            ) {
              setModal("");
              setTab("chat");
              setSelectedId(ms[0].id);
            }
          }}
        />
      )}
      {outcome && (
        <OutcomeForm
          decision={outcome}
          onClose={() => setOutcome(null)}
          onSave={saveOutcome}
        />
      )}
      {modal === "style" && (
        <Modal
          title="Make it sound like you"
          description="Your writing style can be used across connections. Their private histories stay separate."
          onClose={() => setModal("")}
        >
          <Field
            label="Your style and optional writing examples"
            value={style}
            onChange={setStyle}
            multiline
          />
          <p className="form-note">
            Only your style is shared across your profiles. Real experiences and
            availability are never invented.
          </p>
          <div className="dialog-actions">
            <button
              className="button primary"
              disabled={controlsDisabled}
              onClick={async () => {
                if (
                  await persist({
                    ...dataRef.current,
                    style,
                    profiles: dataRef.current.profiles.map((x) => ({
                      ...x,
                      review: x.review
                        ? { ...x.review, goalVersion: -1 }
                        : null,
                    })),
                  })
                ) {
                  setModal("");
                  toast.success(
                    "Your style is saved. Previous moves need review.",
                  );
                }
              }}
            >
              Save my style
            </button>
          </div>
        </Modal>
      )}
      {modal === "settings" && (
        <Modal
          title="Your space, your choices"
          description="Choose how reviews run and how long your evidence stays here."
          onClose={() => setModal("")}
        >
          <div className="settings-section">
            <h3>AI connection</h3>
            <Pick
              label="Provider"
              value={provider === "openai" ? "OpenAI API" : "Google Gemini API"}
              onChange={(v) => {
                const next = v === "OpenAI API" ? "openai" : "gemini";
                setProvider(next);
                setModel(DEFAULT_MODELS[next]);
                setApiKey("");
                setConsent(false);
              }}
              options={["OpenAI API", "Google Gemini API"]}
            />
            <Field label="Model" value={model} onChange={setModel} />
            {hasTaskTuning(provider, model) ? (
              <p className="form-note">
                Recommended model. Reasoning adapts to each review step, with
                concise final answers and no app-imposed output-token limit.
              </p>
            ) : (
              <div className="custom-model-note">
                <p className="form-note">
                  Custom models must support structured JSON. They use the
                  provider’s default reasoning; step-specific writing guidance
                  still applies.
                </p>
                <button
                  className="button secondary small"
                  onClick={() => setModel(DEFAULT_MODELS[provider])}
                >
                  Use {DEFAULT_MODELS[provider]}
                </button>
              </div>
            )}
            <details className="ai-tuning">
              <summary>How review steps are tuned</summary>
              <p className="form-note">
                {hasTaskTuning(provider, model)
                  ? "More reasoning checks difficult interpretations; it does not mean a longer answer."
                  : `These presets apply when you use ${DEFAULT_MODELS[provider]}.`}
              </p>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Review step</th>
                    <th scope="col">Reasoning</th>
                    <th scope="col">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(REVIEW_TASKS).map(([task, settings]) => (
                    <tr key={task}>
                      <th scope="row">{settings.label}</th>
                      <td>{settings.effort}</td>
                      <td>
                        {settings.verbosity === "low" ? "Concise" : "Balanced"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="form-note">
                {provider === "openai"
                  ? "OpenAI uses reasoning effort and text verbosity."
                  : "Gemini uses thinking level; writing guidance controls answer detail."}{" "}
                Provider limits still apply. Incomplete results are not saved.
              </p>
            </details>
            <Field
              label="API key · this session only"
              type="password"
              value={apiKey}
              onChange={setApiKey}
              placeholder={
                provider === "openai"
                  ? "OpenAI API key"
                  : "Google AI Studio API key"
              }
            />
            <p className="form-note">
              Your key stays in this tab’s memory and is sent to our server only
              to make your requested API calls. It is not saved in the database
              or browser storage. Reloading clears it.
            </p>
            <label className="check-row">
              <Checkbox
                checked={consent}
                onCheckedChange={(v) => setConsent(v === true)}
              />
              I understand that running a review sends this connection’s
              messages, context, intention, decisions, and my style to{" "}
              {provider === "openai" ? "OpenAI" : "Google"}. API usage may cost
              money.
            </label>
            <p className="form-note">
              Perspective review makes up to six calls to the selected model.
              Each pass sees only this profile. The provider’s own data and
              retention policies apply.
            </p>
            <div className="provider-links">
              <a
                href={
                  provider === "openai"
                    ? "https://platform.openai.com/api-keys"
                    : "https://aistudio.google.com/api-keys"
                }
                target="_blank"
                rel="noreferrer"
              >
                Get an API key <ArrowUpRight size={13} />
              </a>
              <a
                href={
                  provider === "openai"
                    ? "https://developers.openai.com/api/docs/guides/your-data"
                    : "https://ai.google.dev/gemini-api/terms"
                }
                target="_blank"
                rel="noreferrer"
              >
                Provider data terms <ArrowUpRight size={13} />
              </a>
            </div>
            <button
              className="button secondary"
              onClick={() => {
                setApiKey("");
                setConsent(false);
                toast.success("API key removed from this session");
              }}
            >
              Disconnect AI
            </button>
          </div>
          <div className="settings-section">
            <h3>Evidence retention</h3>
            <Pick
              label="Keep messages and decision history"
              value={
                retention === "until-deleted"
                  ? "Until I delete them"
                  : retention === "30-days"
                    ? "30 days"
                    : "90 days"
              }
              onChange={(v) =>
                setRetention(
                  v === "30 days"
                    ? "30-days"
                    : v === "90 days"
                      ? "90-days"
                      : "until-deleted",
                )
              }
              options={["Until I delete them", "30 days", "90 days"]}
            />
            <p className="form-note">
              Dated evidence is removed when you next open or save this
              workspace after the selected period. Undated messages remain until
              you delete them. Dependent summaries are cleared with removed
              sources. Exports and provider records are not deleted by this app.
            </p>
          </div>
          <div className="dialog-actions">
            <button
              className="button secondary"
              onClick={() => exportJSON(data, "between-workspace")}
            >
              Export workspace
            </button>
            <button
              className="button primary"
              disabled={controlsDisabled}
              onClick={async () => {
                if (await persist({ ...dataRef.current, retention })) {
                  setModal("");
                  toast.success(
                    apiKey && consent
                      ? "AI configured for this session; run a review to connect."
                      : "Settings saved",
                  );
                }
              }}
            >
              Save settings
            </button>
          </div>
        </Modal>
      )}
      {p && modal === "profile" && (
        <Modal
          title={p.name + " · your controls"}
          description="Each connection has its own evidence and decision history."
          onClose={() => setModal("")}
        >
          <button
            className="button secondary"
            onClick={() =>
              exportJSON(
                p,
                "between-" + p.name.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
              )
            }
          >
            <Download size={16} />
            Export this connection
          </button>
          <button
            className="button secondary"
            disabled={controlsDisabled}
            onClick={async () => {
              if (
                await updateProfile(
                  { ...p, archived: !p.archived },
                  p.archived ? "Connection restored" : "Connection archived",
                )
              ) {
                setModal("");
                setArchived(!p.archived);
              }
            }}
          >
            <Archive size={16} />
            {p.archived ? "Restore connection" : "Archive connection"}
          </button>
          <button
            className="button danger"
            disabled={controlsDisabled}
            onClick={() => setDeleting({ type: "profile", id: p.id })}
          >
            <Trash2 size={16} />
            Delete this connection
          </button>
          <p className="form-note">
            Deleting removes this profile’s messages, intentions, summaries and
            decisions from the active database. Previously downloaded exports
            and AI provider records are outside this deletion.
          </p>
        </Modal>
      )}
      {p && modal === "evidence" && (
        <Modal
          title="Evidence & working hypotheses"
          description="These are separate questions. One answer cannot stand in for another."
          onClose={() => setModal("")}
        >
          <div className="hypothesis">
            <h3>Willingness to keep talking</h3>
            <p>
              {review?.claims.find((c) => c.label === "Context-supported")
                ?.text || "Not established by current evidence."}
            </p>
            <span
              className={
                "evidence-label " +
                (review?.claims.some((c) => c.label === "Context-supported")
                  ? "context-supported"
                  : "unknown")
              }
            >
              {review?.claims.some((c) => c.label === "Context-supported")
                ? "Context-supported"
                : "Unknown"}
            </span>
          </div>
          <div className="hypothesis">
            <h3>Willingness to meet</h3>
            <p>
              A concrete, mutually workable plan would clarify this. A friendly
              exchange alone does not settle it.
            </p>
          </div>
          <div className="hypothesis">
            <h3>Romantic framing</h3>
            <p>
              {review?.unknown ||
                "Unknown. A directly accepted date would clarify the framing, not prove private feelings."}
            </p>
            <span className="evidence-label unknown">Unknown</span>
          </div>
          {review?.claims.map((c, i) => (
            <div className="claim" key={i}>
              <span className={"evidence-label " + c.label.toLowerCase()}>
                {c.label}
              </span>
              <p>{c.text}</p>
              {c.sourceIds.length > 0 && (
                <button
                  aria-label={"Open evidence " + (i + 1)}
                  onClick={() => {
                    setModal("");
                    viewSource(c.sourceIds);
                  }}
                >
                  <ArrowUpRight size={16} />
                </button>
              )}
            </div>
          ))}
          <button
            className="button secondary"
            onClick={() => setModal("context")}
          >
            Correct the context
          </button>
        </Modal>
      )}
      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete{" "}
              {deleting?.type === "profile"
                ? "this connection"
                : deleting?.type === "message"
                  ? "this source"
                  : "this decision"}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.type === "message"
                ? "The source and dependent private summaries will be removed. Historical entries will retain only a source-removed marker."
                : "This removes the saved content from the active workspace. This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="danger"
              onClick={(e) => {
                e.preventDefault();
                deleteItem();
              }}
              disabled={controlsDisabled}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
