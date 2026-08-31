"use client";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

const reveal: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [alreadyVisible, setAlreadyVisible] = useState(false);

  useEffect(() => {
    const rect = ref.current?.getBoundingClientRect();
    if (rect && rect.top < window.innerHeight && rect.bottom > 0) {
      setAlreadyVisible(true);
    }
  }, []);

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={reveal}
      initial="hidden"
      {...(alreadyVisible
        ? { animate: "visible" }
        : { whileInView: "visible", viewport: { once: true, margin: "-80px" } })}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}