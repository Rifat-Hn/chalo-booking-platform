<?php
declare(strict_types=1);

/*
 * Chalo database connection.
 * XAMPP defaults: host=127.0.0.1, database=chalo_db, user=root, password empty.
 * Change these values for your own MySQL setup / production hosting.
 */
$DB_HOST = getenv('CHALO_DB_HOST') ?: '127.0.0.1';
$DB_NAME = getenv('CHALO_DB_NAME') ?: 'chalo_db';
$DB_USER = getenv('CHALO_DB_USER') ?: 'root';
$DB_PASS = getenv('CHALO_DB_PASS') ?: '';

$dsn = "mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    $pdo = new PDO($dsn, $DB_USER, $DB_PASS, $options);
} catch (PDOException $e) {
    error_log('Chalo database connection failed: ' . $e->getMessage());
    http_response_code(500);
    if (str_contains($_SERVER['SCRIPT_NAME'] ?? '', '/api/')) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => false, 'message' => 'Database connection failed. Check config/database.php and import chalo_database.sql.']);
    } else {
        echo 'Chalo could not connect to the database. Check config/database.php and import chalo_database.sql.';
    }
    exit;
}
