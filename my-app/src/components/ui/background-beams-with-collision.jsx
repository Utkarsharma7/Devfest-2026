"use client";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import React, { useRef, useState, useEffect } from "react";

export const BackgroundBeamsWithCollision = ({
  children,
  className
}) => {
  const containerRef = useRef(null);
  const parentRef = useRef(null);

  const beams = [
    // Evenly distributed across entire screen width (0-1920px)
    { initialX: 50, translateX: 50, duration: 4.8, delay: 0 },
    { initialX: 150, translateX: 150, duration: 5.3, delay: 0.1, className: "h-6" },
    { initialX: 250, translateX: 250, duration: 4.5, delay: 0.2, className: "h-8" },
    { initialX: 350, translateX: 350, duration: 5.1, delay: 0.3 },
    { initialX: 450, translateX: 450, duration: 5.5, delay: 0.4, className: "h-10" },
    { initialX: 550, translateX: 550, duration: 4.8, delay: 0.05, className: "h-6" },
    { initialX: 650, translateX: 650, duration: 5.3, delay: 0.15, className: "h-12" },
    { initialX: 750, translateX: 750, duration: 4.9, delay: 0.25, className: "h-8" },
    { initialX: 850, translateX: 850, duration: 5.1, delay: 0.35 },
    { initialX: 950, translateX: 950, duration: 5.5, delay: 0.45, className: "h-14" },
    { initialX: 1050, translateX: 1050, duration: 4.7, delay: 0.1, className: "h-6" },
    { initialX: 1150, translateX: 1150, duration: 5.3, delay: 0.2 },
    { initialX: 1250, translateX: 1250, duration: 5.0, delay: 0.3, className: "h-10" },
    { initialX: 1350, translateX: 1350, duration: 5.2, delay: 0.4, className: "h-8" },
    { initialX: 1450, translateX: 1450, duration: 5.4, delay: 0.05, className: "h-12" },
    { initialX: 1550, translateX: 1550, duration: 4.6, delay: 0.15, className: "h-6" },
    { initialX: 1650, translateX: 1650, duration: 5.1, delay: 0.25, className: "h-16" },
    { initialX: 1750, translateX: 1750, duration: 5.6, delay: 0.35, className: "h-8" },
    { initialX: 100, translateX: 100, duration: 4.9, delay: 0.45 },
    { initialX: 200, translateX: 200, duration: 5.3, delay: 0.1, className: "h-10" },
    { initialX: 300, translateX: 300, duration: 4.8, delay: 0.2, className: "h-6" },
    { initialX: 400, translateX: 400, duration: 5.5, delay: 0.3, className: "h-8" },
    { initialX: 500, translateX: 500, duration: 5.0, delay: 0.4 },
    { initialX: 600, translateX: 600, duration: 5.2, delay: 0.05, className: "h-12" },
    { initialX: 700, translateX: 700, duration: 5.4, delay: 0.15, className: "h-6" },
    { initialX: 800, translateX: 800, duration: 4.7, delay: 0.25 },
    { initialX: 900, translateX: 900, duration: 5.1, delay: 0.35, className: "h-10" },
    { initialX: 1000, translateX: 1000, duration: 5.5, delay: 0.45, className: "h-8" },
    { initialX: 1100, translateX: 1100, duration: 4.9, delay: 0.1, className: "h-14" },
    { initialX: 1200, translateX: 1200, duration: 5.3, delay: 0.2, className: "h-6" },
    { initialX: 1300, translateX: 1300, duration: 4.8, delay: 0.3 },
    { initialX: 1400, translateX: 1400, duration: 5.2, delay: 0.4, className: "h-12" },
    { initialX: 1500, translateX: 1500, duration: 5.4, delay: 0.05, className: "h-8" },
    { initialX: 1600, translateX: 1600, duration: 5.0, delay: 0.15, className: "h-10" },
    { initialX: 1700, translateX: 1700, duration: 5.1, delay: 0.25, className: "h-6" },
    { initialX: 1800, translateX: 1800, duration: 5.6, delay: 0.35, className: "h-16" },
  ];

  return (
    <div
      ref={parentRef}
      className={cn(
        "bg-gradient-to-b from-white to-neutral-100 dark:from-neutral-950 dark:to-neutral-800 relative flex items-center w-full justify-center overflow-hidden",
        // h-screen if you want bigger
        className
      )}>
      {beams.map((beam) => (
        <CollisionMechanism
          key={beam.initialX + "beam-idx"}
          beamOptions={beam}
          containerRef={null}
          parentRef={parentRef} />
      ))}
      {children}
    </div>
  );
};

