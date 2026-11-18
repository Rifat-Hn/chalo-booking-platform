
<?php
require_once __DIR__ . '/includes/session.php';

$user = require_login();

require_once __DIR__ . '/config/database.php';

// Escape output to prevent HTML injection.
function h($value): string
{
    return htmlspecialchars((string)($value ?? ''), ENT_QUOTES, 'UTF-8');
}

// Get the logged-in customer's orders and booking information.
$orders = [];
$pageError = '';

try {
    $stmt = $pdo->prepare("
        SELECT
            o.order_id,
            o.order_number,
            o.placed_at,
            o.grand_total,
            o.currency,
            o.order_status,
            o.payment_status,
            b.booking_reference,
            b.booking_status,
            s.service_name,
            c.category_name,
            sc.start_datetime
        FROM orders o
        LEFT JOIN order_items oi
            ON oi.order_id = o.order_id
        LEFT JOIN bookings b
            ON b.order_item_id = oi.order_item_id
        LEFT JOIN services s
            ON s.service_id = oi.service_id
        LEFT JOIN categories c
            ON c.category_id = s.category_id
        LEFT JOIN schedules sc
            ON sc.schedule_id = oi.schedule_id
        WHERE o.customer_id = ?
        ORDER BY o.placed_at DESC, oi.order_item_id ASC
    ");

    $stmt->execute([(int)$user['user_id']]);
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

} catch (PDOException $e) {
    error_log('Chalo account page error: ' . $e->getMessage());
    $pageError = 'We could not load your booking history right now. Please try again later.';
}

$firstName = explode(' ', trim($user['full_name']))[0] ?? 'Traveler';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>My Account | Chalo</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">

    <link rel="stylesheet" href="css/styleshome.css">

    <style>
        body {
            background: #f6f9fb;
        }

        .account-main {
            width: min(1110px, calc(100% - 48px));
            margin: 45px auto 65px;
        }

        .account-welcome {
            position: relative;
            overflow: hidden;
            padding: 38px;
            border-radius: 18px;
            color: #fff;
            background: linear-gradient(120deg, #102f40, #205f60);
        }

        .account-welcome::after {
            content: "✣";
            position: absolute;
            right: 45px;
            top: -45px;
            font-size: 190px;
            color: rgba(255,255,255,.07);
        }

        .account-eyebrow {
            margin: 0 0 12px;
            color: #65f2ed;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 2px;
        }

        .account-welcome h1 {
            margin: 0 0 12px;
            font-size: clamp(27px, 4vw, 38px);
            font-weight: 700;
        }

        .account-welcome > p {
            margin: 0;
            color: #d5e8e9;
            font-size: 14px;
        }

        .account-welcome-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 25px;
        }

        .account-welcome-actions a,
        .account-welcome-actions button {
            padding: 11px 17px;
            border: 1px solid rgba(255,255,255,.5);
            border-radius: 7px;
            background: transparent;
            color: #fff;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
        }

        .account-welcome-actions a.primary {
            border-color: #ffd329;
            background: #ffd329;
            color: #173345;
        }

        .account-grid {
            display: grid;
            grid-template-columns: .85fr 1.65fr;
            gap: 22px;
            margin-top: 25px;
            align-items: start;
        }

        .account-card {
            padding: 25px;
            border: 1px solid #e2eaf0;
            border-radius: 14px;
            background: #fff;
            box-shadow: 0 5px 20px rgba(16,47,64,.035);
        }

        .account-card h2 {
            margin: 0 0 20px;
            color: #173849;
            font-size: 19px;
            font-weight: 700;
        }

        .profile-item {
            padding: 14px 0;
            border-bottom: 1px solid #edf1f4;
        }

        .profile-item:last-child {
            border-bottom: 0;
        }

        .profile-item small {
            display: block;
            margin-bottom: 6px;
            color: #82919b;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: .8px;
            text-transform: uppercase;
        }

        .profile-item strong {
            display: block;
            color: #173849;
            font-size: 13px;
            font-weight: 600;
            overflow-wrap: anywhere;
        }

        .orders-card {
            min-width: 0;
        }

        .orders-heading {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
        }

        .orders-heading h2 {
            margin: 0;
        }

        .order-count {
            padding: 6px 11px;
            border-radius: 30px;
            background: #eaf7f5;
            color: #205f60;
            font-size: 11px;
            font-weight: 700;
        }

        .orders-table-wrap {
            width: 100%;
            overflow-x: auto;
        }

        .orders-table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
            white-space: nowrap;
        }

        .orders-table th {
            padding: 12px 10px;
            border-bottom: 1px solid #e7edf0;
            color: #71838e;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
        }

        .orders-table td {
            padding: 15px 10px;
            border-bottom: 1px solid #edf1f4;
            color: #344e5c;
            font-size: 12px;
        }

        .orders-table tr:last-child td {
            border-bottom: 0;
        }

        .status {
            display: inline-block;
            padding: 5px 9px;
            border-radius: 30px;
            background: #eaf7f3;
            color: #167457;
            font-size: 10px;
            font-weight: 700;
            text-transform: capitalize;
        }

        .status.pending,
        .status.pending_payment,
        .status.unpaid,
        .status.processing {
            background: #fff5df;
            color: #986a13;
        }

        .status.cancelled,
        .status.failed,
        .status.refunded {
            background: #fff0f0;
            color: #b43b3b;
        }

        .empty-orders {
            padding: 40px 15px;
            text-align: center;
        }

        .empty-orders .empty-icon {
            display: grid;
            place-items: center;
            width: 55px;
            height: 55px;
            margin: 0 auto 15px;
            border-radius: 50%;
            background: #eaf7f5;
            color: #205f60;
            font-size: 25px;
        }

        .empty-orders h3 {
            margin: 0 0 8px;
            color: #173849;
            font-size: 16px;
        }

        .empty-orders p {
            margin: 0 0 18px;
            color: #7a8b94;
            font-size: 12px;
        }

        .empty-orders a {
            display: inline-block;
            padding: 10px 16px;
            border-radius: 7px;
            background: #087dc0;
            color: #fff;
            font-size: 12px;
            font-weight: 600;
        }

        .account-error {
            padding: 14px;
            border-radius: 8px;
            background: #fff0f0;
            color: #a52c2c;
            font-size: 12px;
        }

        @media (max-width: 800px) {
            .account-grid {
                grid-template-columns: 1fr;
            }
        }

        @media (max-width: 600px) {
            .account-main {
                width: calc(100% - 28px);
                margin: 25px auto 40px;
            }

            .account-welcome {
                padding: 26px 21px;
            }

            .account-welcome::after {
                right: 5px;
                font-size: 130px;
            }

            .account-card {
                padding: 19px 15px;
            }
        }
    </style>
