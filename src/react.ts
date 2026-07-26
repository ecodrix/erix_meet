/**
 * @module @ecodrix/erix-meet/react
 * React / Next.js bindings for the ECODrIx booking widget. SSR-safe (the widget
 * is only created inside `useEffect`, which never runs on the server). Use
 * inside a Client Component (`"use client"`).
 *
 *   - {@link ErixMeet}       — floating "Book a meeting" button + modal. Renders null.
 *   - {@link ErixMeetInline} — the booking page embedded inline in a <div>.
 *   - {@link useErixMeet}    — imperative open/close controls.
 */

import {
  createElement,
  useEffect,
  useRef,
  type CSSProperties,
  type ReactElement,
} from "react";
import {
  ErixMeetWidget,
  resolveBookingUrl,
  type ErixMeetConfig,
} from "./index.js";

export type ErixMeetProps = ErixMeetConfig;

export interface ErixMeetControls {
  open(): void;
  close(): void;
  toggle(): void;
  isOpen(): boolean;
  update(next: Partial<ErixMeetConfig>): void;
}

/**
 * Declarative modal booking widget. Renders `null`; the floating button + modal
 * mount to `document.body`.
 *
 * @example
 * ```tsx
 * "use client";
 * import { ErixMeet } from "@ecodrix/erix-meet/react";
 * export default () => <ErixMeet clientCode="ACME123" slug="intro-call" />;
 * ```
 */
export function ErixMeet(props: ErixMeetProps): null {
  const ref = useRef<ErixMeetWidget | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const widget = new ErixMeetWidget({ ...props, mode: "modal" });
    widget.init();
    ref.current = widget;
    return () => {
      widget.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    ref.current?.updateConfig(props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.clientCode, props.slug, props.bookUrl, props.baseUrl, props.buttonText]);

  return null;
}

/**
 * The booking page embedded inline in a container. Renders an iframe directly
 * (no floating button) — drop it anywhere in your layout.
 *
 * @example
 * ```tsx
 * "use client";
 * import { ErixMeetInline } from "@ecodrix/erix-meet/react";
 * export default () => (
 *   <ErixMeetInline clientCode="ACME123" height={760} />
 * );
 * ```
 */
export function ErixMeetInline(
  props: Omit<ErixMeetConfig, "mode" | "target"> & {
    /** Iframe height in px. Default 720. */
    height?: number;
    className?: string;
    style?: CSSProperties;
  },
): ReactElement {
  const url = resolveBookingUrl(props);
  const { height = 720, className, style } = props;
  return createElement("iframe", {
    src: url,
    title: props.buttonText ?? "Book a meeting",
    className,
    style: {
      width: "100%",
      height,
      border: "none",
      borderRadius: 12,
      background: "#fff",
      ...style,
    },
  });
}

/** Imperative hook — mounts the modal widget and returns open/close controls. */
export function useErixMeet(config: ErixMeetConfig): ErixMeetControls {
  const ref = useRef<ErixMeetWidget | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const widget = new ErixMeetWidget({ ...config, mode: "modal" });
    widget.init();
    ref.current = widget;
    return () => {
      widget.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    open: () => ref.current?.open(),
    close: () => ref.current?.close(),
    toggle: () => ref.current?.toggle(),
    isOpen: () => ref.current?.isOpen() ?? false,
    update: (next) => ref.current?.updateConfig(next),
  };
}

export default ErixMeet;
