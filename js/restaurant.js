
/*
 * Chalo Restaurant Listings
 * Database-driven restaurant cards and reservation slots.
 * Preserves the existing restaurant.html and CSS structure.
 */

document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'api/restaurants.php';

    const giftMode =
        new URLSearchParams(window.location.search).get('mode') === 'gift';

    const form = document.getElementById('searchForm');
    const message = document.getElementById('searchMessage');

    const locationInput = document.getElementById('location');
    const dateInput = document.getElementById('date');
    const timeInput = document.getElementById('time');
    const guestsInput = document.getElementById('guests');

    const keyword = document.getElementById('keyword');
    const sortBy = document.getElementById('sortBy');

    const grid = document.getElementById('resultsGrid');
    const empty = document.getElementById('emptyState');

    const resultCount = document.getElementById('resultCount');
    const resultHeading = document.getElementById('resultHeading');
    const resetButton = document.getElementById('resetFilters');

    let allRestaurants = [];

    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[character]);
    }

    function formatPrice(value) {
        return '৳' + Number(value || 0).toLocaleString('en-BD');
    }

    function getRestaurantLocation(restaurant) {
        return [
            restaurant.location_name,
            restaurant.area,
            restaurant.city
        ].filter(Boolean).join(', ') || restaurant.address || 'Location unavailable';
    }

    function getCuisine(restaurant) {
        return restaurant.cuisine_type || 'Restaurant';
    }

    function getImage(restaurant) {
        const name = String(restaurant.service_name || '').toLowerCase();
        let fallback = 'assets/icons/restaurant.png';

        if (name.includes('courtyard')) fallback = 'assets/images/restaurant/courtyard.jpg';
        else if (name.includes('kacchi')) fallback = 'assets/images/restaurant/kacchi.jpg';
        else if (name.includes('bella') || name.includes('italia')) fallback = 'assets/images/restaurant/bella-italia.jpg';

        return window.ChaloCardCovers
            ? window.ChaloCardCovers.resolve('restaurants', [restaurant.service_name, restaurant.slug], restaurant.image_path, fallback)
            : (restaurant.image_path || fallback);
    }

    function getSearchText(restaurant) {
        const amenities = Array.isArray(restaurant.amenities)
            ? restaurant.amenities.join(' ')
            : '';

        const tableAreas = (restaurant.tables || [])
            .map(table => table.table_area || '')
            .join(' ');

        return [
            restaurant.service_name,
            restaurant.provider_name,
            restaurant.cuisine_type,
            restaurant.city,
            restaurant.area,
            restaurant.location_name,
            restaurant.address,
            amenities,
            tableAreas
        ].join(' ').toLowerCase();
    }

    function formatTime(dateTime) {
        if (!dateTime) return '';

        const date = new Date(
            String(dateTime).replace(' ', 'T')
        );

        if (Number.isNaN(date.getTime())) {
            return String(dateTime);
        }

        return date.toLocaleTimeString('en-BD', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    function getSelectedTime() {
        const value = timeInput?.value || '';

        const match = value.match(
            /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
        );

        if (!match) return null;

        let hour = Number(match[1]);
        const minute = Number(match[2]);
        const period = match[3].toUpperCase();

        if (period === 'PM' && hour !== 12) {
            hour += 12;
        }

        if (period === 'AM' && hour === 12) {
            hour = 0;
        }

        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }

    function getSlotTime(slot) {
        if (!slot.start_datetime) return '';

        const value = String(slot.start_datetime);
        const match = value.match(/\s(\d{2}:\d{2})/);

        return match ? match[1] : '';
    }

    function getMatchingSlots(restaurant) {
        const slots = restaurant.slots || [];
        const selectedTime = getSelectedTime();

        if (!selectedTime) return slots;

        return slots.filter(slot =>
            getSlotTime(slot) === selectedTime
        );
    }

    function getCardMeta(restaurant) {
        const slots = getMatchingSlots(restaurant);

        if (slots.length) {
            const firstSlot = slots[0];

            return `${escapeHTML(firstSlot.slot_label || 'Reservation slot')} · ${escapeHTML(formatTime(firstSlot.start_datetime))}`;
        }

        if (restaurant.opening_time && restaurant.closing_time) {
            return `Open ${escapeHTML(restaurant.opening_time)} – ${escapeHTML(restaurant.closing_time)}`;
        }

        return 'Reservation details available';
    }

    // --------------------------------------------------
    // Create restaurant card
    // --------------------------------------------------

    function createRestaurantCard(restaurant) {
        const card = document.createElement('article');

        card.className = 'service-card';

        const name = restaurant.service_name || 'Restaurant';
        const cuisine = getCuisine(restaurant);
        const location = getRestaurantLocation(restaurant);

        const rating = Number(restaurant.average_rating || 0);
        const reviews = Number(restaurant.total_reviews || 0);

        const cost = Number(
            restaurant.average_cost_for_two || 0
        );

        const image = getImage(restaurant);
        const matchingSlots = getMatchingSlots(restaurant);
        const cardMeta = getCardMeta(restaurant);

        card.dataset.name = name.toLowerCase();
        card.dataset.category = cuisine.toLowerCase();
        card.dataset.search = getSearchText(restaurant);
        card.dataset.price = String(cost);

        card.innerHTML = `
            <div class="card-image">
                <img
                    loading="lazy"
                    src="${escapeHTML(image)}"
                    alt="${escapeHTML(name)}"
                >

                <span class="rating">
                    ★ ${rating.toFixed(1)}
                    ${reviews > 0 ? `(${reviews})` : ''}
                </span>
            </div>

            <div class="card-body">

                <div class="card-kicker">
                    ${escapeHTML(cuisine)}
                </div>

                <h3>${escapeHTML(name)}</h3>

                <p>${escapeHTML(location)}</p>

                <div class="card-meta">
                    ${cardMeta}
                </div>

                <div class="card-bottom">
                    <strong>
                        ${cost > 0
                            ? `${formatPrice(cost)} / 2 persons`
                            : 'Reserve a table'
                        }
                    </strong>

                    <button
                        class="action-btn"
                        type="button"
                        ${matchingSlots.length === 0 ? 'disabled' : ''}
                    >
                        ${matchingSlots.length > 0
                            ? (giftMode ? 'GIFT' : 'Select time')
                            : 'No slots'
                        }
                    </button>
                </div>

            </div>
        `;

        const imageElement = card.querySelector('.card-image img');

        imageElement.addEventListener('error', () => {
            imageElement.src = 'assets/icons/restaurant.png';
        }, { once: true });

        const actionButton = card.querySelector('.action-btn');

        if (matchingSlots.length > 0) {
            actionButton.addEventListener('click', async () => {
                await selectRestaurantSlot(
                    restaurant,
                    matchingSlots,
                    actionButton
                );
            });
        }

        return card;
    }

    // --------------------------------------------------
    // Select reservation slot
    // --------------------------------------------------

    async function selectRestaurantSlot(restaurant, slots, button) {
        let selectedSlot = slots[0];

        if (slots.length > 1) {
            const slotOptions = slots.map((slot, index) => {
                return `${index + 1}. ${slot.slot_label || formatTime(slot.start_datetime)} (${formatTime(slot.start_datetime)})`;
            }).join('\n');

            const choice = prompt(
                `Available reservation times:\n\n${slotOptions}\n\nEnter the option number:`,
                '1'
            );

            if (choice === null) return;

            const index = Number(choice) - 1;

            if (
                !Number.isInteger(index) ||
                index < 0 ||
                index >= slots.length
            ) {
                alert('Invalid reservation time selection.');
                return;
            }

            selectedSlot = slots[index];
        }

        await addToCart(restaurant, selectedSlot, button);
    }

    // --------------------------------------------------
    // Add restaurant reservation to database cart
    // --------------------------------------------------

    async function addToCart(restaurant, slot, button) {
        const originalText = button.textContent;

        const scheduleId = Number(slot.schedule_id);
        const guests = Math.max(
            1,
            Number(guestsInput?.value || 2)
        );

        if (!scheduleId) {
            alert('Invalid restaurant reservation slot. Please search again.');
            return;
        }

        button.disabled = true;
        button.textContent = 'Adding to cart...';

        try {
            if (
                !window.ChaloCart ||
                typeof window.ChaloCart.add !== 'function'
            ) {
                throw new Error(
                    'Cart API not loaded. Please check cart-api.js.'
                );
            }

            await window.ChaloCart.add({
                scheduleId: scheduleId,
                quantity: 1,
                selectionType: 'table',
                bookingMode: giftMode ? 'gift' : 'self',

                selectedDetails: {
                    restaurantId: Number(restaurant.restaurant_id),
                    restaurantName: restaurant.service_name,
                    serviceId: Number(restaurant.service_id),

                    cuisine: restaurant.cuisine_type || '',
                    location: getRestaurantLocation(restaurant),

                    restaurantSlotId: Number(
                        slot.restaurant_slot_id || 0
                    ),

                    slotLabel: slot.slot_label || 'Reservation slot',

                    reservationDate: String(
                        slot.start_datetime || ''
                    ).slice(0, 10),

                    reservationTime: formatTime(
                        slot.start_datetime
                    ),

                    guests: guests
                }
            });

            button.textContent = 'Added ✓';

            alert(
                giftMode
                    ? `Restaurant gift selection added to your cart.\n\n${restaurant.service_name}\n${slot.slot_label || 'Reservation slot'}\n${formatTime(slot.start_datetime)}\nGuests: ${guests}`
                    : `Restaurant reservation added to your cart.\n\n${restaurant.service_name}\n${slot.slot_label || 'Reservation slot'}\n${formatTime(slot.start_datetime)}\nGuests: ${guests}`
            );

        } catch (error) {
            console.error('Restaurant cart error:', error);

            alert(
                error.message ||
                'Unable to add restaurant reservation to your cart. Please try again.'
            );

        } finally {
            button.disabled = false;

            setTimeout(() => {
                button.textContent = originalText;
            }, 1300);
        }
    }

    // --------------------------------------------------
    // Filters and sorting
    // --------------------------------------------------

    function applyFilters() {
        const query = (keyword?.value || '')
            .trim()
            .toLowerCase();

        const checkedFilters = [
            ...document.querySelectorAll(
                '.filter-group input[type="checkbox"]:checked'
            )
        ].map(input => input.value.toLowerCase());

        let filtered = allRestaurants.filter(restaurant => {
            const searchText = getSearchText(restaurant);

            const cuisine = String(
                restaurant.cuisine_type || ''
            ).toLowerCase();

            const matchesKeyword =
                !query || searchText.includes(query);

            const matchesCuisine =
                checkedFilters.length === 0 ||
                checkedFilters.some(filter =>
                    cuisine.includes(filter)
                );

            return matchesKeyword && matchesCuisine;
        });

        if (sortBy?.value === 'name') {
            filtered.sort((a, b) =>
                String(a.service_name || '').localeCompare(
                    String(b.service_name || '')
                )
            );
        } else if (sortBy?.value === 'price-low') {
            filtered.sort((a, b) =>
                Number(a.average_cost_for_two || 0) -
                Number(b.average_cost_for_two || 0)
            );
        } else {
            filtered.sort((a, b) =>
                Number(b.average_rating || 0) -
                Number(a.average_rating || 0)
            );
        }

        renderRestaurants(filtered);
    }

    // --------------------------------------------------
    // Render cards
    // --------------------------------------------------

    function renderRestaurants(restaurants) {
        grid.innerHTML = '';

        restaurants.forEach(restaurant => {
            grid.appendChild(
                createRestaurantCard(restaurant)
            );
        });

        if (resultCount) {
            resultCount.textContent =
                `${restaurants.length} ${restaurants.length === 1 ? 'option' : 'options'}`;
        }

        if (empty) {
            empty.hidden = restaurants.length > 0;
        }
    }

    // --------------------------------------------------
    // Load restaurants from API
    // --------------------------------------------------

    async function loadRestaurants(parameters = {}) {
        grid.innerHTML = '<p>Loading restaurants...</p>';

        if (empty) {
            empty.hidden = true;
        }

        try {
            const url = new URL(
                API_URL,
                window.location.href
            );

            Object.entries(parameters).forEach(([key, value]) => {
                if (
                    value !== undefined &&
                    value !== null &&
                    value !== ''
                ) {
                    url.searchParams.set(key, value);
                }
            });

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(
                    `Server returned HTTP ${response.status}`
                );
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(
                    result.message || 'Unable to load restaurants.'
                );
            }

            allRestaurants = Array.isArray(
                result.data?.restaurants
            )
                ? result.data.restaurants
                : [];

            // The sample database has future reservation dates, not slots for
            // every calendar day. On first load, default to the earliest real
            // upcoming date rather than today's empty date.
            if (!parameters.date && dateInput && allRestaurants.length) {
                const availableDates = allRestaurants
                    .flatMap(restaurant => restaurant.slots || [])
                    .map(slot => String(slot.start_datetime || '').slice(0, 10))
                    .filter(value => value && value >= dateInput.min)
                    .sort();

                if (availableDates.length) {
                    dateInput.value = availableDates[0];
                }
            }

            applyFilters();

            if (message) {
                message.textContent =
                    result.message || 'Restaurants loaded successfully.';
            }

        } catch (error) {
            console.error('Restaurant API error:', error);

            allRestaurants = [];

            renderRestaurants([]);

            if (message) {
                message.textContent =
                    'Unable to load restaurants. Please check your connection and try again.';
            }
        }
    }

    // --------------------------------------------------
    // Search form
    // --------------------------------------------------

    form?.addEventListener('submit', event => {
        event.preventDefault();

        const location = locationInput?.value || '';
        const date = dateInput?.value || '';
        const guests = Number(guestsInput?.value || 2);

        if (!date) {
            if (message) {
                message.textContent =
                    'Please select a reservation date.';
            }
            return;
        }

        if (guests < 1) {
            if (message) {
                message.textContent =
                    'Please select at least one guest.';
            }
            return;
        }

        if (message) {
            message.textContent =
                'Searching available restaurant reservation slots...';
        }

        loadRestaurants({
            location,
            date,
            guests
        });

        document.querySelector('.catalog-main')?.scrollIntoView({
            behavior: 'smooth'
        });
    });

    // --------------------------------------------------
    // Filter listeners
    // --------------------------------------------------

    keyword?.addEventListener('input', applyFilters);
    sortBy?.addEventListener('change', applyFilters);

    document.querySelectorAll(
        '.filter-group input[type="checkbox"]'
    ).forEach(input => {
        input.addEventListener('change', applyFilters);
    });

    // --------------------------------------------------
    // Reset filters
    // --------------------------------------------------

    resetButton?.addEventListener('click', () => {
        document.querySelectorAll(
            '.filter-group input[type="checkbox"]'
        ).forEach(input => {
            input.checked = false;
        });

        if (keyword) {
            keyword.value = '';
        }

        if (sortBy) {
            sortBy.value = 'recommended';
        }

        if (message) {
            message.textContent = 'Filters reset.';
        }

        applyFilters();
    });

    // --------------------------------------------------
    // Set default reservation date
    // --------------------------------------------------

    if (dateInput) {
        const now = new Date();

        const today = new Date(
            now.getTime() -
            now.getTimezoneOffset() * 60000
        ).toISOString().slice(0, 10);

        dateInput.min = today;

        if (!dateInput.value) {
            dateInput.value = today;
        }
    }

    // --------------------------------------------------
    // Initial database load
    // --------------------------------------------------

    loadRestaurants({
        location: locationInput?.value || '',
        guests: guestsInput?.value || 2
    });
});
