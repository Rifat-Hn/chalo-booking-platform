
document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    const API_URL = 'api/cart.php';
    const CHECKOUT_KEY = 'chalo_checkout_items';

    const itemsContainer = document.getElementById('cartItems');
    const emptyState = document.getElementById('cartEmptyState');
    const itemCount = document.getElementById('cartItemCount');
    const summaryItemCount = document.getElementById('summaryItemCount');

    const selectAll = document.getElementById('selectAllItems');
    const removeSelected = document.getElementById('removeSelectedItems');
    const checkoutButton = document.getElementById('proceedCheckout');

    const subtotalElement = document.getElementById('summarySubtotal');
    const feesElement = document.getElementById('summaryFees');
    const totalElement = document.getElementById('summaryTotal');

    let cart = [];
    let busy = false;

    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[char]);
    }

    function money(value) {
        return '৳' + Number(value || 0).toLocaleString('en-BD', {
            maximumFractionDigits: 2
        });
    }

    async function apiRequest(method = 'GET', data = null) {
        const options = {
            method,
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json'
            }
        };

        if (data !== null) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(data);
        }

        const response = await fetch(API_URL, options);

        let result;

        try {
            result = await response.json();
        } catch (_) {
            throw new Error('The server returned an invalid response. Please try again.');
        }

        if (response.status === 401) {
            throw new Error('Please log in to view and manage your cart.');
        }

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Cart request failed.');
        }

        return result.data || {};
    }

    function getCategoryName(category) {
        const names = {
            train: 'TRAIN',
            bus: 'BUS',
            ferry: 'RIVER FERRY',
            'river-ferry': 'RIVER FERRY',
            hotel: 'HOTEL',
            restaurant: 'RESTAURANT',
            movies: 'MOVIE',
            movie: 'MOVIE',
            events: 'EVENT',
            'hall-shows': 'HALL SHOW'
        };

        return names[String(category || '').toLowerCase()]
            || String(category || 'SERVICE').toUpperCase();
    }

    function getItemName(item) {
        return item.service_name || 'Chalo booking';
    }

    // Parse JSON details returned by the cart API.
    function parseSelectedDetails(value) {
        if (!value) return {};

        if (typeof value === 'object' && !Array.isArray(value)) {
            return value;
        }

        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);

                return parsed &&
                    typeof parsed === 'object' &&
                    !Array.isArray(parsed)
                    ? parsed
                    : {};

            } catch (error) {
                console.warn('Could not parse cart item details:', error);
            }
        }

        return {};
    }

    function getItemDescription(item) {
        const details = [];
        const selected = parseSelectedDetails(item.selected_details);

        if (item.address) {
            details.push(item.address);
        }

        if (item.start_datetime) {
            details.push('Date: ' + item.start_datetime);
        }

        if (item.check_in_date) {
            details.push('Check-in: ' + item.check_in_date);
        }

        if (item.check_out_date) {
            details.push('Check-out: ' + item.check_out_date);
        }

        if (item.unit_code) {
            details.push('Selected: ' + item.unit_code);
        }

        if (item.class_or_type) {
            details.push(item.class_or_type);
        }

        const detailLabels = {
            trainName: 'Train',
            trainNumber: 'Train number',
            route: 'Route',
            from: 'From',
            to: 'To',
            journeyDate: 'Journey date',
            departure: 'Departure',
            arrival: 'Arrival',
            travelClass: 'Class',
            seat: 'Seat',
            passengers: 'Passengers',
            busType: 'Bus type',
            operator: 'Operator',
            vessel: 'Vessel',
            guests: 'Guests',
            hotelName: 'Hotel',
            checkIn: 'Check-in',
            checkOut: 'Check-out',
            restaurantName: 'Restaurant',
            reservationDate: 'Reservation date',
            reservationTime: 'Reservation time',
            slotLabel: 'Time slot',
            movieTitle: 'Movie',
            title: 'Title',
            cinema: 'Cinema',
            screen: 'Screen',
            showtime: 'Showtime',
            date: 'Date',
            time: 'Time'
        };

        Object.entries(selected).forEach(([key, value]) => {
            if (
                value === null ||
                value === undefined ||
                value === '' ||
                typeof value === 'object'
            ) {
                return;
            }

            const label = detailLabels[key] || key
                .replace(/([A-Z])/g, ' $1')
                .replace(/_/g, ' ')
                .replace(/^./, character => character.toUpperCase());

            details.push(label + ': ' + value);
        });

        if (
            item.quantity > 1 &&
            !selected.passengers &&
            !selected.guests
        ) {
            details.push('Quantity: ' + item.quantity);
        }

        return details.length
            ? details.join(' · ')
            : 'Service details selected';
    }

    function getItemImage(item) {
        // Use the service image supplied by the database when available.
        if (item.image_path) {
            return item.image_path;
        }

        const category = String(
            item.category_slug || ''
        ).toLowerCase();

        const images = {
            train: 'assets/icons/train.png',
            bus: 'assets/icons/bus.png',
            'river-ferry': 'assets/icons/ferry.png',
            ferry: 'assets/icons/ferry.png',
            hotel: 'assets/icons/hotel.png',
            restaurant: 'assets/icons/restaurant.png',
            movies: 'assets/icons/movies.png',
            movie: 'assets/icons/movies.png',
            events: 'assets/icons/events.png',
            'hall-shows': 'assets/icons/events.png'
        };

        return images[category] || 'assets/chalo-logo.png';
    }

    // Convert database cart records into a consistent frontend format.
    function normalizeItem(item) {
        const quantity = Math.max(1, Number(item.quantity || 1));

        const unitPrice = Number(
            item.unit_price || item.price || 0
        );

        const lineTotal =
            item.line_total !== undefined &&
            item.line_total !== null
                ? Number(item.line_total)
                : unitPrice * quantity;

        return {
            ...item,
            _cartId: String(item.cart_item_id),
            category: item.category_slug || 'service',
            price: Number.isFinite(lineTotal) ? lineTotal : 0,
            unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
            quantity,
            selected_details: parseSelectedDetails(item.selected_details),
            _selected: item.item_status === 'selected',
            bookingMode: item.booking_mode || 'self',
            isGift: item.booking_mode === 'gift'
        };
    }

    function getSelectedItems() {
        return cart.filter(item => item._selected);
    }

    function renderItem(item) {
        const title = escapeHTML(getItemName(item));

        const category = escapeHTML(
            getCategoryName(item.category)
        );

        const description = escapeHTML(
            getItemDescription(item)
        );

        const image = escapeHTML(
            getItemImage(item)
        );

        const giftLabel = item.isGift
            ? '<span class="cart-item-gift">♧ GIFT BOOKING</span>'
            : '';

        return `
            <article class="cart-item"
                data-cart-id="${escapeHTML(item._cartId)}">

                <input
                    type="checkbox"
                    class="cart-item-checkbox"
                    aria-label="Select ${title}"
                    ${item._selected ? 'checked' : ''}>

                <img
                    class="cart-item-image"
                    src="${image}"
                    alt="${title}"
                    onerror="this.onerror=null;this.src='assets/chalo-logo.png'">

                <div class="cart-item-details">
                    <span class="cart-item-category">${category}</span>

                    ${giftLabel}

                    <h3>${title}</h3>

                    <p>${description}</p>

                    <div class="cart-item-bottom">
                        <strong class="cart-item-price">
                            ${money(item.price)}
                        </strong>

                        <div class="cart-item-actions">
                            <button
                                type="button"
                                class="remove-item"
                                data-action="remove">
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            </article>
        `;
    }

    function updateSummary() {
        const selectedItems = getSelectedItems();

        const subtotal = selectedItems.reduce(
            (sum, item) => sum + item.price,
            0
        );

        const fees = 0;
        const total = subtotal + fees;

        if (subtotalElement) {
            subtotalElement.textContent = money(subtotal);
        }

        if (feesElement) {
            feesElement.textContent = money(fees);
        }

        if (totalElement) {
            totalElement.textContent = money(total);
        }

        if (summaryItemCount) {
            summaryItemCount.textContent =
                `${selectedItems.length} ${
                    selectedItems.length === 1 ? 'item' : 'items'
                }`;
        }

        if (itemCount) {
            itemCount.textContent =
                `${cart.length} ${
                    cart.length === 1 ? 'item' : 'items'
                } in your cart · ${selectedItems.length} selected`;
        }

        if (checkoutButton) {
            checkoutButton.disabled =
                selectedItems.length === 0 || busy;
        }

        if (selectAll) {
            selectAll.checked =
                cart.length > 0 &&
                cart.every(item => item._selected);

            selectAll.indeterminate =
                selectedItems.length > 0 &&
                selectedItems.length < cart.length;
        }

        if (removeSelected) {
            removeSelected.disabled =
                selectedItems.length === 0 || busy;
        }
    }

    function renderCart() {
        if (!itemsContainer) return;

        if (!cart.length) {
            itemsContainer.innerHTML = '';

            if (emptyState) {
                emptyState.hidden = false;
            }

            if (selectAll) {
                selectAll.checked = false;
                selectAll.indeterminate = false;
            }

            updateSummary();
            return;
        }

        if (emptyState) {
            emptyState.hidden = true;
        }

        itemsContainer.innerHTML = cart
            .map(renderItem)
            .join('');

        updateSummary();
    }

    async function loadCart() {
        try {
            busy = true;
            updateSummary();

            const data = await apiRequest('GET');

            cart = (data.items || []).map(normalizeItem);

            renderCart();

        } catch (error) {
            console.error('Cart loading error:', error);

            if (itemsContainer) {
                itemsContainer.innerHTML = '';
            }

            cart = [];
            renderCart();

            alert(error.message);

        } finally {
            busy = false;
            updateSummary();
        }
    }

    async function updateItem(item, changes) {
        if (busy) return;

        try {
            busy = true;
            updateSummary();

            await apiRequest('POST', {
                action: 'update',
                cartItemId: Number(item.cart_item_id),
                ...changes
            });

            await loadCart();

        } catch (error) {
            alert(error.message);

        } finally {
            busy = false;
            updateSummary();
        }
    }

    // Select or unselect all cart items.
    selectAll?.addEventListener('change', async () => {
        if (busy) return;

        const selected = selectAll.checked;

        try {
            busy = true;
            updateSummary();

            await Promise.all(
                cart.map(item =>
                    apiRequest('POST', {
                        action: 'update',
                        cartItemId: Number(item.cart_item_id),
                        itemStatus: selected
                            ? 'selected'
                            : 'unselected'
                    })
                )
            );

            await loadCart();

        } catch (error) {
            alert(error.message);
            await loadCart();

        } finally {
            busy = false;
            updateSummary();
        }
    });

    // Select or unselect one item.
    itemsContainer?.addEventListener('change', async event => {
        const checkbox = event.target.closest(
            '.cart-item-checkbox'
        );

        if (!checkbox || busy) return;

        const card = checkbox.closest('.cart-item');

        const item = cart.find(
            entry => entry._cartId === card?.dataset.cartId
        );

        if (!item) return;

        await updateItem(item, {
            itemStatus: checkbox.checked
                ? 'selected'
                : 'unselected'
        });
    });

    // Remove one cart item.
    itemsContainer?.addEventListener('click', async event => {
        const button = event.target.closest(
            '[data-action="remove"]'
        );

        if (!button || busy) return;

        const card = button.closest('.cart-item');

        const item = cart.find(
            entry => entry._cartId === card?.dataset.cartId
        );

        if (!item) return;

        try {
            busy = true;
            updateSummary();

            await apiRequest('POST', {
                action: 'remove',
                cartItemId: Number(item.cart_item_id)
            });

            await loadCart();

        } catch (error) {
            alert(error.message);

        } finally {
            busy = false;
            updateSummary();
        }
    });

    // Remove all selected cart items.
    removeSelected?.addEventListener('click', async () => {
        const selectedItems = getSelectedItems();

        if (!selectedItems.length || busy) return;

        if (!confirm(
            `Remove ${selectedItems.length} selected item(s) from your cart?`
        )) {
            return;
        }

        try {
            busy = true;
            updateSummary();

            await apiRequest('POST', {
                action: 'remove_selected'
            });

            await loadCart();

        } catch (error) {
            alert(error.message);

        } finally {
            busy = false;
            updateSummary();
        }
    });

    // Proceed to checkout.
    checkoutButton?.addEventListener('click', () => {
        const selectedItems = getSelectedItems();

        if (!selectedItems.length) {
            alert('Please select at least one item.');
            return;
        }

        // Pass database cart item IDs to the checkout page.
        // The checkout API must validate these IDs server-side.
        const checkoutItems = selectedItems.map(item => ({
            cartItemId: Number(item.cart_item_id),
            scheduleId: Number(item.schedule_id),
            serviceId: Number(item.service_id),
            category: item.category,
            name: item.service_name,
            quantity: item.quantity,
            price: item.price,
            bookingMode: item.bookingMode,
            selectedDetails: item.selected_details
        }));

        try {
            localStorage.setItem(
                CHECKOUT_KEY,
                JSON.stringify(checkoutItems)
            );

            window.location.href = 'checkout.html';

        } catch (error) {
            console.error('Checkout preparation error:', error);

            alert('Unable to prepare checkout. Please try again.');
        }
    });

    // Load the customer's database cart when the page opens.
    loadCart();
});
