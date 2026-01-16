"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/config";
import { onAuthStateChanged } from "firebase/auth";

export default function Dashboard() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/auth");
      }
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen w-full bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="bg-neutral-800 rounded-2xl p-8 shadow-lg shadow-black/50">
          <h1 className="text-3xl font-bold text-white text-center mb-8">
            Dashboard
          </h1>
          <p className="text-neutral-300 text-center">
            Welcome to your dashboard! You have successfully signed in with Google.
          </p>
        </div>
      </div>
    </div>
  );
}
