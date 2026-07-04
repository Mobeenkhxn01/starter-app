"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export default function SignOut() {
  const router = useRouter();

  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={() =>
        authClient.signOut({
          fetchOptions: { onSuccess: () => router.push("/login") },
        })
      }
    >
      Sign Out
    </Button>
  );
}