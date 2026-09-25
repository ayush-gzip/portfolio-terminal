import Link from "next/link";

export default function NotFound() {
  return (
    <div className="terminal crt min-h-dvh p-5" data-theme="green">
      <div className="mx-auto max-w-2xl">
        <div className="tx-err">bash: cd: no such file or directory (404)</div>
        <div className="mt-2 tx-dim">The path you followed does not exist on this machine.</div>
        <div className="mt-4">
          <Link href="/" className="tx-link">cd ~ (back to terminal)</Link>
        </div>
      </div>
    </div>
  );
}
