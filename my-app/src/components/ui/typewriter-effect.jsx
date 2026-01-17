"use client";

import { cn } from "@/lib/utils";
import { motion, stagger, useAnimate, useInView } from "motion/react";
import { useEffect } from "react";
import React from "react";

export const TypewriterEffect = ({
  words,
  lines,
  className,
  cursorClassName
}) => {
  // Default lines to cycle through
  const defaultLines = [
    "Connections, perfectly timed.",
    "Network like you mean it.",
    "Context finds your next connect.",
    "From signals to introductions.",
    "Stop guessing. Start connecting.",
    "Your smartest next message.",
    "Connect with purpose, instantly.",
    "Timing beats networking.",
    "Find your next \"yes.\"",
  ];
  
  // Determine what mode to use: if words provided, use words; otherwise use lines
  const hasWords = words && words.length > 0;
  const linesArray = lines || [];
  const hasCustomLines = linesArray.length > 0;
  const shouldCycleLines = hasCustomLines || !hasWords;
  const activeLines = hasCustomLines ? linesArray : defaultLines;
  
  // split text inside of words into array of characters
  const wordsArray = words ? words.map((word) => {
    return {
      ...word,
      text: word.text.split(""),
    };
  }) : [];
  
  const [scope, animate] = useAnimate();
  const isInView = useInView(scope);
  const [currentLineIndex, setCurrentLineIndex] = React.useState(0);
  const [currentLineWords, setCurrentLineWords] = React.useState([]);
  
  // Convert a line string to words array format
  const lineToWords = (line) => {
    return line.split(/\s+/).map((word, idx) => ({
      text: word,
      className: idx === line.split(/\s+/).length - 1 ? "text-purple-500" : "text-white"
    }));
  };
  
  // Initialize with first line or words
  useEffect(() => {
    if (shouldCycleLines && activeLines.length > 0) {
      setCurrentLineWords(lineToWords(activeLines[currentLineIndex]));
    } else if (words && words.length > 0) {
      setCurrentLineWords(words);
    }
  }, [currentLineIndex, shouldCycleLines, activeLines, words]);
  
  // Initialize on mount
  useEffect(() => {
    if (shouldCycleLines && activeLines.length > 0 && currentLineWords.length === 0) {
      setCurrentLineWords(lineToWords(activeLines[0]));
    } else if (!shouldCycleLines && words && words.length > 0 && currentLineWords.length === 0) {
      setCurrentLineWords(words);
    }
  }, []);
  
  useEffect(() => {
    if (isInView) {
      const runAnimation = async () => {
        while (true) {
          if (shouldCycleLines) {
            // Cycle through all lines
            for (let i = 0; i < activeLines.length; i++) {
              setCurrentLineIndex(i);
              setCurrentLineWords(lineToWords(activeLines[i]));
              
              // Wait a moment for the state to update
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Reset spans to invisible
              await animate("span", {
                opacity: 0,
              }, {
                duration: 0.1,
              });
              
              // Wait a moment before starting animation
              await new Promise(resolve => setTimeout(resolve, 300));
              
              // Animate spans in sequence
              await animate("span", {
                opacity: 1,
              }, {
                duration: 0.3,
                delay: stagger(0.1),
                ease: "easeInOut",
              });
              
              // Wait at the end before moving to next line
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          } else {
            // Original behavior for words
            // Reset all spans to initial state (invisible but keeping space)
            await animate("span", {
              opacity: 0,
            }, {
              duration: 0.1,
            });
            
            // Wait a moment before restarting
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Animate spans in sequence (keep display and width consistent)
            await animate("span", {
              opacity: 1,
            }, {
              duration: 0.3,
              delay: stagger(0.1),
              ease: "easeInOut",
            });
            
            // Wait at the end before restarting
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      };
      
      runAnimation();
    }
  }, [isInView, animate, shouldCycleLines, activeLines]);

  const renderWords = () => {
    const wordsToRender = currentLineWords.map((word) => {
      return {
        ...word,
        text: word.text.split(""),
      };
    });
    
    return (
      <motion.div ref={scope} className="inline-block text-left">
        {wordsToRender.map((word, idx) => {
          return (
            <React.Fragment key={`word-${idx}-${currentLineIndex}`}>
              <span className="inline-block">
                {word.text.map((char, index) => (
                  <motion.span
                    initial={{
                      opacity: 0,
                    }}
                    key={`char-${index}-${currentLineIndex}`}
                    className={cn(`dark:text-white text-black inline-block`, word.className)}
                    style={{ minWidth: '0.5ch' }}>
                    {char}
                  </motion.span>
                ))}
              </span>
              {idx < wordsToRender.length - 1 && (
                <span className={cn(`dark:text-white text-black inline-block`, word.className)}>
                  {" "}
                </span>
              )}
            </React.Fragment>
          );
        })}
      </motion.div>
    );
  };
  return (
    <div
      className={cn(
        "text-lg sm:text-2xl md:text-4xl lg:text-6xl xl:text-7xl font-bold text-left w-full",
        className
      )}
      style={{ minHeight: '120px' }}>
      {renderWords()}
      <motion.span
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          repeatType: "reverse",
        }}
        className={cn(
          "inline-block rounded-sm w-[4px] h-4 md:h-6 lg:h-10 bg-blue-500",
          cursorClassName
        )}></motion.span>
    </div>
  );
};

export const TypewriterEffectSmooth = ({
  words,
  className,
  cursorClassName
}) => {
  // split text inside of words into array of characters
  const wordsArray = words.map((word) => {
    return {
      ...word,
      text: word.text.split(""),
    };
  });
  const renderWords = () => {
    return (
      <div>
        {wordsArray.map((word, idx) => {
          return (
            <div key={`word-${idx}`} className="inline-block">
              {word.text.map((char, index) => (
                <span
                  key={`char-${index}`}
                  className={cn(`dark:text-white text-black `, word.className)}>
                  {char}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={cn("flex space-x-1 my-6", className)}>
      <motion.div
        className="overflow-hidden pb-2"
        initial={{
          width: "0%",
        }}
        whileInView={{
          width: "fit-content",
        }}
        transition={{
          duration: 2,
          ease: "linear",
          delay: 1,
        }}>
        <div
          className="text-xs sm:text-base md:text-xl lg:text:3xl xl:text-5xl font-bold"
          style={{
            whiteSpace: "nowrap",
          }}>
          {renderWords()}{" "}
        </div>{" "}
      </motion.div>
      <motion.span
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        transition={{
          duration: 0.8,

          repeat: Infinity,
          repeatType: "reverse",
        }}
        className={cn(
          "block rounded-sm w-[4px]  h-4 sm:h-6 xl:h-12 bg-blue-500",
          cursorClassName
        )}></motion.span>
    </div>
  );
};
