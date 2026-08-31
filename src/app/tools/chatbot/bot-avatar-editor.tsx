"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  AVATAR_DEFAULT_SIZE,
  AVATAR_FREQUENCY_OPTIONS,
  AVATAR_MAX_SIZE,
  AVATAR_MIN_SIZE,
  MAX_GIF_BYTES,
  MAX_IMAGE_BYTES,
  MAX_MULTI_AVATARS,
  MIN_MULTI_AVATARS,
  emptyAvatar,
  emptyAvatarConfig,
  type AvatarKind,
  type BotAvatar,
  type BotAvatarConfig,
} from "@/lib/chatbot-bot-avatars";

// Shown below the "Add another query" section of the chatbot builder (both
// the create-bot form and the edit/settings form). Free-trial accounts can
// set one image avatar; the "Multiple avatar" toggle and the "GIF Avatar"
// option stay visible for everyone (so free users know they exist), but
// picking them just shows an upgrade notice instead of unlocking until the
// account is paid — same pattern as CustomQueryEditor's "Add another query".
export default function BotAvatarEditor({
  config,
  onChange,
  isPaid,
  botName,
}: {
  config: BotAvatarConfig;
  onChange: (next: BotAvatarConfig) => void;
  isPaid: boolean;
  botName?: string;
}) {
  const [showModeUpgradeNotice, setShowModeUpgradeNotice] = useState(false);
  const displayName = botName?.trim() || "Your bot";

  function handleModeClick(mode: "single" | "multiple") {
    if (mode === "multiple" && !isPaid) {
      setShowModeUpgradeNotice(true);
      return;
    }
    setShowModeUpgradeNotice(false);
    if (mode === config.mode) return;

    if (mode === "single") {
      onChange({ ...config, mode, avatars: config.avatars.slice(0, 1) });
    } else {
      // Seed with two empty slots — multi-avatar needs at least
      // MIN_MULTI_AVATARS before it's usable in the widget.
      const seeded = config.avatars.slice(0, MAX_MULTI_AVATARS);
      while (seeded.length < MIN_MULTI_AVATARS) seeded.push(emptyAvatar());
      onChange({ ...config, mode, avatars: seeded });
    }
  }

  return (
    <div>
      <label className="text-xs font-semibold text-slate">Add Bot Avatar</label>
      <p className="mt-1 text-xs text-slate">
        Give your bot a face in the chat widget. Choose one avatar, or (on a
        paid plan) a set of avatars that rotate automatically.
      </p>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => handleModeClick("single")}
          className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
            config.mode === "single"
              ? "border-ink bg-ink text-white"
              : "border-line text-ink hover:bg-canvas"
          }`}
        >
          Single avatar
        </button>
        <button
          type="button"
          onClick={() => handleModeClick("multiple")}
          className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
            config.mode === "multiple"
              ? "border-ink bg-ink text-white"
              : "border-line text-ink hover:bg-canvas"
          }`}
        >
          Multiple avatar
        </button>
      </div>

      {showModeUpgradeNotice && (
        <p className="mt-2 rounded-lg bg-brand-bg px-3 py-2 text-xs leading-relaxed text-slate">
          You must become a paid user to use multiple avatars.{" "}
          <Link href="/pricing" className="font-semibold text-brand hover:underline">
            See the pricing →
          </Link>
        </p>
      )}

      <div className="mt-4">
        {config.mode === "single" ? (
          <SingleAvatarSection
            avatar={config.avatars[0] ?? null}
            isPaid={isPaid}
            displayName={displayName}
            onChange={(avatar) => onChange({ ...config, avatars: avatar ? [avatar] : [] })}
          />
        ) : (
          <MultiAvatarSection
            config={config}
            displayName={displayName}
            onChange={onChange}
          />
        )}
      </div>
    </div>
  );
}

