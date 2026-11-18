
<?php

require_once __DIR__ . '/../includes/session.php';
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json; charset=utf-8');

function checkoutResponse(
    bool $success,
    string $message,
    array $data = [],
    int $status = 200
): never {
    http_response_code($status);

    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

function checkoutCustomerId(): int {
    $user = function_exists('current_user')
        ? current_user()
        : ($_SESSION['user'] ?? null);

    if (
        !$user ||
        ($user['role'] ?? '') !== 'customer' ||
        empty($user['user_id'])
    ) {
        checkoutResponse(
            false,
            'Please log in with a customer account.',
            [],
            401
        );
    }

    return (int)$user['user_id'];
}

function checkoutInput(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '{}', true);

    if (!is_array($data)) {
        checkoutResponse(false, 'Invalid request data.', [], 400);
    }

    return $data;
}

function checkoutReference(string $prefix): string {
    return $prefix
        . date('ymdHis')
        . strtoupper(bin2hex(random_bytes(4)));
}

function checkoutPhoneValid(string $phone): bool {
    $phone = preg_replace('/[\s-]+/', '', $phone);

    return (bool)preg_match(
        '/^(?:\+?8801[3-9][0-9]{8}|01[3-9][0-9]{8})$/',
        $phone
    );
}

function checkoutPaymentMethod(string $method): string {
    $allowed = [
        'bkash',
        'nagad',
        'rocket',
        'card',
        'internet_banking',
        'cash',
        'other'
    ];

    return in_array($method, $allowed, true)
        ? $method
        : 'other';
}

function getActiveCheckoutCart(
    PDO $pdo,
    int $customerId,
    bool $lock = false
): array {
    $sql = "
        SELECT
            ci.cart_item_id,
            ci.cart_id,
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
            s.service_status,

            sch.start_datetime,
            sch.end_datetime,
            sch.check_in_date,
            sch.check_out_date,
            sch.price AS schedule_price,
            sch.available_capacity,
            sch.schedule_status,

            c.category_name,
            c.category_slug,

            d.booking_mode,
            d.selection_type,
            d.selected_details,
            d.booking_for_name,
            d.booking_for_phone,
            d.booking_for_email,
            d.requested_start_date,
            d.requested_end_date,

            u.unit_code,
            u.class_or_type,
            u.extra_price,
            u.unit_status,

            (
                SELECT si.image_path
                FROM service_images si
                WHERE si.service_id = s.service_id
                ORDER BY si.is_primary DESC, si.display_order ASC
                LIMIT 1
            ) AS image_path

        FROM carts cart

        INNER JOIN cart_items ci
            ON ci.cart_id = cart.cart_id

        INNER JOIN schedules sch
            ON sch.schedule_id = ci.schedule_id

        INNER JOIN services s
            ON s.service_id = sch.service_id

        INNER JOIN categories c
            ON c.category_id = s.category_id

        LEFT JOIN cart_item_details d
            ON d.cart_item_id = ci.cart_item_id

        LEFT JOIN inventory_units u
            ON u.unit_id = ci.unit_id

        WHERE
            cart.customer_id = ?
            AND cart.cart_status = 'active'
            AND ci.item_status = 'selected'
    ";

    if ($lock) {
        $sql .= " FOR UPDATE";
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$customerId]);

    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/*
|--------------------------------------------------------------------------
| GET: Load selected checkout items
|--------------------------------------------------------------------------
*/

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $customerId = checkoutCustomerId();

    try {
        $items = getActiveCheckoutCart($pdo, $customerId);

        $stmt = $pdo->prepare("
            SELECT full_name, email, phone
            FROM users
            WHERE user_id = ?
            LIMIT 1
        ");

        $stmt->execute([$customerId]);

        $customer = $stmt->fetch(PDO::FETCH_ASSOC);

        checkoutResponse(
            true,
            'Checkout information loaded.',
            [
                'items' => $items,
                'customer' => $customer ?: [],
                'item_count' => count($items)
            ]
        );

    } catch (Throwable $e) {
        error_log('Checkout GET error: ' . $e->getMessage());

        checkoutResponse(
            false,
            'Unable to load checkout information.',
            [],
            500
        );
    }
}

/*
|--------------------------------------------------------------------------
| POST: Create a real database order
|--------------------------------------------------------------------------
*/

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    checkoutResponse(
        false,
        'Unsupported request method.',
        [],
        405
    );
}

$customerId = checkoutCustomerId();
$input = checkoutInput();

$purchaserName = trim((string)($input['customerName'] ?? ''));
$purchaserPhone = trim((string)($input['customerPhone'] ?? ''));
$purchaserEmail = trim((string)($input['customerEmail'] ?? ''));

