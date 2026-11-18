
<?php


require_once __DIR__ . '/../includes/session.php';
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

function respond(bool $success, string $message = '', array $data = [], int $status = 200): never {
    http_response_code($status);
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ]);
    exit;
}

function customerId(): int {
    $user = current_user();

    if (!$user || empty($user['user_id']) || ($user['role'] ?? '') !== 'customer') {
        respond(false, 'Please log in with a customer account.', [], 401);
    }

    return (int)$user['user_id'];
}

function activeCart(PDO $pdo, int $customerId): int {
    $stmt = $pdo->prepare("
        SELECT cart_id
        FROM carts
        WHERE customer_id = ? AND cart_status = 'active'
        ORDER BY cart_id DESC
        LIMIT 1
    ");
    $stmt->execute([$customerId]);
    $cartId = (int)$stmt->fetchColumn();

    if ($cartId) {
        return $cartId;
    }

    $stmt = $pdo->prepare("
        INSERT INTO carts (customer_id, cart_status)
        VALUES (?, 'active')
    ");
    $stmt->execute([$customerId]);

    return (int)$pdo->lastInsertId();
}

try {
    $customerId = customerId();
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $stmt = $pdo->prepare("
            SELECT
                ci.cart_item_id,
                ci.schedule_id,
                ci.unit_id,
                ci.quantity,
                ci.unit_price,
                ci.guest_name,
                ci.guest_phone,
                ci.special_request,
                ci.item_status,
                s.service_id,
                s.service_name,
                s.address,
                s.base_price,
                s.category_id,
                cat.category_name,
                cat.category_slug,
                sc.start_datetime,
                sc.end_datetime,
                sc.check_in_date,
                sc.check_out_date,
                iu.unit_code,
                iu.class_or_type,
                d.booking_mode,
                d.selection_type,
                d.selected_details,
                d.booking_for_name,
                d.booking_for_phone,
                d.booking_for_email,
                (ci.quantity * ci.unit_price) AS line_total,
                (
                    SELECT si.image_path
                    FROM service_images si
                    WHERE si.service_id = s.service_id
                    ORDER BY si.is_primary DESC, si.display_order ASC
                    LIMIT 1
                ) AS image_path
            FROM carts c
            INNER JOIN cart_items ci ON ci.cart_id = c.cart_id
            INNER JOIN schedules sc ON sc.schedule_id = ci.schedule_id
            INNER JOIN services s ON s.service_id = sc.service_id
            INNER JOIN categories cat ON cat.category_id = s.category_id
            LEFT JOIN cart_item_details d ON d.cart_item_id = ci.cart_item_id
            LEFT JOIN inventory_units iu ON iu.unit_id = ci.unit_id
            WHERE c.customer_id = ?
              AND c.cart_status = 'active'
              AND ci.item_status != 'removed'
            ORDER BY ci.added_at DESC
        ");

        $stmt->execute([$customerId]);

        respond(true, 'Cart loaded.', [
            'items' => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ]);
    }

    if ($method !== 'POST') {
        respond(false, 'Method not allowed.', [], 405);
    }

    $input = json_decode(file_get_contents('php://input'), true);

    if (!is_array($input)) {
        respond(false, 'Invalid request data.', [], 400);
    }

    $action = $input['action'] ?? '';
    $cartId = activeCart($pdo, $customerId);

    if ($action === 'add') {
        $scheduleId = (int)($input['scheduleId'] ?? 0);
        $quantity = (int)($input['quantity'] ?? 1);
        $unitId = !empty($input['unitId']) ? (int)$input['unitId'] : null;

        $bookingMode = ($input['bookingMode'] ?? 'self') === 'gift'
            ? 'gift' : 'self';

        $selectionType = $input['selectionType'] ?? 'other';

        $allowedTypes = ['seat', 'room', 'table', 'ticket', 'cabin', 'quantity', 'other'];

        if (!in_array($selectionType, $allowedTypes, true)) {
            $selectionType = 'other';
        }

        if ($scheduleId <= 0 || $quantity < 1 || $quantity > 20) {
            respond(false, 'Invalid schedule or quantity.', [], 422);
        }

        $pdo->beginTransaction();

        $stmt = $pdo->prepare("
            SELECT
                sc.schedule_id,
                sc.price,
                sc.available_capacity,
                sc.schedule_status,
                s.service_status
            FROM schedules sc
            INNER JOIN services s ON s.service_id = sc.service_id
            WHERE sc.schedule_id = ?
            FOR UPDATE
        ");
        $stmt->execute([$scheduleId]);
        $schedule = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$schedule ||
            $schedule['schedule_status'] !== 'open' ||
            $schedule['service_status'] !== 'published') {
            $pdo->rollBack();
            respond(false, 'This service is not currently available.', [], 409);
        }

        if ((int)$schedule['available_capacity'] < $quantity) {
            $pdo->rollBack();
            respond(false, 'Not enough availability for this quantity.', [], 409);
        }

        $unitPrice = (float)$schedule['price'];

        if ($unitId !== null) {
            $stmt = $pdo->prepare("
                SELECT extra_price
                FROM inventory_units
                WHERE unit_id = ?
                  AND schedule_id = ?
                  AND unit_status = 'available'
            ");
            $stmt->execute([$unitId, $scheduleId]);
            $unit = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$unit) {
                $pdo->rollBack();
                respond(false, 'The selected inventory unit is unavailable.', [], 409);
            }

            $unitPrice += (float)$unit['extra_price'];
        }

        $guestName = trim((string)($input['guestName'] ?? ''));
        $guestPhone = trim((string)($input['guestPhone'] ?? ''));
        $specialRequest = trim((string)($input['specialRequest'] ?? ''));

        $stmt = $pdo->prepare("
            INSERT INTO cart_items (
                cart_id, schedule_id, unit_id, quantity,
                unit_price, guest_name, guest_phone,
                special_request, item_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'selected')
        ");

        $stmt->execute([
            $cartId,
            $scheduleId,
            $unitId,
            $quantity,
            $unitPrice,
            $guestName ?: null,
            $guestPhone ?: null,
            $specialRequest ?: null
        ]);

        $cartItemId = (int)$pdo->lastInsertId();

        $selectedDetails = $input['selectedDetails'] ?? [];

        if (!is_array($selectedDetails)) {
            $selectedDetails = [];
        }

        $stmt = $pdo->prepare("
            INSERT INTO cart_item_details (
                cart_item_id, booking_mode, selection_type,
                selected_details, booking_for_name,
                booking_for_phone, booking_for_email,
                requested_start_date, requested_end_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $cartItemId,
            $bookingMode,
            $selectionType,
            json_encode($selectedDetails, JSON_UNESCAPED_UNICODE),
            $input['bookingForName'] ?? null,
            $input['bookingForPhone'] ?? null,
            $input['bookingForEmail'] ?? null,
            $input['startDate'] ?? null,
            $input['endDate'] ?? null
        ]);

        $pdo->commit();

        respond(true, 'Item added to your account cart.', [
            'cartItemId' => $cartItemId,
            'unitPrice' => $unitPrice,
            'quantity' => $quantity
        ]);
    }

    if ($action === 'update') {
        $cartItemId = (int)($input['cartItemId'] ?? 0);

        $stmt = $pdo->prepare("
            UPDATE cart_items ci
            INNER JOIN carts c ON c.cart_id = ci.cart_id
            SET
                ci.quantity = COALESCE(?, ci.quantity),
                ci.item_status = COALESCE(?, ci.item_status)
            WHERE ci.cart_item_id = ?
              AND c.customer_id = ?
              AND c.cart_status = 'active'
              AND ci.item_status != 'removed'
        ");

        $quantity = isset($input['quantity'])
            ? max(1, min(20, (int)$input['quantity']))
            : null;

        $itemStatus = $input['itemStatus'] ?? null;

        if ($itemStatus !== null &&
            !in_array($itemStatus, ['selected', 'unselected'], true)) {
            respond(false, 'Invalid item status.', [], 422);
        }

        $stmt->execute([$quantity, $itemStatus, $cartItemId, $customerId]);

        respond(true, 'Cart item updated.');
    }

    if ($action === 'remove') {
        $cartItemId = (int)($input['cartItemId'] ?? 0);

        $stmt = $pdo->prepare("
            UPDATE cart_items ci
            INNER JOIN carts c ON c.cart_id = ci.cart_id
            SET ci.item_status = 'removed'
            WHERE ci.cart_item_id = ?
              AND c.customer_id = ?
              AND c.cart_status = 'active'
        ");
        $stmt->execute([$cartItemId, $customerId]);

        respond(true, 'Item removed.');
    }

    if ($action === 'remove_selected') {
        $stmt = $pdo->prepare("
            UPDATE cart_items ci
            INNER JOIN carts c ON c.cart_id = ci.cart_id
            SET ci.item_status = 'removed'
            WHERE c.customer_id = ?
              AND c.cart_status = 'active'
              AND ci.item_status = 'selected'
        ");
        $stmt->execute([$customerId]);

        respond(true, 'Selected items removed.');
    }

    if ($action === 'clear') {
        $stmt = $pdo->prepare("
            UPDATE cart_items ci
            INNER JOIN carts c ON c.cart_id = ci.cart_id
            SET ci.item_status = 'removed'
            WHERE c.customer_id = ?
              AND c.cart_status = 'active'
        ");
        $stmt->execute([$customerId]);

        respond(true, 'Cart cleared.');
    }

    respond(false, 'Unknown cart action.', [], 400);

} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('Cart API error: ' . $e->getMessage());
    respond(false, 'A server error occurred while processing your cart.', [], 500);
}
