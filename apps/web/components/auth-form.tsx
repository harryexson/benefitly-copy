"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");
    const { error } =
      mode === "sign-up" ? await authClient.signUp.email({ name, email, password }) : await authClient.signIn.email({ email, password });
    if (error) {
      setStatus("error");
      setErrorMessage(error.message ?? "Something went wrong. Please try again.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className="donate-panel" onSubmit={onSubmit} style={{ maxWidth: 420 }}>
      {mode === "sign-up" && (
        <>
          <label htmlFor="name">Full name</label>
          <input id="name" required value={name} onChange={(event) => setName(event.target.value)} />
        </>
      )}
      <label htmlFor="email">Email</label>
      <input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      <label htmlFor="password">Password</label>
      <input id="password" type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} />
      <button className="button" type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Please wait…" : mode === "sign-up" ? "Create account" : "Sign in"}
      </button>
      {status === "error" && <p className="muted">{errorMessage}</p>}
    </form>
  );
}
