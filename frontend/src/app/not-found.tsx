import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center text-white">
      <Image
        src="/logo.png"
        alt=""
        width={203}
        height={110}
        className="mb-2 h-14 w-auto rounded-2xl bg-white p-3"
      />
      <p className="text-6xl font-semibold tracking-tight text-indigo-400">404</p>
      <div>
        <h1 className="text-lg font-semibold">This pass route does not exist</h1>
        <p className="mt-1 text-sm text-slate-400">
          The link may have expired or the pass was deleted.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex h-10 items-center rounded-lg bg-indigo-600 px-5 text-sm font-medium text-white transition hover:bg-indigo-500"
      >
        Back to GatePass
      </Link>
    </div>
  );
}
