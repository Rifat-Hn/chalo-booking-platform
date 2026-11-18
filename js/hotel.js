/*
 * Chalo Hotels
 * Loads hotel listings and room information from the database API.
 * Existing HTML and CSS classes are preserved.
 */

document.addEventListener('DOMContentLoaded', () => {
  const API_URL = 'api/hotels.php';

  // Gift mode
  const giftMode =
      new URLSearchParams(window.location.search).get('mode') === 'gift';

  const form = document.getElementById('searchForm');
  const message = document.getElementById('searchMessage');
  const locationInput = document.getElementById('location');
  const checkinInput = document.getElementById('checkin');
  const checkoutInput = document.getElementById('checkout');
  const guestsInput = document.getElementById('guests');

  const keyword = document.getElementById('keyword');
  const sortBy = document.getElementById('sortBy');
  const grid = document.getElementById('resultsGrid');
  const empty = document.getElementById('emptyState');

  const resultCount = document.getElementById('resultCount');
  const resultHeading = document.getElementById('resultHeading');
  const resetButton = document.getElementById('resetFilters');

  let allHotels = [];
  let defaultStayApplied = false;

  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------

  function escapeHTML(value) {
      return String(value ?? '').replace(/[&<>"']/g, character => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;'
      })[character]);
  }

  function formatPrice(price) {
      return '৳' + Number(price || 0).toLocaleString('en-BD');
  }

  function getHotelLocation(hotel) {
      return [
          hotel.location_name,
          hotel.area,
          hotel.city
      ].filter(Boolean).join(', ') || hotel.address || 'Location unavailable';
  }

  function getHotelImage(hotel) {
      const name = String(hotel.service_name || '').toLowerCase();
      let fallback = 'assets/chalo-logo.png';

      if (name.includes('sea pearl')) fallback = 'assets/images/hotel/seapearl.jpg';
      else if (name.includes('intercontinental')) fallback = 'assets/images/hotel/intercontinental.jpg';
      else if (name.includes('sylhet')) fallback = 'assets/images/hotel/sylhet.jpg';

      return window.ChaloCardCovers
          ? window.ChaloCardCovers.resolve('hotels', [hotel.service_name, hotel.slug], hotel.image_path, fallback)
          : (hotel.image_path || fallback);
  }

  function getRoomList(hotel) {
      const classes = hotel.suitable_room_classes || [];
      const types = hotel.suitable_room_types || [];

      if (classes.length) return classes;
      return types;
  }

  function getRoomName(room) {
      return room.room_name || room.room_type_name || 'Available room';
  }

  function getRoomPrice(room) {
      return Number(
          room.base_nightly_rate ??
          room.base_price ??
          0
      );
  }

  function getStartingPrice(hotel) {
      const rooms = getRoomList(hotel);

      if (rooms.length) {
          const prices = rooms
              .map(getRoomPrice)
              .filter(price => price > 0);

          if (prices.length) {
              return Math.min(...prices);
          }
      }

      return Number(hotel.base_price || 0);
  }

  function getRoomSummary(hotel) {
      const rooms = getRoomList(hotel);

      if (!rooms.length) {
          return 'Room information available';
      }

      const names = [...new Set(
          rooms.map(getRoomName).filter(Boolean)
      )];

      return names.slice(0, 3).join(' · ');
  }

  function getHotelSearchText(hotel) {
      const roomText = getRoomList(hotel)
          .map(room => [
              room.room_name,
              room.room_type_name,
              room.bed_type
          ].join(' '))
          .join(' ');

      const amenities = Array.isArray(hotel.hotel_amenities)
          ? hotel.hotel_amenities.join(' ')
          : '';

      return [
          hotel.service_name,
          hotel.provider_name,
          hotel.city,
          hotel.area,
          hotel.location_name,
          hotel.address,
          hotel.description,
          hotel.hotel_star_rating,
          roomText,
          amenities
      ].join(' ').toLowerCase();
  }

  function getHotelCategoryText(hotel) {
      const categories = [];

      const starRating = Number(hotel.hotel_star_rating || 0);

      if (starRating > 0) {
          categories.push('Hotel');
      }

      const name = String(hotel.service_name || '').toLowerCase();

      if (name.includes('resort')) {
          categories.push('Resort');
      }

      if (
          name.includes('guest house') ||
          name.includes('guesthouse')
      ) {
          categories.push('Guest house');
      }

      const amenities = Array.isArray(hotel.hotel_amenities)
          ? hotel.hotel_amenities
          : [];

      if (amenities.some(item =>
          String(item).toLowerCase().includes('breakfast')
      )) {
          categories.push('Breakfast included');
      }

      return categories;
  }

  // --------------------------------------------------
  // Create a hotel card
  // --------------------------------------------------

  function createHotelCard(hotel) {
      const card = document.createElement('article');
      card.className = 'service-card';

      const name = hotel.service_name || 'Hotel';
      const location = getHotelLocation(hotel);
      const image = getHotelImage(hotel);

      const rating = Number(hotel.average_rating || 0);
      const reviews = Number(hotel.total_reviews || 0);
      const starRating = Number(hotel.hotel_star_rating || 0);

      const rooms = getRoomList(hotel);
      const roomSummary = getRoomSummary(hotel);
      const startingPrice = Number(hotel.schedule_price ?? getStartingPrice(hotel));

      const checkinTime = hotel.check_in_time || 'Not specified';

      const categoryText = getHotelCategoryText(hotel).join(' ');
      const searchText = getHotelSearchText(hotel);

      card.dataset.name = name.toLowerCase();
      card.dataset.price = String(startingPrice);
      card.dataset.search = searchText;
      card.dataset.category = categoryText.toLowerCase();

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
                  ${escapeHTML(roomSummary)}
              </div>

              <h3>${escapeHTML(name)}</h3>

              <p>${escapeHTML(location)}</p>

              <div class="card-meta">
                  ${starRating > 0
                      ? `${starRating}-star property · `
                      : ''
                  }
                  Check-in ${escapeHTML(checkinTime)}
              </div>

              <div class="card-bottom">
                  <strong>${formatPrice(startingPrice)} / selected stay</strong>
                  <button class="action-btn" type="button" ${hotel.schedule_id ? '' : 'disabled'}>
                      ${hotel.schedule_id ? (giftMode ? 'GIFT' : 'Choose room') : 'No rooms for these dates'}
                  </button>
              </div>
          </div>
      `;

      const imageElement = card.querySelector('.card-image img');

      imageElement.addEventListener('error', () => {
          imageElement.src = 'assets/chalo-logo.png';
      }, { once: true });

      card.querySelector('.action-btn').addEventListener('click', async event => {
        await addToCart(hotel, event.currentTarget);
    });

      return card;
  }

 // --------------------------------------------------
// Add hotel selection to database-backed Chalo cart
// --------------------------------------------------

async function addToCart(hotel, button) {
    const originalText = button.textContent;

    const scheduleId = Number(hotel.schedule_id);
    const checkin = checkinInput?.value || '';
    const checkout = checkoutInput?.value || '';
    const guests = Math.max(1, Number(guestsInput?.value || 1));

    const rooms = getRoomList(hotel);

    if (!scheduleId) {
        alert('Invalid hotel schedule. Please search again.');
        return;
    }

    if (!checkin || !checkout || checkout <= checkin) {
        alert('Please select valid check-in and check-out dates.');
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

            // One selected room by default.
            quantity: 1,

            selectionType: 'room',

            bookingMode: giftMode ? 'gift' : 'self',

            startDate: checkin,
            endDate: checkout,

            selectedDetails: {
                hotelName: hotel.service_name,
                hotelLocation: getHotelLocation(hotel),

                checkIn: checkin,
                checkOut: checkout,

                guests: guests,

                availableRoomOptions: rooms.map(room => ({
                    roomName: getRoomName(room),
                    price: getRoomPrice(room),
                    bedType: room.bed_type || ''
                }))
            }
        });

        button.textContent = 'Added ✓';

        alert(
            giftMode
                ? 'Hotel gift selection added to your cart.'
                : 'Hotel selection added to your cart.'
        );

    } catch (error) {
        console.error('Hotel cart error:', error);

        alert(
            error.message ||
            'Unable to add this hotel to your cart. Please try again.'
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
      const query = (keyword?.value || '').trim().toLowerCase();

      const checkedFilters = [
          ...document.querySelectorAll(
              '.filter-group input[type="checkbox"]:checked'
          )
      ].map(input => input.value.toLowerCase());

      let filtered = allHotels.filter(hotel => {
          const searchText = getHotelSearchText(hotel);
          const categoryText = getHotelCategoryText(hotel)
              .join(' ')
              .toLowerCase();

          const matchesKeyword =
              !query || searchText.includes(query);

          const matchesCategory =
              checkedFilters.length === 0 ||
              checkedFilters.some(filter =>
                  categoryText.includes(filter)
              );

          return matchesKeyword && matchesCategory;
      });

      if (sortBy?.value === 'price-low') {
          filtered.sort(
              (a, b) => getStartingPrice(a) - getStartingPrice(b)
          );
      } else if (sortBy?.value === 'name') {
          filtered.sort((a, b) =>
              String(a.service_name || '').localeCompare(
                  String(b.service_name || '')
              )
          );
      } else {
          filtered.sort(
              (a, b) =>
                  Number(b.average_rating || 0) -
                  Number(a.average_rating || 0)
          );
      }

      renderHotels(filtered);
  }

  // --------------------------------------------------
  // Render results
  // --------------------------------------------------

  function renderHotels(hotels) {
      grid.innerHTML = '';

      hotels.forEach(hotel => {
          grid.appendChild(createHotelCard(hotel));
      });

      if (resultCount) {
          resultCount.textContent =
              `${hotels.length} ${hotels.length === 1 ? 'option' : 'options'}`;
      }

      if (empty) {
          empty.hidden = hotels.length > 0;
      }
  }

  // --------------------------------------------------
  // Fetch hotel data from the database
  // --------------------------------------------------

  async function loadHotels(parameters = {}) {
      grid.innerHTML = '<p>Loading hotels...</p>';

      if (empty) {
          empty.hidden = true;
      }

      try {
          const url = new URL(API_URL, window.location.href);

          Object.entries(parameters).forEach(([key, value]) => {
              if (value !== undefined && value !== null && value !== '') {
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
              throw new Error(`Server returned HTTP ${response.status}`);
          }

          const result = await response.json();

          if (!result.success) {
              throw new Error(
                  result.message || 'Unable to load hotels.'
              );
          }

          allHotels = Array.isArray(result.data?.hotels)
              ? result.data.hotels
              : [];

          // Use the earliest real seeded stay on first load. The demo database
          // does not contain availability for every date on the calendar.
          if (!defaultStayApplied && !parameters.checkin && allHotels.length) {
              const stays = allHotels
                  .flatMap(hotel => hotel.available_stays || [])
                  .sort((a, b) => String(a.check_in_date).localeCompare(String(b.check_in_date)));
              defaultStayApplied = true;
              if (stays.length && checkinInput && checkoutInput) {
                  checkinInput.value = stays[0].check_in_date;
                  checkoutInput.value = stays[0].check_out_date;
                  await loadHotels({
                      location: locationInput?.value || '',
                      checkin: checkinInput.value,
                      checkout: checkoutInput.value,
                      guests: guestsInput?.value || 1
                  });
                  return;
              }
          }

          applyFilters();

          if (message) {
              message.textContent =
                  result.message || 'Hotels loaded successfully.';
          }

      } catch (error) {
          console.error('Hotel loading error:', error);

          allHotels = [];
          renderHotels([]);

          if (message) {
              message.textContent =
                  'Unable to load hotels. Please check your connection and try again.';
          }
      }
  }

  // --------------------------------------------------
  // Hotel search
  // --------------------------------------------------

  form?.addEventListener('submit', event => {
      event.preventDefault();

      const location = locationInput?.value || '';
      const checkin = checkinInput?.value || '';
      const checkout = checkoutInput?.value || '';
      const guests = Number(guestsInput?.value || 1);

      if (!checkin || !checkout) {
          if (message) {
              message.textContent =
                  'Please select both check-in and check-out dates.';
          }
          return;
      }

      if (checkout <= checkin) {
          if (message) {
              message.textContent =
                  'Check-out date must be after check-in date.';
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
          message.textContent = 'Searching available hotels...';
      }

      loadHotels({
          location,
          checkin,
          checkout,
          guests
      });

      document.querySelector('.catalog-main')?.scrollIntoView({
          behavior: 'smooth'
      });
  });

  // --------------------------------------------------
  // Filter event listeners
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

      if (keyword) keyword.value = '';

      if (sortBy) {
          sortBy.value = 'recommended';
      }

      if (message) {
          message.textContent = 'Filters reset.';
      }

      applyFilters();
  });

  // --------------------------------------------------
  // Set date defaults
  // --------------------------------------------------

  const now = new Date();

  const today = new Date(
      now.getTime() - now.getTimezoneOffset() * 60000
  ).toISOString().slice(0, 10);

  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);

  const tomorrow = new Date(
      tomorrowDate.getTime() -
      tomorrowDate.getTimezoneOffset() * 60000
  ).toISOString().slice(0, 10);

  if (checkinInput) {
      checkinInput.min = today;

      if (!checkinInput.value) {
          checkinInput.value = today;
      }
  }

  if (checkoutInput) {
      checkoutInput.min = tomorrow;

      if (!checkoutInput.value) {
          checkoutInput.value = tomorrow;
      }
  }

  checkinInput?.addEventListener('change', () => {
      if (!checkinInput.value || !checkoutInput) return;

      const nextDate = new Date(`${checkinInput.value}T00:00:00`);
      nextDate.setDate(nextDate.getDate() + 1);

      const minimumCheckout = [
          nextDate.getFullYear(),
          String(nextDate.getMonth() + 1).padStart(2, '0'),
          String(nextDate.getDate()).padStart(2, '0')
      ].join('-');

      checkoutInput.min = minimumCheckout;

      if (checkoutInput.value <= checkinInput.value) {
          checkoutInput.value = minimumCheckout;
      }
  });

  // --------------------------------------------------
  // Initial load
  // --------------------------------------------------

  loadHotels({
      location: locationInput?.value || ''
  });
});