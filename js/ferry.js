// Chalo River Ferries
// Ferry listings are loaded dynamically from the database API.
// Existing HTML structure and CSS classes are preserved.

document.addEventListener('DOMContentLoaded', () => {
  const API_URL = 'api/ferries.php';

  // Gift mode
  const giftMode =
    new URLSearchParams(window.location.search).get('mode') === 'gift';

  const form = document.getElementById('searchForm');
  const message = document.getElementById('searchMessage');
  const keyword = document.getElementById('keyword');
  const sortBy = document.getElementById('sortBy');
  const grid = document.getElementById('resultsGrid');
  const empty = document.getElementById('emptyState');

  const resultCount = document.getElementById('resultCount');
  const resultHeading = document.getElementById('resultHeading');

  const fromInput = document.getElementById('from');
  const toInput = document.getElementById('to');
  const dateInput = document.getElementById('date');
  const passengersInput = document.getElementById('passengers');

  const resetButton = document.getElementById('resetFilters');

  let allFerries = [];
  let currentFerries = [];

  // --------------------------------------------------
  // Helper functions
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

  function formatTime(dateTime) {
      if (!dateTime) return 'Time unavailable';

      const date = new Date(String(dateTime).replace(' ', 'T'));

      if (Number.isNaN(date.getTime())) {
          return String(dateTime);
      }

      return date.toLocaleTimeString('en-BD', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
      });
  }

  function formatDate(dateTime) {
      if (!dateTime) return '';

      const date = new Date(String(dateTime).replace(' ', 'T'));

      if (Number.isNaN(date.getTime())) {
          return '';
      }

      return date.toLocaleDateString('en-BD', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
      });
  }

  function getFerryImage(ferry) {
      const vesselName = String(ferry.vessel_name || '').toLowerCase();
      let fallback = 'assets/images/ferry/default-ferry.jpg';
      if (vesselName.includes('sundarban')) fallback = 'assets/images/ferry/sundarban.jpg';
      else if (vesselName.includes('green line')) fallback = 'assets/images/ferry/greenline-waterways.jpg';
      else if (vesselName.includes('tipu')) fallback = 'assets/images/ferry/tipu.jpg';

      return window.ChaloCardCovers
          ? window.ChaloCardCovers.resolve('ferries', [ferry.vessel_name, ferry.service_name], ferry.image_path, fallback)
          : (ferry.image_path || fallback);
  }

  function getInventoryText(ferry) {
      const inventory = ferry.inventory || [];

      const availableTypes = [
          ...new Set(
              inventory
                  .filter(unit => unit.unit_status === 'available')
                  .map(unit => unit.class_or_type)
                  .filter(Boolean)
          )
      ];

      if (availableTypes.length) {
          return availableTypes.join(' · ');
      }

      return ferry.vessel_type || 'Ferry service';
  }

  function getSearchText(ferry) {
      const inventoryText = (ferry.inventory || [])
          .map(unit => unit.class_or_type || '')
          .join(' ');

      return [
          ferry.service_name,
          ferry.vessel_name,
          ferry.operator_name,
          ferry.departure_city,
          ferry.arrival_city,
          ferry.departure_terminal,
          ferry.arrival_terminal,
          ferry.vessel_type,
          inventoryText
      ].join(' ').toLowerCase();
  }

  // --------------------------------------------------
  // Create ferry card
  // --------------------------------------------------

  function createFerryCard(ferry) {
      const card = document.createElement('article');
      card.className = 'service-card';

      const name = ferry.service_name || ferry.vessel_name || 'Ferry service';
      const route = `${ferry.departure_city || ''} → ${ferry.arrival_city || ''}`;
      const departure = formatTime(ferry.departure_datetime);
      const arrival = formatTime(ferry.arrival_datetime);
      const journeyDate = formatDate(ferry.departure_datetime);
      const image = getFerryImage(ferry);
      const rating = Number(ferry.average_rating || 0);
      const reviews = Number(ferry.total_reviews || 0);
      const price = Number(ferry.price || 0);
      const inventoryText = getInventoryText(ferry);

      card.dataset.name = name.toLowerCase();
      card.dataset.price = String(price);
      card.dataset.search = getSearchText(ferry);
      card.dataset.category = inventoryText.toLowerCase();

      card.dataset.scheduleId = String(ferry.schedule_id);
      card.dataset.serviceId = String(ferry.service_id);

      card.innerHTML = `
          <div class="card-image">
              <img
                  src="${escapeHTML(image)}"
                  alt="${escapeHTML(ferry.vessel_name || name)}"
                  onerror="this.onerror=null;this.src='assets/images/ferry/default-ferry.jpg';"
              >
              <span class="rating">
                  ★ ${rating.toFixed(1)}
                  ${reviews > 0 ? `(${reviews})` : ''}
              </span>
          </div>

          <div class="card-body">
              <div class="card-kicker">
                  ${escapeHTML(inventoryText)}
              </div>

              <h3>${escapeHTML(name)}</h3>

              <p>${escapeHTML(route)}</p>

              <div class="card-meta">
                  <span>
                      ${escapeHTML(departure)} – ${escapeHTML(arrival)}
                  </span>
                  <span>
                      ${escapeHTML(journeyDate)}
                  </span>
              </div>

              <div class="card-bottom">
                  <strong>${formatPrice(price)}</strong>
                  <button type="button" class="action-btn">
                      ${giftMode ? 'GIFT' : 'View cabins'}
                  </button>
              </div>
          </div>
      `;

      const actionButton = card.querySelector('.action-btn');

      actionButton.addEventListener('click', async () => {
        await addToCart(ferry, actionButton);
    });

      return card;
  }

  
  // --------------------------------------------------
  // Add ferry selection to database-backed Chalo cart
  // --------------------------------------------------

  async function addToCart(ferry, button) {

    const originalText = button.textContent;

    const quantity = Math.max(
        1,
        Number(passengersInput?.value || 1)
    );

    const scheduleId = Number(ferry.schedule_id);

    if (!scheduleId) {
        alert('Invalid ferry schedule. Please try again.');
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

            quantity: quantity,

            selectionType: 'cabin',

            bookingMode: giftMode ? 'gift' : 'self',

            selectedDetails: {

                serviceName: ferry.service_name,

                vessel: ferry.vessel_name,

                route:
                    `${ferry.departure_city || ''} → ${ferry.arrival_city || ''}`,

                departure: ferry.departure_datetime,

                arrival: ferry.arrival_datetime,

                availableCabinTypes: (ferry.inventory || [])
                    .filter(unit => unit.unit_status === 'available')
                    .map(unit => unit.class_or_type)
                    .filter(Boolean)

            }

        });

        button.textContent = 'Added ✓';

        alert(
            `${giftMode ? 'Ferry gift selection' : 'Ferry selection'} added to your cart successfully!\n\n` +
            `Ferry: ${ferry.service_name || ferry.vessel_name}\n` +
            `Route: ${ferry.departure_city} → ${ferry.arrival_city}\n` +
            `Passengers: ${quantity}\n` +
            `Price per passenger: ${formatPrice(ferry.price)}\n` +
            `Mode: ${giftMode ? 'Gift Booking' : 'Self Booking'}\n\n` +
            `Your selection has been saved in your database cart.`
        );

    } catch (error) {

        console.error('Ferry cart error:', error);

        alert(
            error.message ||
            'Unable to add ferry selection to your cart. Please try again.'
        );

    } finally {

        button.disabled = false;

        setTimeout(() => {
            button.textContent = originalText;
        }, 1300);

    }
}


  // --------------------------------------------------
  // Filter and sort database results
  // --------------------------------------------------

  function applyFilters() {
      const searchTerm = (keyword?.value || '').trim().toLowerCase();

      const selectedTypes = [
          ...document.querySelectorAll(
              '.filter-group input[type="checkbox"]:checked'
          )
      ].map(input => input.value.toLowerCase());

      let filtered = allFerries.filter(ferry => {
          const searchableText = getSearchText(ferry);

          const matchesKeyword =
              !searchTerm || searchableText.includes(searchTerm);

          const availableTypes = (ferry.inventory || [])
              .filter(unit => unit.unit_status === 'available')
              .map(unit => String(unit.class_or_type || '').toLowerCase());

          const matchesType =
              selectedTypes.length === 0 ||
              selectedTypes.some(type => availableTypes.includes(type));

          return matchesKeyword && matchesType;
      });

      if (sortBy?.value === 'price-low') {
          filtered.sort(
              (a, b) => Number(a.price || 0) - Number(b.price || 0)
          );
      } else if (sortBy?.value === 'name') {
          filtered.sort((a, b) =>
              String(a.service_name || '').localeCompare(
                  String(b.service_name || '')
              )
          );
      }

      currentFerries = filtered;
      renderFerries(filtered);
  }

  // --------------------------------------------------
  // Render cards
  // --------------------------------------------------

  function renderFerries(ferries) {
      grid.innerHTML = '';

      ferries.forEach(ferry => {
          grid.appendChild(createFerryCard(ferry));
      });

      if (resultCount) {
          resultCount.textContent =
              `${ferries.length} ${ferries.length === 1 ? 'option' : 'options'}`;
      }

      if (empty) {
          empty.hidden = ferries.length > 0;
      }

      if (resultHeading) {
          resultHeading.textContent = 'Available River Ferries';
      }
  }

  // --------------------------------------------------
  // Load ferry data from PHP API
  // --------------------------------------------------

  async function loadFerries(searchParameters = {}) {
      grid.innerHTML = '<p>Loading ferry schedules...</p>';

      if (empty) {
          empty.hidden = true;
      }

      try {
          const url = new URL(API_URL, window.location.href);

          Object.entries(searchParameters).forEach(([key, value]) => {
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
              throw new Error(result.message || 'Unable to load ferry schedules.');
          }

          allFerries = Array.isArray(result.data?.ferries)
              ? result.data.ferries
              : [];

          applyFilters();

          if (message) {
              message.textContent = result.message || 'Ferry schedules loaded.';
          }

      } catch (error) {
          console.error('Ferry loading error:', error);

          allFerries = [];
          renderFerries([]);

          if (message) {
              message.textContent =
                  'Unable to load ferry schedules. Please check your connection and try again.';
          }
      }
  }

  // --------------------------------------------------
  // Search form
  // --------------------------------------------------

  form?.addEventListener('submit', event => {
      event.preventDefault();

      const from = fromInput?.value || '';
      const to = toInput?.value || '';
      const date = dateInput?.value || '';

      const passengers = Number(passengersInput?.value || 1);

      if (from && to && from.toLowerCase() === to.toLowerCase()) {
          if (message) {
              message.textContent =
                  'Departure and arrival locations cannot be the same.';
          }
          return;
      }

      if (passengers < 1) {
          if (message) {
              message.textContent = 'Please select at least one passenger.';
          }
          return;
      }

      const parameters = {
          from,
          to,
          date
      };

      if (message) {
          message.textContent = 'Searching available ferry schedules...';
      }

      loadFerries(parameters);

      document.querySelector('.catalog-main')?.scrollIntoView({
          behavior: 'smooth'
      });
  });

  // --------------------------------------------------
  // Filter events
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
      if (sortBy) sortBy.value = 'recommended';

      if (message) {
          message.textContent = 'Filters reset.';
      }

      applyFilters();
  });

  // --------------------------------------------------
  // Set minimum journey date
  // --------------------------------------------------

  if (dateInput) {
      const now = new Date();

      const today = new Date(
          now.getTime() - now.getTimezoneOffset() * 60000
      ).toISOString().slice(0, 10);

      dateInput.min = today;

      if (!dateInput.value) {
          dateInput.value = today;
      }
  }

  // --------------------------------------------------
  // Initial page load
  // --------------------------------------------------

  loadFerries({
      from: fromInput?.value || '',
      to: toInput?.value || ''
  });
});