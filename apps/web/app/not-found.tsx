import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <p className="kicker">404</p>
      <h1>This page is not available.</h1>
      <p className="lede">The fundraiser or page you were looking for may have moved, ended, or never existed.</p>
      <Link className="button" href="/">Return home</Link>
    </main>
  );
}
