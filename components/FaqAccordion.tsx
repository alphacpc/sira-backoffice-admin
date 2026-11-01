"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { FaqItem } from "@/content/faq";

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={item.question}
            className={`overflow-hidden rounded-2xl border bg-white transition-colors ${
              isOpen ? "border-amber shadow-soft" : "border-navy/10"
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="flex w-full items-center gap-4 px-5 py-5 text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-navy sm:px-6"
              aria-expanded={isOpen}
            >
              <span
                aria-hidden="true"
                className="w-7 shrink-0 font-mono text-xs font-semibold tracking-[0.12em] text-amber-ink"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 text-lg font-bold leading-snug text-navy">
                {item.question}
              </span>
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xl font-bold leading-none transition-colors ${
                  isOpen
                    ? "bg-amber text-navy"
                    : "bg-amber-soft text-navy"
                }`}
              >
                <motion.span
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  +
                </motion.span>
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
                >
                  <p className="px-5 pb-6 pl-[3.75rem] text-ink/75 sm:pl-[4.25rem] sm:pr-6">{item.answer}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
