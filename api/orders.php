
<?php
// api/orders.php

require_once __DIR__ . '/../includes/session.php';
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json; charset=utf-8');

function orderResponse(bool $success, string $message, array $data = [], int $status = 200): never
{
    http_response_code($status);
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // Use the same session structure as login.php and checkout.php.
    $loggedInUser = function_exists('current_user') ? current_user() : ($_SESSION['user'] ?? null);

    if (
        !is_array($loggedInUser) ||
        ($loggedInUser['role'] ?? '') !== 'customer' ||
        empty($loggedInUser['user_id'])
    ) {
        orderResponse(false, 'Please log in to view your order.', [], 401);
    }

    $customerId = (int) $loggedInUser['user_id'];
    $orderNumber = trim((string) ($_GET['orderNumber'] ?? ''));

    if ($orderNumber === '') {
        orderResponse(false, 'Order number is missing.', [], 400);
    }

    // Only the customer who placed the order can view it.
    $orderQuery = $pdo->prepare("
        SELECT
            o.order_id,
            o.order_number,
            o.subtotal,
            o.discount_amount,
            o.service_fee,
            o.tax_amount,
            o.grand_total,
            o.currency,
            o.order_status,
            o.payment_status,
            o.placed_at,
            d.booking_mode,
            d.purchaser_name,
            d.purchaser_phone,
            d.purchaser_email,
            d.checkout_note
        FROM orders o
        LEFT JOIN order_checkout_details d
            ON d.order_id = o.order_id
        WHERE o.order_number = :order_number
          AND o.customer_id = :customer_id
        LIMIT 1
    ");

    $orderQuery->execute([
        ':order_number' => $orderNumber,
        ':customer_id' => $customerId
    ]);

    $order = $orderQuery->fetch(PDO::FETCH_ASSOC);

    if (!$order) {
        orderResponse(false, 'Order not found or you do not have permission to view it.', [], 404);
    }

    // Retrieve the actual items belonging to this order.
    $itemsQuery = $pdo->prepare("
        SELECT
            oi.order_item_id,
            oi.service_id,
            oi.schedule_id,
            oi.unit_id,
            oi.quantity,
            oi.unit_price,
            oi.line_total,
            oi.item_description,
            s.service_name,
            b.booking_reference,
            b.booking_status,
            b.booked_for_name,
            b.booked_for_phone
        FROM order_items oi
        LEFT JOIN services s
            ON s.service_id = oi.service_id
        LEFT JOIN bookings b
            ON b.order_item_id = oi.order_item_id
        WHERE oi.order_id = :order_id
        ORDER BY oi.order_item_id ASC
    ");

    $itemsQuery->execute([':order_id' => $order['order_id']]);
    $items = $itemsQuery->fetchAll(PDO::FETCH_ASSOC);

    // Retrieve gift recipient information, if this is a gift order.
    $giftQuery = $pdo->prepare("
        SELECT
            recipient_full_name,
            recipient_phone,
            recipient_email,
            recipient_address,
            personal_message,
            delivery_method
        FROM gift_orders
        WHERE order_id = :order_id
        LIMIT 1
    ");

    $giftQuery->execute([':order_id' => $order['order_id']]);
    $gift = $giftQuery->fetch(PDO::FETCH_ASSOC);

    // Retrieve the latest payment record.
    $paymentQuery = $pdo->prepare("
        SELECT
            payment_reference,
            payment_method,
            amount,
            payment_status,
            gateway_name,
            paid_at
        FROM payments
        WHERE order_id = :order_id
        ORDER BY payment_id DESC
        LIMIT 1
    ");

    $paymentQuery->execute([':order_id' => $order['order_id']]);
    $payment = $paymentQuery->fetch(PDO::FETCH_ASSOC);

    $formattedItems = [];

    foreach ($items as $item) {
        $description = trim((string) ($item['item_description'] ?? ''));

        $formattedItems[] = [
            'id' => (int) $item['order_item_id'],
            'name' => $item['service_name'] ?: 'Chalo Booking',
            'details' => $description,
            'quantity' => (int) $item['quantity'],
            'unitPrice' => (float) $item['unit_price'],
            'total' => (float) $item['line_total'],
            'bookingReference' => $item['booking_reference'],
            'bookingStatus' => $item['booking_status'],
            'bookedForName' => $item['booked_for_name'],
            'bookedForPhone' => $item['booked_for_phone'],
            'unitId' => $item['unit_id'] !== null ? (int) $item['unit_id'] : null
        ];
    }

    $response = [
        'orderId' => $order['order_number'],
        'orderDate' => $order['placed_at'],
        'bookingType' => $order['booking_mode'] ?: 'self',
        'orderStatus' => $order['order_status'],
        'paymentStatus' => $order['payment_status'],

        'purchaser' => [
            'name' => $order['purchaser_name'],
            'phone' => $order['purchaser_phone'],
            'email' => $order['purchaser_email']
        ],

        'recipient' => $gift ? [
            'name' => $gift['recipient_full_name'],
            'phone' => $gift['recipient_phone'],
            'email' => $gift['recipient_email'],
            'address' => $gift['recipient_address'],
            'message' => $gift['personal_message'],
            'deliveryMethod' => $gift['delivery_method']
        ] : null,

        'items' => $formattedItems,

        'subtotal' => (float) $order['subtotal'],
        'serviceFee' => (float) $order['service_fee'],
        'tax' => (float) $order['tax_amount'],
        'discount' => (float) $order['discount_amount'],
        'total' => (float) $order['grand_total'],
        'currency' => $order['currency'] ?: 'BDT',

        'payment' => $payment ?: null,
        'checkoutNote' => $order['checkout_note']
    ];

    orderResponse(true, 'Order details loaded successfully.', $response);

} catch (Throwable $error) {
    error_log('Order confirmation API error: ' . $error->getMessage());
    orderResponse(false, 'Unable to load order details. Please try again.', [], 500);
}
