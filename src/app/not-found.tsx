import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-sm font-semibold text-indigo-600">404</p>
      <h1 className="mt-2 text-3xl font-bold">Page not found</h1>
      <p className="mt-2 text-slate-600">We couldn&apos;t find what you were looking for.</p>
      <Link href="/" className="btn btn-primary mt-6">
        Back to services
      </Link>
    </div>
  );
}
