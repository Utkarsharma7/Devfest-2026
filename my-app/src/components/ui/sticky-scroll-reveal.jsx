"use client";
import React, { useRef } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { motion } from "motion/react";
import { TypewriterEffect } from "./typewriter-effect";

export const StickyScroll = ({
  content,
  contentClassName
}) => {
  const [activeCard, setActiveCard] = React.useState(0);
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    // uncomment line 22 and comment line 23 if you DONT want the overflow container and want to have it change on the entire page scroll
    // target: ref
    container: ref,
    offset: ["start start", "end start"],
  });
  const cardLength = content.length;

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const cardsBreakpoints = content.map((_, index) => index / cardLength);
    const closestBreakpointIndex = cardsBreakpoints.reduce((acc, breakpoint, index) => {
      const distance = Math.abs(latest - breakpoint);
      if (distance < Math.abs(latest - cardsBreakpoints[acc])) {
        return index;
      }
      return acc;
    }, 0);
    // Ensure the last card activates when scrolled near the bottom
    if (latest >= 0.85 && closestBreakpointIndex === cardLength - 2) {
      setActiveCard(cardLength - 1);
    } else {
      setActiveCard(closestBreakpointIndex);
    }
  });

  return (
    <motion.div
      className="relative flex h-[30rem] justify-center gap-10 overflow-y-auto rounded-md p-10 bg-neutral-950"
      ref={ref}>
      <div className="div relative flex items-start px-4 flex-shrink-0" style={{ minWidth: '500px', maxWidth: '500px' }}>
        <div className="w-full">
          {content.map((item, index) => (
            <div key={item.title + index} className="my-12">
              <motion.h2
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: activeCard === index ? 1 : 0.3,
                }}
                className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-100">
                {item.title}
              </motion.h2>
              <motion.p
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: activeCard === index ? 1 : 0.3,
                }}
                className="text-lg md:text-xl lg:text-2xl mt-10 max-w-md text-slate-300">
                {item.description}
              </motion.p>
            </div>
          ))}
          <div className="h-40" />
        </div>
      </div>
      <div className="sticky top-10 hidden lg:flex items-center justify-center flex-shrink-0" style={{ minWidth: '600px', maxWidth: '600px' }}>
        <TypewriterEffect
          className="text-5xl lg:text-6xl xl:text-7xl font-bold w-full"
        />
      </div>
    </motion.div>
  );
};
