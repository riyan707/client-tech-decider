// app/(auth)/login/page.tsx
import { Suspense } from "react";
import LoginClient from "./login-client";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center">Loading…</div>}>
      <LoginClient/>
    </Suspense>
  );
}
