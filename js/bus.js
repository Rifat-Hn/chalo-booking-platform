// Chalo Bus Page — Database-driven search, filters, sorting and seat selection.
(() => {
  'use strict';

  const $ = (selector, root = document) =>
      root.querySelector(selector);

  const $$ = (selector, root = document) =>
      [...root.querySelectorAll(selector)];

  const API_URL = 'api/buses.php';

  // Gift mode
  const giftMode =
      new URLSearchParams(window.location.search).get('mode') === 'gift';

  document.body.classList.toggle('gift-mode-active', giftMode);

  const form = $('#searchForm');
  const results = $('#resultsList');
  const count = $('#resultCount');
  const empty = $('#emptyState');
  const modal = $('#seatModal');
  const seatGrid = $('#seatGrid');
  const dateInput = $('#date');

  let buses = [];
  let activeCard = null;
  let currentFare = 0;
  let selectedSeats = new Set();

  const continueBookingButton = $('#continueBooking');

  if (giftMode) {
      continueBookingButton.textContent = 'GIFT';
      modal.classList.add('gift-mode');
  }

  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------

  const money = value =>
      '৳' + Number(value || 0).toLocaleString('en-BD');

  const escapeHTML = value =>
      String(value ?? '').replace(/[&<>"']/g, char => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;'
      })[char]);

  function localISO(date) {
      const d = new Date(
          date.getTime() - date.getTimezoneOffset() * 60000
      );

      return d.toISOString().slice(0, 10);
  }

  function formatTime(value) {
      if (!value) return '--:--';

      const date = new Date(String(value).replace(' ', 'T'));

      if (!isNaN(date.getTime()) && String(value).includes('-')) {
          return date.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
          });
      }

      const parts = String(value).substring(0, 5).split(':');

      if (parts.length !== 2) return String(value);

      let hour = Number(parts[0]);
      const minute = parts[1];
      const suffix = hour >= 12 ? 'PM' : 'AM';

      hour = hour % 12 || 12;

      return `${String(hour).padStart(2, '0')}:${minute} ${suffix}`;
  }

  function getDatePart(value) {
      if (!value) return dateInput.value;

      const date = new Date(String(value).replace(' ', 'T'));

      if (isNaN(date.getTime())) {
          return dateInput.value;
      }

      return localISO(date);
  }

  function formatJourneyDate(value) {
      if (!value) return '';

      const date = new Date(value + 'T12:00:00');

      return date.toLocaleDateString('en-US', {
          day: '2-digit',
          month: 'short'
      });
  }

  function durationText(minutes) {
      minutes = Number(minutes || 0);

      if (!minutes) return 'Duration unavailable';

      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;

      if (!remainingMinutes) {
          return `${hours} hrs`;
      }

      return `${hours} hrs ${remainingMinutes} mins`;
  }

  function timePeriod(value) {
      const hour = Number(String(value || '00:00').substring(0, 2));

      if (hour >= 6 && hour < 12) return 'morning';
      if (hour >= 12 && hour < 18) return 'afternoon';

      return 'evening';
  }

  function initials(name) {
      const words = String(name || 'Bus')
          .trim()
          .split(/\s+/)
          .filter(Boolean);

      if (words.length === 1) {
          return words[0].substring(0, 2).toUpperCase();
      }

      return (words[0][0] + words[1][0]).toUpperCase();
  }

  function operatorColor(name) {
      const value = String(name || '').toLowerCase();

      if (value.includes('green')) return 'green';
      if (value.includes('hanif')) return 'red';
      if (value.includes('shohagh')) return 'blue';
      if (value.includes('ena')) return 'orange';

      return 'blue';
  }

  function showMessage(text, type = 'info') {
      $('#searchMessage').textContent = text;
      $('#searchMessage').dataset.type = type;
  }

  // --------------------------------------------------
  // Date setup
  // --------------------------------------------------

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  dateInput.min = localISO(today);

  if (!dateInput.value) {
      dateInput.value = localISO(today);
  }

  // --------------------------------------------------
  // Date strip
  // --------------------------------------------------

  const strip = $('#dateStrip');

  function renderDates() {
      strip.innerHTML = '';

      const chosen = dateInput.value || localISO(today);

      for (let i = 0; i < 7; i++) {
          const date = new Date(today);

          date.setDate(today.getDate() + i);

          const iso = localISO(date);

          const button = document.createElement('button');

          button.type = 'button';

          button.className =
              'date-option' + (iso === chosen ? ' active' : '');

          button.dataset.date = iso;

          button.innerHTML = `
              <small>
                  ${i === 0
                      ? 'TODAY'
                      : date.toLocaleDateString('en-US', {
                          weekday: 'short'
                      }).toUpperCase()
                  }
              </small>
              ${date.toLocaleDateString('en-US', {
                  day: '2-digit',
                  month: 'short'
              })}
          `;

          button.addEventListener('click', () => {
              dateInput.value = iso;
              renderDates();
              loadBuses();
          });

          strip.appendChild(button);
      }
  }

  renderDates();

  // --------------------------------------------------
  // Swap route
  // --------------------------------------------------

  $('#swapRoute').addEventListener('click', () => {
      const from = $('#from');
      const to = $('#to');

      const old = from.value;

      from.value = to.value;
      to.value = old;
  });

  // --------------------------------------------------
  // Normalize database records
  // --------------------------------------------------

  function normalizeBus(item) {
      const departure =
          item.boarding_time ||
          item.departure_datetime;

      const arrival =
          item.dropping_time ||
          item.arrival_datetime;

      const departureDate = getDatePart(departure);
      const arrivalDate = getDatePart(arrival);

      const availableSeats = Number(
          item.available_capacity ??
          item.listed_available_seats ??
          0
      );

      let amenities = item.amenities || [];

      if (typeof amenities === 'string') {
          try {
              amenities = JSON.parse(amenities);
          } catch (error) {
              amenities = [];
          }
      }

      if (!Array.isArray(amenities)) {
          amenities = Object.values(amenities || {});
      }

      return {
          id: item.schedule_id,
          serviceId: item.service_id,
          busId: item.bus_id,
          imagePath: item.image_path || '',

          operator: item.operator_name ||
              item.business_name ||
              'Bus Operator',

          busName: item.bus_name ||
              item.operator_name ||
              'Bus Service',

          type: item.bus_type || 'Standard',

          registration: item.registration_no || '',

          price: Number(item.price || 0),

          rating: Number(item.average_rating || 0),
          reviews: Number(item.total_reviews || 0),

          departure,
          arrival,

          departureTime: formatTime(departure),
          arrivalTime: formatTime(arrival),

          departureDate,
          arrivalDate,

          from: item.departure_city || '',
          to: item.arrival_city || '',

          departureTerminal: item.departure_terminal || '',
          arrivalTerminal: item.arrival_terminal || '',

          duration: Number(
              item.duration_minutes ||
              item.estimated_minutes ||
              0
          ),

          distance: Number(item.distance_km || 0),

          capacity: Number(item.capacity || item.seat_capacity || 0),

          availableSeats,

          amenities,

          hotline: item.operator_hotline ||
              item.support_phone ||
              '',

          routeId: item.bus_route_id
      };
  }

  // --------------------------------------------------
  // Load buses from PHP API
  // --------------------------------------------------

  async function loadBuses() {
      const from = $('#from').value;
      const to = $('#to').value;
      const date = dateInput.value;

      if (!date) {
          showMessage('Please select your journey date.');
          return;
      }

      if (from.toLowerCase() === to.toLowerCase()) {
          showMessage('Please choose two different locations.');
          return;
      }

      showMessage('Searching available buses...');

      results.innerHTML = `
          <div class="empty-state">
              Loading bus schedules...
          </div>
      `;

      empty.hidden = true;

      const params = new URLSearchParams();

      if (from) params.set('from', from);
      if (to) params.set('to', to);

      params.set('date', date);

      try {
          const response = await fetch(
              `${API_URL}?${params.toString()}`,
              {
                  method: 'GET',
                  headers: {
                      'Accept': 'application/json'
                  }
              }
          );

          if (!response.ok) {
              throw new Error(
                  `Server returned HTTP ${response.status}`
              );
          }

          const json = await response.json();

          if (!json.success) {
              throw new Error(
                  json.message || 'Could not load bus schedules.'
              );
          }

          const records =
              json.data?.buses ||
              json.buses ||
              [];

          buses = records.map(normalizeBus);

          renderBuses();

          showMessage(
              buses.length
                  ? `${buses.length} bus schedule(s) found.`
                  : 'No buses found for this route and date.',
              buses.length ? 'success' : 'info'
          );

      } catch (error) {
          console.error('Bus API error:', error);

          buses = [];
          results.innerHTML = '';
          count.textContent = '0 buses';
          empty.hidden = false;
          empty.textContent = 'Unable to load buses. Please try again.';

          showMessage(
              error.message || 'Something went wrong.',
              'error'
          );
      }
  }

  // --------------------------------------------------
  // Bus card
  // --------------------------------------------------

  function createBusCard(bus) {
    const card = document.createElement('article');
    card.className = 'bus-result-card';

    const period = timePeriod(bus.departureTime);

    const amenities = bus.amenities
        .slice(0, 3)
        .map(item => typeof item === 'string'
            ? item
            : item.name || item.amenity_name || item.label || ''
        )
        .filter(Boolean)
        .join(' · ');

    const seatText = `${bus.availableSeats} seats left`;

    const ratingHTML = bus.rating > 0
        ? `<span class="rating">★ ${bus.rating.toFixed(1)} / 5</span>
           <span class="rating-count">${bus.reviews} ratings</span>`
        : `<span class="rating">New operator</span>`;

    const departureDate = formatJourneyDate(bus.departureDate);

    const arrivalDate = bus.arrivalDate > bus.departureDate
        ? 'Next day'
        : formatJourneyDate(bus.arrivalDate);

    card.dataset.name = bus.operator;
    card.dataset.type = bus.type;
    card.dataset.price = bus.price;
    card.dataset.rating = bus.rating;
    card.dataset.departure =
        String(bus.departureTime).substring(0, 5);
    card.dataset.period = period;
    card.dataset.seats = bus.availableSeats;
    card.dataset.operator = bus.operator;
    card.dataset.scheduleId = bus.id;

    const busCover = window.ChaloCardCovers
        ? window.ChaloCardCovers.resolve('buses', [bus.busName, bus.operator], bus.imagePath, '')
        : (bus.imagePath || '');

    card.innerHTML = `
        <div class="operator-mark ${operatorColor(bus.operator)}${busCover ? ' has-cover' : ''}">
            ${busCover
                ? `<img src="${escapeHTML(busCover)}" alt="${escapeHTML(bus.busName || bus.operator)}" onerror="this.style.display='none';this.parentElement.textContent='${escapeHTML(initials(bus.operator))}'">`
                : escapeHTML(initials(bus.operator))}
        </div>

        <div class="bus-info">
            <div class="operator-line">
                <h3>${escapeHTML(bus.operator)}</h3>
                ${ratingHTML}
            </div>

            <p class="bus-type">
                ${escapeHTML(bus.type)}
                · ${escapeHTML(seatText)}
                ${amenities ? ' · ' + escapeHTML(amenities) : ''}
            </p>

            <div class="journey-line">
                <div>
                    <strong>${escapeHTML(bus.departureTime)}</strong>
                    <small class="journey-date">${escapeHTML(departureDate)}</small>
                    <small class="place-label from-place">
                        ${escapeHTML(bus.departureTerminal || bus.from)}
                    </small>
                </div>

                <div class="journey-duration">
                    <span></span>
                    <small>${escapeHTML(durationText(bus.duration))}</small>
                    <span></span>
                </div>

                <div>
                    <strong>${escapeHTML(bus.arrivalTime)}</strong>
                    <small class="journey-date">${escapeHTML(arrivalDate)}</small>
                    <small class="place-label to-place">
                        ${escapeHTML(bus.arrivalTerminal || bus.to)}
                    </small>
                </div>
            </div>

            <div class="bus-card-links">
                <span>Amenities</span>
                <span>Boarding points</span>
                <span>Operator information</span>
                <span>Policies</span>
            </div>
        </div>

        <div class="fare-panel">
            <small>Ticket fare</small>
            <strong>${money(bus.price)}</strong>

            <button class="select-seat-btn" type="button">
                ${giftMode ? 'GIFT' : 'SELECT SEATS'}
            </button>

            ${bus.availableSeats <= 5 && bus.availableSeats > 0
                ? `<em>Only ${bus.availableSeats} seats left</em>`
                : ''}
        </div>
    `;

    card.querySelector('.select-seat-btn')
        .addEventListener('click', () => openSeatModal(card, bus));

    return card;
}
  // --------------------------------------------------
  // Render bus results
  // --------------------------------------------------

  function renderBuses() {
      results.innerHTML = '';

      if (!buses.length) {
          count.textContent = '0 buses';
          empty.hidden = false;
          empty.textContent =
              'No buses found. Please change your search route or date.';
          return;
      }

      const sort = $('#sortBy').value;
      const sorted = [...buses];

      if (sort === 'price-low') {
          sorted.sort((a, b) => a.price - b.price);
      } else if (sort === 'price-high') {
          sorted.sort((a, b) => b.price - a.price);
      } else if (sort === 'rating') {
          sorted.sort((a, b) => b.rating - a.rating);
      } else {
          sorted.sort((a, b) =>
              String(a.departure).localeCompare(String(b.departure))
          );
      }

      sorted.forEach(bus => {
          results.appendChild(createBusCard(bus));
      });

      applyFilters();
  }

  // --------------------------------------------------
  // Filters
  // --------------------------------------------------

  function activeValues(name) {
      return $$(`input[name="${name}"]:checked`)
          .map(input => input.value.toLowerCase());
  }

  function applyFilters() {
      const keyword = ($('#keyword').value || '')
          .trim()
          .toLowerCase();

      const periods = activeValues('departure');
      const types = activeValues('type');
      const operators = activeValues('operator');
      const seatFilters = activeValues('seats');

      const cards = $$('.bus-result-card', results);

      let visible = [];

      cards.forEach(card => {
          const type = card.dataset.type.toLowerCase();
          const typeWords = type.split(/[\s/-]+/);

          const operator = card.dataset.operator.toLowerCase();

          const text = (
              card.dataset.name + ' ' +
              card.dataset.type + ' ' +
              card.dataset.operator
          ).toLowerCase();

          const seats = Number(card.dataset.seats);

          const matches =
              (!keyword || text.includes(keyword)) &&
              (!periods.length || periods.includes(card.dataset.period)) &&
              (!types.length || types.some(type =>
                  typeWords.includes(type)
              )) &&
              (!operators.length || operators.some(operatorName =>
                  operator.includes(operatorName)
              )) &&
              (!seatFilters.includes('available') || seats > 0) &&
              (!seatFilters.includes('few') || (seats > 0 && seats <= 5));

          card.hidden = !matches;

          if (matches) {
              visible.push(card);
          }
      });

      const sort = $('#sortBy').value;

      visible.sort((a, b) => {
          if (sort === 'price-low') {
              return Number(a.dataset.price) -
                  Number(b.dataset.price);
          }

          if (sort === 'price-high') {
              return Number(b.dataset.price) -
                  Number(a.dataset.price);
          }

          if (sort === 'rating') {
              return Number(b.dataset.rating) -
                  Number(a.dataset.rating);
          }

          return a.dataset.departure.localeCompare(
              b.dataset.departure
          );
      });

      visible.forEach(card => results.appendChild(card));

      count.textContent =
          `Showing ${visible.length} bus${visible.length === 1 ? '' : 'es'}`;

      empty.hidden = visible.length !== 0;

      if (!visible.length && buses.length) {
          empty.textContent =
              'No buses match your selected filters.';
      } else if (!buses.length) {
          empty.textContent =
              'No buses found. Please change your search route or date.';
      }
  }

  // --------------------------------------------------
  // Filter events
  // --------------------------------------------------

  $('#keyword').addEventListener('input', applyFilters);

  $('#sortBy').addEventListener('change', applyFilters);

  $$('.filter-panel input[type="checkbox"]').forEach(input => {
      input.addEventListener('change', applyFilters);
  });

  $('#resetFilters').addEventListener('click', () => {
      $$('.filter-panel input[type="checkbox"]')
          .forEach(input => input.checked = false);

      $('#keyword').value = '';
      $('#sortBy').value = 'departure';

      applyFilters();
  });

  $$('[data-reset]').forEach(button => {
      button.addEventListener('click', () => {
          $$(`input[name="${button.dataset.reset}"]`)
              .forEach(input => input.checked = false);

          applyFilters();
      });
  });

  // --------------------------------------------------
  // Seat selection modal
  // --------------------------------------------------

  function updateSeatSummary() {
      const names = [...selectedSeats].sort();

      $('#selectedSeatNames').textContent =
          names.length ? names.join(', ') : 'None';

      $('#selectedTotal').textContent =
          money(names.length * currentFare);

      $('#continueBooking').disabled =
          names.length === 0;
  }

  function openSeatModal(card, bus) {
      activeCard = card;
      currentFare = bus.price;

      selectedSeats.clear();

      $('#modalBusName').textContent =
          `${bus.operator} · ${bus.type}`;

      $('#modalFare').textContent = money(currentFare);

      seatGrid.innerHTML = '';

      const totalSeats = Math.min(
          Math.max(bus.capacity || 24, 24),
          24
      );

      const available = Math.min(
          totalSeats,
          Math.max(0, bus.availableSeats)
      );

      const rows = ['A', 'B', 'C', 'D', 'E', 'F'];

      rows.forEach((row, rowIndex) => {
          for (let col = 1; col <= 4; col++) {
              const index = rowIndex * 4 + col - 1;
              const name = row + col;

              const button = document.createElement('button');

              button.type = 'button';
              button.className = 'seat';
              button.textContent = name;
              button.dataset.seat = name;

              if (index >= available || index >= totalSeats) {
                  button.classList.add('booked');
                  button.disabled = true;

                  button.setAttribute(
                      'aria-label',
                      name + ' unavailable'
                  );

              } else {
                  button.setAttribute('aria-pressed', 'false');

                  button.addEventListener('click', () => {
                      if (selectedSeats.has(name)) {
                          selectedSeats.delete(name);

                          button.classList.remove('selected');

                          button.setAttribute(
                              'aria-pressed',
                              'false'
                          );

                      } else if (
                          selectedSeats.size <
                          Number($('#passengers').value)
                      ) {
                          selectedSeats.add(name);

                          button.classList.add('selected');

                          button.setAttribute(
                              'aria-pressed',
                              'true'
                          );

                      } else {
                          alert(
                              `You can select up to ${$('#passengers').value} seat(s).`
                          );
                      }

                      updateSeatSummary();
                  });
              }

              seatGrid.appendChild(button);
          }
      });

      updateSeatSummary();

      modal.classList.add('open');

      modal.setAttribute('aria-hidden', 'false');

      document.body.style.overflow = 'hidden';
  }

  function closeModal() {
      modal.classList.remove('open');

      modal.setAttribute('aria-hidden', 'true');

      document.body.style.overflow = '';

      activeCard = null;
      selectedSeats.clear();
  }

  $('#closeSeatModal').addEventListener('click', closeModal);

  modal.addEventListener('click', event => {
      if (event.target === modal) {
          closeModal();
      }
  });

  document.addEventListener('keydown', event => {
      if (
          event.key === 'Escape' &&
          modal.classList.contains('open')
      ) {
          closeModal();
      }
  });


  // --------------------------------------------------
  // Add bus selection to database-backed Chalo cart
  // --------------------------------------------------

  continueBookingButton.addEventListener('click', async () => {

    if (!activeCard || !selectedSeats.size) {
        return;
    }

    const button = continueBookingButton;
    const originalText = button.textContent;

    const seats = [...selectedSeats].sort();

    const scheduleId = Number(activeCard.dataset.scheduleId);

    if (!scheduleId) {
        alert('Invalid bus schedule. Please select the bus again.');
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

            quantity: seats.length,

            selectionType: 'seat',

            bookingMode: giftMode ? 'gift' : 'self',

            selectedDetails: {
                operator: activeCard.dataset.name,

                busType: activeCard.dataset.type,

                route: $('#from').value + ' → ' + $('#to').value,

                date: dateInput.value,

                seats: seats
            }

        });

        const total = seats.length * currentFare;

        alert(
            `${giftMode ? 'Gift selection' : 'Bus selection'} added to your cart successfully!\n\n` +
            `Operator: ${activeCard.dataset.name}\n` +
            `Bus Type: ${activeCard.dataset.type}\n` +
            `Seats: ${seats.join(', ')}\n` +
            `Passengers: ${seats.length}\n` +
            `Total: ${money(total)}\n\n` +
            `Mode: ${giftMode ? 'Gift Booking' : 'Self Booking'}\n\n` +
            `Your selection is saved in your database cart.`
        );

        closeModal();

    } catch (error) {

        console.error('Bus cart error:', error);

        alert(
            error.message ||
            'Unable to add this bus selection to your cart. Please try again.'
        );

    } finally {

        button.disabled = false;
        button.textContent = originalText;

    }

});


  // --------------------------------------------------
  // Search form
  // --------------------------------------------------

  form.addEventListener('submit', event => {
      event.preventDefault();

      loadBuses();
  });

  // --------------------------------------------------
  // Initial database load
  // --------------------------------------------------

  renderDates();

  loadBuses();

})();