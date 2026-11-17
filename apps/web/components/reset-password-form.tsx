"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm({ token, linkError }: { token: string | null; linkError: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  if (!token || linkError) {
    return (
      <div className="donate-panel" style={{ maxWidth: 420 }}>
        <p>This reset link is invalid or has expired. Reset links work once and expire after one hour.</p>
        <p>
          <Link href="/forgot-password">Request a new reset link</Link>
        </p>
      </div>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmation) {
      setStatus("error");
      setErrorMessage("The two passwords do not match.");
      return;
    }
    setStatus("submitting");
    setErrorMessage("");
    const { error } = await authClient.resetPassword({ newPassword: password, token: token ?? "" });
    if (error) {
      setStatus("error");
      setErrorMessage(error.message ?? "We could not reset your password. Request a new link and try again.");
      return;
    }
    router.push("/sign-in?reset=1");
  }

  return (
    <form className="donate-panel" onSubmit={onSubmit} style={{ maxWidth: 420 }}>
      <label htmlFor="new-password">New password</label>
      <input id="new-password" type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} />
      <label htmlFor="confirm-password">Confirm new password</label>
      <input id="confirm-password" type="password" required minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
      <button className="button" type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Please wait…" : "Set new password"}
      </button>
      {status === "error" && <p className="muted">{errorMessage}</p>}
    </form>
  );
}
