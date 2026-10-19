"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD_LENGTH = 8;

export default function SettingsForm({ currentEmail }: { currentEmail: string }) {
  const supabase = createClient();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState(currentEmail);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    const trimmedEmail = newEmail.trim();
    const emailChanged = trimmedEmail !== currentEmail;
    const passwordChanged = newPassword.length > 0 || confirmNewPassword.length > 0;

    if (!emailChanged && !passwordChanged) {
      setError("No changes to save.");
      return;
    }

    if (!currentPassword) {
      setError("Enter your current password to save changes.");
      return;
    }

    if (emailChanged) {
      if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        setError("Enter a valid email address.");
        return;
      }
    }

    if (passwordChanged) {
      if (newPassword.length < MIN_PASSWORD_LENGTH) {
        setError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setError("New passwords don't match.");
        return;
      }
    }

    setSaving(true);

    // Re-authenticate with the current password before applying either
    // change. This protects against someone using an already-open,
    // unattended session to take over the account by changing the login
    // email or password.
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: currentEmail,
      password: currentPassword,
    });

    if (reauthError) {
      setError("Current password is incorrect.");
      setSaving(false);
      return;
    }

    const messages: string[] = [];

    if (emailChanged) {
      const { error: emailError } = await supabase.auth.updateUser({ email: trimmedEmail });
      if (emailError) {
        setError(emailError.message);
        setSaving(false);
        return;
      }
      messages.push("Confirmation link sent to your new email — click it to finish the change.");
    }

    if (passwordChanged) {
      const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
      if (passwordError) {
        setError(passwordError.message);
        setSaving(false);
        return;
      }
      messages.push("Password updated.");
    }

    // Never leave password values sitting in memory longer than necessary.
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setSuccessMessage(messages.join(" "));
    setSaving(false);
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4 rounded-xl border border-line bg-white p-5">
      <div>
        <label className="text-xs font-semibold text-slate">Email address</label>
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
        />
      </div>

      <div className="border-t border-line pt-4">
        <label className="text-xs font-semibold text-slate">New password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Leave blank to keep your current password"
          className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-slate">Confirm new password</label>
        <input
          type="password"
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
        />
      </div>

      <div className="border-t border-line pt-4">
        <label className="text-xs font-semibold text-slate">Current password</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Required to save any change above"
          className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {successMessage && <p className="text-sm text-flow">{successMessage}</p>}

      <button
        type="submit"
        disabled={saving}
        className="mt-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
