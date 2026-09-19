"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { Profile, Intention, Message, Decision } from "@/lib/types";
export function Pick({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
export function Field({
  label,
  value,
  onChange,
  placeholder = "",
  multiline = false,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          maxLength={15000}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          maxLength={type === "password" ? 500 : 5000}
        />
      )}
    </label>
  );
}
export function Modal({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="app-dialog">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
const statuses = [
  "Serious relationship",
  "Dating and seeing where it goes",
  "Casual dating",
  "Friends with benefits",
  "Friendship",
  "Unsure",
  "Custom",
];
const roles = [
  "Confident initiator",
  "Playful romantic interest",
  "Calm, independent equal",
  "Warm, intentional prospect",
  "Slow-burn connection",
  "Unsure",
  "Custom",
];
export function IntentionForm({
  profile,
  onSave,
  onClose,
  isNew = false,
}: {
  profile: Profile;
  onSave: (p: Profile) => void;
  onClose: () => void;
  isNew?: boolean;
}) {
  const [p, setP] = useState(structuredClone(profile));
  const [step, setStep] = useState(isNew ? 0 : 1);
  const i = p.intention;
  const intention = (patch: Partial<Intention>) =>
    setP({ ...p, intention: { ...i, ...patch } });
  const [error, setError] = useState("");
  function next() {
    if (step === 0 && (!p.name.trim() || !p.adult)) {
      setError("Add an alias and confirm that both people are adults.");
      return;
    }
    if (
      step === 1 &&
      (!i.status || (i.status === "Custom" && !i.custom.trim()))
    ) {
      setError(
        "Choose a connection, or describe your custom intention. Unsure is also a valid answer.",
      );
      return;
    }
    if (step === 2 && !i.role) {
      setError("Choose how you want to show up. Unsure is a valid answer.");
      return;
    }
    setError("");
    setStep(step + 1);
  }
  return (
    <Modal
      title={
        step === 0
          ? "A new connection"
          : step === 3
            ? "Does this feel like you?"
            : "Your intention for " + (p.name || "this connection")
      }
      description={
        step === 3
          ? "Your intention guides your choices. It does not tell us what she wants."
          : `Step ${isNew ? step + 1 : step} of ${isNew ? 4 : 3} · You can change this at any time.`
      }
      onClose={onClose}
    >
      <div className="step-dots">
        {[0, 1, 2, 3].slice(isNew ? 0 : 1).map((s) => (
          <span className={s <= step ? "filled" : ""} key={s} />
        ))}
      </div>
      {step === 0 && (
        <>
          <Field
            label="Her name or alias"
            value={p.name}
            onChange={(name) => setP({ ...p, name })}
            placeholder="An alias is enough"
          />
          <Field
            label="Where did you meet?"
            value={p.met}
            onChange={(met) => setP({ ...p, met })}
            placeholder="University, a dating app, through friends…"
          />
          <label className="check-row">
            <Checkbox
              checked={p.adult}
              onCheckedChange={(v) => setP({ ...p, adult: v === true })}
            />
            I confirm that we are both 18 or older.
          </label>
        </>
      )}
      {step === 1 && (
        <>
          <h3 className="form-question">
            What kind of connection would you like with her?
          </h3>
          <Pick
            label="Desired connection"
            value={i.status}
            onChange={(status) => intention({ status })}
            options={statuses}
          />
          {i.status === "Custom" && (
            <Field
              label="Your original brief"
              value={i.custom}
              onChange={(custom) => intention({ custom })}
              multiline
              placeholder="What do you want from this connection?"
            />
          )}
          <p className="form-note">
            This is what you want, not a current relationship label.
          </p>
        </>
      )}
      {step === 2 && (
        <>
          <h3 className="form-question">
            How do you want to show up in this connection?
          </h3>
          <Pick
            label="Primary role"
            value={i.role}
            onChange={(role) => intention({ role })}
            options={roles}
          />
          {i.role === "Custom" && (
            <Field
              label="Your custom role or dynamic"
              value={i.custom}
              onChange={(custom) => intention({ custom })}
              multiline
            />
          )}
          <Field
            label="Optional secondary quality"
            value={i.secondary}
            onChange={(secondary) => intention({ secondary })}
            placeholder="Warm, playful, direct…"
          />
          <Field
            label="What would you like to happen next?"
            value={i.objective}
            onChange={(objective) => intention({ objective })}
            placeholder="Ask her out, get to know her, or figure it out"
          />
          <Field
            label="Pace and style"
            value={i.pace}
            onChange={(pace) => intention({ pace })}
          />
          <Field
            label="Your boundaries"
            value={i.boundaries}
            onChange={(boundaries) => intention({ boundaries })}
          />
        </>
      )}
      {step === 3 && (
        <div className="intention-confirm">
          <span className="eyebrow">YOUR BRIEF</span>
          <h3>{i.status}</h3>
          <p>
            Show up as <strong>{i.role.toLowerCase()}</strong>
            {i.secondary && `, with a ${i.secondary.toLowerCase()} quality`}.
          </p>
          <p>
            <strong>Next:</strong>{" "}
            {i.objective ||
              "Explore what feels right without a fixed next step."}
          </p>
          {i.custom && <blockquote>{i.custom}</blockquote>}
          <p className="form-note">
            What she wants: only what she has explicitly stated. Anything else
            stays unknown.
          </p>
        </div>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        {step > (isNew ? 0 : 1) && (
          <button
            className="button secondary"
            onClick={() => setStep(step - 1)}
          >
            Back to edit
          </button>
        )}
        {step < 3 ? (
          <button className="button primary" onClick={next}>
            Continue
          </button>
        ) : (
          <button
            className="button primary"
            onClick={() =>
              onSave({
                ...p,
                name: p.name.trim(),
                intention: { ...i, confirmed: true, version: i.version + 1 },
              })
            }
          >
            Confirm for {p.name}
          </button>
        )}
      </div>
    </Modal>
  );
}
export function ContextForm({
  profile,
  onSave,
  onClose,
}: {
  profile: Profile;
  onSave: (p: Profile) => void;
  onClose: () => void;
}) {
  const [p, setP] = useState(structuredClone(profile));
  return (
    <Modal
      title="The context that matters"
      description="Keep what exists, what she said, and your impressions separate."
      onClose={onClose}
    >
      <Pick
        label="Current stage"
        value={p.stage}
        onChange={(stage) => setP({ ...p, stage })}
        options={[
          "New match",
          "Acquaintance",
          "Early conversation",
          "Talking stage",
          "Invitation pending",
          "Early dating",
          "Not pursuing further",
        ]}
      />
      <Field
        label="What currently exists"
        value={p.current}
        onChange={(current) => setP({ ...p, current })}
        multiline
      />
      <Field
        label="Her stated preferences · quote and source"
        value={p.stated}
        onChange={(stated) => setP({ ...p, stated })}
        multiline
      />
      <Field
        label="Shared context / your recollection"
        value={p.context}
        onChange={(context) => setP({ ...p, context })}
        multiline
      />
      <Pick
        label="A boundary she has stated"
        value={p.boundary}
        onChange={(boundary) => setP({ ...p, boundary })}
        options={[
          "None stated",
          "Declined invitation",
          "Asked for space",
          "No contact",
          "Friendship only",
        ]}
      />
      <p className="form-note">
        Change a recorded boundary only if she clearly revises it. Warmer
        messages alone do not undo a refusal.
      </p>
      <div className="dialog-actions">
        <button className="button primary" onClick={() => onSave(p)}>
          Save context
        </button>
      </div>
    </Modal>
  );
}
export function MessageForm({
  profile,
  editing,
  onSave,
  onClose,
}: {
  profile: Profile;
  editing?: Message;
  onSave: (messages: Message[]) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(editing?.text || "");
  const [speaker, setSpeaker] = useState(
    editing?.speaker === "you" ? "You" : profile.name,
  );
  const [kind, setKind] = useState(editing?.kind || "Message");
  const [date, setDate] = useState(editing?.date?.slice(0, 16) || "");
  const [error, setError] = useState("");
  function save() {
    if (!text.trim()) {
      setError("Add the message or event first.");
      return;
    }
    const lines = editing ? [text] : text.split("\n").filter((x) => x.trim());
    const ms = lines.map((line) => {
      const match = line.match(/^(You|Me|Her|[^:]{1,70}):\s*(.+)$/i);
      let who = speaker === profile.name ? "her" : "you";
      let value = line;
      if (
        match &&
        ["you", "me", "her", profile.name.toLowerCase()].includes(
          match[1].toLowerCase(),
        )
      ) {
        who = ["you", "me"].includes(match[1].toLowerCase()) ? "you" : "her";
        value = match[2];
      }
      return {
        id: editing?.id || crypto.randomUUID(),
        speaker: who as "her" | "you",
        text: value.trim(),
        date,
        kind: kind as Message["kind"],
      };
    });
    const unique = ms.filter(
      (m, n) =>
        ms.findIndex(
          (x) =>
            x.text === m.text &&
            x.speaker === m.speaker &&
            (!x.date || !m.date || x.date === m.date),
        ) === n &&
        !(
          !editing &&
          profile.messages.some(
            (x) =>
              x.text === m.text &&
              x.speaker === m.speaker &&
              (!x.date || !m.date || x.date === m.date),
          )
        ),
    );
    if (!unique.length) {
      setError(
        "These messages are already saved. Duplicates do not add evidence.",
      );
      return;
    }
    onSave(unique);
  }
  return (
    <Modal
      title={editing ? "Correct this source" : "Add to the conversation"}
      description="Remove names or identifying details you don’t need before saving. Nothing is sent to her."
      onClose={onClose}
    >
      <div className="two-fields">
        <Pick
          label="Speaker"
          value={speaker}
          onChange={setSpeaker}
          options={[profile.name, "You"]}
        />
        <Pick
          label="Source type"
          value={kind}
          onChange={(v) => setKind(v as Message["kind"])}
          options={["Message", "She said", "My impression", "Event"]}
        />
      </div>
      <Field
        label={editing ? "Source text" : "Message or conversation"}
        value={text}
        onChange={setText}
        multiline
        placeholder={`Paste one message, or one per line:\nYou: We should get coffee sometime.\n${profile.name}: That sounds nice.`}
      />
      <Field
        label="When · leave blank if unknown"
        type="datetime-local"
        value={date}
        onChange={setDate}
      />
      <p className="form-note">
        Undated messages stay undated. Editing a source marks dependent advice
        for review.
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button className="button primary" onClick={save}>
          {editing ? "Save correction" : "Save messages"}
        </button>
      </div>
    </Modal>
  );
}
export function OutcomeForm({
  decision,
  onSave,
  onClose,
}: {
  decision: Decision;
  onSave: (d: Decision) => void;
  onClose: () => void;
}) {
  const [d, setD] = useState(structuredClone(decision));
  return (
    <Modal
      title="What actually happened?"
      description="The action you took and the result are separate. Copying a draft is not sending."
      onClose={onClose}
    >
      <Pick
        label="What did you actually do?"
        value={d.actualAction}
        onChange={(actualAction) =>
          setD({
            ...d,
            actualAction,
            actualText:
              actualAction === "Sent as written"
                ? d.move.draft
                : actualAction === "Sent an edited version"
                  ? d.actualText || d.preparedDraft || d.move.draft
                  : "",
          })
        }
        options={[
          "Not recorded",
          "Sent as written",
          "Sent an edited version",
          "Did something else",
          "Did nothing",
        ]}
      />
      {!["Not recorded", "Did nothing"].includes(d.actualAction) && (
        <Field
          label="Actual wording or action"
          value={d.actualText}
          onChange={(actualText) =>
            setD({
              ...d,
              actualText,
              actualAction:
                d.actualAction === "Sent as written" &&
                actualText !== d.move.draft
                  ? "Sent an edited version"
                  : d.actualAction,
            })
          }
          multiline
        />
      )}
      <Pick
        label="What happened next?"
        value={d.outcomeKind || "Unknown"}
        onChange={(outcomeKind) =>
          setD({
            ...d,
            outcomeKind,
            outcome:
              outcomeKind === "Still waiting" || outcomeKind === "Unknown"
                ? ""
                : d.outcome,
          })
        }
        options={["Unknown", "Still waiting", "Actual reply", "Offline event"]}
      />
      {["Actual reply", "Offline event"].includes(d.outcomeKind) && (
        <Field
          label="Reply or event · use actual words"
          value={d.outcome}
          onChange={(outcome) => setD({ ...d, outcome })}
          multiline
        />
      )}
      <Field
        label="Outcome date · leave blank if unknown"
        type="datetime-local"
        value={d.outcomeDate || ""}
        onChange={(outcomeDate) => setD({ ...d, outcomeDate })}
      />
      <Field
        label="Your reflection · what changed?"
        value={d.revision}
        onChange={(revision) => setD({ ...d, revision })}
        multiline
        placeholder="Keep the observation separate from what you think it means."
      />
      <p className="form-note">
        An unknown outcome is not a failed forecast. A friendly response is not
        proof of attraction.
      </p>
      <div className="dialog-actions">
        <button
          className="button primary"
          disabled={
            ["Actual reply", "Offline event"].includes(d.outcomeKind) &&
            !d.outcome.trim()
          }
          onClick={() => onSave(d)}
        >
          Save check-in
        </button>
      </div>
    </Modal>
  );
}
