/**
 * @module @ecodrix/erix-meet
 * ECODrIx Meet — a lightweight, dependency-free way to embed your hosted
 * ECODrIx booking page on any website. It renders our booking UI (the same
 * `/book/{clientCode}[/{slug}]` page) inside an iframe — either a floating
 * "Book a meeting" button that opens a modal, or inline in an element you
 * choose. No API keys: the tenant is identified by the PUBLIC `clientCode`.
 *
 * Usable via CDN (`window.ErixMeet.init`), any bundler (ESM/CJS), or the React
 * entry (`@ecodrix/erix-meet/react`).
 */

/** Floating-button corner. */
export type ButtonPosition =
  | "bottom-left"
  | "bottom-right"
  | "top-left"
  | "top-right";

/** How the booking UI is embedded. */
export type EmbedMode = "modal" | "inline" | "popup" | "slide-left" | "slide-right" | "fullscreen";

export interface ErixMeetConfig {
  // ── Identity (one of clientCode / bookUrl required) ─────────────────────
  /**
   * Your PUBLIC workspace client code. The SDK builds the hosted booking URL
   * (`${baseUrl}/book/<clientCode>[/<slug>]`). Not a secret.
   */
  clientCode?: string;
  /** Book a specific event type directly (its slug). Omit for the picker. */
  slug?: string;
  /** Base origin of the ECODrIx app. Default `https://app.ecodrix.com`. */
  baseUrl?: string;
  /** Advanced: explicit booking URL. Wins over clientCode/slug/baseUrl. */
  bookUrl?: string;

  // ── Embedding ───────────────────────────────────────────────────────────
  /** `"modal"` (floating button → dialog) or `"inline"`. Default `"modal"`. */
  mode?: EmbedMode;
  /** Inline mode: CSS selector or element to mount the iframe into. */
  target?: string | HTMLElement;

  // ── Floating button (modal mode) ────────────────────────────────────────
  /** Button label. Default `"Book a meeting"`. */
  buttonText?: string;
  /** Button background color. Default `#4f46e5`. */
  buttonColor?: string;
  /** Button text color. Default `#ffffff`. */
  buttonTextColor?: string;
  /** Corner for the floating button. Default `"bottom-right"`. */
  buttonPosition?: ButtonPosition;
  /** Don't render the floating button — open the modal via `open()` yourself. */
  hideButton?: boolean;

  // ── Sizing ──────────────────────────────────────────────────────────────
  /** Modal iframe width in px. Default `460`. */
  width?: number;
  /** Modal iframe height in px. Default `720`. */
  height?: number;
  /** Inline iframe height in px. Default `720`. */
  inlineHeight?: number;

  // ── Events ──────────────────────────────────────────────────────────────
  onOpen?: () => void;
  onClose?: () => void;
}

const DEFAULTS = {
  baseUrl: "https://console.ecodrix.com",
  mode: "modal" as EmbedMode,
  buttonText: "Book a meeting",
  buttonColor: "#4f46e5",
  buttonTextColor: "#ffffff",
  buttonPosition: "bottom-right" as ButtonPosition,
  hideButton: false,
  width: 460,
  height: 720,
  inlineHeight: 720,
};

type ResolvedConfig = typeof DEFAULTS & ErixMeetConfig;

/**
 * Resolve the booking iframe URL: an explicit `bookUrl` wins; otherwise it's
 * `${baseUrl}/book/<clientCode>[/<slug>]`. Returns `undefined` when neither a
 * `bookUrl` nor a `clientCode` is provided. Pure — the single URL builder.
 */
export function resolveBookingUrl(config: {
  bookUrl?: string;
  clientCode?: string;
  slug?: string;
  baseUrl?: string;
}): string | undefined {
  if (config.bookUrl) return config.bookUrl;
  if (!config.clientCode) return undefined;
  const base = String(config.baseUrl ?? DEFAULTS.baseUrl).replace(/\/+$/, "");
  const path = config.slug
    ? `/book/${encodeURIComponent(config.clientCode)}/${encodeURIComponent(config.slug)}`
    : `/book/${encodeURIComponent(config.clientCode)}`;
  return `${base}${path}`;
}

