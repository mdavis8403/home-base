"use client";
// The Messages correspondence folio — a 2D interface that opens as if the
// writing desk has been drawn forward. It reuses the full Messages feature
// (all sending, media, scheduling, hearts, favorites, archive) unchanged and
// presents it on the redesigned folio surface. Reading and writing happen here
// in clear 2D, never inside tiny 3D objects.
import { useEffect, useRef } from "react";
import type { Profile } from "@/lib/shared/types";
import type { MessageItem } from "@/lib/shared/messages";
import { Messages } from "@/components/messages/messages";

export function MessagesOverlay({
  profile,
  initial,
  onClose,
}: {
  profile: Profile;
  initial: MessageItem[];
  onClose: () => void;
}) {
  const folio = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    folio.current?.focus({ preventScroll: true });
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="msg-overlay">
      <button
        className="msg-scrim"
        aria-label="Close Messages and return to the clubhouse"
        onClick={onClose}
      />
      <section
        className="msg-folio"
        role="dialog"
        aria-modal="true"
        aria-label="Messages — the writing desk"
        ref={folio}
        tabIndex={-1}
      >
        <div className="msg-folio-bar">
          <span className="msg-folio-brand" aria-hidden="true">
            <span className="msg-folio-mark">✒</span> The writing desk
          </span>
          <button className="msg-close" onClick={onClose}>
            <span aria-hidden="true">↩</span> Back to the clubhouse
          </button>
        </div>
        <div className="msg-folio-body">
          <Messages profile={profile} initial={initial} />
        </div>
      </section>
    </div>
  );
}
