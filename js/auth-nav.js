(() => {
    'use strict';

    const nav = document.querySelector('.header-actions');
    if (!nav) return;

    // Keep the cart entry visible even while account information is loading.
    nav.innerHTML = `
        <a class="login-link" href="login.html">Log in</a>
        <a class="register-btn" href="register.html">Register</a>
        <a class="register-btn chalo-cart-nav" href="cart.html">My Cart</a>
    `;

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, ch => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;',
            '"': '&quot;', "'": '&#39;'
        })[ch]);
    }

    async function loadNavigation() {
        try {
            const response = await fetch('api/auth.php?action=me', {
                credentials: 'same-origin',
                cache: 'no-store',
                headers: { 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error('Could not verify login status.');

            const data = await response.json();

            if (!data.authenticated || !data.user) return;

            const firstName = escapeHtml(
                String(data.user.full_name || 'Traveler').trim().split(/\s+/)[0]
            );

            let cartCount = 0;
            try {
                const cartResponse = await fetch('api/cart.php', {
                    credentials: 'same-origin',
                    cache: 'no-store',
                    headers: { 'Accept': 'application/json' }
                });
                const cartData = await cartResponse.json();
                if (cartResponse.ok && cartData.success) {
                    cartCount = (cartData.data?.items || [])
                        .reduce((sum, item) => sum + Number(item.quantity || 1), 0);
                }
            } catch (error) {
                console.warn('Could not load cart count:', error);
            }

            nav.innerHTML = `
                <a class="login-link" href="account.php">Hi, ${firstName}</a>
                <a class="register-btn chalo-cart-nav" href="cart.html">
                    My Cart (${cartCount})
                </a>
                <a class="register-btn" href="account.php">My Account</a>
                <button class="register-btn" type="button" id="chaloLogout">Log out</button>
            `;

            document.getElementById('chaloLogout')?.addEventListener('click', async () => {
                try {
                    const logoutResponse = await fetch('api/auth.php?action=logout', {
                        method: 'POST',
                        credentials: 'same-origin',
                        headers: { 'Accept': 'application/json' }
                    });
                    const result = await logoutResponse.json();
                    if (!logoutResponse.ok || !result.success) {
                        throw new Error(result.message || 'Logout failed.');
                    }
                    window.location.href = 'index.html';
                } catch (error) {
                    alert(error.message || 'Could not log out. Please try again.');
                }
            });
        } catch (error) {
            console.error('Navigation loading error:', error);
            // The initial cart link remains available if auth lookup fails.
        }
    }

    loadNavigation();
})();
