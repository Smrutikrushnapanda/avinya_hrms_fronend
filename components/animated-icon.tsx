"use client";

import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type AnimationType =
  | "spin"
  | "bounce"
  | "pulse"
  | "wiggle"
  | "flip"
  | "swing"
  | "rubberBand"
  | "float";

interface AnimatedIconProps {
  icon: LucideIcon;
  animation: AnimationType;
  isActive?: boolean;
  className?: string;
}

const animationVariants: Record<AnimationType, Variants> = {
  spin: {
    idle: { rotate: 0 },
    active: {
      rotate: 360,
      transition: {
        duration: 3,
        ease: "linear",
        repeat: Infinity,
      },
    },
    hover: {
      rotate: 180,
      transition: { duration: 0.4, ease: "easeInOut" },
    },
  },
  bounce: {
    idle: { y: 0 },
    active: {
      y: [0, -4, 0],
      transition: {
        duration: 1.5,
        ease: "easeInOut",
        repeat: Infinity,
      },
    },
    hover: {
      y: [0, -6, 0],
      transition: { duration: 0.4, ease: "easeOut" },
    },
  },
  pulse: {
    idle: { scale: 1, opacity: 1 },
    active: {
      scale: [1, 1.15, 1],
      opacity: [1, 0.8, 1],
      transition: {
        duration: 2,
        ease: "easeInOut",
        repeat: Infinity,
      },
    },
    hover: {
      scale: 1.2,
      transition: { duration: 0.2, ease: "easeOut" },
    },
  },
  wiggle: {
    idle: { rotate: 0 },
    active: {
      rotate: [0, -8, 8, -5, 5, 0],
      transition: {
        duration: 2,
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: 1,
      },
    },
    hover: {
      rotate: [0, -12, 12, -8, 8, 0],
      transition: { duration: 0.5, ease: "easeInOut" },
    },
  },
  flip: {
    idle: { rotateY: 0 },
    active: {
      rotateY: [0, 180, 360],
      transition: {
        duration: 2.5,
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: 2,
      },
    },
    hover: {
      rotateY: 180,
      transition: { duration: 0.5, ease: "easeInOut" },
    },
  },
  swing: {
    idle: { rotate: 0 },
    active: {
      rotate: [0, 15, -10, 8, -5, 0],
      transition: {
        duration: 2,
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: 1.5,
      },
    },
    hover: {
      rotate: [0, 20, -15, 10, -5, 0],
      transition: { duration: 0.6, ease: "easeInOut" },
    },
  },
  rubberBand: {
    idle: { scaleX: 1, scaleY: 1 },
    active: {
      scaleX: [1, 1.2, 0.85, 1.1, 0.95, 1],
      scaleY: [1, 0.85, 1.15, 0.92, 1.05, 1],
      transition: {
        duration: 1.5,
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: 2,
      },
    },
    hover: {
      scaleX: [1, 1.25, 0.9, 1.1, 1],
      scaleY: [1, 0.8, 1.1, 0.95, 1],
      transition: { duration: 0.5, ease: "easeInOut" },
    },
  },
  float: {
    idle: { y: 0, rotate: 0 },
    active: {
      y: [0, -3, 0, -2, 0],
      rotate: [0, 2, -2, 1, 0],
      transition: {
        duration: 3,
        ease: "easeInOut",
        repeat: Infinity,
      },
    },
    hover: {
      y: -4,
      rotate: 5,
      transition: { duration: 0.3, ease: "easeOut" },
    },
  },
};

export default function AnimatedIcon({
  icon: Icon,
  animation,
  isActive = false,
  className,
}: AnimatedIconProps) {
  const [isHovered, setIsHovered] = useState(false);

  const currentState = isHovered ? "hover" : isActive ? "active" : "idle";

  return (
    <motion.div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      variants={animationVariants[animation]}
      animate={currentState}
      style={{ display: "inline-flex", originX: 0.5, originY: 0.5 }}
    >
      <Icon className={cn("w-5 h-5", className)} />
    </motion.div>
  );
}
