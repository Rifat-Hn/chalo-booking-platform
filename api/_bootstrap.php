
<?php


/*
 * Chalo API Bootstrap
 * Shared foundation for all database-driven category APIs.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/**
 * Return a consistent JSON response.
 */
function api_response(
    bool $success,
    string $message,
    array $data = [],
    int $status = 200
): never {
    http_response_code($status);

    echo json_encode(
        [
            'success' => $success,
            'message' => $message,
            'data' => $data
        ],
        JSON_UNESCAPED_UNICODE |
        JSON_UNESCAPED_SLASHES |
        JSON_INVALID_UTF8_SUBSTITUTE
    );

    exit;
}

/**
 * Read and trim a GET parameter.
 */
function api_get(string $key, string $default = ''): string
{
    $value = $_GET[$key] ?? $default;

    if (!is_scalar($value)) {
        return $default;
    }

    return trim((string) $value);
}

/**
 * Validate a date in YYYY-MM-DD format.
 */
function api_valid_date(string $date): bool
{
    $parsed = DateTime::createFromFormat('!Y-m-d', $date);

    return $parsed !== false &&
        $parsed->format('Y-m-d') === $date;
}

/**
 * Load the existing Chalo PDO database connection.
 */
try {
    require_once __DIR__ . '/../config/database.php';

    if (!isset($pdo) || !$pdo instanceof PDO) {
        throw new RuntimeException('PDO connection is unavailable.');
    }
} catch (Throwable $exception) {
    error_log('Chalo API bootstrap error: ' . $exception->getMessage());

    api_response(
        false,
        'Unable to connect to the database. Check your database configuration.',
        [],
        500
    );
}