let activeWidget: ErixMeetWidget | null = null;

export class ErixMeetWidget {
  // Definite-assignment: set in the constructor's normal path. The singleton
  // early-return discards the un-initialized throwaway instance.
  private config!: ResolvedConfig;
  private url: string | undefined;
  private button: HTMLButtonElement | null = null;
  private overlay: HTMLDivElement | null = null;
  private inlineIframe: HTMLIFrameElement | null = null;
  private open_ = false;
  private readonly onKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") this.close();
  };

  constructor(config: ErixMeetConfig) {
    if (activeWidget) {
      activeWidget.updateConfig(config);
      return activeWidget;
    }
    this.config = { ...DEFAULTS, ...config };
    this.url = resolveBookingUrl(this.config);
  }

  init(): void {
    if (!this.url) {
      throw new Error("[ErixMeet] Provide `clientCode` (recommended) or `bookUrl`.");
    }
    if (typeof document === "undefined") return;
    this.injectStyles();

    if (this.config.mode === "inline") {
      this.mountInline();
      return;
    }
    if (!this.config.hideButton) this.createButton();
  }

  // ── Inline ────────────────────────────────────────────────────────────────

  private mountInline(): void {
    const host = this.resolveTarget();
    if (!host) {
      throw new Error(
        "[ErixMeet] inline mode needs a valid `target` (selector or element).",
      );
    }
    const iframe = document.createElement("iframe");
    iframe.src = this.url as string;
    iframe.title = this.config.buttonText;
    iframe.style.cssText = `width:100%;height:${this.config.inlineHeight}px;border:none;border-radius:12px;background:#fff;`;
    host.appendChild(iframe);
    this.inlineIframe = iframe;
  }

  private resolveTarget(): HTMLElement | null {
    const t = this.config.target;
    if (!t) return null;
    if (typeof t === "string") return document.querySelector<HTMLElement>(t);
    return t;
  }

  // ── Floating button (modal) ────────────────────────────────────────────────

  private createButton(): void {
    const [v, h] = this.config.buttonPosition.split("-");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = this.config.buttonText;
    btn.setAttribute("aria-label", this.config.buttonText);
    btn.style.cssText = `
      position:fixed; ${v}:24px; ${h}:20px; z-index:2147483000;
      padding:12px 18px; border:none; border-radius:9999px; cursor:pointer;
      font:600 14px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
      background:${this.config.buttonColor}; color:${this.config.buttonTextColor};
      box-shadow:0 8px 24px rgba(0,0,0,0.18); transition:transform .15s ease;
    `;
    btn.addEventListener("mouseenter", () => {
      btn.style.transform = "translateY(-2px)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "translateY(0)";
    });
    btn.addEventListener("click", () => this.open());
    document.body.appendChild(btn);
    this.button = btn;
  }

  // ── Modal open/close ────────────────────────────────────────────────────────

  open(): void {
    if (this.config.mode === "inline" || this.open_ || !this.url) return;
    this.open_ = true;

    const mode = this.config.mode;
    const overlay = document.createElement("div");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    // Base overlay styles shared across modes.
    const isSlide = mode === "slide-left" || mode === "slide-right";
    const isFullscreen = mode === "fullscreen";

    overlay.style.cssText = `
      position:fixed; inset:0; z-index:2147483001;
      display:flex; ${isSlide ? (mode === "slide-left" ? "justify-content:flex-start" : "justify-content:flex-end") : "align-items:center; justify-content:center"};
      background:rgba(17,24,39,${isFullscreen ? "0.95" : "0.55"});
      ${isFullscreen ? "" : "padding:16px;"}
      animation:erixmeet-fade .18s ease;
    `;
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.close();
    });

    const frameWrap = document.createElement("div");
    if (isFullscreen) {
      frameWrap.style.cssText = `position:relative; width:100%; height:100%;`;
    } else if (isSlide) {
      frameWrap.style.cssText = `position:relative; width:${this.config.width}px; max-width:90vw; height:100%; animation:erixmeet-slide-${mode === "slide-left" ? "left" : "right"} .25s ease;`;
    } else {
      // modal / popup
      frameWrap.style.cssText = `position:relative; width:${this.config.width}px; max-width:100%; height:${this.config.height}px; max-height:92vh;`;
    }

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.innerHTML = "&times;";
    closeBtn.style.cssText = `
      position:absolute; top:${isFullscreen ? "16px" : "-14px"}; right:${isFullscreen ? "16px" : isSlide ? "12px" : "-14px"}; z-index:1;
      width:32px; height:32px; border:none; border-radius:9999px; cursor:pointer;
      background:#fff; color:#111827; font-size:22px; line-height:1;
      box-shadow:0 4px 12px rgba(0,0,0,0.2);
    `;
    closeBtn.addEventListener("click", () => this.close());

    const iframe = document.createElement("iframe");
    iframe.src = this.url;
    iframe.title = this.config.buttonText;
    iframe.style.cssText = `
      width:100%; height:100%; border:none;
      border-radius:${isFullscreen ? "0" : isSlide ? "0" : "14px"};
      background:#fff;
      ${isFullscreen || isSlide ? "" : "box-shadow:0 25px 60px -12px rgba(0,0,0,0.5);"}
    `;

    frameWrap.appendChild(closeBtn);
    frameWrap.appendChild(iframe);
    overlay.appendChild(frameWrap);
    document.body.appendChild(overlay);
    document.addEventListener("keydown", this.onKeydown);
    this.overlay = overlay;
    this.config.onOpen?.();
  }

  close(): void {
    if (!this.overlay) return;
    this.overlay.remove();
    this.overlay = null;
    this.open_ = false;
    document.removeEventListener("keydown", this.onKeydown);
    this.config.onClose?.();
  }

  toggle(): void {
    if (this.open_) this.close();
    else this.open();
  }

  isOpen(): boolean {
    return this.open_;
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  updateConfig(next: Partial<ErixMeetConfig> = {}): void {
    this.config = { ...this.config, ...next };
    this.url = resolveBookingUrl(this.config);
    if (this.button) this.button.textContent = this.config.buttonText;
    if (this.inlineIframe && this.url) this.inlineIframe.src = this.url;
  }

  destroy(): boolean {
    this.close();
    this.button?.remove();
    this.inlineIframe?.remove();
    this.button = null;
    this.inlineIframe = null;
    document.getElementById("erixmeet-styles")?.remove();
    activeWidget = null;
    return true;
  }

  private injectStyles(): void {
    if (document.getElementById("erixmeet-styles")) return;
    const el = document.createElement("style");
    el.id = "erixmeet-styles";
    el.textContent = `
      @keyframes erixmeet-fade{from{opacity:0}to{opacity:1}}
      @keyframes erixmeet-slide-left{from{transform:translateX(-100%)}to{transform:translateX(0)}}
      @keyframes erixmeet-slide-right{from{transform:translateX(100%)}to{transform:translateX(0)}}
    `;
    document.head.appendChild(el);
  }
}

/** The CDN global surface (`window.ErixMeet`). */
export interface ErixMeetGlobal {
  init(config: ErixMeetConfig): ErixMeetWidget;
  open(): void;
  close(): void;
  toggle(): void;
  isOpen(): boolean;
  updateConfig(config: Partial<ErixMeetConfig>): void;
  destroy(): void;
}

declare global {
  interface Window {
    ErixMeet?: ErixMeetGlobal;
  }
}

// CDN / global attach — the side effect the `<script>` embed relies on.
if (typeof window !== "undefined") {
  window.ErixMeet = {
    init: (opts: ErixMeetConfig) => {
      activeWidget = new ErixMeetWidget(opts);
      activeWidget.init();
      return activeWidget;
    },
    open: () => activeWidget?.open(),
    close: () => activeWidget?.close(),
    toggle: () => activeWidget?.toggle(),
    isOpen: () => activeWidget?.isOpen() ?? false,
    updateConfig: (opts: Partial<ErixMeetConfig>) =>
      activeWidget?.updateConfig(opts),
    destroy: () => activeWidget?.destroy(),
  };
}
