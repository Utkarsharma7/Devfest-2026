"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { NoiseBackground } from "@/components/ui/noise-background";
import SignupFormDemo from "@/components/signup-form-demo";

export default function SignUpPage() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // If user is already authenticated, redirect to home
      if (user) {
        router.replace("/home");
      }
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen w-full bg-neutral-950 flex items-center justify-center p-4">
      <NoiseBackground className="p-8">
        <SignupFormDemo />
      </NoiseBackground>
    </div>
  );
}
