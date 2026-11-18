<?php
// Keep the old /cart.php address working while the cart interface lives in cart.html.
header('Location: cart.html', true, 302);
exit;
