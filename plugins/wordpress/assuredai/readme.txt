=== AssuredAI — Verified AI Publishing ===
Contributors: assuredai
Tags: ai, compliance, hipaa, finra, content moderation, audit, gutenberg
Requires at least: 6.4
Tested up to: 6.7
Requires PHP: 8.1
Stable tag: 1.0.0
License: MIT
License URI: https://opensource.org/licenses/MIT

Verify AI-assisted posts against your vertical compliance pack before they
publish. Every verification produces a hash-chained audit row and a public
proof URL that compliance can hand to a regulator.

== Description ==

AssuredAI is the proof layer for regulated AI publishing. This plugin
integrates the AssuredAI verifier directly into your WordPress editorial
workflow.

* **Verify on demand** — sidebar "Verify with AssuredAI" button runs your
  post through the verifier of record (HIPAA, FINRA, ABA, FedRAMP-ready
  vertical packs) and shows the scoreboard in your editor.
* **Optional publish gate** — refuse to publish posts that fail PHI/PII
  recognizers or fall below a citation threshold.
* **Hash-chained proof URL** — every verification yields a tamper-evident
  `/v/<id>` proof page you can link from the post itself.
* **REST + meta surfaces** — every score lives in standard WP post meta
  (`_assuredai_audit_log_id`, `_assuredai_verdict`, `_assuredai_score`),
  so reporting, exports, and headless front-ends can consume it.

Get an AssuredAI tenant + API key at [assuredai.online](https://assuredai.online).

== Installation ==

1. Upload the plugin folder to `/wp-content/plugins/assuredai/`, or
   install via the WP admin Plugins screen.
2. Activate the plugin.
3. Visit **Settings → AssuredAI** and paste your API key
   (mint one at `/admin/api-keys` on your AssuredAI tenant).

== Frequently Asked Questions ==

= Does the API key ever reach the browser? =

No. All calls to the AssuredAI verifier are proxied through the WordPress
backend via `/wp-json/assuredai/v1/verify-post`. The browser never sees
the bearer token.

= Can I block publish if verification fails? =

Yes — turn on the **Publish gate** in Settings → AssuredAI and set the
minimum cited-paragraphs threshold. Posts that fail get bumped back to
"Pending review" with a visible reason.

= How do I show the proof badge on the front-end? =

By default the plugin appends a small "Verified by AssuredAI" badge to
the post body. To control placement, disable the auto-append with
`add_filter('assuredai/auto_append_badge', '__return_false');` and use
the `[assuredai_proof]` shortcode or
`do_action('assuredai_proof_badge');` template tag.

== Changelog ==

= 1.0.0 =
* Initial release.
* Verify meta-box + REST proxy.
* Publish gate.
* Proof badge auto-append + shortcode.
