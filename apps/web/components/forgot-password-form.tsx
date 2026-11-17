"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

// The same confirmation is shown whether or not an account exists for the address, so the form
// cannot be used to discover which emails have Benefitly accounts.
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setStatus("error");
      setErrorMessage(error.message ?? "We could not send the reset email. Please try again.");
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="donate-panel" style={{ maxWidth: 420 }}>
        <p>If an account exists for <strong>{email}</strong>, we have sent a link to reset its password. The link expires in one hour.</p>
        <p className="muted">Check your spam folder if it does not arrive within a few minutes.</p>
      </div>
    );
  }

  return (
    <form className="donate-panel" onSubmit={onSubmit} style={{ maxWidth: 420 }}>
      <label htmlFor="reset-email">Email</label>
      <input id="reset-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      <button className="button" type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Please wait…" : "Send reset link"}
      </button>
      {status === "error" && <p className="muted">{errorMessage}</p>}
    </form>
  );
}
