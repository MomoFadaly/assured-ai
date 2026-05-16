<?php
/**
 * AssuredAI — publish gate.
 *
 * Optional enforcement layer: when `gate_publish` is enabled in
 * Settings, refuse to transition a post to "publish" unless the most
 * recent verification meets the configured cited-paragraphs threshold
 * AND the verifier didn't return a blocked / escalated verdict.
 *
 * The gate is intentionally additive — it never modifies the post,
 * only blocks the transition. Admins can override with the
 * `assuredai/skip_publish_gate` filter (e.g. for an editorial
 * override workflow).
 *
 * @package AssuredAI
 */

declare(strict_types=1);

namespace AssuredAI;

if (!defined('ABSPATH')) {
    exit;
}

final class Publish_Gate {
    private static ?self $instance = null;

    public static function instance(): self {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_filter('wp_insert_post_data', [$this, 'maybe_block_publish'], 10, 2);
    }

    /**
     * Hook into the pre-write step. If the post is transitioning into
     * 'publish' and the gate fails, downgrade to 'pending' so the
     * editor sees a clear "Submit for review" state instead of a
     * silent failure.
     */
    public function maybe_block_publish(array $data, array $postarr): array {
        if (!Settings::gate_publish_enabled() || !Settings::is_configured()) {
            return $data;
        }
        if (($data['post_status'] ?? '') !== 'publish') {
            return $data;
        }
        if (!in_array($data['post_type'] ?? '', Meta_Box::supported_post_types(), true)) {
            return $data;
        }
        $post_id = (int) ($postarr['ID'] ?? 0);
        if ($post_id <= 0) {
            return $data;
        }
        if (apply_filters('assuredai/skip_publish_gate', false, $post_id, $data, $postarr)) {
            return $data;
        }

        $verdict   = (string) get_post_meta($post_id, Meta_Box::META_VERDICT, true);
        $score     = (array)  get_post_meta($post_id, Meta_Box::META_SCORE, true);
        $cited_pct = (int)    ($score['cited_pct'] ?? 0);
        $audit_id  = (int)    get_post_meta($post_id, Meta_Box::META_AUDIT_ID, true);

        $reason = null;
        if ($audit_id <= 0) {
            $reason = __('Verify this post with AssuredAI before publishing.', 'assuredai');
        } elseif (in_array($verdict, ['blocked', 'cannot_answer', 'escalated'], true)) {
            $reason = sprintf(
                /* translators: %s = verdict */
                __('AssuredAI verifier returned "%s" — resolve before publishing.', 'assuredai'),
                $verdict
            );
        } elseif ($cited_pct < Settings::gate_min_cited_pct()) {
            $reason = sprintf(
                /* translators: 1 = actual %%, 2 = required %% */
                __('Only %1$d%% of paragraphs cite an approved source — minimum is %2$d%%.', 'assuredai'),
                $cited_pct,
                Settings::gate_min_cited_pct()
            );
        }

        if ($reason !== null) {
            // Stash the reason so the post-edit screen can surface a
            // friendly admin notice.
            set_transient('assuredai_blocked_' . $post_id, $reason, 60);
            $data['post_status'] = 'pending';
        }
        return $data;
    }
}

// One-shot admin notice when a gate fired on the just-saved post.
add_action('admin_notices', function () {
    global $post;
    if (!$post instanceof \WP_Post) {
        return;
    }
    $key = 'assuredai_blocked_' . (int) $post->ID;
    $msg = get_transient($key);
    if (!$msg) {
        return;
    }
    delete_transient($key);
    printf(
        '<div class="notice notice-warning"><p><strong>%s</strong> %s</p></div>',
        esc_html__('AssuredAI publish gate:', 'assuredai'),
        esc_html((string) $msg)
    );
});
