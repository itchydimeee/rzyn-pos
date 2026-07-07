"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SessionGuard({ expectedRole }: { expectedRole: string }) {
  const router = useRouter();

  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        fetch("/api/auth/me").then((res) => {
          if (!res.ok) {
            router.replace("/");
          } else {
            res.json().then((user) => {
              if (user.role !== expectedRole) {
                router.replace("/");
              }
            });
          }
        }).catch(() => {
          router.replace("/");
        });
      }
    }

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [router, expectedRole]);

  return null;
}
