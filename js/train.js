
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const apiUrl = new URL('api/trains.php', document.baseURI);

  // Gift mode is active only when the URL contains ?mode=gift.
  const giftMode = new URLSearchParams(window.location.search).get('mode') === 'gift';
  document.body.classList.toggle('gift-mode-active', giftMode);

  const dateInput = $('#journeyDate');
  const returnInput = $('#returnDate');
  const results = $('#trainResults');
  const searchMessage = $('#searchMessage');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const iso = date =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const money = value => `BDT ${Number(value || 0).toLocaleString('en-US')}`;

  let currentTrains = [];
  let lastSearch = { from: '', to: '', date: '' };

  if (!dateInput || !returnInput || !results) return;

  dateInput.min = iso(today);
  if (!dateInput.value) dateInput.value = iso(today);
  returnInput.min = dateInput.value;

  // Convert dropdown labels to the station names used by the API.
  function stationQuery(value) {
    const text = String(value || '').trim();

    const aliases = {
      'Dhaka (Kamalapur)': 'Kamalapur',
      'Kamalapur Railway Station': 'Kamalapur',
      'Chattogram': 'Chattogram',
      'Airport': 'Airport'
    };

    return aliases[text] || text;
  }

  function dateTime(value) {
    if (!value) return null;

    const normalized = String(value).replace(' ', 'T');
    const parsed = new Date(normalized);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function clock(value) {
    const d = value instanceof Date ? value : dateTime(value);

    return d
      ? d.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
      : '--:--';
  }

  function shortDate(value) {
    const d = value instanceof Date ? value : dateTime(value);

    return d
      ? d.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          weekday: 'short'
        })
      : '';
  }

  function minutesBetween(start, end) {
    if (!start || !end) return 0;

    let diff = Math.round((end - start) / 60000);

    if (diff < 0) diff += 24 * 60;

    return diff;
  }

  function durationLabel(minutes) {
    if (!minutes) return 'Duration unavailable';

    const h = Math.floor(minutes / 60);
    const m = minutes % 60;

    return `${h ? `${h}h ` : ''}${m ? `${m}m` : ''}`.trim();
  }

  function pick(obj, keys, fallback = '') {
    for (const key of keys) {
      if (
        obj &&
        obj[key] !== undefined &&
        obj[key] !== null &&
        obj[key] !== ''
      ) {
        return obj[key];
      }
    }

    return fallback;
  }

  function normalizeClasses(train) {
    const raw = pick(
      train,
      ['seat_classes', 'classes', 'fares', 'inventory'],
      []
    );

    if (Array.isArray(raw)) {
      return raw.map(item => {
        if (typeof item === 'string') {
          return {
            name: item,
            price: Number(pick(train, ['price', 'fare'], 0)),
            available: Number(
              pick(train, ['available_capacity', 'available_seats'], 0)
            )
          };
        }

        return {
          name: String(
            pick(
              item,
              ['class_name', 'class_or_type', 'class', 'name', 'unit_name'],
              'Standard'
            )
          ),
          price: Number(
            pick(
              item,
              ['price', 'fare', 'unit_price', 'class_price'],
              pick(train, ['price', 'fare'], 0)
            )
          ),
          available: Number(
            pick(
              item,
              [
                'available',
                'available_count',
                'available_seats',
                'quantity',
                'seat_count'
              ],
              pick(train, ['available_capacity', 'available_seats'], 0)
            )
          )
        };
      }).filter(item => item.name);
    }

    if (raw && typeof raw === 'object') {
      return Object.entries(raw).map(([name, item]) => ({
        name,
        price: Number(
          typeof item === 'object'
            ? pick(item, ['price', 'fare'], pick(train, ['price', 'fare'], 0))
            : pick(train, ['price', 'fare'], 0)
        ),
        available: Number(
          typeof item === 'object'
            ? pick(item, ['available', 'available_count', 'seats'], 0)
            : item
        )
      }));
    }

    return [{
      name: 'Standard',
      price: Number(pick(train, ['price', 'fare', 'base_price'], 0)),
      available: Number(
        pick(train, ['available_capacity', 'available_seats'], 0)
      )
    }];
  }

  function normalizeTrain(row) {
    const start = dateTime(
      pick(row, [
        'start_datetime',
        'departure_datetime',
        'departure_time',
        'start_time'
      ])
    );

    const end = dateTime(
      pick(row, [
        'end_datetime',
        'arrival_datetime',
        'arrival_time',
        'end_time'
      ])
    );

    const from = String(
      pick(
        row,
        [
          'departure_station',
          'departure_station_name',
          'from_station',
          'origin_station'
        ],
        'Departure station'
      )
    );

    const to = String(
      pick(
        row,
        [
          'arrival_station',
          'arrival_station_name',
          'to_station',
          'destination_station'
        ],
        'Arrival station'
      )
    );

    const classes = normalizeClasses(row);

    const available = Number(
      pick(
        row,
        ['available_capacity', 'available_seats', 'seats_available'],
        classes.reduce((sum, item) => sum + item.available, 0)
      )
    );

    return {
      id: pick(row, ['schedule_id', 'id'], ''),
      imagePath: pick(row, ['image_path'], ''),
      name: String(
        pick(row, ['train_name', 'service_name', 'name'], 'Train service')
      ),
      number: String(
        pick(row, ['train_number', 'service_code', 'schedule_code'], '')
      ),
      type: String(
        pick(row, ['train_type', 'type'], 'intercity')
      ).toLowerCase(),
      from,
      to,
      start,
      end,
      departure: clock(start),
      arrival: clock(end),
      duration: minutesBetween(start, end),
      price: Number(
        pick(row, ['price', 'fare', 'base_price'], classes[0]?.price || 0)
      ),
      available,
      classes,
      operator: String(
        pick(row, ['operator_name', 'business_name', 'provider_name'], 'Bangladesh Railway')
      ),
      hotline: String(pick(row, ['hotline', 'operator_hotline'], '')),
      rating: pick(row, ['average_rating', 'rating'], ''),
      reviews: pick(row, ['total_reviews', 'review_count'], '')
    };
  }

  function timeBand(value) {
    const hour = Number(String(value || '00:00').split(':')[0]);

    return hour < 6
      ? 'early'
      : hour < 12
        ? 'morning'
        : hour < 18
          ? 'afternoon'
          : 'evening';
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function renderCard(train) {
    const classes = train.classes.length
      ? train.classes
      : [{
          name: 'Standard',
          price: train.price,
          available: train.available
        }];

    const classButtons = classes.map((item, index) => `
      <button
        type="button"
        data-class="${escapeHtml(item.name)}"
        data-fare="${item.price}"
        data-seats="${item.available}"
        class="${index === 0 ? 'selected' : ''}"
        ${item.available <= 0 ? 'disabled' : ''}>
        <b>${escapeHtml(item.name)}</b>
        <small>${item.available} seats</small>
        <strong>${money(item.price)}</strong>
      </button>
    `).join('');

    const trainCover = window.ChaloCardCovers
      ? window.ChaloCardCovers.resolve('trains', [train.name, train.operator], train.imagePath, '')
      : (train.imagePath || '');

    const routeDate = train.start ? shortDate(train.start) : '';
    const arrivalDate = train.end ? shortDate(train.end) : routeDate;

    const nextDay =
      train.start &&
      train.end &&
      train.end.toDateString() !== train.start.toDateString();

    return `
      <article class="train-card"
        data-schedule-id="${escapeHtml(train.id)}"
        data-departure="${escapeHtml(train.departure)}"
        data-arrival="${escapeHtml(train.arrival)}"
        data-price="${train.price}"
        data-duration="${train.duration}"
        data-type="${escapeHtml(train.type)}"
        data-classes="${escapeHtml(classes.map(x => x.name).join(','))}"
        data-available="${train.available > 0 ? 'true' : 'false'}">

        <div class="train-card-main">
          <div class="train-name">
            <span class="train-mini-icon">
              <img src="${escapeHtml(trainCover || 'assets/icons/train.png')}" alt="${escapeHtml(train.name)}" class="train-cover-image${trainCover ? ' custom-cover' : ''}">
            </span>

            <span>
              <strong>${escapeHtml(train.name)}</strong>
              <small>
                ${train.number ? `#${escapeHtml(train.number)} · ` : ''}
                ${escapeHtml(train.type)} · Direct
              </small>
            </span>

            <small class="demo-label">Database schedule</small>
          </div>

          <div class="journey-times">
            <div>
              <strong>${escapeHtml(train.departure)}</strong>
              <span>${escapeHtml(train.from)}</span>
              <small class="date-label">${escapeHtml(routeDate)}</small>
            </div>

            <div class="duration">
              <small>${escapeHtml(durationLabel(train.duration))}</small>
              <span></span>
              <small>Direct</small>
            </div>

            <div class="arrival">
              <strong>
                ${escapeHtml(train.arrival)}${nextDay ? ' <i>+1 day</i>' : ''}
              </strong>
              <span>${escapeHtml(train.to)}</span>
              <small class="date-label">${escapeHtml(arrivalDate)}</small>
            </div>
          </div>

          <div class="fare-options">${classButtons}</div>
        </div>

        <div class="train-card-footer">
          <div>
            <small>From · per person</small>
            <strong>
              ${money(classes.find(x => x.available > 0)?.price ?? train.price)}
            </strong>
          </div>

          <button class="view-seats" type="button">
            View Seats <b>→</b>
          </button>
        </div>

        <div class="seat-panel" hidden></div>
      </article>
    `;
  }

  function updateSummary() {
    const from = $('#fromStation').value;
    const to = $('#toStation').value;
    const date = dateInput.value
      ? new Date(`${dateInput.value}T00:00:00`)
      : new Date();

    $('#routeHeading').textContent =
      `${from.split(' (')[0]} → ${to.split(' (')[0]}`;

    $('#journeySummary').textContent =
      `${date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })} · ${$('#passengers').value} · ${
        $('input[name="tripType"]:checked').value === 'round'
          ? 'Round trip'
          : 'One way'
      } · ${currentTrains.length} train${
        currentTrains.length === 1 ? '' : 's'
      }`;
  }

  function showEmpty(message) {
    results.innerHTML = `
      <div id="noResults" class="empty-state">
        ${escapeHtml(message)}
      </div>
    `;
  }

  function applyFilters() {
    const cards = $$('.train-card', results);
    const dep = $$('.time-filter:checked').map(x => x.value);
    const arr = $$('.arrival-filter:checked').map(x => x.value);
    const types = $$('.type-filter:checked').map(x => x.value);
    const classes = $$('.class-filter:checked').map(x => x.value);
    const max = Number($('#maxPrice').value);
    const availableOnly = $('#availableOnly').checked;

    cards.forEach(card => {
      const fares = $$('.fare-options button', card);

      fares.forEach(fare => {
        fare.hidden =
          Number(fare.dataset.fare) > max ||
          (classes.length > 0 && !classes.includes(fare.dataset.class));
      });

      const classMatch =
        !classes.length ||
        classes.some(name => card.dataset.classes.split(',').includes(name));

      card.hidden =
        (dep.length && !dep.includes(timeBand(card.dataset.departure))) ||
        (arr.length && !arr.includes(timeBand(card.dataset.arrival))) ||
        (types.length && !types.includes(card.dataset.type)) ||
        !classMatch ||
        Number(card.dataset.price) > max ||
        (availableOnly && card.dataset.available !== 'true');
    });

    $('#maxPriceLabel').textContent = money(max);

    const visible = cards.filter(card => !card.hidden).length;
    let empty = $('#noResults', results);

    if (!visible && !empty) {
      empty = document.createElement('div');
      empty.id = 'noResults';
      empty.className = 'empty-state';
      empty.textContent =
        'No trains match these filters. Try adjusting your selections.';
      results.append(empty);
    } else if (visible && empty) {
      empty.remove();
    }

    updateSummary();
  }

  function setupCard(card) {
    const fares = $$('.fare-options button', card);
    const footerPrice = $('.train-card-footer strong', card);

    fares.forEach(fare => {
      fare.addEventListener('click', () => {
        fares.forEach(item => item.classList.remove('selected'));
        fare.classList.add('selected');

        footerPrice.textContent = money(fare.dataset.fare);
        card.dataset.price = fare.dataset.fare;
        card.dataset.selectedClass = fare.dataset.class;
      });
    });

    const view = $('.view-seats', card);
    const panel = $('.seat-panel', card);

    view.addEventListener('click', () => {
      if (!panel.hidden) {
        panel.hidden = true;
        view.innerHTML = 'View Seats <b>→</b>';
        return;
      }

      if (!$('.fare-options button.selected:not(:disabled)', card)) {
        fares.find(item => !item.disabled && !item.hidden)?.click();
      }

      const chosen = $('.fare-options button.selected:not(:disabled)', card);

      if (!chosen) {
        searchMessage.textContent =
          'No seats are currently available in this class.';
        return;
      }

      panel.hidden = false;
      view.innerHTML = 'Hide Seats <b>↑</b>';

      // Inventory counts come from MySQL. Individual seat numbers remain
      // illustrative until a real seat-allocation endpoint is implemented.
      const seatCount = Math.min(Number(chosen.dataset.seats), 24);

      panel.innerHTML = `
        <h4>${escapeHtml(chosen.dataset.class)} · Select a seat</h4>

        <div class="seat-grid">
          ${Array.from({ length: 24 }, (_, i) => `
            <button
              type="button"
              class="seat ${i >= seatCount ? 'taken' : ''}"
              ${i >= seatCount ? 'disabled' : ''}>
              ${String.fromCharCode(65 + Math.floor(i / 4))}${i % 4 + 1}
            </button>
          `).join('')}
        </div>

        <div class="seat-actions">
          <span class="seat-selection">No seat selected</span>
          <button type="button" class="add-seat" disabled>
            ${giftMode ? 'GIFT' : 'Add to cart'}
          </button>
        </div>

        <p class="seat-help">
          Seat availability counts are loaded from the database.
          Seat numbers shown here are illustrative; this page does not
          reserve a real seat.
        </p>
      `;

      const seats = $$('.seat:not(.taken)', panel);
      const status = $('.seat-selection', panel);
      const add = $('.add-seat', panel);

      let selected = null;

      seats.forEach(seat => {
        seat.addEventListener('click', () => {
          seats.forEach(item => item.classList.remove('selected'));
          seat.classList.add('selected');

          selected = seat.textContent.trim();
          status.textContent = `Selected seat: ${selected}`;
          add.disabled = false;
        });
      });

      // Add the selected train seat to the database-backed cart.
      add.addEventListener('click', async () => {
        if (!selected) return;

        if (!window.ChaloCart || typeof window.ChaloCart.add !== 'function') {
          searchMessage.textContent =
            'Cart service is not loaded. Please refresh the page and try again.';
          return;
        }

        const scheduleId = Number(card.dataset.scheduleId);

        if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
          searchMessage.textContent =
            'This train schedule does not have a valid database schedule ID.';
          return;
        }

        const originalLabel = add.textContent;
        add.disabled = true;
        add.textContent = 'Adding…';

        try {
          await window.ChaloCart.add({
            scheduleId,
            unitId: null,
            quantity: 1,
            selectionType: 'seat',
            bookingMode: giftMode ? 'gift' : 'self',
            selectedDetails: {
              trainName: $('.train-name strong', card).textContent.trim(),
              trainNumber: card.querySelector('.train-name small')?.textContent.trim() || '',
              route: $('#routeHeading').textContent,
              from: card.querySelector('.journey-times > div:first-child span')?.textContent.trim() || '',
              to: card.querySelector('.journey-times .arrival span')?.textContent.trim() || '',
              journeyDate: dateInput.value,
              departure: card.dataset.departure,
              arrival: card.dataset.arrival,
              travelClass: chosen.dataset.class,
              seat: selected,
              passengers: Number($('#passengers').value || 1),
              price: Number(chosen.dataset.fare),
              currency: 'BDT'
            }
          });

          status.textContent = giftMode
            ? `${selected} added as a gift to your cart.`
            : `${selected} added to your cart.`;

          add.textContent = 'Added ✓';

        } catch (error) {
          console.error('Train cart error:', error);

          status.textContent =
            error.message || 'Could not add this train seat to your cart.';

          add.textContent = originalLabel;
          add.disabled = false;
        }
      });
    });
  }

  async function searchTrains() {
    const from = $('#fromStation').value;
    const to = $('#toStation').value;
    const date = dateInput.value;

    if (from === to) {
      searchMessage.textContent =
        'Choose two different stations to search.';
      return;
    }

    if (!date) {
      searchMessage.textContent =
        'Please select your journey date.';
      return;
    }

    if (
      $('input[name="tripType"]:checked').value === 'round' &&
      (!returnInput.value || returnInput.value < date)
    ) {
      searchMessage.textContent =
        'Return date must be on or after the journey date.';
      return;
    }

    searchMessage.textContent = 'Searching available train schedules…';
    results.innerHTML =
      '<div class="empty-state">Loading train schedules…</div>';

    apiUrl.search = new URLSearchParams({
      from: stationQuery(from),
      to: stationQuery(to),
      date
    }).toString();

    lastSearch = { from, to, date };

    try {
      const response = await fetch(apiUrl.toString(), {
        headers: { Accept: 'application/json' }
      });

      const payload = await response.json();

      if (!response.ok || payload.success === false) {
        throw new Error(
          payload.message || `Request failed (${response.status})`
        );
      }

      const rows = Array.isArray(payload?.data?.trains)
        ? payload.data.trains
        : (
            Array.isArray(payload.trains)
              ? payload.trains
              : (
                  Array.isArray(payload.data)
                    ? payload.data
                    : []
                )
          );

      currentTrains = rows.map(normalizeTrain);

      if (!currentTrains.length) {
        showEmpty(
          'No trains were found for this route and date. Try another date or station pair.'
        );

        searchMessage.textContent =
          payload.message || 'No matching train schedules found.';
      } else {
        results.innerHTML = currentTrains.map(renderCard).join('');

        $$('.train-card', results).forEach(setupCard);

        searchMessage.textContent =
          `${currentTrains.length} train schedule${
            currentTrains.length === 1 ? '' : 's'
          } loaded from the database.`;
      }

      updateSummary();
      applyFilters();

    } catch (error) {
      console.error('Train API error:', error);

      showEmpty(
        'Could not load train schedules. Please check the API connection and try again.'
      );

      searchMessage.textContent =
        error.message || 'Unable to load train schedules.';

      currentTrains = [];
      updateSummary();
    }
  }

  // Trip date controls.
  const tripRadios = $$('input[name="tripType"]');

  function syncReturn() {
    const round =
      $('input[name="tripType"]:checked').value === 'round';

    returnInput.disabled = !round;
    $('#returnField').classList.toggle('is-disabled', !round);
    returnInput.required = round;

    if (round && returnInput.value < dateInput.value) {
      returnInput.value = dateInput.value;
    }
  }

  tripRadios.forEach(radio =>
    radio.addEventListener('change', syncReturn)
  );

  dateInput.addEventListener('change', () => {
    returnInput.min = dateInput.value;

    if (returnInput.value < dateInput.value) {
      returnInput.value = dateInput.value;
    }
  });

  syncReturn();

  $('#swapStations').addEventListener('click', () => {
    const from = $('#fromStation');
    const to = $('#toStation');
    const value = from.value;

    from.value = to.value;
    to.value = value;
  });

  $('#trainSearchForm').addEventListener('submit', event => {
    event.preventDefault();
    searchTrains();
  });

  $$('.filters input').forEach(input =>
    input.addEventListener('change', applyFilters)
  );

  $('#maxPrice').addEventListener('input', applyFilters);

  $('#resetFilters').addEventListener('click', () => {
    $$('.filters input[type="checkbox"]').forEach(input => {
      input.checked = input.id === 'availableOnly';
    });

    $('#maxPrice').value = 1500;
    applyFilters();
  });

  $$('.sort-btn').forEach(button => {
    button.addEventListener('click', () => {
      $$('.sort-btn').forEach(item =>
        item.classList.remove('active')
      );

      button.classList.add('active');

      const key = button.dataset.sort;

      const sorted = [...$$('.train-card', results)].sort((a, b) =>
        key === 'price'
          ? Number(a.dataset.price) - Number(b.dataset.price)
          : key === 'duration'
            ? Number(a.dataset.duration) - Number(b.dataset.duration)
            : a.dataset.departure.localeCompare(b.dataset.departure)
      );

      sorted.forEach(card => results.append(card));
    });
  });

  $$('.date-strip button').forEach(button => {
    button.addEventListener('click', () => {
      const date = new Date(`${dateInput.value}T00:00:00`);

      date.setDate(date.getDate() + Number(button.dataset.offset));

      if (iso(date) < iso(today)) return;

      dateInput.value = iso(date);

      $$('.date-strip button').forEach(item =>
        item.classList.remove('active')
      );

      button.classList.add('active');

      button.querySelector('strong').textContent =
        button.dataset.offset === '0'
          ? 'Selected journey'
          : shortDate(date);

      searchTrains();
    });
  });

  $('#alternateRoute').addEventListener('click', () => {
    $('#toStation').value = 'Sylhet';
    dateInput.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });

    searchTrains();
  });

  // Remove the old hardcoded demonstration cards on load.
  if (giftMode) {
    searchMessage.textContent =
      'Gift mode is active. Choose a train, select a seat, then press GIFT.';
  }

  results.innerHTML =
    '<div class="empty-state">Choose your route and journey date, then select “Search Trains” to load database records.</div>';

  $('#demoNotice')?.remove();

  const notice = $('.demo-notice');

  if (notice) {
    notice.innerHTML =
      '<b>ⓘ</b> Train schedules, fares and seat counts below are loaded from the Chalo database. Seat-number selection is currently illustrative.';
  }

  updateSummary();
})();
