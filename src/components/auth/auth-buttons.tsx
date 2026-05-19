import { signInWithGoogle, signOutUser } from "@/server/auth/actions";
import { cn } from "@/lib/utils";

const buttonClass =
  "rounded-full bg-white/10 px-10 py-3 font-semibold transition hover:bg-white/20";

export function GoogleSignInButton({ className }: { className?: string }) {
  return (
    <form action={signInWithGoogle}>
      <button type="submit" className={cn(buttonClass, className)}>
        Mit Google anmelden
      </button>
    </form>
  );
}

export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOutUser}>
      <button type="submit" className={cn(buttonClass, className)}>
        Abmelden
      </button>
    </form>
  );
}
