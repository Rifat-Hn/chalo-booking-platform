
document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    const API_URL = 'api/checkout.php';
    const CONFIRMATION_KEY = 'chalo_order_confirmation';

    const form = document.getElementById('checkoutForm');
    const emptyState = document.getElementById('checkoutEmpty');
    const giftSection = document.getElementById('giftRecipientSection');

    const checkoutItemsContainer = document.getElementById('checkoutItems');
    const itemCountElement = document.getElementById('checkoutItemCount');
    const subtotalElement = document.getElementById('checkoutSubtotal');
    const feesElement = document.getElementById('checkoutFees');
    const totalElement = document.getElementById('checkoutTotal');

    const placeOrderButton = document.getElementById('placeOrderBtn');

    const customerName = document.getElementById('customerName');
    const customerPhone = document.getElementById('customerPhone');
    const customerEmail = document.getElementById('customerEmail');

    const recipientName = document.getElementById('recipientName');
    const recipientPhone = document.getElementById('recipientPhone');
    const recipientEmail = document.getElementById('recipientEmail');
    const recipientAddress = document.getElementById('recipientAddress');
    const giftMessage = document.getElementById('giftMessage');

    let checkoutItems = [];
    let busy = false;

    const money = amount =>
        '৳' + Number(amount || 0).toLocaleString('en-BD', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });

    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[character]);
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
            throw new Error(
                'The server returned an invalid response. Please try again.'
            );
        }

        if (response.status === 401) {
            throw new Error('Please log in to continue checkout.');
        }

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || 'Checkout request failed.'
            );
        }

        return result.data || {};
    }

    function parseDetails(value) {
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
                console.warn('Could not parse selected details:', error);
            }
        }

        return {};
    }

    function getCategory(item) {
        return String(
            item.category_slug || item.category || 'booking'
        ).toLowerCase();
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

        return names[category] ||
            String(category || 'BOOKING').toUpperCase();
    }

    function getItemName(item) {
        return item.service_name || 'Chalo Booking';
    }

    function getItemPrice(item) {
        const quantity = Math.max(1, Number(item.quantity || 1));
        const unitPrice = Number(item.unit_price || 0);

        return quantity * unitPrice;
    }

    function getItemImage(item) {
        if (item.image_path) {
            return item.image_path;
        }

        const icons = {
            train: 'assets/icons/train.png',
            bus: 'assets/icons/bus.png',
            ferry: 'assets/icons/ferry.png',
            'river-ferry': 'assets/icons/ferry.png',
            hotel: 'assets/icons/hotel.png',
            restaurant: 'assets/icons/restaurant.png',
            movies: 'assets/icons/movies.png',
            movie: 'assets/icons/movies.png',
            events: 'assets/icons/events.png'
        };

        return icons[getCategory(item)] || 'assets/chalo-logo.png';
    }

    function getItemDetails(item) {
        const details = [];
        const selected = parseDetails(item.selected_details);

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

        const labels = {
            trainName: 'Train',
            trainNumber: 'Train No.',
            route: 'Route',
            from: 'From',
            to: 'To',
            journeyDate: 'Journey Date',
            departure: 'Departure',
            arrival: 'Arrival',
            travelClass: 'Class',
            seat: 'Seat',
            passengers: 'Passengers',
            busType: 'Bus Type',
            operator: 'Operator',
            vessel: 'Vessel',
            guests: 'Guests',
            hotelName: 'Hotel',
            checkIn: 'Check-in',
            checkOut: 'Check-out',
            restaurantName: 'Restaurant',
            reservationDate: 'Reservation Date',
            reservationTime: 'Reservation Time',
            slotLabel: 'Time Slot',
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

            const label = labels[key] ||
                key.replace(/([A-Z])/g, ' $1')
                    .replace(/_/g, ' ')
                    .replace(/^./, character => character.toUpperCase());

            details.push(label + ': ' + value);
        });

        if (
            Number(item.quantity) > 1 &&
            !selected.passengers &&
            !selected.guests
        ) {
            details.push('Quantity: ' + item.quantity);
        }

        return [...new Set(details)].join(' • ') || 'Booking item';
    }

    function getSubtotal() {
        return checkoutItems.reduce(
            (sum, item) => sum + getItemPrice(item),
            0
        );
    }

    function showEmptyCheckout() {
        form.hidden = true;

        if (emptyState) {
            emptyState.hidden = false;
        }
    }

    function showCheckoutForm() {
        form.hidden = false;

        if (emptyState) {
            emptyState.hidden = true;
        }
    }

    function renderItems() {
        checkoutItemsContainer.innerHTML = '';

        checkoutItems.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'checkout-item';

            const image = document.createElement('img');
            image.className = 'checkout-item-image';
            image.src = getItemImage(item);
            image.alt = getItemName(item);

            image.onerror = () => {
                image.onerror = null;
                image.src = 'assets/chalo-logo.png';
            };

            const info = document.createElement('div');
            info.className = 'checkout-item-info';

            const name = document.createElement('strong');
            name.textContent = getItemName(item);

            const category = document.createElement('small');
            category.textContent = getCategoryName(getCategory(item));

            const details = document.createElement('small');
            details.textContent = getItemDetails(item);

            info.appendChild(name);
            info.appendChild(category);
            info.appendChild(details);

            if (item.booking_mode === 'gift') {
                const giftLabel = document.createElement('span');
                giftLabel.className = 'checkout-gift-label';
                giftLabel.textContent = 'GIFT';
                info.appendChild(giftLabel);
            }

            const price = document.createElement('span');
            price.className = 'checkout-item-price';
            price.textContent = money(getItemPrice(item));

            itemElement.appendChild(image);
            itemElement.appendChild(info);
            itemElement.appendChild(price);

            checkoutItemsContainer.appendChild(itemElement);
        });

        updateSummary();
    }

    function updateSummary() {
        const subtotal = getSubtotal();

        // Fees and discounts are currently zero.
        // They can be connected to database rules later.
        const fees = 0;
        const discount = 0;
        const total = subtotal + fees - discount;

        itemCountElement.textContent = checkoutItems.length;
        subtotalElement.textContent = money(subtotal);
        feesElement.textContent = money(fees);
        totalElement.textContent = money(total);

        const discountRow = document.getElementById('checkoutDiscountRow');
        const discountElement = document.getElementById('checkoutDiscount');

        if (discountRow && discountElement) {
            discountRow.hidden = discount <= 0;
            discountElement.textContent = '-' + money(discount);
        }

        placeOrderButton.disabled =
            busy || checkoutItems.length === 0;
    }

    function getBookingType() {
        return document.querySelector(
            'input[name="bookingType"]:checked'
        )?.value || 'self';
    }

    function updateBookingType() {
        const isGift = getBookingType() === 'gift';

        giftSection.hidden = !isGift;

        recipientName.required = isGift;
        recipientPhone.required = isGift;

        const paymentNumber = document.getElementById(
            'paymentSectionNumber'
        );

        if (paymentNumber) {
            paymentNumber.textContent = isGift ? '04' : '03';
        }

        placeOrderButton.textContent = isGift
            ? 'Confirm Gift Booking'
            : 'Confirm & Pay';
    }

    function validateBangladeshPhone(phone) {
        const cleaned = phone.replace(/[\s-]/g, '');

        return /^(\+?8801[3-9]\d{8}|01[3-9]\d{8})$/.test(cleaned);
    }

    function validateForm() {
        if (!form.reportValidity()) {
            return false;
        }

        if (!validateBangladeshPhone(customerPhone.value.trim())) {
            alert('Please enter a valid Bangladesh phone number.');
            customerPhone.focus();
            return false;
        }

        if (getBookingType() === 'gift') {
            if (!validateBangladeshPhone(recipientPhone.value.trim())) {
                alert('Please enter a valid recipient phone number.');
                recipientPhone.focus();
                return false;
            }
        }

        return true;
    }

    function getPaymentMethod() {
        const selected = document.querySelector(
            'input[name="paymentMethod"]:checked'
        )?.value || 'demo_card';

        /*
         * The current HTML contains demonstration payment options.
         * Map them to valid database ENUM values.
         *
         * demo_card   -> card
         * demo_mobile -> other
         */
        const mapping = {
            demo_card: 'card',
            demo_mobile: 'other',
            bkash: 'bkash',
            nagad: 'nagad',
            rocket: 'rocket',
            card: 'card',
            internet_banking: 'internet_banking',
            cash: 'cash'
        };

        return mapping[selected] || 'other';
    }

    function getCheckoutPayload() {
        return {
            bookingType: getBookingType(),

            customerName: customerName.value.trim(),
            customerPhone: customerPhone.value.trim(),
            customerEmail: customerEmail.value.trim(),

            recipientName: recipientName.value.trim(),
            recipientPhone: recipientPhone.value.trim(),
            recipientEmail: recipientEmail.value.trim(),
            recipientAddress: recipientAddress.value.trim(),
            giftMessage: giftMessage.value.trim(),

            paymentMethod: getPaymentMethod(),

            checkoutNote: ''
        };
    }

    function fillCustomerInformation(customer) {
        if (!customer) return;

        if (customerName && customer.full_name) {
            customerName.value = customer.full_name;
        }

        if (customerPhone && customer.phone) {
            customerPhone.value = customer.phone;
        }

        if (customerEmail && customer.email) {
            customerEmail.value = customer.email;
        }
    }

    async function loadCheckout() {
        try {
            busy = true;
            updateSummary();

            /*
             * Load selected items directly from the database.
             * Do not use localStorage prices or booking details.
             */
            const data = await apiRequest('GET');

            checkoutItems = Array.isArray(data.items)
                ? data.items
                : [];

            fillCustomerInformation(data.customer);

            if (checkoutItems.length === 0) {
                showEmptyCheckout();
                return;
            }

            showCheckoutForm();

            /*
             * If every selected cart item is already marked as a gift,
             * automatically select Gift Booking.
             */
            const allItemsAreGifts = checkoutItems.every(
                item => item.booking_mode === 'gift'
            );

            if (allItemsAreGifts) {
                const giftRadio = document.querySelector(
                    'input[name="bookingType"][value="gift"]'
                );

                if (giftRadio) {
                    giftRadio.checked = true;
                }
            }

            renderItems();
            updateBookingType();

        } catch (error) {
            console.error('Checkout loading error:', error);

            showEmptyCheckout();

            alert(error.message);

        } finally {
            busy = false;
            updateSummary();
        }
    }

    document.querySelectorAll(
        'input[name="bookingType"]'
    ).forEach(input => {
        input.addEventListener('change', updateBookingType);
    });

    /*
     * Submit checkout to the PHP API.
     */
    form.addEventListener('submit', async event => {
        event.preventDefault();

        if (busy) return;

        if (!validateForm()) return;

        if (checkoutItems.length === 0) {
            alert('Your checkout has no items.');
            return;
        }

        busy = true;

        const originalButtonText = placeOrderButton.textContent;

        placeOrderButton.disabled = true;
        placeOrderButton.textContent = 'Processing Order...';

        try {
            const payload = getCheckoutPayload();

            /*
             * PHP verifies the logged-in customer, selected cart items,
             * schedule availability and prices using MySQL.
             */
            const result = await apiRequest('POST', payload);

            if (!result.orderId || !result.orderNumber) {
                throw new Error(
                    'The server did not return a valid order confirmation.'
                );
            }

            /*
             * Save only the server-generated confirmation response.
             * This is for displaying the confirmation page, not payment.
             */
            const confirmation = {
                orderId: result.orderId,
                orderNumber: result.orderNumber,
                paymentReference: result.paymentReference,
                paymentStatus: result.paymentStatus,
                orderStatus: result.orderStatus,
                bookingType: result.bookingType,
                subtotal: result.subtotal,
                serviceFee: result.serviceFee,
                discount: result.discount,
                total: result.total,
                currency: result.currency,
                bookings: result.bookings || [],
                createdAt: new Date().toISOString()
            };

            localStorage.setItem(
                CONFIRMATION_KEY,
                JSON.stringify(confirmation)
            );

            /*
             * The order is created, but payment is still pending.
             */
            window.location.href = 'order-confirmation.html';

        } catch (error) {
            console.error('Checkout submission error:', error);

            alert(error.message || 'Unable to create your order.');

            busy = false;
            placeOrderButton.disabled = false;
            placeOrderButton.textContent = originalButtonText;
        }
    });

    loadCheckout();
});