</head>

<body>

<header class="site-header">
    <div class="container header-inner">

        <a href="index.html" class="brand" aria-label="Chalo home">
            <img src="assets/chalo-logo.png" alt="Chalo logo" class="brand-logo"
                 onerror="this.style.display='none'">
            <span class="brand-bengali">চলো - Chalo</span>
        </a>

        <nav class="main-nav">
            <a href="index.html">Home</a>
            <a href="gift-booking.html">Gift</a>
            <a href="index.html#about">About</a>
        </nav>

        <div class="header-actions">
            <a class="login-link" href="account.php">My account</a>
            <a class="register-btn" href="cart.html">My Cart</a>
            <button class="register-btn" id="logoutBtn" type="button">
                Log out
            </button>
        </div>

    </div>
</header>

<main class="account-main">

    <section class="account-welcome">
        <p class="account-eyebrow">YOUR CHALO SPACE</p>

        <h1>Welcome, <?= h($firstName) ?>!</h1>

        <p>Manage your account and keep track of all your journeys and bookings in one place.</p>

        <div class="account-welcome-actions">
            <a href="index.html#services" class="primary">Explore bookings →</a>
            <a href="bookings.html">Manage bookings</a>
            <button type="button" id="logoutWelcomeBtn">Log out</button>
        </div>
    </section>

    <div class="account-grid">

        <section class="account-card">
            <h2>Personal information</h2>

            <div class="profile-item">
                <small>Full name</small>
                <strong><?= h($user['full_name']) ?></strong>
            </div>

            <div class="profile-item">
                <small>Email address</small>
                <strong><?= h($user['email']) ?></strong>
            </div>

            <div class="profile-item">
                <small>Phone number</small>
                <strong><?= h($user['phone']) ?></strong>
            </div>

            <div class="profile-item">
                <small>Account type</small>
                <strong><?= h(ucfirst($user['role'] ?? 'Customer')) ?></strong>
            </div>
        </section>

        <section class="account-card orders-card">

            <div class="orders-heading">
                <h2>Your orders & bookings</h2>
                <span class="order-count"><?= count($orders) ?> items</span>
            </div>

            <?php if ($pageError): ?>

                <div class="account-error"><?= h($pageError) ?></div>

            <?php elseif (empty($orders)): ?>

                <div class="empty-orders">
                    <div class="empty-icon">⌑</div>
                    <h3>No bookings yet</h3>
                    <p>Your orders and reservations will appear here after you complete checkout.</p>
                    <a href="index.html#services">Explore Chalo</a>
                </div>

            <?php else: ?>

                <div class="orders-table-wrap">
                    <table class="orders-table">
                        <thead>
                            <tr>
                                <th>Order</th>
                                <th>Service</th>
                                <th>Booking reference</th>
                                <th>Booking status</th>
                                <th>Payment</th>
                                <th>Total</th>
                            </tr>
                        </thead>

                        <tbody>
                        <?php foreach ($orders as $order): ?>
                            <tr>
                                <td>
                                    <strong><?= h($order['order_number']) ?></strong>
                                    <br>
                                    <small><?= h($order['placed_at']) ?></small>
                                </td>

                                <td>
                                    <?= h($order['service_name'] ?? 'Order item') ?>
                                    <br>
                                    <small><?= h($order['category_name'] ?? '') ?></small>
                                </td>

                                <td>
                                    <?= h($order['booking_reference'] ?? 'Pending') ?>
                                </td>

                                <td>
                                    <?php
                                    $bookingStatus = $order['booking_status']
                                        ?? $order['order_status']
                                        ?? 'pending';
                                    ?>
                                    <span class="status <?= h(strtolower($bookingStatus)) ?>">
                                        <?= h(str_replace('_', ' ', $bookingStatus)) ?>
                                    </span>
                                </td>

                                <td>
                                    <span class="status <?= h(strtolower($order['payment_status'] ?? 'unpaid')) ?>">
                                        <?= h(str_replace('_', ' ', $order['payment_status'] ?? 'unpaid')) ?>
                                    </span>
                                </td>

                                <td>
                                    <?= h($order['currency'] ?? 'BDT') ?>
                                    <?= number_format((float)$order['grand_total'], 2) ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>

            <?php endif; ?>

        </section>

    </div>

</main>

<footer class="site-footer">
    <div class="container">
        <div class="footer-bottom">
            <span>© <?= date('Y') ?> Chalo. All rights reserved.</span>
            <div class="legal-links">
                <a href="index.html">Home</a>
                <a href="index.html#about">About us</a>
            </div>
        </div>
    </div>
</footer>

<script>
async function chaloLogout() {
    const buttons = [
        document.getElementById('logoutBtn'),
        document.getElementById('logoutWelcomeBtn')
    ];

    buttons.forEach(button => {
        if (button) {
            button.disabled = true;
            button.textContent = 'Logging out...';
        }
    });

    try {
        const response = await fetch('api/auth.php?action=logout', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json'
            }
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Logout failed.');
        }

        window.location.href = 'index.html';

    } catch (error) {
        buttons.forEach(button => {
            if (button) {
                button.disabled = false;
                button.textContent = 'Log out';
            }
        });

        alert(error.message || 'Could not log out. Please try again.');
    }
}

document.getElementById('logoutBtn')
    ?.addEventListener('click', chaloLogout);

document.getElementById('logoutWelcomeBtn')
    ?.addEventListener('click', chaloLogout);
</script>

</body>
</html>
