<?php
/**
 * Plugin Name:       AssuredAI — Verified AI Publishing
 * Plugin URI:        https://assuredai.online
 * Description:       Verify AI-assisted posts against your vertical pack (HIPAA, FINRA, ABA, FedRAMP-ready) before publishing. Adds a hash-chained proof URL to every published post for tamper-evident compliance.
 * Version:           1.0.0
 * Requires at least: 6.4
 * Requires PHP:      8.1
 * Author:            AssuredAI
 * Author URI:        https://assuredai.online
 * License:           MIT
 * Text Domain:       assuredai
 * Domain Path:       /languages
 *
 * @package AssuredAI
 */

declare(strict_types=1);

if (!defined('ABSPATH')) {
    exit;
}

define('ASSUREDAI_VERSION', '1.0.0');
define('ASSUREDAI_PLUGIN_FILE', __FILE__);
define('ASSUREDAI_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('ASSUREDAI_PLUGIN_URL', plugin_dir_url(__FILE__));

// Core classes — autoloaded by inclusion (no composer required for the
// plugin itself; consumers may install it standalone or via composer).
require_once ASSUREDAI_PLUGIN_DIR . 'includes/class-settings.php';
require_once ASSUREDAI_PLUGIN_DIR . 'includes/class-client.php';
require_once ASSUREDAI_PLUGIN_DIR . 'includes/class-meta-box.php';
require_once ASSUREDAI_PLUGIN_DIR . 'includes/class-rest.php';
require_once ASSUREDAI_PLUGIN_DIR . 'includes/class-proof-render.php';
require_once ASSUREDAI_PLUGIN_DIR . 'includes/class-publish-gate.php';

/**
 * Boot the plugin on plugins_loaded so all WP APIs are available and
 * other plugins (e.g. multisite, polylang) have wired their hooks.
 */
function assuredai_boot(): void {
    load_plugin_textdomain('assuredai', false, dirname(plugin_basename(__FILE__)) . '/languages');

    \AssuredAI\Settings::instance();
    \AssuredAI\Meta_Box::instance();
    \AssuredAI\REST::instance();
    \AssuredAI\Proof_Render::instance();
    \AssuredAI\Publish_Gate::instance();
}
add_action('plugins_loaded', 'assuredai_boot');

/**
 * Activation: stash the install timestamp so the settings page can
 * show a friendly first-run banner.
 */
function assuredai_activate(): void {
    if (!get_option('assuredai_installed_at')) {
        add_option('assuredai_installed_at', current_time('mysql', true));
    }
}
register_activation_hook(__FILE__, 'assuredai_activate');
