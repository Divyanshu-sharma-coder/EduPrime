"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function EmergencyShortcut() {
  const router = useRouter();

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (!event.ctrlKey || !event.shiftKey || !event.altKey) return;
      if (event.key.toLowerCase() === "l") {
        event.preventDefault();
        router.push("/developer?emergency=lock");
      }
      if (event.key.toLowerCase() === "u") {
        event.preventDefault();
        router.push("/developer?emergency=unlock");
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [router]);

  return null;
}