$bookingType = ($input['bookingType'] ?? 'self') === 'gift'
    ? 'gift'
    : 'self';

$paymentMethod = checkoutPaymentMethod(
    (string)($input['paymentMethod'] ?? 'other')
);

$checkoutNote = trim((string)($input['checkoutNote'] ?? ''));

$recipientName = trim((string)($input['recipientName'] ?? ''));
$recipientPhone = trim((string)($input['recipientPhone'] ?? ''));
$recipientEmail = trim((string)($input['recipientEmail'] ?? ''));
$recipientAddress = trim((string)($input['recipientAddress'] ?? ''));
$giftMessage = trim((string)($input['giftMessage'] ?? ''));

if ($purchaserName === '' || strlen($purchaserName) > 120) {
    checkoutResponse(false, 'Please enter a valid customer name.', [], 422);
}

if (!checkoutPhoneValid($purchaserPhone)) {
    checkoutResponse(false, 'Please enter a valid Bangladesh phone number.', [], 422);
}

if (
    $purchaserEmail !== '' &&
    !filter_var($purchaserEmail, FILTER_VALIDATE_EMAIL)
) {
    checkoutResponse(false, 'Please enter a valid email address.', [], 422);
}

if ($bookingType === 'gift') {
    if ($recipientName === '' || strlen($recipientName) > 120) {
        checkoutResponse(false, 'Please enter the gift recipient name.', [], 422);
    }

    if (!checkoutPhoneValid($recipientPhone)) {
        checkoutResponse(false, 'Please enter a valid recipient phone number.', [], 422);
    }

    if (
        $recipientEmail !== '' &&
        !filter_var($recipientEmail, FILTER_VALIDATE_EMAIL)
    ) {
        checkoutResponse(false, 'Please enter a valid recipient email.', [], 422);
    }
}

