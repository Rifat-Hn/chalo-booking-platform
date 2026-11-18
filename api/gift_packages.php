
<?php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/database.php';

function giftResponse(bool $success, string $message, array $data = []): void
{
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

try {
    $category = strtolower(trim($_GET['category'] ?? ''));

    $allowedCategories = [
        'honeymoon',
        'birthday',
        'anniversary',
        'travel',
        'dining',
        'hotel_stay',
        'voucher'
    ];

    $sql = "
        SELECT
            gp.gift_package_id,
            gp.package_name,
            gp.gift_category,
            gp.linked_service_id,
            gp.description,
            gp.price,
            gp.validity_days,
            gp.image_path,

            sv.service_name AS linked_service_name,
            sv.address AS service_address,
            sv.average_rating,
            loc.city,
            loc.area

        FROM gift_packages gp

        LEFT JOIN services sv
            ON sv.service_id = gp.linked_service_id

        LEFT JOIN locations loc
            ON loc.location_id = sv.location_id

        WHERE gp.is_active = 1
    ";

    $params = [];

    if ($category !== '') {
        if (!in_array($category, $allowedCategories, true)) {
            http_response_code(400);
            giftResponse(false, 'Invalid gift category.');
        }

        $sql .= " AND gp.gift_category = :category";
        $params[':category'] = $category;
    }

    $sql .= "
        ORDER BY
            gp.gift_category ASC,
            gp.price ASC,
            gp.package_name ASC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $packages = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($packages as &$package) {
        $package['gift_package_id'] = (int) $package['gift_package_id'];
        $package['linked_service_id'] = $package['linked_service_id'] !== null
            ? (int) $package['linked_service_id']
            : null;

        $package['price'] = (float) $package['price'];
        $package['validity_days'] = (int) $package['validity_days'];

        $package['average_rating'] = $package['average_rating'] !== null
            ? (float) $package['average_rating']
            : null;
    }

    unset($package);

    giftResponse(
        true,
        'Gift packages loaded successfully.',
        [
            'count' => count($packages),
            'packages' => $packages
        ]
    );

} catch (PDOException $e) {
    error_log('Gift packages API error: ' . $e->getMessage());

    http_response_code(500);

    giftResponse(
        false,
        'Could not load gift packages. Please check the database.'
    );

} catch (Throwable $e) {
    error_log('Gift API error: ' . $e->getMessage());

    http_response_code(500);

    giftResponse(
        false,
        'An unexpected error occurred.'
    );
}
