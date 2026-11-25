import { Suspense } from "react";
import { requireAdmin } from "@/lib/data";
import { signOut } from "../actions";
import AdminNav from "./admin-nav";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <AdminNav />
        <form action={signOut} className="flex items-center gap-3 text-sm text-slate-500">
          <Suspense>
            <AdminEmail />
          </Suspense>
          <button type="submit" className="btn btn-secondary">
            Sign out
          </button>
        </form>
      </div>
      <Suspense fallback={<div className="card h-96 animate-pulse" />}>
        <AdminGate>{children}</AdminGate>
      </Suspense>
    </div>
  );
}

/** Checks admin access at request time before rendering the page. */
async function AdminGate({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return children;
}

async function AdminEmail() {
  const { email } = await requireAdmin();
  return <span className="hidden sm:inline">{email}</span>;
}
