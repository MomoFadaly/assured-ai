<?php
/**
 * AssuredAI — front-end proof rendering.
 *
 * For posts that carry an `_assuredai_audit_log_id` meta, automatically
 * append a small "Verified by AssuredAI · proof URL" badge to the
 * rendered content. Operators who want fine-grained placement can
 * disable the auto-append with the `assuredai/auto_append_badge`
 * filter and use the `[assuredai_proof]` shortcode or
 * `do_action('assuredai_proof_badge')` template tag instead.
 *
 * The badge HTML is intentionally minimal + inline-styled so it works
 * on any theme without enqueueing a stylesheet on every page-load.
 *
 * @package AssuredAI
 */

declare(strict_types=1);

namespace AssuredAI;

if (!defined('ABSPATH')) {
    exit;
}

final class Proof_Render {
    private static ?self $instance = null;

    public static function instance(): self {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_filter('the_content', [$this, 'maybe_append_badge'], 50);
        add_shortcode('assuredai_proof', [$this, 'shortcode']);
        add_action('assuredai_proof_badge', [$this, 'template_tag']);
    }

    public function maybe_append_badge(string $content): string {
        if (!is_singular(Meta_Box::supported_post_types()) || !in_the_loop() || !is_main_query()) {
            return $content;
        }
        /** Filter: skip auto-append. Theme/operator can render manually. */
        if (!apply_filters('assuredai/auto_append_badge', true)) {
            return $content;
        }
        $badge = $this->render_badge(get_the_ID());
        if ($badge === '') {
            return $content;
        }
        return $content . $badge;
    }

    public function shortcode(array $atts = []): string {
        $atts    = shortcode_atts(['post_id' => 0, 'style' => 'card'], $atts, 'assuredai_proof');
        $post_id = (int) $atts['post_id'] ?: (int) get_the_ID();
        return $this->render_badge($post_id, (string) $atts['style']);
    }

    public function template_tag(): void {
        echo $this->render_badge((int) get_the_ID());
    }

    public function render_badge(int $post_id, string $style = 'card'): string {
        if ($post_id <= 0) {
            return '';
        }
        $audit_id = (int) get_post_meta($post_id, Meta_Box::META_AUDIT_ID, true);
        if ($audit_id <= 0) {
            return '';
        }
        $proof_url = (string) get_post_meta($post_id, Meta_Box::META_PROOF_URL, true);
        if ($proof_url === '') {
            $proof_url = rtrim(Settings::api_base(), '/') . '/v/' . $audit_id;
        }
        $pack       = (string) get_post_meta($post_id, Meta_Box::META_PACK, true) ?: Settings::default_pack();
        $pack_label = Settings::PACK_CHOICES[$pack] ?? ucfirst($pack);
        $verified   = (string) get_post_meta($post_id, Meta_Box::META_VERIFIED_AT, true);
        $verified_human = $verified ? mysql2date(get_option('date_format'), $verified) : '';

        if ($style === 'inline') {
            return sprintf(
                '<p class="assuredai-proof-inline"><a href="%s" target="_blank" rel="noopener noreferrer">%s</a></p>',
                esc_url($proof_url),
                esc_html(sprintf(/* translators: %s = audit id */ __('Verified by AssuredAI · Proof #%s ↗', 'assuredai'), $audit_id))
            );
        }

        return sprintf(
            '<aside class="assuredai-proof-card" style="margin:24px 0;padding:14px 16px;border:1px solid #e5e7eb;border-radius:10px;background:#fcfcfd;font-size:13px;line-height:1.5;color:#374151;">
              <div style="font-size:10.5px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#0a0a0b;">%s</div>
              <div style="margin-top:6px;">%s</div>
              <div style="margin-top:8px;"><a href="%s" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#0a0a0b;color:#fff;text-decoration:none;font-weight:600;padding:6px 12px;border-radius:6px;font-size:12.5px;">%s</a></div>
            </aside>',
            esc_html__('Verified by AssuredAI', 'assuredai'),
            esc_html(sprintf(
                /* translators: 1 = pack label, 2 = verified date */
                __('%1$s pack · verified %2$s', 'assuredai'),
                $pack_label,
                $verified_human ?: __('recently', 'assuredai')
            )),
            esc_url($proof_url),
            esc_html(sprintf(__('Open proof URL #%s', 'assuredai'), $audit_id))
        );
    }
}
