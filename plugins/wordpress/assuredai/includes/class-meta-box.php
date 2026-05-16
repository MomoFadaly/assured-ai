<?php
/**
 * AssuredAI — post-editor meta box.
 *
 * Adds a "Verify with AssuredAI" sidebar block to the classic editor
 * and a matching panel to the Gutenberg sidebar. Both surface:
 *
 *   - Vertical pack selector (defaults to site-wide setting)
 *   - Verify button → POSTs the rendered post body to the AssuredAI
 *     verifier through our REST proxy (so the API key never reaches
 *     the browser).
 *   - Result card: verdict, citations %, proof URL.
 *
 * Post meta keys (queryable via REST + WP-CLI):
 *   assuredai_audit_log_id  bigint
 *   assuredai_pack          string slug
 *   assuredai_verdict       string (one of: answered, cannot_answer, blocked, escalated)
 *   assuredai_score         array  { cited_pct, citations, recognizer_hits }
 *   assuredai_verified_at   ISO timestamp
 *
 * @package AssuredAI
 */

declare(strict_types=1);

namespace AssuredAI;

if (!defined('ABSPATH')) {
    exit;
}

final class Meta_Box {
    public const META_AUDIT_ID    = '_assuredai_audit_log_id';
    public const META_PACK        = '_assuredai_pack';
    public const META_VERDICT     = '_assuredai_verdict';
    public const META_SCORE       = '_assuredai_score';
    public const META_VERIFIED_AT = '_assuredai_verified_at';
    public const META_PROOF_URL   = '_assuredai_proof_url';

    private static ?self $instance = null;

