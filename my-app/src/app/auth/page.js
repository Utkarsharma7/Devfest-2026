"use client";
import { NoiseBackground } from "@/components/ui/noise-background";
import SignupFormDemo from "@/components/signup-form-demo";

export default function SignUpPage() {
  return (
    <div className="min-h-screen w-full bg-neutral-950 flex items-center justify-center p-4">
      <NoiseBackground className="p-8">
        <SignupFormDemo />
      </NoiseBackground>
    </div>
  );
}
