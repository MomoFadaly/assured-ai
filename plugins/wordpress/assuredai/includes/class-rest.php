<?php
/**
 * AssuredAI — internal REST proxy.
 *
 * The plugin exposes one server-side endpoint under
 * `/wp-json/assuredai/v1/verify-post` that the editor JS calls. We
 * proxy through the WP backend (rather than calling AssuredAI from
 * the browser) so:
 *
 *   1. The API key never leaves the server.
 *   2. The post body the verifier sees matches what readers will see
 *      (rendered through `the_content` filters, not the raw editor
 *      input).
 *   3. We can persist the audit_log_id + score into post meta in the
 *      same request — no second round-trip from the browser.
 *
 * @package AssuredAI
 */

declare(strict_types=1);

namespace AssuredAI;

if (!defined('ABSPATH')) {
    exit;
}

final class REST {
    private static ?self $instance = null;

    public static function instance(): self {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action('rest_api_init', [$this, 'register_routes']);
        add_action('save_post', [$this, 'maybe_auto_verify'], 20, 3);
    }

    public function register_routes(): void {
        register_rest_route('assuredai/v1', '/verify-post', [
            'methods'             => 'POST',
            'callback'            => [$this, 'handle_verify'],
            'permission_callback' => [$this, 'can_verify'],
            'args'                => [
                'post_id' => [
                    'required'          => true,
                    'type'              => 'integer',
                    'sanitize_callback' => 'absint',
                ],
                'pack' => [
                    'required'          => false,
                    'type'              => 'string',
                    'sanitize_callback' => static fn($v) => sanitize_key((string) $v),
                ],
            ],
        ]);
    }

    public function can_verify(\WP_REST_Request $req): bool {
        $post_id = (int) $req->get_param('post_id');
        if ($post_id <= 0) {
            return false;
        }
        return current_user_can('edit_post', $post_id);
    }

    public function handle_verify(\WP_REST_Request $req) {
        $post_id = (int) $req->get_param('post_id');
        $post    = get_post($post_id);
        if (!$post) {
            return new \WP_Error('assuredai_no_post', __('Post not found.', 'assuredai'), ['status' => 404]);
        }

        $pack = (string) $req->get_param('pack');
        if ($pack === '' || !array_key_exists($pack, Settings::PACK_CHOICES)) {
            $pack = Settings::default_pack();
        }

        $article = self::prepare_article($post);
        if (strlen($article) < 40) {
            return new \WP_Error('assuredai_too_short', __('Post body is too short to verify. Add at least one paragraph.', 'assuredai'), ['status' => 400]);
        }

        $result = Client::instance()->verify($article, $pack, [
            'user_session_id' => 'wp:' . get_current_blog_id() . ':' . $post_id,
        ]);
        if (!$result['ok']) {
            return new \WP_Error('assuredai_remote_failed', (string) ($result['error'] ?? 'Unknown error'), ['status' => 502]);
        }

        $data       = (array) ($result['data'] ?? []);
        $audit_id   = (int) ($data['audit_log_id'] ?? 0);
        $verdict    = (string) ($data['verdict'] ?? $data['kind'] ?? '');
        $score      = self::extract_score($data);
        $proof_url  = $audit_id > 0
            ? rtrim(Settings::api_base(), '/') . '/v/' . $audit_id
            : '';

        if ($audit_id > 0) {
            update_post_meta($post_id, Meta_Box::META_AUDIT_ID,    $audit_id);
            update_post_meta($post_id, Meta_Box::META_PROOF_URL,   $proof_url);
        }
        update_post_meta($post_id, Meta_Box::META_PACK,        $pack);
        update_post_meta($post_id, Meta_Box::META_VERDICT,     $verdict);
        update_post_meta($post_id, Meta_Box::META_SCORE,       $score);
        update_post_meta($post_id, Meta_Box::META_VERIFIED_AT, gmdate('c'));

        return rest_ensure_response([
            'ok'           => true,
            'audit_log_id' => $audit_id,
            'verdict'      => $verdict,
            'pack'         => $pack,
            'score'        => $score,
            'proof_url'    => $proof_url,
            'verified_at'  => gmdate('c'),
        ]);
    }