    public static function instance(): self {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action('add_meta_boxes', [$this, 'register_meta_box']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_assets']);

        // Register meta as REST-exposed so Gutenberg can read/write it
        // through the wp.data store + the block editor can show the
        // proof URL in its post-publish panel.
        add_action('init', [$this, 'register_post_meta']);
    }

    public function register_meta_box(): void {
        $post_types = self::supported_post_types();
        foreach ($post_types as $type) {
            add_meta_box(
                'assuredai-verify',
                __('AssuredAI verification', 'assuredai'),
                [$this, 'render_meta_box'],
                $type,
                'side',
                'high'
            );
        }
    }

    public function register_post_meta(): void {
        $post_types = self::supported_post_types();
        $meta = [
            self::META_AUDIT_ID    => ['type' => 'integer', 'single' => true, 'show_in_rest' => true],
            self::META_PACK        => ['type' => 'string',  'single' => true, 'show_in_rest' => true],
            self::META_VERDICT     => ['type' => 'string',  'single' => true, 'show_in_rest' => true],
            self::META_VERIFIED_AT => ['type' => 'string',  'single' => true, 'show_in_rest' => true],
            self::META_PROOF_URL   => ['type' => 'string',  'single' => true, 'show_in_rest' => true],
            self::META_SCORE       => [
                'type'         => 'object',
                'single'       => true,
                'show_in_rest' => [
                    'schema' => [
                        'type' => 'object',
                        'properties' => [
                            'cited_pct'        => ['type' => 'integer'],
                            'citations'        => ['type' => 'integer'],
                            'recognizer_hits'  => ['type' => 'integer'],
                        ],
                        'additionalProperties' => true,
                    ],
                ],
            ],
        ];
        foreach ($post_types as $type) {
            foreach ($meta as $key => $args) {
                $args['auth_callback'] = static fn() => current_user_can('edit_posts');
                register_post_meta($type, $key, $args);
            }
        }
    }

    public function enqueue_assets($hook): void {
        if (!in_array($hook, ['post.php', 'post-new.php'], true)) {
            return;
        }
        wp_enqueue_style(
            'assuredai-meta-box',
            ASSUREDAI_PLUGIN_URL . 'assets/css/meta-box.css',
            [],
            ASSUREDAI_VERSION
        );
        wp_enqueue_script(
            'assuredai-meta-box',
            ASSUREDAI_PLUGIN_URL . 'assets/js/meta-box.js',
            ['jquery', 'wp-api-fetch'],
            ASSUREDAI_VERSION,
            true
        );
        wp_localize_script('assuredai-meta-box', 'AssuredAIMetaBox', [
            'restNonce'        => wp_create_nonce('wp_rest'),
            'restRoot'         => esc_url_raw(rest_url('assuredai/v1/')),
            'apiBase'          => Settings::api_base(),
            'isConfigured'     => Settings::is_configured(),
            'defaultPack'      => Settings::default_pack(),
            'packs'            => Settings::PACK_CHOICES,
            'autoVerifyOnSave' => Settings::auto_verify_on_save(),
            'i18n'             => [
                'verify'         => __('Verify now', 'assuredai'),
                'verifying'      => __('Verifying…', 'assuredai'),
                'noKey'          => __('AssuredAI is not configured. Visit Settings → AssuredAI.', 'assuredai'),
                'verifyFailed'   => __('Verification failed:', 'assuredai'),
                'openProof'      => __('Open proof URL', 'assuredai'),
                'pack'           => __('Vertical pack', 'assuredai'),
                'lastVerified'   => __('Last verified', 'assuredai'),
                'verdict'        => __('Verdict', 'assuredai'),
                'citedPct'       => __('Cited paragraphs', 'assuredai'),
                'recognizerHits' => __('PHI / PII hits', 'assuredai'),
                'never'          => __('Never', 'assuredai'),
            ],
        ]);
    }

    public function render_meta_box(\WP_Post $post): void {
        $audit_id   = (int) get_post_meta($post->ID, self::META_AUDIT_ID, true);
        $pack       = (string) get_post_meta($post->ID, self::META_PACK, true) ?: Settings::default_pack();
        $verdict    = (string) get_post_meta($post->ID, self::META_VERDICT, true);
        $verified   = (string) get_post_meta($post->ID, self::META_VERIFIED_AT, true);
        $proof_url  = (string) get_post_meta($post->ID, self::META_PROOF_URL, true);
        $score      = (array) get_post_meta($post->ID, self::META_SCORE, true);
        ?>
        <div id="assuredai-meta-box" data-post-id="<?php echo esc_attr((string) $post->ID); ?>">
            <?php if (!Settings::is_configured()) : ?>
                <p class="assuredai-warn">
                    <?php
                    printf(
                        /* translators: %s = link to plugin settings */
                        esc_html__('AssuredAI is not configured. %s', 'assuredai'),
                        '<a href="' . esc_url(admin_url('options-general.php?page=assuredai')) . '">' . esc_html__('Open Settings', 'assuredai') . '</a>'
                    );
                    ?>
                </p>
            <?php endif; ?>

            <p>
                <label for="assuredai-pack-select" class="assuredai-label"><?php esc_html_e('Vertical pack', 'assuredai'); ?></label>
                <select id="assuredai-pack-select" name="assuredai_pack">
                    <?php foreach (Settings::PACK_CHOICES as $slug => $label) : ?>
                        <option value="<?php echo esc_attr($slug); ?>" <?php selected($pack, $slug); ?>><?php echo esc_html($label); ?></option>
                    <?php endforeach; ?>
                </select>
            </p>

            <p>
                <button type="button" class="button button-primary" id="assuredai-verify-button" <?php disabled(!Settings::is_configured()); ?>>
                    <?php esc_html_e('Verify now', 'assuredai'); ?>
                </button>
            </p>

            <div id="assuredai-result" class="assuredai-result" <?php echo $audit_id > 0 ? '' : 'hidden'; ?>>
                <div class="assuredai-row">
                    <span class="assuredai-row-label"><?php esc_html_e('Verdict', 'assuredai'); ?></span>
                    <span class="assuredai-badge assuredai-badge-<?php echo esc_attr($verdict ?: 'unknown'); ?>" id="assuredai-verdict"><?php echo esc_html($verdict ?: '—'); ?></span>
                </div>
                <div class="assuredai-row">
                    <span class="assuredai-row-label"><?php esc_html_e('Cited paragraphs', 'assuredai'); ?></span>
                    <span class="assuredai-row-value" id="assuredai-cited-pct"><?php echo isset($score['cited_pct']) ? esc_html(((int) $score['cited_pct']) . '%') : '—'; ?></span>
                </div>
                <div class="assuredai-row">
                    <span class="assuredai-row-label"><?php esc_html_e('PHI / PII hits', 'assuredai'); ?></span>
                    <span class="assuredai-row-value" id="assuredai-recog-hits"><?php echo isset($score['recognizer_hits']) ? esc_html((string) (int) $score['recognizer_hits']) : '—'; ?></span>
                </div>
                <div class="assuredai-row">
                    <span class="assuredai-row-label"><?php esc_html_e('Last verified', 'assuredai'); ?></span>
                    <span class="assuredai-row-value" id="assuredai-verified-at"><?php echo $verified ? esc_html(mysql2date(get_option('date_format') . ' ' . get_option('time_format'), $verified)) : esc_html__('Never', 'assuredai'); ?></span>
                </div>
                <p>
                    <a href="<?php echo esc_url($proof_url ?: '#'); ?>" id="assuredai-proof-link" target="_blank" rel="noopener noreferrer" class="button" <?php echo $proof_url ? '' : 'hidden'; ?>>
                        <?php esc_html_e('Open proof URL', 'assuredai'); ?> ↗
                    </a>
                </p>
            </div>
            <div id="assuredai-error" class="assuredai-error" hidden></div>
        </div>
        <?php
    }

    /**
     * @return string[]
     */
    public static function supported_post_types(): array {
        /** Filter: which post types get the AssuredAI meta box. */
        return (array) apply_filters('assuredai/supported_post_types', ['post', 'page']);
    }
}
