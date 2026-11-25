import { Suspense } from "react";
import LoginForm from "./login-form";

export default function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <div className="mx-auto max-w-sm px-4 py-20">
      <h1 className="text-2xl font-bold">Admin sign in</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">Manage appointments, services and opening hours.</p>
      <Suspense>
        <NotAdminNotice searchParams={searchParams} />
      </Suspense>
      <LoginForm />
    </div>
  );
}

async function NotAdminNotice({ searchParams }: Pick<PageProps<"/admin/login">, "searchParams">) {
  const { error } = await searchParams;
  if (error !== "not-admin") return null;
  return (
    <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
      Your account doesn&apos;t have admin access.
    </p>
  );
}
