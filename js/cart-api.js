
window.ChaloCart = {
    async add(item) {
        const response = await fetch('api/cart.php', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                action: 'add',
                scheduleId: Number(item.scheduleId),
                unitId: item.unitId || null,
                quantity: Number(item.quantity || 1),
                selectionType: item.selectionType || 'other',
                selectedDetails: item.selectedDetails || {},
                bookingMode: item.bookingMode || 'self',
                guestName: item.guestName || '',
                guestPhone: item.guestPhone || '',
                specialRequest: item.specialRequest || '',
                bookingForName: item.bookingForName || '',
                bookingForPhone: item.bookingForPhone || '',
                bookingForEmail: item.bookingForEmail || '',
                startDate: item.startDate || null,
                endDate: item.endDate || null
            })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Could not add item to cart.');
        }

        return result;
    },

    async load() {
        const response = await fetch('api/cart.php', {
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' }
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Could not load cart.');
        }

        return result.data.items || [];
    }
};
