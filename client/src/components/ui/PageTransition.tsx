import { motion } from "motion/react";
import { ReactNode } from "react";

export function PageTransition({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`w-full h-full flex flex-col ${className}`}
    >
      {children}
    </motion.div>
  );
}
