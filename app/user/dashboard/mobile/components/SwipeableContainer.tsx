"use client";

import { ReactNode, useRef } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface SwipeableContainerProps {
  children: ReactNode;
  currentIndex: number;
  totalPages: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export default function SwipeableContainer({
  children,
  currentIndex,
  totalPages,
  onSwipeLeft,
  onSwipeRight,
}: SwipeableContainerProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const x = useMotionValue(0);
  const background = useTransform(
    x,
    [-150, 0, 150],
    ["rgba(0,0,0,0.1)", "rgba(0,0,0,0)", "rgba(0,0,0,0.1)"]
  );

  const handleDragEnd = (_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    const swipeThreshold = 100;
    const velocityThreshold = 500;

    if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
      // Swiped left - go to next page (Posts)
      if (onSwipeLeft) {
        onSwipeLeft();
      }
    } else if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
      // Swiped right - go to previous page (Home)
      if (onSwipeRight) {
        onSwipeRight();
      }
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1 overflow-hidden">
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.3}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="h-full"
      >
        {children}
      </motion.div>

      {/* Subtle swipe indicator dots at bottom */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
        {Array.from({ length: totalPages }).map((_, index) => (
          <div
            key={index}
            className={`transition-all duration-300 ${
              index === currentIndex
                ? "w-6 h-1.5 bg-[#005F90] rounded-full"
                : "w-1.5 h-1.5 bg-gray-300 rounded-full"
            }`}
          />
        ))}
      </div>

      {/* Swipe hint arrows on first load (optional) */}
      {currentIndex === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="fixed right-4 top-1/2 -translate-y-1/2 pointer-events-none"
        >
          <div className="flex items-center gap-1 text-[#005F90]">
            <span className="text-xs">Swipe</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </div>
        </motion.div>
      )}
    </div>
  );
}

