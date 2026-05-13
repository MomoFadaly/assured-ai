# AssuredAI Chrome Extension

A browser surface that lets writers verify any selection on any web page with
the full AssuredAI compliance pipeline — without leaving their CMS, doc editor,
or draft.

## What it does

- **Highlight to verify.** Select text on any supported site (Google Docs, Notion,
  WordPress admin, Substack, Medium) and a floating "Verify with AssuredAI"
  button appears. Click it to run PII redaction, medical red-flag detection,
  sentence-level sourcing, and disclaimer checks on the selection.
- **Keyboard shortcut.** `⌘⇧V` (or `Ctrl+Shift+V`) verifies the current selection
  without needing the floating button.
- **Right-click menu.** "Verify with AssuredAI" appears in the context menu
  whenever text is selected.
- **Popup quick-verify.** Click the extension icon to paste an article and
  verify it without leaving the current page.
- **Inline verdict panel.** Results render in a slide-in panel at the bottom of
  the page — verdict, PII / unsourced counts, link to the public proof URL.

## Installing locally (developer mode)

This MVP is unpacked. To load it:

1. Open `chrome://extensions` in Chrome (or Brave / Edge).
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select this `extension/` directory.
5. Make sure AssuredAI is running on `http://localhost:3030` (or update the API
   base URL in the extension popup).

## Configuring the API base

Click the extension icon to open the popup. The **Settings** card lets you
change the API base URL — point it at your production AssuredAI deployment
when you ship.

## Notes

- This MVP ships without packaged icons. Drop your own `icon-16.png`,
  `icon-32.png`, `icon-48.png`, `icon-128.png` into `extension/icons/` before
  publishing to the Chrome Web Store.
- The host-permission list is broad (`https://*/*`) to keep the demo
  frictionless. Tighten before submitting to the Web Store.
- All API calls go through the background service worker so the content
  scripts and popup share auth / settings.