function SingleAvatarSection({
  avatar,
  isPaid,
  displayName,
  onChange,
}: {
  avatar: BotAvatar | null;
  isPaid: boolean;
  displayName: string;
  onChange: (avatar: BotAvatar | null) => void;
}) {
  const selectedKind: AvatarKind = avatar?.kind ?? "image";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <AvatarKindCard
          title="Image Avatar"
          kind="image"
          locked={false}
          active={selectedKind === "image" && !!avatar?.url}
          avatar={selectedKind === "image" ? avatar : null}
          onChange={(next) => onChange(next)}
        />
        <AvatarKindCard
          title="GIF Avatar"
          kind="gif"
          locked={!isPaid}
          active={selectedKind === "gif" && !!avatar?.url}
          avatar={selectedKind === "gif" ? avatar : null}
          onChange={(next) => onChange(next)}
        />
      </div>

      {avatar?.url && (
        <SizePicker
          size={avatar.size}
          onChange={(size) => onChange({ ...avatar, size })}
          previewUrl={avatar.url}
          caption={`This is how big the avatar appears in the widget header. When a visitor clicks it, it minimizes into a small circle pinned above the message box, labeled "${displayName} · Assistant".`}
        />
      )}
    </div>
  );
}

function MultiAvatarSection({
  config,
  displayName,
  onChange,
}: {
  config: BotAvatarConfig;
  displayName: string;
  onChange: (next: BotAvatarConfig) => void;
}) {
  const avatars = config.avatars;

  function updateSlot(index: number, next: BotAvatar | null) {
    const nextAvatars = avatars.map((a, i) =>
      i === index ? next ?? emptyAvatar(a.kind) : a
    );
    onChange({ ...config, avatars: nextAvatars });
  }

  function addSlot() {
    if (avatars.length >= MAX_MULTI_AVATARS) return;
    onChange({ ...config, avatars: [...avatars, emptyAvatar()] });
  }

  function removeSlot(index: number) {
    if (avatars.length <= MIN_MULTI_AVATARS) return;
    onChange({ ...config, avatars: avatars.filter((_, i) => i !== index) });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-slate">
        Upload {MIN_MULTI_AVATARS} to {MAX_MULTI_AVATARS} avatars. They rotate
        in order — each one minimizes into the small circle above the chat
        bar as the next one appears, on the timer below.
      </p>

      <div className="flex flex-col gap-3">
        {avatars.map((avatar, index) => (
          <div key={index} className="rounded-lg border border-line p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate">Avatar {index + 1}</p>
              {avatars.length > MIN_MULTI_AVATARS && (
                <button
                  type="button"
                  onClick={() => removeSlot(index)}
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="mt-2 flex gap-2">
              {(["image", "gif"] as AvatarKind[]).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() =>
                    updateSlot(index, { kind, url: "", size: avatar.size || AVATAR_DEFAULT_SIZE })
                  }
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    avatar.kind === kind
                      ? "border-ink bg-ink text-white"
                      : "border-line text-ink hover:bg-canvas"
                  }`}
                >
                  {kind === "image" ? "Image" : "GIF"}
                </button>
              ))}
            </div>

            <div className="mt-3">
              <AvatarUploadControl
                kind={avatar.kind}
                url={avatar.url}
                onUrlChange={(url) => updateSlot(index, { ...avatar, url })}
              />
            </div>

            {avatar.url && (
              <div className="mt-3">
                <SizePicker
                  size={avatar.size}
                  onChange={(size) => updateSlot(index, { ...avatar, size })}
                  previewUrl={avatar.url}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {avatars.length < MAX_MULTI_AVATARS && (
        <button
          type="button"
          onClick={addSlot}
          className="self-start rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:bg-canvas"
        >
          + Add avatar
        </button>
      )}

      <div>
        <label className="text-xs font-semibold text-slate">Time between avatars</label>
        <select
          value={config.frequencySeconds}
          onChange={(e) =>
            onChange({ ...config, frequencySeconds: Number(e.target.value) })
          }
          className="mt-1 w-full max-w-[220px] rounded-lg border border-line px-3 py-2 text-sm sm:w-auto"
        >
          {AVATAR_FREQUENCY_OPTIONS.map((seconds) => (
            <option key={seconds} value={seconds}>
              Every {seconds < 60 ? `${seconds}s` : `${seconds / 60}m`}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate">
          How often the widget switches to the next avatar, in order,
          repeating from Avatar 1 · Assistant onward for {displayName}.
        </p>
      </div>
    </div>
  );
}

function AvatarKindCard({
  title,
  kind,
  locked,
  active,
  avatar,
  onChange,
}: {
  title: string;
  kind: AvatarKind;
  locked: boolean;
  active: boolean;
  avatar: BotAvatar | null;
  onChange: (next: BotAvatar | null) => void;
}) {
  const [showUpgradeNotice, setShowUpgradeNotice] = useState(false);

  function guardedOnUrlChange(url: string) {
    if (locked) {
      setShowUpgradeNotice(true);
      return;
    }
    onChange({ kind, url, size: avatar?.size ?? AVATAR_DEFAULT_SIZE });
  }

  return (
    <div
      className={`rounded-lg border p-3 ${
        active ? "border-ink" : "border-line"
      } ${locked ? "relative" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate">{title}</p>
        {locked && (
          <span className="rounded-full bg-brand-bg px-2 py-0.5 text-[10px] font-semibold text-brand">
            Paid
          </span>
        )}
      </div>

      <div
        className={locked ? "pointer-events-none opacity-50" : ""}
        onClickCapture={(e) => {
          if (locked) {
            e.preventDefault();
            e.stopPropagation();
            setShowUpgradeNotice(true);
          }
        }}
      >
        <div className="mt-2">
          <AvatarUploadControl kind={kind} url={avatar?.url ?? ""} onUrlChange={guardedOnUrlChange} />
        </div>
      </div>

      {locked && showUpgradeNotice && (
        <p className="mt-2 rounded-lg bg-brand-bg px-3 py-2 text-xs leading-relaxed text-slate">
          You must become a paid user to use a GIF avatar.{" "}
          <Link href="/pricing" className="font-semibold text-brand hover:underline">
            See the pricing →
          </Link>
        </p>
      )}
    </div>
  );
}

function AvatarUploadControl({
  kind,
  url,
  onUrlChange,
}: {
  kind: AvatarKind;
  url: string;
  onUrlChange: (url: string) => void;
}) {
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const accept = kind === "gif" ? ".gif" : ".jpg,.jpeg,.png";
  const maxBytes = kind === "gif" ? MAX_GIF_BYTES : MAX_IMAGE_BYTES;
  const maxLabel = kind === "gif" ? "2MB" : "500KB";

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    if (file.size > maxBytes) {
      setError(`That file is too big. Max size is ${maxLabel}.`);
      return;
    }

    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", kind);
      const res = await fetch("/api/bots/avatar-upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed. Try again.");
      } else {
        onUrlChange(data.url);
      }
    } catch {
      setError("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className="h-10 w-10 shrink-0 rounded-full border border-line object-cover"
          />
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-canvas disabled:opacity-50"
          >
            {uploading ? "Uploading…" : url ? "Replace file" : "Upload file"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelected}
            className="hidden"
          />
          <span className="text-xs text-slate">or</span>
          <button
            type="button"
            onClick={() => setShowUrlInput((v) => !v)}
            className="text-xs font-semibold text-brand hover:underline"
          >
            Use URL of your {kind === "gif" ? "GIF" : "image"}
          </button>
        </div>
      </div>

      {showUrlInput && (
        <input
          type="text"
          value={url && !url.startsWith("blob:") ? url : ""}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://... (from the web or a shared Google Drive link)"
          className="mt-2 w-full rounded-lg border border-line px-3 py-2 text-sm"
        />
      )}

      <p className="mt-1 text-xs text-slate">
        (in this option only {kind === "gif" ? "GIF" : "image"} files can be
        uploaded — max {maxLabel})
      </p>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function SizePicker({
  size,
  onChange,
  previewUrl,
  caption,
}: {
  size: number;
  onChange: (size: number) => void;
  previewUrl: string;
  caption?: string;
}) {
  return (
    <div className="rounded-lg border border-line p-3">
      <div className="flex items-center gap-4">
        <div
          className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-canvas"
          style={{ width: AVATAR_MAX_SIZE, height: AVATAR_MAX_SIZE }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Avatar preview"
            style={{ width: size, height: size }}
            className="rounded-full object-cover transition-all"
          />
        </div>

        <div className="flex-1">
          <label className="text-xs font-semibold text-slate">
            Avatar size — {size}px
          </label>
          <input
            type="range"
            min={AVATAR_MIN_SIZE}
            max={AVATAR_MAX_SIZE}
            step={8}
            value={size}
            onChange={(e) => onChange(Number(e.target.value))}
            className="mt-2 w-full"
          />
          <div className="flex justify-between text-[10px] text-slate">
            <span>Smallest ({AVATAR_MIN_SIZE}px)</span>
            <span>Max ({AVATAR_MAX_SIZE}px)</span>
          </div>
        </div>
      </div>
      {caption && <p className="mt-2 text-xs text-slate">{caption}</p>}
    </div>
  );
}

export { emptyAvatarConfig };
