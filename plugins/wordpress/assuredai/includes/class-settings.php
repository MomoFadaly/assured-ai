<?php
/**
 * AssuredAI — settings page + option contract.
 *
 * One source of truth for every option the plugin reads. Settings are
 * registered with the WP Settings API so they show up under
 * Settings → AssuredAI, are autoloaded into the option cache, and play
 * nicely with WP Multisite and configuration-as-code tooling
 * (wp-cli, WP-CFM).
 *
 * @package AssuredAI
 */

declare(strict_types=1);

namespace AssuredAI;

if (!defined('ABSPATH')) {
    exit;
}

final class Settings {
    public const OPTION_API_BASE = 'assuredai_api_base';
    public const OPTION_API_KEY  = 'assuredai_api_key';
    public const OPTION_PACK     = 'assuredai_default_pack';
    public const OPTION_GATE     = 'assuredai_gate_publish';
    public const OPTION_GATE_MIN_CITED_PCT = 'assuredai_gate_min_cited_pct';
    public const OPTION_AUTO_VERIFY = 'assuredai_auto_verify_on_save';

    public const DEFAULT_API_BASE = 'https://assuredai.online';
    public const DEFAULT_PACK     = 'healthcare';

    public const PACK_CHOICES = [
        'healthcare' => 'Healthcare (HIPAA Safe-Harbor)',
        'finance'    => 'Finance (SEC / FINRA / SOX / PCI-DSS)',
        'government' => 'Government (Section 508 / plain language)',
        'legal'      => 'Legal (ABA Model Rules)',
    ];

    private static ?self $instance = null;

    public static function instance(): self {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action('admin_init', [$this, 'register_settings']);
        add_action('admin_menu', [$this, 'register_menu']);
        add_filter('plugin_action_links_' . plugin_basename(ASSUREDAI_PLUGIN_FILE), [$this, 'plugin_action_links']);
    }

    // ----------------------------------------------------------------
    // Public option accessors — used by every other class.
    // ----------------------------------------------------------------

    public static function api_base(): string {
        $v = trim((string) get_option(self::OPTION_API_BASE, self::DEFAULT_API_BASE));
        return $v !== '' ? rtrim($v, '/') : self::DEFAULT_API_BASE;
    }

    public static function api_key(): string {
        return trim((string) get_option(self::OPTION_API_KEY, ''));
    }

    public static function default_pack(): string {
        $v = (string) get_option(self::OPTION_PACK, self::DEFAULT_PACK);
        return array_key_exists($v, self::PACK_CHOICES) ? $v : self::DEFAULT_PACK;
    }

    public static function gate_publish_enabled(): bool {
        return (bool) get_option(self::OPTION_GATE, false);
    }

    public static function gate_min_cited_pct(): int {
        return max(0, min(100, (int) get_option(self::OPTION_GATE_MIN_CITED_PCT, 70)));
    }

    public static function auto_verify_on_save(): bool {
        return (bool) get_option(self::OPTION_AUTO_VERIFY, false);
    }

    public static function is_configured(): bool {
        return self::api_key() !== '' && self::api_base() !== '';
    }

    // ----------------------------------------------------------------
    // Settings API registration.
    // ----------------------------------------------------------------

    public function register_settings(): void {
        register_setting('assuredai', self::OPTION_API_BASE, [
            'type'              => 'string',
            'sanitize_callback' => static fn($v) => esc_url_raw((string) $v),
            'default'           => self::DEFAULT_API_BASE,
        ]);
        register_setting('assuredai', self::OPTION_API_KEY, [
            'type'              => 'string',
            'sanitize_callback' => static fn($v) => sanitize_text_field((string) $v),
            'default'           => '',
        ]);
        register_setting('assuredai', self::OPTION_PACK, [
            'type'              => 'string',
            'sanitize_callback' => static fn($v) => array_key_exists($v, self::PACK_CHOICES) ? $v : self::DEFAULT_PACK,
            'default'           => self::DEFAULT_PACK,
        ]);
        register_setting('assuredai', self::OPTION_GATE, [
            'type'              => 'boolean',
            'sanitize_callback' => static fn($v) => (bool) $v,
            'default'           => false,
        ]);
        register_setting('assuredai', self::OPTION_GATE_MIN_CITED_PCT, [
            'type'              => 'integer',
            'sanitize_callback' => static fn($v) => max(0, min(100, (int) $v)),
            'default'           => 70,
        ]);
        register_setting('assuredai', self::OPTION_AUTO_VERIFY, [
            'type'              => 'boolean',
            'sanitize_callback' => static fn($v) => (bool) $v,
            'default'           => false,
        ]);
    }

    public function register_menu(): void {
        add_options_page(
            __('AssuredAI', 'assuredai'),
            __('AssuredAI', 'assuredai'),
            'manage_options',
            'assuredai',
            [$this, 'render_page']
        );
    }

    public function plugin_action_links(array $links): array {
        $url = admin_url('options-general.php?page=assuredai');
        array_unshift($links, '<a href="' . esc_url($url) . '">' . esc_html__('Settings', 'assuredai') . '</a>');
        return $links;
    }

