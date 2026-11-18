
<?php


// api/auth.php

ini_set('display_errors', '0');
ini_set('log_errors', '1');

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

require_once __DIR__ . '/../includes/session.php';

try {
    require_once __DIR__ . '/../config/database.php';

    if (!isset($pdo) || !$pdo instanceof PDO) {
        throw new RuntimeException('Database connection is unavailable.');
    }
} catch (Throwable $error) {
    error_log('Chalo authentication database error: ' . $error->getMessage());

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Unable to connect to the database. Check your database configuration.'
    ]);
    exit;
}

function authResponse(int $status, array $body): never
{
    http_response_code($status);

    echo json_encode(
        $body,
        JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE
    );

    exit;
}

function authRequestData(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '', true);

    return is_array($data) ? $data : $_POST;
}

function authSafeUser(array $row): array
{
    return [
        'user_id' => (int) $row['user_id'],
        'full_name' => $row['full_name'],
        'email' => $row['email'],
        'phone' => $row['phone'],
        'role' => $row['role']
    ];
}

function authLength(string $value): int
{
    return function_exists('mb_strlen')
        ? mb_strlen($value, 'UTF-8')
        : strlen($value);
}

$action = strtolower(trim((string) ($_GET['action'] ?? '')));

if ($action === 'me') {
    $user = current_user();

    authResponse(200, [
        'success' => true,
        'authenticated' => (bool) $user,
        'user' => $user
    ]);
}

if ($action === 'logout') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        authResponse(405, [
            'success' => false,
            'message' => 'Method not allowed.'
        ]);
    }

    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();

        setcookie(session_name(), '', [
            'expires' => time() - 42000,
            'path' => $params['path'],
            'domain' => $params['domain'],
            'secure' => $params['secure'],
            'httponly' => $params['httponly'],
            'samesite' => $params['samesite'] ?? 'Lax'
        ]);
    }

    session_destroy();

    authResponse(200, [
        'success' => true,
        'message' => 'You have been logged out.'
    ]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    authResponse(405, [
        'success' => false,
        'message' => 'Method not allowed.'
    ]);
}

$data = authRequestData();

if ($action === 'register') {
    $name = trim((string) ($data['full_name'] ?? ''));
    $email = strtolower(trim((string) ($data['email'] ?? '')));
    $phone = preg_replace(
        '/[\s-]+/',
        '',
        trim((string) ($data['phone'] ?? ''))
    );
    $password = (string) ($data['password'] ?? '');

    if (authLength($name) < 2 || authLength($name) > 120) {
        authResponse(422, [
            'success' => false,
            'field' => 'full_name',
            'message' => 'Enter a name between 2 and 120 characters.'
        ]);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150) {
        authResponse(422, [
            'success' => false,
            'field' => 'email',
            'message' => 'Enter a valid email address.'
        ]);
    }

    if (!preg_match('/^\+?[0-9]{8,16}$/', $phone)) {
        authResponse(422, [
            'success' => false,
            'field' => 'phone',
            'message' => 'Enter a valid phone number, including country code if needed.'
        ]);
    }

    if (strlen($password) < 8) {
        authResponse(422, [
            'success' => false,
            'field' => 'password',
            'message' => 'Password must contain at least 8 characters.'
        ]);
    }

    try {
        $check = $pdo->prepare("
            SELECT user_id
            FROM users
            WHERE email = ? OR phone = ?
            LIMIT 1
        ");

        $check->execute([$email, $phone]);

        if ($check->fetch(PDO::FETCH_ASSOC)) {
            authResponse(409, [
                'success' => false,
                'message' => 'An account with this email or phone number already exists.'
            ]);
        }

        $passwordHash = password_hash($password, PASSWORD_DEFAULT);

        if ($passwordHash === false) {
            throw new RuntimeException('Password hashing failed.');
        }

        $insert = $pdo->prepare("
            INSERT INTO users (
                full_name,
                email,
                phone,
                password_hash,
                role,
                status
            )
            VALUES (?, ?, ?, ?, 'customer', 'active')
        ");

        $insert->execute([
            $name,
            $email,
            $phone,
            $passwordHash
        ]);

        $userId = (int) $pdo->lastInsertId();

        if ($userId <= 0) {
            throw new RuntimeException('The user account was not created.');
        }

        // Start a fresh authenticated session.
        session_regenerate_id(true);

        $user = [
            'user_id' => $userId,
            'full_name' => $name,
            'email' => $email,
            'phone' => $phone,
            'role' => 'customer'
        ];

        $_SESSION['user'] = $user;

        authResponse(201, [
            'success' => true,
            'message' => 'Your Chalo account has been created successfully.',
            'user' => $user
        ]);

    } catch (PDOException $error) {
        error_log('Chalo registration database error: ' . $error->getMessage());

        if ($error->getCode() === '23000') {
            authResponse(409, [
                'success' => false,
                'message' => 'That email or phone number is already registered.'
            ]);
        }

        authResponse(500, [
            'success' => false,
            'message' => 'Database error during registration. Check the PHP error log.'
        ]);

    } catch (Throwable $error) {
        error_log('Chalo registration error: ' . $error->getMessage());

        authResponse(500, [
            'success' => false,
            'message' => 'Registration could not be completed. Check the PHP error log.'
        ]);
    }
}

if ($action === 'login') {
    $identity = trim((string) ($data['identity'] ?? ''));
    $password = (string) ($data['password'] ?? '');

    if ($identity === '' || $password === '') {
        authResponse(422, [
            'success' => false,
            'message' => 'Enter your email/phone and password.'
        ]);
    }

    try {
        $stmt = $pdo->prepare("
            SELECT
                user_id,
                full_name,
                email,
                phone,
                password_hash,
                role,
                status
            FROM users
            WHERE email = :email OR phone = :phone
            LIMIT 1
        ");

        $stmt->execute([
            ':email' => strtolower($identity),
            ':phone' => $identity
        ]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row || !password_verify($password, $row['password_hash'])) {
            authResponse(401, [
                'success' => false,
                'message' => 'Incorrect email/phone or password.'
            ]);
        }

        if ($row['status'] !== 'active') {
            authResponse(403, [
                'success' => false,
                'message' => 'This account is not active. Please contact Chalo support.'
            ]);
        }

        if (password_needs_rehash($row['password_hash'], PASSWORD_DEFAULT)) {
            $newHash = password_hash($password, PASSWORD_DEFAULT);

            $update = $pdo->prepare("
                UPDATE users
                SET password_hash = ?
                WHERE user_id = ?
            ");

            $update->execute([
                $newHash,
                $row['user_id']
            ]);
        }

        session_regenerate_id(true);

        $_SESSION['user'] = authSafeUser($row);

        authResponse(200, [
            'success' => true,
            'message' => 'Login successful.',
            'user' => $_SESSION['user']
        ]);

    } catch (Throwable $error) {
        error_log('Chalo login error: ' . $error->getMessage());

        authResponse(500, [
            'success' => false,
            'message' => 'Login could not be completed. Please try again.'
        ]);
    }
}

authResponse(404, [
    'success' => false,
    'message' => 'Unknown authentication action.'
]);
