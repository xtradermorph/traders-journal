"use client"

import { ClientOnly } from "../components/ClientOnly";
import { Login } from "../components/auth";

export default function LoginPage() {
  return (
    <ClientOnly>
      <Login />
    </ClientOnly>
  );
}