"use client";

import { useEffect, useState } from "react";
import { LoginForm } from "../components/login-form";
import { Vault } from "../components/vault";
import { Providers } from "./providers";
import { useAuthStore } from "../store/auth";

function Gate() {
  const token = useAuthStore((s) => s.token);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return token ? <Vault /> : <LoginForm />;
}

export default function Home() {
  return (
    <Providers>
      <Gate />
    </Providers>
  );
}