const CollisionMechanism = React.forwardRef(({ parentRef, containerRef, beamOptions = {} }, ref) => {
  const beamRef = useRef(null);
  const [collision, setCollision] = useState({
    detected: false,
    coordinates: null,
  });
  const [beamKey, setBeamKey] = useState(0);
  const [cycleCollisionDetected, setCycleCollisionDetected] = useState(false);

  useEffect(() => {
    if (!containerRef) return; // Skip collision detection if no container
    
    const checkCollision = () => {
      if (
        beamRef.current &&
        containerRef &&
        containerRef.current &&
        parentRef.current &&
        !cycleCollisionDetected
      ) {
        const beamRect = beamRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        const parentRect = parentRef.current.getBoundingClientRect();

        if (beamRect.bottom >= containerRect.top) {
          const relativeX =
            beamRect.left - parentRect.left + beamRect.width / 2;
          const relativeY = beamRect.bottom - parentRect.top;

          setCollision({
            detected: true,
            coordinates: {
              x: relativeX,
              y: relativeY,
            },
          });
          setCycleCollisionDetected(true);
        }
      }
    };

    const animationInterval = setInterval(checkCollision, 50);

    return () => clearInterval(animationInterval);
  }, [cycleCollisionDetected, containerRef]);

  useEffect(() => {
    if (collision.detected && collision.coordinates) {
      setTimeout(() => {
        setCollision({ detected: false, coordinates: null });
        setCycleCollisionDetected(false);
      }, 2000);

      setTimeout(() => {
        setBeamKey((prevKey) => prevKey + 1);
      }, 2000);
    }
  }, [collision]);

  return (
    <>
      <motion.div
        key={beamKey}
        ref={beamRef}
        animate={{
          translateY: beamOptions.translateY || "200vh",
          translateX: beamOptions.translateX || "0px",
        }}
        initial={{
          translateY: beamOptions.initialY || "-200px",
          translateX: beamOptions.initialX || "0px",
        }}
        transition={{
          duration: beamOptions.duration || 8,
          repeat: Infinity,
          repeatType: "loop",
          ease: "linear",
          times: [0, 1],
          delay: beamOptions.delay || 0,
          repeatDelay: 0,
        }}
        className={cn(
          "absolute left-0 top-20 m-auto h-14 w-px rounded-full bg-gradient-to-t from-indigo-500 via-purple-500 to-transparent",
          beamOptions.className
        )} />
      <AnimatePresence>
        {collision.detected && collision.coordinates && (
          <Explosion
            key={`${collision.coordinates.x}-${collision.coordinates.y}`}
            className=""
            style={{
              left: `${collision.coordinates.x}px`,
              top: `${collision.coordinates.y}px`,
              transform: "translate(-50%, -50%)",
            }} />
        )}
      </AnimatePresence>
    </>
  );
});

CollisionMechanism.displayName = "CollisionMechanism";

const Explosion = ({
  ...props
}) => {
  const spans = Array.from({ length: 20 }, (_, index) => ({
    id: index,
    initialX: 0,
    initialY: 0,
    directionX: Math.floor(Math.random() * 80 - 40),
    directionY: Math.floor(Math.random() * -50 - 10),
  }));

  return (
    <div {...props} className={cn("absolute z-50 h-2 w-2", props.className)}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="absolute -inset-x-10 top-0 m-auto h-2 w-10 rounded-full bg-gradient-to-r from-transparent via-indigo-500 to-transparent blur-sm"></motion.div>
      {spans.map((span) => (
        <motion.span
          key={span.id}
          initial={{ x: span.initialX, y: span.initialY, opacity: 1 }}
          animate={{
            x: span.directionX,
            y: span.directionY,
            opacity: 0,
          }}
          transition={{ duration: Math.random() * 1.5 + 0.5, ease: "easeOut" }}
          className="absolute h-1 w-1 rounded-full bg-gradient-to-b from-indigo-500 to-purple-500" />
      ))}
    </div>
  );
};
