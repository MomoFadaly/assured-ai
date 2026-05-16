# AssuredAI for WordPress

The AssuredAI WordPress plugin verifies AI-assisted posts against your
vertical compliance pack before they publish, and attaches a
hash-chained `/v/<id>` proof URL to every published post for
tamper-evident regulator-ready compliance.

## What it adds

| Surface | What | Where |
|---|---|---|
| **Settings page** | API key, base URL, default pack, auto-verify, publish gate | `Settings → AssuredAI` |
| **Editor meta box** | "Verify now" button + scoreboard (verdict, cited %, PHI hits, proof URL) | Post / page sidebar |
| **REST proxy** | `POST /wp-json/assuredai/v1/verify-post` — API key stays server-side | WP REST |
| **Publish gate** | Optional: block publish when the latest verification fails or is missing | Filter on `wp_insert_post_data` |
| **Proof badge** | Auto-appends a compact "Verified by AssuredAI" card to post bodies | `the_content` filter |
| **Shortcode** | `[assuredai_proof]` (and `do_action('assuredai_proof_badge')` template tag) | Anywhere |
| **Post meta** | `_assuredai_audit_log_id`, `_assuredai_pack`, `_assuredai_verdict`, `_assuredai_score`, `_assuredai_proof_url`, `_assuredai_verified_at` | REST-exposed |

## Install

### Option 1 — Composer

```bash
composer require assuredai/wordpress
```

Composer with the `composer/installers` plugin lands it at
`wp-content/plugins/assuredai/`.

### Option 2 — Zip upload

1. Download the plugin folder as a zip (or
   `git clone` this directory).
2. WP admin → Plugins → Add new → Upload plugin.
3. Activate "AssuredAI — Verified AI Publishing".

### Configure

1. Mint an API key at
   `https://YOUR_TENANT.assuredai.online/admin/api-keys`.
2. WP admin → Settings → AssuredAI → paste the key, pick a default
   pack, save.
3. Open any post — the "AssuredAI verification" panel appears in the
   sidebar.

## Extensibility hooks

```php
// Restrict the meta box to a custom post type.
add_filter('assuredai/supported_post_types', fn($types) => ['post', 'patient_handout']);

// Skip the auto-appended proof badge (use the shortcode instead).
add_filter('assuredai/auto_append_badge', '__return_false');

// Bypass the publish gate for editorial overrides.
add_filter('assuredai/skip_publish_gate', fn($skip, $post_id) => current_user_can('manage_options'));
```

## WP-CLI

The plugin's settings are stored as standard WP options, so they're
fully scriptable:

```bash
wp option update assuredai_api_base    https://acme.assuredai.online
wp option update assuredai_api_key     ak_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
wp option update assuredai_default_pack healthcare
wp option update assuredai_gate_publish 1
wp option update assuredai_gate_min_cited_pct 70
```

## License

MIT.
