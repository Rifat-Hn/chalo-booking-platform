
document.addEventListener('DOMContentLoaded', async () => {
    const content = document.getElementById('confirmationContent');
    const noOrder = document.getElementById('noOrderMessage');
    const itemsContainer = document.getElementById('confirmedItems');

    const CONFIRMATION_KEY = 'chalo_order_confirmation';
    const API_URL = 'api/orders.php';

    function showNoOrder(message) {
        if (content) content.hidden = true;

        if (noOrder) {
            noOrder.hidden = false;

            const messageElement = noOrder.querySelector('p');
            if (messageElement && message) {
                messageElement.textContent = message;
            }
        }
    }

    function readConfirmation() {
        try {
            return JSON.parse(localStorage.getItem(CONFIRMATION_KEY)) || null;
        } catch (error) {
            console.error('Unable to read order confirmation:', error);
            return null;
        }
    }

    function getOrderNumber(savedOrder) {
        return savedOrder?.orderNumber ||
            savedOrder?.data?.orderNumber ||
            savedOrder?.data?.order?.orderNumber ||
            savedOrder?.order_number ||
            savedOrder?.data?.order_number ||
            null;
    }

    const money = amount => {
        const value = Number(amount || 0);

        return '৳' + value.toLocaleString('en-BD', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });
    };

    const setText = (id, value) => {
        const element = document.getElementById(id);

        if (element) {
            element.textContent =
                value !== null && value !== undefined && value !== ''
                    ? value
                    : '—';
        }
    };

    function formatDate(value) {
        if (!value) return '—';

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return date.toLocaleString('en-BD', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    }

    function getItemName(item) {
        return item.name || 'Chalo Booking';
    }

    function getItemDetails(item) {
        const details = [
            item.details,
            item.quantity > 1 ? `Quantity: ${item.quantity}` : null,
            item.bookingReference
                ? `Booking Ref: ${item.bookingReference}`
                : null
        ];

        return details.filter(Boolean).join(' • ') || 'Booking item';
    }

    function getItemImage() {
        // The current order API does not return an image path.
        return 'assets/chalo-logo.png';
    }

    function renderItems(items) {
        if (!itemsContainer) return;

        itemsContainer.innerHTML = '';

        if (!Array.isArray(items) || items.length === 0) {
            const message = document.createElement('p');
            message.textContent = 'No booking items were found for this order.';
            itemsContainer.appendChild(message);
            return;
        }

        items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'confirmed-item';

            const image = document.createElement('img');
            image.className = 'confirmed-item-image';
            image.src = getItemImage(item);
            image.alt = getItemName(item);
            image.onerror = () => {
                image.onerror = null;
                image.src = 'assets/chalo-logo.png';
            };

            const info = document.createElement('div');
            info.className = 'confirmed-item-info';

            const name = document.createElement('strong');
            name.textContent = getItemName(item);

            const details = document.createElement('small');
            details.textContent = getItemDetails(item);

            info.appendChild(name);
            info.appendChild(details);

            if (item.bookingStatus) {
                const status = document.createElement('small');
                status.className = 'confirmed-booking-status';
                status.textContent =
                    'Booking status: ' + item.bookingStatus.replaceAll('_', ' ');
                info.appendChild(status);
            }

            const price = document.createElement('span');
            price.className = 'confirmed-item-price';
            price.textContent = money(item.total);

            itemElement.appendChild(image);
            itemElement.appendChild(info);
            itemElement.appendChild(price);

            itemsContainer.appendChild(itemElement);
        });
    }

    function renderOrder(order) {
        if (content) content.hidden = false;
        if (noOrder) noOrder.hidden = true;

        // Order information
        setText('orderId', order.orderId);
        setText('orderDate', formatDate(order.orderDate));

        setText(
            'bookingType',
            order.bookingType === 'gift' ? 'Gift Booking' : 'Self Booking'
        );

        // Purchaser information
        const purchaser = order.purchaser || {};

        setText('purchaserName', purchaser.name);
        setText('purchaserPhone', purchaser.phone);
        setText('purchaserEmail', purchaser.email);

        // Recipient information
        const recipientCard = document.getElementById('recipientCard');

        if (order.bookingType === 'gift' && order.recipient) {
            if (recipientCard) recipientCard.hidden = false;

            setText('recipientName', order.recipient.name);
            setText('recipientPhone', order.recipient.phone);
            setText('recipientEmail', order.recipient.email);
            setText('recipientAddress', order.recipient.address);
            setText('giftMessage', order.recipient.message);
        } else if (recipientCard) {
            recipientCard.hidden = true;
        }

        // Booking items
        renderItems(order.items);

        // Payment summary
        setText('confirmedSubtotal', money(order.subtotal));
        setText('confirmedFees', money(order.serviceFee));
        setText('confirmedDiscount', '-' + money(order.discount));
        setText('confirmedTotal', money(order.total));

        // Order and payment status, if the HTML contains these elements.
        setText('orderStatus', order.orderStatus);
        setText('paymentStatus', order.paymentStatus);

        if (order.payment) {
            setText('paymentMethod', order.payment.payment_method);
            setText('paymentReference', order.payment.payment_reference);
        }

        // Print button
        const printButton = document.getElementById('printOrderBtn');

        if (printButton) {
            printButton.addEventListener('click', () => {
                window.print();
            });
        }
    }

    try {
        const savedOrder = readConfirmation();
        const orderNumber = getOrderNumber(savedOrder);

        if (!orderNumber) {
            showNoOrder(
                'No recent order was found. Please place an order first.'
            );
            return;
        }

        const response = await fetch(
            `${API_URL}?orderNumber=${encodeURIComponent(orderNumber)}`,
            {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json'
                }
            }
        );

        const result = await response.json();

        if (!response.ok || !result.success || !result.data) {
            throw new Error(
                result.message || 'Unable to retrieve your order.'
            );
        }

        renderOrder(result.data);

    } catch (error) {
        console.error('Order confirmation error:', error);

        showNoOrder(
            error.message || 'Unable to load your order. Please try again.'
        );
    }
});