    public function render_page(): void {
        if (!current_user_can('manage_options')) {
            wp_die(esc_html__('You do not have permission to manage AssuredAI settings.', 'assuredai'));
        }

        // Reachability ping when the user clicks "Test connection"
        $ping = null;
        if (isset($_POST['assuredai_test_nonce']) && wp_verify_nonce(sanitize_text_field(wp_unslash((string) $_POST['assuredai_test_nonce'])), 'assuredai_test')) {
            $ping = Client::instance()->ping();
        }
        ?>
        <div class="wrap">
            <h1><?php esc_html_e('AssuredAI', 'assuredai'); ?></h1>
            <p class="description" style="max-width:760px;">
                <?php esc_html_e('Verify AI-assisted posts against your vertical pack before they publish. Every verification produces a hash-chained audit row and a public proof URL that compliance can hand to a regulator.', 'assuredai'); ?>
            </p>

            <?php if ($ping !== null) : ?>
                <?php if ($ping['ok']) : ?>
                    <div class="notice notice-success is-dismissible"><p><strong><?php esc_html_e('Connection OK.', 'assuredai'); ?></strong> <?php echo esc_html(sprintf(__('Tenant: %1$s · Pack: %2$s', 'assuredai'), $ping['tenant'] ?? '—', $ping['pack'] ?? '—')); ?></p></div>
                <?php else : ?>
                    <div class="notice notice-error is-dismissible"><p><strong><?php esc_html_e('Connection failed.', 'assuredai'); ?></strong> <?php echo esc_html((string) ($ping['error'] ?? '')); ?></p></div>
                <?php endif; ?>
            <?php endif; ?>

            <form action="options.php" method="post">
                <?php settings_fields('assuredai'); ?>

                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row"><label for="<?php echo esc_attr(self::OPTION_API_BASE); ?>"><?php esc_html_e('AssuredAI base URL', 'assuredai'); ?></label></th>
                        <td>
                            <input type="url" class="regular-text code" name="<?php echo esc_attr(self::OPTION_API_BASE); ?>" id="<?php echo esc_attr(self::OPTION_API_BASE); ?>" value="<?php echo esc_attr(self::api_base()); ?>" placeholder="<?php echo esc_attr(self::DEFAULT_API_BASE); ?>" />
                            <p class="description"><?php esc_html_e('For cloud customers leave the default. For self-hosted, point at your internal hostname.', 'assuredai'); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="<?php echo esc_attr(self::OPTION_API_KEY); ?>"><?php esc_html_e('API key', 'assuredai'); ?></label></th>
                        <td>
                            <input type="password" class="regular-text code" name="<?php echo esc_attr(self::OPTION_API_KEY); ?>" id="<?php echo esc_attr(self::OPTION_API_KEY); ?>" value="<?php echo esc_attr(self::api_key()); ?>" autocomplete="off" placeholder="ak_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
                            <p class="description">
                                <?php printf(
                                    /* translators: %s = admin/api-keys URL */
                                    esc_html__('Mint a key in the AssuredAI admin at %s. Keys are shown once; if you lose it, issue a new one.', 'assuredai'),
                                    '<a href="' . esc_url(self::api_base() . '/admin/api-keys') . '" target="_blank" rel="noopener noreferrer">/admin/api-keys</a>'
                                ); ?>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="<?php echo esc_attr(self::OPTION_PACK); ?>"><?php esc_html_e('Default vertical pack', 'assuredai'); ?></label></th>
                        <td>
                            <select name="<?php echo esc_attr(self::OPTION_PACK); ?>" id="<?php echo esc_attr(self::OPTION_PACK); ?>">
                                <?php foreach (self::PACK_CHOICES as $slug => $label) : ?>
                                    <option value="<?php echo esc_attr($slug); ?>" <?php selected(self::default_pack(), $slug); ?>><?php echo esc_html($label); ?></option>
                                <?php endforeach; ?>
                            </select>
                            <p class="description"><?php esc_html_e('Used when a post does not declare its own pack. Override per-post from the editor sidebar.', 'assuredai'); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('Auto-verify', 'assuredai'); ?></th>
                        <td>
                            <fieldset>
                                <label>
                                    <input type="checkbox" name="<?php echo esc_attr(self::OPTION_AUTO_VERIFY); ?>" value="1" <?php checked(self::auto_verify_on_save()); ?> />
                                    <?php esc_html_e('Automatically verify a post on every save.', 'assuredai'); ?>
                                </label>
                                <p class="description"><?php esc_html_e('Costs one verification per save. Leave off if you prefer to verify on demand from the post sidebar.', 'assuredai'); ?></p>
                            </fieldset>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('Publish gate', 'assuredai'); ?></th>
                        <td>
                            <fieldset>
                                <label>
                                    <input type="checkbox" name="<?php echo esc_attr(self::OPTION_GATE); ?>" value="1" <?php checked(self::gate_publish_enabled()); ?> />
                                    <?php esc_html_e('Block publish when the last verification is missing or fails the threshold.', 'assuredai'); ?>
                                </label>
                                <p class="description">
                                    <?php esc_html_e('Minimum % of paragraphs that must cite an approved source for publish:', 'assuredai'); ?>
                                    <input type="number" min="0" max="100" name="<?php echo esc_attr(self::OPTION_GATE_MIN_CITED_PCT); ?>" value="<?php echo esc_attr((string) self::gate_min_cited_pct()); ?>" style="width:5em;" />%
                                </p>
                            </fieldset>
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>

            <hr/>
            <h2><?php esc_html_e('Test connection', 'assuredai'); ?></h2>
            <p class="description"><?php esc_html_e('Pings the AssuredAI verifier with your saved API key and returns the resolved tenant + default pack.', 'assuredai'); ?></p>
            <form method="post" action="">
                <?php wp_nonce_field('assuredai_test', 'assuredai_test_nonce'); ?>
                <?php submit_button(__('Test connection', 'assuredai'), 'secondary', 'assuredai_test_submit', false); ?>
            </form>
        </div>
        <?php
    }
}
