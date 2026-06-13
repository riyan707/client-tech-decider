"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSignIn() {
    const e = email.trim().toLowerCase();

    if (!e || !password) {
      setErrorMsg("Please enter your email and password.");
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    const res = await signIn("credentials", {
      email: e,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.ok) {
      router.push(next);
      router.refresh();
    } else {
      setErrorMsg("Invalid email or password");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6 py-10">
        <Card className="w-full rounded-2xl">
          <CardHeader className="space-y-2">
            <div className="text-xs text-muted-foreground">Tech Decider</div>
            <CardTitle className="text-2xl">Admin login</CardTitle>
            <p className="text-sm text-muted-foreground">
              Sign in to manage the catalogue and recommendations.
            </p>
          </CardHeader>

          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleSignIn();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@yourdomain.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>

                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                    disabled={loading}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              {errorMsg && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {errorMsg}
                </div>
              )}

              <Button type="submit" className="w-full rounded-xl" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>

              <p className="text-xs text-muted-foreground">
                Tip: If you were redirected here, you&apos;ll be sent back after login.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
