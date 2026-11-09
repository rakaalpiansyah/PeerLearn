import React from "react";

const URL_REGEX = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;

/**
 * Safely parses and renders text with automatic clickable links (Google Drive, Meet, docs, etc.)
 * Strictly protects against XSS by keeping all non-URL tokens as React string children (no innerHTML),
 * and enforces rel="noopener noreferrer" on all external anchors.
 */
export default function LinkifiedText({ text, className = "" }) {
  if (!text) return null;

  const parts = text.split(URL_REGEX);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (/^https?:\/\//i.test(part)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="underline font-medium underline-offset-2 hover:opacity-80 break-all transition-opacity text-inherit decoration-current/40 hover:decoration-current"
            >
              {part}
            </a>
          );
        }
        return part;
      })}
    </span>
  );
}