    /**
     * Optional auto-verify on every save. Guarded by:
     *   - auto_verify_on_save setting
     *   - non-autosave, non-revision
     *   - capable user
     *   - supported post type
     */
    public function maybe_auto_verify(int $post_id, \WP_Post $post, bool $update): void {
        if (!Settings::auto_verify_on_save() || !Settings::is_configured()) {
            return;
        }
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }
        if (wp_is_post_revision($post_id) || $post->post_status === 'trash') {
            return;
        }
        if (!in_array($post->post_type, Meta_Box::supported_post_types(), true)) {
            return;
        }
        if (!current_user_can('edit_post', $post_id)) {
            return;
        }
        $pack = (string) get_post_meta($post_id, Meta_Box::META_PACK, true) ?: Settings::default_pack();
        $article = self::prepare_article($post);
        if (strlen($article) < 40) {
            return;
        }
        $result = Client::instance()->verify($article, $pack, [
            'user_session_id' => 'wp-autosave:' . get_current_blog_id() . ':' . $post_id,
        ]);
        if (!$result['ok']) {
            return;
        }
        $data     = (array) ($result['data'] ?? []);
        $audit_id = (int) ($data['audit_log_id'] ?? 0);
        if ($audit_id > 0) {
            $proof_url = rtrim(Settings::api_base(), '/') . '/v/' . $audit_id;
            update_post_meta($post_id, Meta_Box::META_AUDIT_ID,    $audit_id);
            update_post_meta($post_id, Meta_Box::META_PROOF_URL,   $proof_url);
        }
        update_post_meta($post_id, Meta_Box::META_PACK,        $pack);
        update_post_meta($post_id, Meta_Box::META_VERDICT,     (string) ($data['verdict'] ?? $data['kind'] ?? ''));
        update_post_meta($post_id, Meta_Box::META_SCORE,       self::extract_score($data));
        update_post_meta($post_id, Meta_Box::META_VERIFIED_AT, gmdate('c'));
    }

    // ----------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------

    /**
     * Render a post into the plain-text body we'll send to the
     * verifier. Strips HTML, normalizes whitespace, caps at 60 KB so
     * we never push past the verifier's payload limit.
     */
    public static function prepare_article(\WP_Post $post): string {
        $content = apply_filters('the_content', $post->post_content);
        $title   = trim(wp_strip_all_tags((string) $post->post_title));
        $body    = trim(wp_strip_all_tags((string) $content));
        $body    = preg_replace("/[ \t]+\n/", "\n", $body) ?? $body;
        $body    = preg_replace("/\n{3,}/", "\n\n", $body) ?? $body;
        $text    = trim(($title !== '' ? $title . "\n\n" : '') . $body);
        if (strlen($text) > 60_000) {
            $text = substr($text, 0, 60_000);
        }
        return $text;
    }

    /**
     * Extract a normalised score blob from the verifier's response so
     * the editor + downstream filters see the same shape regardless of
     * which verdict path the verifier took.
     *
     * @return array{cited_pct:int,citations:int,recognizer_hits:int,unsourced_paragraphs:int}
     */
    public static function extract_score(array $data): array {
        $detail = is_array($data['verification_detail'] ?? null) ? $data['verification_detail'] : [];
        $citations  = (int) ($detail['citation_count'] ?? count((array) ($data['citations'] ?? [])));
        $unsourced  = (int) ($detail['unsourced_paragraphs'] ?? 0);
        $sourced    = (int) ($detail['sourced_paragraphs']   ?? 0);
        $total      = $sourced + $unsourced;
        $cited_pct  = $total > 0 ? (int) round(($sourced / $total) * 100) : 0;
        $hits       = (int) ($detail['recognizer_hits'] ?? count((array) ($data['recognizer_hits'] ?? [])));
        return [
            'cited_pct'            => $cited_pct,
            'citations'            => $citations,
            'recognizer_hits'      => $hits,
            'unsourced_paragraphs' => $unsourced,
        ];
    }
}
