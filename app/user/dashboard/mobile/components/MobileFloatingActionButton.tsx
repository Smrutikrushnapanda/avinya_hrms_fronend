"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface FabAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

interface MobileFloatingActionButtonProps {
  actions?: FabAction[];
  className?: string;
}

export function MobileFloatingActionButton({
  actions,
  className,
}: MobileFloatingActionButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("fixed bottom-24 right-5 z-40 flex flex-col items-center gap-3", className)}>
      <AnimatePresence>
        {open &&
          actions?.map((action, i) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 200, damping: 18, delay: i * 0.04 }}
              onClick={() => {
                action.onClick();
                setOpen(false);
              }}
              className="flex items-center gap-2 bg-card border border-slate-200/50 shadow-lg rounded-full px-4 py-2.5 text-sm font-medium text-foreground active:scale-95 transition-transform"
            >
              {action.icon}
              <span>{action.label}</span>
            </motion.button>
          ))}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen((p) => !p)}
        className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        style={{
          boxShadow: "0 4px 16px color-mix(in srgb, var(--primary) 40%, transparent)",
        }}
      >
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <Plus className="w-6 h-6" />
        </motion.div>
      </motion.button>
    </div>
  );
}
