"use client";
// The Clubhouse experience — the interaction + application layer. It owns the
// camera view, browser history, the in-world chrome, and whether a destination
// opens an in-world overlay (Messages) or glides the camera and then hands off
// to an existing feature route. The world underneath is the Spline scene when
// published, else the design-system Room. Everything stays keyboard-usable and
// honors reduced motion; nothing here writes presence or activity.
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Profile } from "@/lib/shared/types";
import type { MessageItem } from "@/lib/shared/messages";
import {
  DESTINATIONS,
  destinationById,
  viewForPath,
  type CameraView,
  type DestinationId,
} from "@/lib/shared/clubhouse";
import { messageRequest } from "@/components/messages/api";
import { SignOut } from "@/components/sign-out";
import { Room } from "./room";
import { SplineWorld } from "./spline-world";
import { MessagesOverlay } from "./messages-overlay";

const SPLINE_SCENE = process.env.NEXT_PUBLIC_SPLINE_SCENE;

export function ClubhouseExperience({
  profile,
  initialView = "home",
  initialMessages = null,
  unread = 0,
  boardWaiting = false,
  canManage = false,
}: {
  profile: Profile;
  initialView?: CameraView;
  initialMessages?: MessageItem[] | null;
  unread?: number;
  boardWaiting?: boolean;
  canManage?: boolean;
}) {
  const router = useRouter();
  const [view, setView] = useState<CameraView>(initialView);
  const [messages, setMessages] = useState<MessageItem[] | null>(initialMessages);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [splineFailed, setSplineFailed] = useState(false);
  const [arriving, setArriving] = useState(false);
  const pushed = useRef(false);
  const leaving = useRef(false);

  // Immersive: hide the standard family chrome while the clubhouse owns the view.
  useEffect(() => {
    document.body.classList.add("immersive");
    return () => document.body.classList.remove("immersive");
  }, []);

  // A gentle arrival bloom on the first visit through the door.
  useEffect(() => {
    let flag = "";
    try {
      flag = sessionStorage.getItem("hb-arriving") || "";
      sessionStorage.removeItem("hb-arriving");
    } catch {
      /* storage may be unavailable */
    }
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (flag && !reduce) {
      const raf = requestAnimationFrame(() => setArriving(true));
      const t = setTimeout(() => setArriving(false), 1100);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(t);
      };
    }
  }, []);

  // Keep the camera in sync with browser navigation (back/forward, deep links).
  useEffect(() => {
    function onPop() {
      const v = viewForPath(window.location.pathname);
      setView(v);
      if (v !== "messages") pushed.current = false;
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const loadMessages = useCallback(async () => {
    setLoadingMsgs(true);
    try {
      const data = await messageRequest<MessageItem[]>("");
      setMessages(data);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  const select = useCallback(
    (id: DestinationId) => {
      const d = destinationById(id);
      if (!d || leaving.current) return;
      if (d.mode === "overlay") {
        setView("messages");
        if (window.location.pathname !== d.href) {
          window.history.pushState({ hbView: "messages" }, "", d.href);
          pushed.current = true;
        }
        if (messages === null) void loadMessages();
      } else {
        // Glide the camera toward the place, then hand off to its route.
        setView(id);
        leaving.current = true;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.setTimeout(() => router.push(d.href), reduce ? 0 : 720);
      }
    },
    [messages, loadMessages, router],
  );

  const closeMessages = useCallback(() => {
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    } else {
      window.history.replaceState({}, "", "/home");
      setView("home");
    }
  }, []);

  const world =
    SPLINE_SCENE && !splineFailed ? (
      <SplineWorld
        scene={SPLINE_SCENE}
        view={view}
        onSelect={select}
        onFail={() => setSplineFailed(true)}
      />
    ) : (
      <Room view={view} onSelect={select} unread={unread} boardWaiting={boardWaiting} />
    );

  return (
    <div className={`clubhouse-root ${arriving ? "is-arriving" : ""}`}>
      <div className="clubhouse-world">{world}</div>

      <header className="clubhouse-bar">
        <button
          className="clubhouse-brand"
          onClick={() => {
            window.history.replaceState({}, "", "/home");
            setView("home");
          }}
          aria-label="Home Base — the clubhouse"
        >
          <span aria-hidden="true">✦</span> HOME BASE
        </button>
        <div className="clubhouse-who">
          <span className="clubhouse-avatar" style={{ background: profile.color }} aria-hidden="true">
            {profile.displayName.charAt(0)}
          </span>
          <span className="clubhouse-name">{profile.displayName}</span>
          {canManage && (
            <Link className="clubhouse-settings" href="/parent-settings">
              Parent Settings
            </Link>
          )}
          <SignOut />
        </div>
      </header>

      {/* The clubhouse image is the navigation. This list is the screen-reader /
          keyboard equivalent — present and operable, but not visually shown. */}
      <nav className="visually-hidden" aria-label="Places in the clubhouse">
        <ul>
          {DESTINATIONS.map((d) => (
            <li key={d.id}>
              <button
                onClick={() => select(d.id)}
                aria-current={view === d.id ? "true" : undefined}
              >
                {d.label}
                {d.id === "messages" && unread > 0 ? ` — ${unread} waiting` : ""}
              </button>
            </li>
          ))}
        </ul>
        <noscript>
          {DESTINATIONS.map((d) => (
            <Link key={d.id} href={d.href}>
              {d.label}
            </Link>
          ))}
        </noscript>
      </nav>

      {view === "messages" && (
        <MessagesOverlay
          profile={profile}
          initial={messages ?? []}
          onClose={closeMessages}
        />
      )}
      {view === "messages" && messages === null && loadingMsgs && (
        <p className="visually-hidden" role="status">
          Opening the writing desk…
        </p>
      )}
    </div>
  );
}
