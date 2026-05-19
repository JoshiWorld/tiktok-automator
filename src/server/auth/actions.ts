"use server";

import { signIn, signOut } from "@/server/auth";

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/dashboard" });
}

export async function signOutUser() {
  await signOut({ redirectTo: "/" });
}