try {
    $pdo->beginTransaction();

    /*
     * Lock the active selected cart records.
     * Never trust prices or item information sent by JavaScript.
     */
    $items = getActiveCheckoutCart($pdo, $customerId, true);

    if (!$items) {
        throw new RuntimeException(
            'Your cart has no selected items. Please return to your cart.'
        );
    }

    $cartId = (int)$items[0]['cart_id'];

    $subtotal = 0.00;
    $scheduleQuantities = [];

    foreach ($items as $item) {
        if ($item['service_status'] !== 'published') {
            throw new RuntimeException(
                $item['service_name'] . ' is no longer available.'
            );
        }

        if ($item['schedule_status'] !== 'open') {
            throw new RuntimeException(
                $item['service_name'] . ' is not currently available for booking.'
            );
        }

        $quantity = (int)$item['quantity'];

        if ($quantity < 1) {
            throw new RuntimeException('Invalid booking quantity.');
        }

        $unitPrice = (float)$item['unit_price'];

        if ($unitPrice < 0) {
            throw new RuntimeException('Invalid booking price.');
        }

        $subtotal += $unitPrice * $quantity;

        $scheduleId = (int)$item['schedule_id'];

        if (!isset($scheduleQuantities[$scheduleId])) {
            $scheduleQuantities[$scheduleId] = 0;
        }

        $scheduleQuantities[$scheduleId] += $quantity;

        if (!empty($item['unit_id'])) {
            if (
                $item['unit_status'] !== 'available' ||
                (int)$item['unit_id'] <= 0
            ) {
                throw new RuntimeException(
                    'A selected seat, room or other inventory unit is no longer available.'
                );
            }

            if ($quantity !== 1) {
                throw new RuntimeException(
                    'An individually selected inventory unit must have quantity one.'
                );
            }
        }
    }

    /*
     * Lock and verify schedule capacity.
     */
    $scheduleCheck = $pdo->prepare("
        SELECT available_capacity, schedule_status
        FROM schedules
        WHERE schedule_id = ?
        FOR UPDATE
    ");

    foreach ($scheduleQuantities as $scheduleId => $quantity) {
        $scheduleCheck->execute([$scheduleId]);

        $schedule = $scheduleCheck->fetch(PDO::FETCH_ASSOC);

        if (
            !$schedule ||
            $schedule['schedule_status'] !== 'open' ||
            (int)$schedule['available_capacity'] < $quantity
        ) {
            throw new RuntimeException(
                'Insufficient availability for one or more selected bookings.'
            );
        }
    }

    $serviceFee = 0.00;
    $discount = 0.00;
    $tax = 0.00;
    $grandTotal = $subtotal + $serviceFee + $tax - $discount;

    /*
     * Create the master order.
     */
    $orderNumber = checkoutReference('CH');

    $stmt = $pdo->prepare("
        INSERT INTO orders (
            order_number,
            customer_id,
            cart_id,
            subtotal,
            discount_amount,
            service_fee,
            tax_amount,
            grand_total,
            currency,
            order_status,
            payment_status,
            customer_note
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, 'BDT',
            'pending_payment',
            'unpaid',
            ?
        )
    ");

    $stmt->execute([
        $orderNumber,
        $customerId,
        $cartId,
        $subtotal,
        $discount,
        $serviceFee,
        $tax,
        $grandTotal,
        $checkoutNote
    ]);

    $orderId = (int)$pdo->lastInsertId();

    /*
     * Save purchaser and booking mode.
     */
    $stmt = $pdo->prepare("
        INSERT INTO order_checkout_details (
            order_id,
            booking_mode,
            purchaser_name,
            purchaser_phone,
            purchaser_email,
            checkout_note
        ) VALUES (?, ?, ?, ?, ?, ?)
    ");

    $stmt->execute([
        $orderId,
        $bookingType,
        $purchaserName,
        $purchaserPhone,
        $purchaserEmail ?: null,
        $checkoutNote ?: null
    ]);

    /*
     * Create one payment record.
     *
     * This does NOT mean payment is successful.
     * A real payment gateway must confirm payment separately.
     */
    $paymentReference = checkoutReference('PAY');

    $stmt = $pdo->prepare("
        INSERT INTO payments (
            order_id,
            payment_reference,
            payment_method,
            amount,
            currency,
            payment_status,
            gateway_name
        ) VALUES (?, ?, ?, ?, 'BDT', 'initiated', 'manual_or_pending')
    ");

    $stmt->execute([
        $orderId,
        $paymentReference,
        $paymentMethod,
        $grandTotal
    ]);

    $paymentId = (int)$pdo->lastInsertId();

    /*
     * Create payment attempt record.
     */
    $attemptMethod = $paymentMethod === 'internet_banking'
        ? 'bank'
        : $paymentMethod;

    $stmt = $pdo->prepare("
        INSERT INTO payment_attempts (
            order_id,
            payment_id,
            attempt_number,
            payment_method,
            amount,
            currency,
            attempt_status
        ) VALUES (?, ?, 1, ?, ?, 'BDT', 'pending')
    ");

    $stmt->execute([
        $orderId,
        $paymentId,
        $attemptMethod,
        $grandTotal
    ]);

    /*
     * Create master order lifecycle.
     */
    $stmt = $pdo->prepare("
        INSERT INTO order_lifecycle (
            order_id,
            master_order_status
        ) VALUES (?, 'awaiting_payment')
    ");

    $stmt->execute([$orderId]);

    /*
     * Prepared statements for individual order items.
     */
    $orderItemInsert = $pdo->prepare("
        INSERT INTO order_items (
            order_id,
            service_id,
            schedule_id,
            unit_id,
            quantity,
            unit_price,
            line_total,
            item_description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $bookingInsert = $pdo->prepare("
        INSERT INTO bookings (
            booking_reference,
            order_item_id,
            customer_id,
            booking_status,
            booked_for_name,
            booked_for_phone
        ) VALUES (?, ?, ?, 'pending', ?, ?)
    ");

    $bookingLifecycleInsert = $pdo->prepare("
        INSERT INTO booking_lifecycle (
            booking_id,
            individual_booking_status
        ) VALUES (?, 'pending')
    ");

    $bookingHistoryInsert = $pdo->prepare("
        INSERT INTO booking_status_history (
            booking_id,
            old_status,
            new_status,
            changed_by_user_id,
            change_reason
        ) VALUES (?, NULL, 'pending', ?, 'Order created at checkout')
    ");

    $bookingResourceInsert = $pdo->prepare("
        INSERT INTO booking_resources (
            booking_id,
            unit_id
        ) VALUES (?, ?)
    ");

    $allocationInsert = $pdo->prepare("
        INSERT INTO booking_inventory_allocations (
            booking_id,
            inventory_unit_id,
            allocation_status
        ) VALUES (?, ?, 'held')
    ");

    $unitUpdate = $pdo->prepare("
        UPDATE inventory_units
        SET unit_status = 'booked'
        WHERE unit_id = ?
          AND schedule_id = ?
          AND unit_status = 'available'
    ");

    $createdBookings = [];

    foreach ($items as $item) {
        $quantity = (int)$item['quantity'];
        $unitPrice = (float)$item['unit_price'];
        $lineTotal = $unitPrice * $quantity;

        $details = $item['selected_details'];

        if (is_string($details)) {
            $decoded = json_decode($details, true);
            $details = is_array($decoded) ? $decoded : [];
        }

        if (!is_array($details)) {
            $details = [];
        }

        $description = json_encode(
            $details,
            JSON_UNESCAPED_UNICODE
        );

        if ($description === false) {
            $description = '';
        }

        $description = mb_substr($description, 0, 255);

        $unitId = !empty($item['unit_id'])
            ? (int)$item['unit_id']
            : null;

        $orderItemInsert->execute([
            $orderId,
            (int)$item['service_id'],
            (int)$item['schedule_id'],
            $unitId,
            $quantity,
            $unitPrice,
            $lineTotal,
            $description
        ]);

        $orderItemId = (int)$pdo->lastInsertId();

        $bookedForName = $bookingType === 'gift'
            ? $recipientName
            : ($item['booking_for_name'] ?: $purchaserName);

        $bookedForPhone = $bookingType === 'gift'
            ? $recipientPhone
            : ($item['booking_for_phone'] ?: $purchaserPhone);

        $bookingReference = checkoutReference('BK');

        $bookingInsert->execute([
            $bookingReference,
            $orderItemId,
            $customerId,
            $bookedForName,
            $bookedForPhone
        ]);

        $bookingId = (int)$pdo->lastInsertId();

        $bookingLifecycleInsert->execute([$bookingId]);

        $bookingHistoryInsert->execute([
            $bookingId,
            $customerId
        ]);

        /*
         * Allocate a physical inventory unit only when
         * the cart actually contains a valid unit_id.
         */
        if ($unitId !== null) {
            $unitUpdate->execute([
                $unitId,
                (int)$item['schedule_id']
            ]);

            if ($unitUpdate->rowCount() !== 1) {
                throw new RuntimeException(
                    'A selected inventory unit was just booked by another customer.'
                );
            }

            $bookingResourceInsert->execute([
                $bookingId,
                $unitId
            ]);

            $allocationInsert->execute([
                $bookingId,
                $unitId
            ]);
        }

        $createdBookings[] = [
            'bookingId' => $bookingId,
            'bookingReference' => $bookingReference,
            'orderItemId' => $orderItemId
        ];
    }

    /*
     * Decrease available schedule capacity.
     */
    $capacityUpdate = $pdo->prepare("
        UPDATE schedules
        SET available_capacity = available_capacity - ?
        WHERE schedule_id = ?
          AND available_capacity >= ?
          AND schedule_status = 'open'
    ");

    foreach ($scheduleQuantities as $scheduleId => $quantity) {
        $capacityUpdate->execute([
            $quantity,
            $scheduleId,
            $quantity
        ]);

        if ($capacityUpdate->rowCount() !== 1) {
            throw new RuntimeException(
                'Booking capacity changed. Please try again.'
            );
        }
    }

    /*
     * Save gift information at order level.
     */
    if ($bookingType === 'gift') {
        $stmt = $pdo->prepare("
            INSERT INTO gift_orders (
                order_id,
                purchaser_user_id,
                recipient_full_name,
                recipient_phone,
                recipient_email,
                recipient_address,
                personal_message,
                gift_status,
                delivery_method
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 'share_link')
        ");

        $stmt->execute([
            $orderId,
            $customerId,
            $recipientName,
            $recipientPhone,
            $recipientEmail ?: null,
            $recipientAddress ?: null,
            $giftMessage ?: null
        ]);
    }

    /*
     * Convert the active cart after successful order creation.
     */
    $stmt = $pdo->prepare("
        UPDATE carts
        SET cart_status = 'converted'
        WHERE cart_id = ?
          AND customer_id = ?
          AND cart_status = 'active'
    ");

    $stmt->execute([
        $cartId,
        $customerId
    ]);

    $pdo->commit();

    checkoutResponse(
        true,
        'Your order has been created successfully. Payment is still pending.',
        [
            'orderId' => $orderId,
            'orderNumber' => $orderNumber,
            'paymentReference' => $paymentReference,
            'paymentStatus' => 'unpaid',
            'orderStatus' => 'pending_payment',
            'bookingType' => $bookingType,
            'subtotal' => number_format($subtotal, 2, '.', ''),
            'serviceFee' => number_format($serviceFee, 2, '.', ''),
            'discount' => number_format($discount, 2, '.', ''),
            'total' => number_format($grandTotal, 2, '.', ''),
            'currency' => 'BDT',
            'bookings' => $createdBookings
        ],
        201
    );

} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('Checkout POST error: ' . $e->getMessage());

    $message = $e instanceof RuntimeException
        ? $e->getMessage()
        : 'Unable to create your order. Please try again.';

    checkoutResponse(
        false,
        $message,
        [],
        422
    );
}
