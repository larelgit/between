"use client";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Modal, Field, Pick } from "./forms";
import { readApiResponse } from "@/lib/api-response";
import { MAX_SCREENSHOT_BYTES, prepareScreenshotMessages, transcriptionSchema, type ScreenshotImage, type Transcription, type ImportMessage } from "@/lib/screenshot-import";
import type { AIConfig } from "@/lib/review-engine";
import type { Profile } from "@/lib/types";

const resultSchema = z.object({ transcription: transcriptionSchema });
export function ScreenshotImport({ profile, config, onClose, onSettings, onSave }: {
  profile: Profile;
  config: AIConfig;
  onClose: () => void;
  onSettings: () => void;
  onSave: (rows: ImportMessage[]) => Promise<boolean>;
}) {
  const [image, setImage] = useState<ScreenshotImage | null>(null);
  const [filename, setFilename] = useState("");
  const [mySide, setMySide] = useState("Right");
  const [consent, setConsent] = useState(false);
  const [transcription, setTranscription] = useState<Transcription | null>(null);
  const [rows, setRows] = useState<ImportMessage[]>([]);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const operation = useRef<{ controller?: AbortController; ticket: number }>({ ticket: 0 });
  const configured = config.key.trim().length >= 15 && !!config.model.trim();
  const provider = config.provider === "openai" ? "OpenAI" : "Google Gemini";
  useEffect(() => {
    const active = operation.current;
    return () => { active.ticket++; active.controller?.abort(); };
  }, []);

  async function choose(file?: File) {
    const ticket = ++operation.current.ticket;
    operation.current.controller?.abort();
    setReading(false); setLoadingFile(false); setImage(null); setRows([]); setTranscription(null); setError(""); setConsent(false); setFilename("");
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Choose a PNG, JPEG, or WebP screenshot."); return;
    }
    if (!file.size || file.size > MAX_SCREENSHOT_BYTES) {
      setError("Choose a screenshot smaller than 8 MB."); return;
    }
    setLoadingFile(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(Error("This image could not be opened. Choose it again."));
        reader.readAsDataURL(file);
      });
      if (ticket !== operation.current.ticket) return;
      setImage({ mimeType: file.type as ScreenshotImage["mimeType"], data: dataUrl.split(",")[1] });
      setFilename(file.name);
    } catch (cause) {
      if (ticket === operation.current.ticket) setError(cause instanceof Error ? cause.message : "Could not open this image.");
    } finally {
      if (ticket === operation.current.ticket) setLoadingFile(false);
    }
  }
  async function readScreenshot() {
    if (!image || !consent || !configured || reading) return;
    const ticket = ++operation.current.ticket;
    const controller = new AbortController();
    operation.current.controller = controller;
    setReading(true); setError("");
    try {
      const response = await fetch("/api/transcribe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, consent, config }), signal: controller.signal,
      });
      const result = resultSchema.parse(await readApiResponse(response));
      if (ticket !== operation.current.ticket) return;
      setTranscription(result.transcription);
      setRows(result.transcription.messages.map((message) => ({
        id: crypto.randomUUID(), text: message.text,
        speaker: message.side === "unknown" ? "unknown" : message.side === mySide.toLowerCase() ? "you" : "her",
        date: "", included: true,
      })));
    } catch (cause) {
      if (ticket === operation.current.ticket && !controller.signal.aborted)
        setError(cause instanceof z.ZodError ? "The screenshot could not be read reliably. Try a clearer crop." : cause instanceof Error ? cause.message : "Could not read the screenshot. Try again.");
    } finally {
      if (ticket === operation.current.ticket) setReading(false);
    }
  }
  function change(id: string, patch: Partial<ImportMessage>) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  }
  async function save() {
    if (saving) return;
    setError("");
    try {
      const prepared = prepareScreenshotMessages(rows, profile.messages);
      if (!prepared.messages.length) { setError("These messages are already in this conversation. Nothing new to add."); return; }
      setSaving(true);
      if (!await onSave(rows)) setError("The import has not finished saving. Your text is still here. Close this dialog to use the workspace’s retry or export controls.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add the messages.");
    } finally { setSaving(false); }
  }
  return <Modal title="Import a conversation screenshot" description={`Add messages to ${profile.name} after checking the text and speakers.`} onClose={() => { if (!saving) onClose(); }}>
    <div className="screenshot-import">
      {!configured && <div className="notice"><div><p>Connect an image-capable AI model in Settings first.</p><button className="text-link" onClick={onSettings}>Open AI settings</button></div></div>}
      <label className="field screenshot-file">
        <span>Conversation screenshot</span>
        <input type="file" accept="image/png,image/jpeg,image/webp" disabled={saving || reading || !configured} onChange={(event) => { void choose(event.target.files?.[0]); }} />
      </label>
      <p className="form-note">PNG, JPEG, or WebP, up to 8 MB. Crop to one conversation and keep the text readable.</p>
      {loadingFile && <p role="status">Opening screenshot…</p>}
      {image && <figure className="screenshot-preview">
        {/* A session-only data URL; routing it through image optimization would expose private input. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:${image.mimeType};base64,${image.data}`} alt="Selected conversation screenshot" onError={() => { setImage(null); setError("This image could not be displayed. Choose a valid screenshot."); }} />
        <figcaption>{filename}</figcaption>
      </figure>}
      {image && !transcription && <>
        <fieldset disabled={reading} className="screenshot-controls">
          <Pick label="My messages are on the" value={mySide} options={["Right", "Left"]} onChange={setMySide} />
          <label className="screenshot-check"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>Send this screenshot to {provider} to read the messages. API usage may cost money.</span></label>
        </fieldset>
        <p className="form-note">Only this image is sent for transcription. The app saves the text you confirm, not the image. Your provider’s data policies still apply.</p>
        <button className="button primary" disabled={!consent || !configured || reading} onClick={readScreenshot}>{reading ? "Reading screenshot…" : "Read screenshot"}</button>
        {reading && <p className="form-note" role="status">Reading the visible message bubbles. Nothing has been added to history.</p>}
      </>}
      {transcription && <>
        <div role="status" className="screenshot-result"><h3>{rows.length ? `Check ${rows.length} extracted ${rows.length === 1 ? "message" : "messages"}` : "No readable messages found"}</h3><p>Correct the text and speakers. Deselect anything you don’t want to import. Dates stay unknown unless you add one.</p></div>
        {transcription.warnings.length > 0 && <ul className="screenshot-warnings">{transcription.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
        {!!rows.length && <button className="text-link" disabled={saving} onClick={() => setRows((current) => current.map((row) => ({ ...row, speaker: row.speaker === "you" ? "her" : row.speaker === "her" ? "you" : "unknown" })))}>Swap all speakers</button>}
        <fieldset disabled={saving} className="screenshot-controls screenshot-rows">
          {rows.map((row, index) => <section key={row.id} className="screenshot-row">
            <label className="screenshot-check"><input type="checkbox" checked={row.included} onChange={(event) => change(row.id, { included: event.target.checked })} /><span>Include message {index + 1}</span></label>
            <label className="field"><span>Message {index + 1} speaker</span><select value={row.speaker} onChange={(event) => change(row.id, { speaker: event.target.value as ImportMessage["speaker"] })}><option value="unknown">Choose speaker</option><option value="you">You</option><option value="her">{profile.name}</option></select></label>
            <Field label={`Message ${index + 1} text`} multiline value={row.text} onChange={(text) => change(row.id, { text })} />
            {transcription.messages[index]?.timestamp && <p className="form-note">Visible timestamp: {transcription.messages[index].timestamp}</p>}
            <Field label={`Message ${index + 1} date (optional)`} type="datetime-local" value={row.date} onChange={(date) => change(row.id, { date })} />
          </section>)}
        </fieldset>
        {!!rows.length && <p className="form-note">Matching messages already in history are skipped. Imported messages are marked “Screenshot”.</p>}
      </>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="dialog-actions">
        <button className="button secondary" disabled={saving} onClick={onClose}>Cancel</button>
        {!!rows.length && <button className="button primary" disabled={saving || !rows.some((row) => row.included)} onClick={save}>{saving ? "Adding messages…" : "Add selected messages"}</button>}
      </div>
    </div>
  </Modal>;
}
