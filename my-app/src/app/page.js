"use client";
import { BackgroundBeamsWithCollision } from "@/components/ui/background-beams-with-collision";
import { NoiseBackground } from "@/components/ui/noise-background";
import { StickyScroll } from "@/components/ui/sticky-scroll-reveal";
import { TypewriterEffect } from "@/components/ui/typewriter-effect";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  
  const content = [
    {
      title: "Smart Connections",
      description: "Connect with the right people at the right time. Our platform uses intelligent matching to help you build meaningful connections when they matter most.",
    },
    {
      title: "Timing Matters",
      description: "We understand that great connections happen at the perfect moment. Our system ensures you're connected when it's most relevant and beneficial for everyone involved.",
    },
    {
      title: "Purpose-Driven",
      description: "Every connection has a reason. Whether it's networking, collaboration, or building relationships, we help you connect with purpose and intention.",
    },
    {
      title: "Seamless Experience",
      description: "Experience a smooth, intuitive platform designed to make connecting effortless. Focus on what matters - building relationships and achieving your goals.",
    },
  ];

  return (
    <div className="w-full">
      <div className="min-h-screen w-full">
        <BackgroundBeamsWithCollision className="h-screen min-h-screen w-full bg-neutral-950">
          <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 h-full">
            <div className="text-white font-sans">
              <h1 className="text-5xl md:text-7xl font-bold mb-2 leading-tight">
                What's cooler than
                <br />
                Beams?
              </h1>
              <h2 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 bg-clip-text text-transparent mb-8">
                Exploding beams.
              </h2>
              <p className="text-2xl md:text-3xl font-semibold text-neutral-300 mt-8 mb-8">
                Connect smarter. Right time. Right reason.
              </p>
              <NoiseBackground className="px-6 py-3">
                <button 
                  onClick={() => router.push('/auth')}
                  className="text-base font-semibold text-white cursor-pointer"
                >
                  Sign In
                </button>
              </NoiseBackground>
            </div>
          </div>
        </BackgroundBeamsWithCollision>
      </div>
      
      <div className="w-full bg-neutral-950 pt-20 pb-20">
        <div className="container mx-auto px-4">
          <StickyScroll content={content} />
        </div>
      </div>
    </div>
  );
}
