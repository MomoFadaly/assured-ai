<?php
/**
 * AssuredAI — HTTP client.
 *
 * Thin wrapper around WordPress's `wp_remote_*` API. Handles:
 *   - Bearer-token auth with the configured API key
 *   - Sensible timeouts (10s) that fit inside WP's admin request window
 *   - Structured response parsing so callers always see
 *     `['ok' => bool, 'data' => array, 'error' => string|null, 'status' => int]`
 *
 * @package AssuredAI
 */

declare(strict_types=1);

namespace AssuredAI;

if (!defined('ABSPATH')) {
    exit;
}

final class Client {
    private static ?self $instance = null;

    public static function instance(): self {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Reachability check: hits a lightweight known endpoint with the
     * configured key. Used by the settings page's "Test connection".
     *
     * @return array{ok:bool,error?:string,tenant?:string,pack?:string,status?:int}
     */
    public function ping(): array {
        if (!Settings::is_configured()) {
            return ['ok' => false, 'error' => __('Set the API key + base URL first.', 'assuredai')];
        }

        // /api/packs is unauth-public but accepts a Bearer for tenant
        // resolution echo-back. Cheap GET; no verification billed.
        $r = $this->get('/api/packs');
        if (!$r['ok']) {
            return ['ok' => false, 'error' => $r['error'] ?? __('Unknown error', 'assuredai'), 'status' => $r['status']];
        }
        $packs = is_array($r['data']['packs'] ?? null) ? $r['data']['packs'] : [];
        $names = [];
        foreach ($packs as $p) {
            if (is_array($p) && isset($p['slug'])) {
                $names[] = (string) $p['slug'];
            }
        }
        return [
            'ok'     => true,
            'tenant' => 'default',
            'pack'   => implode(', ', array_slice($names, 0, 4)),
            'status' => $r['status'],
        ];
    }

    /**
     * Run a verification against the configured AssuredAI tenant.
     *
     * @param string $article         Plain-text article body (HTML stripped upstream).
     * @param string $pack_slug       Vertical pack slug.
     * @param array{user_session_id?:string} $opts Optional extras for the request payload.
     * @return array{ok:bool,error?:string,data?:array,status?:int}
     */
    public function verify(string $article, string $pack_slug, array $opts = []): array {
        if (!Settings::is_configured()) {
            return ['ok' => false, 'error' => __('AssuredAI is not configured. Add an API key in Settings → AssuredAI.', 'assuredai')];
        }

        $body = [
            'vertical_pack_slug' => $pack_slug,
            'input_mode'         => 'paste',
            'article'            => $article,
        ];
        if (!empty($opts['user_session_id'])) {
            $body['user_session_id'] = (string) $opts['user_session_id'];
        }
        return $this->post('/api/verify', $body, 60);
    }

    // ----------------------------------------------------------------
    // Low-level helpers
    // ----------------------------------------------------------------

    private function get(string $path): array {
        return $this->request('GET', $path, null, 10);
    }

    private function post(string $path, array $body, int $timeout = 10): array {
        return $this->request('POST', $path, $body, $timeout);
    }

    private function request(string $method, string $path, ?array $body, int $timeout): array {
        $url  = Settings::api_base() . $path;
        $args = [
            'method'  => $method,
            'timeout' => $timeout,
            'headers' => [
                'User-Agent'    => 'AssuredAI-WordPress/' . ASSUREDAI_VERSION . ' (' . home_url() . ')',
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
                'Authorization' => 'Bearer ' . Settings::api_key(),
            ],
        ];
        if ($body !== null) {
            $args['body'] = (string) wp_json_encode($body);
        }
        $resp = wp_remote_request($url, $args);
        if (is_wp_error($resp)) {
            return ['ok' => false, 'error' => $resp->get_error_message(), 'status' => 0];
        }
        $status = (int) wp_remote_retrieve_response_code($resp);
        $raw    = (string) wp_remote_retrieve_body($resp);
        $data   = json_decode($raw, true);
        if (!is_array($data)) {
            $data = ['raw' => $raw];
        }
        if ($status < 200 || $status >= 300) {
            $err = isset($data['error']) ? (string) $data['error'] : sprintf(__('HTTP %d', 'assuredai'), $status);
            return ['ok' => false, 'error' => $err, 'status' => $status, 'data' => $data];
        }
        return ['ok' => true, 'data' => $data, 'status' => $status];
    }
}
