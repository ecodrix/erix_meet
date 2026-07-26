# @ecodrix/erix-meet

Embed your ECODrIx booking page on any website — a floating **"Book a meeting"**
button + modal, or an **inline** calendar. No API keys: you only need your
public **client code**. It renders the same hosted booking UI as
`app.ecodrix.com/book/<clientCode>`, so bookings land in your CRM and (when
Google is connected) create a real Calendar/Meet event.

## Install

```bash
npm install @ecodrix/erix-meet
```

Or use the CDN (no build step) — see below.

## CDN (plain HTML)

```html
<script src="https://cdn.jsdelivr.net/npm/@ecodrix/erix-meet/dist/index.global.js"></script>
<script>
  // Floating "Book a meeting" button, bottom-right.
  window.ErixMeet.init({ clientCode: "ACME123" });

  // …or a specific event type:
  // window.ErixMeet.init({ clientCode: "ACME123", slug: "intro-call" });
</script>
```

Open the modal from your own button:

```html
<button onclick="window.ErixMeet.open()">Schedule a call</button>
<script>
  window.ErixMeet.init({ clientCode: "ACME123", hideButton: true });
</script>
```

## ESM / bundlers

```ts
import { ErixMeetWidget } from "@ecodrix/erix-meet";

const widget = new ErixMeetWidget({
  clientCode: "ACME123",
  slug: "intro-call",
});
widget.init();
// widget.open(); widget.close(); widget.destroy();
```

## React / Next.js

```tsx
"use client";
import { ErixMeet, ErixMeetInline } from "@ecodrix/erix-meet/react";

// Floating button + modal
<ErixMeet clientCode="ACME123" slug="intro-call" />

// …or embedded inline in your page
<ErixMeetInline clientCode="ACME123" height={760} />
```

Imperative control:

```tsx
"use client";
import { useErixMeet } from "@ecodrix/erix-meet/react";

function Cta() {
  const meet = useErixMeet({ clientCode: "ACME123" });
  return <button onClick={meet.open}>Book a meeting</button>;
}
```

## Options

| Option             | Type                                   | Default                   | Notes                                              |
| ------------------ | -------------------------------------- | ------------------------- | -------------------------------------------------- |
| `clientCode`       | `string`                               | —                         | Your public workspace code (or use `bookUrl`).     |
| `slug`             | `string`                               | —                         | Book one event type directly; omit for the picker. |
| `baseUrl`          | `string`                               | `https://app.ecodrix.com` | ECODrIx app origin.                                |
| `bookUrl`          | `string`                               | —                         | Advanced: explicit booking URL.                    |
| `mode`             | `"modal" \| "inline"`                  | `"modal"`                 | Inline requires `target`.                          |
| `target`           | `string \| HTMLElement`                | —                         | Inline mount point (selector or element).          |
| `buttonText`       | `string`                               | `"Book a meeting"`        | Floating button label.                             |
| `buttonColor`      | `string`                               | `#4f46e5`                 |                                                    |
| `buttonPosition`   | `bottom-right \| bottom-left \| top-*` | `"bottom-right"`          |                                                    |
| `hideButton`       | `boolean`                              | `false`                   | Modal without the floating button.                 |
| `width`/`height`   | `number`                               | `460` / `720`             | Modal iframe size.                                 |
| `onOpen`/`onClose` | `() => void`                           | —                         | Modal lifecycle callbacks.                         |

## How it works

The widget loads `${baseUrl}/book/<clientCode>[/<slug>]` in an iframe. The tenant
is identified by the public `clientCode` (not a secret). Everything else —
availability, free/busy against the owner's Google calendar, intake questions,
lead creation, and the Google Calendar/Meet event — happens on the hosted page.

## License

MIT
