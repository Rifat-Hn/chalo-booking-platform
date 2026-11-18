
document.addEventListener('DOMContentLoaded', () => {
    'use strict';
  
    const API_URL = 'api/movies.php';
    const giftMode = new URLSearchParams(window.location.search).get('mode') === 'gift';
  
    const form = document.getElementById('searchForm');
    const message = document.getElementById('searchMessage');
    const city = document.getElementById('city');
    const date = document.getElementById('date');
    const cinema = document.getElementById('cinema');
    const language = document.getElementById('language');
    const keyword = document.getElementById('keyword');
    const sortBy = document.getElementById('sortBy');
    const grid = document.getElementById('resultsGrid');
    const empty = document.getElementById('emptyState');
    const resultCount = document.getElementById('resultCount');
    const resultHeading = document.getElementById('resultHeading');
    const resetButton = document.getElementById('resetFilters');
  
    let allMovies = [];
    let currentMovies = [];
    let requestController = null;
  
    if (!grid || !empty) {
        console.error('Movie page error: resultsGrid or emptyState element is missing.');
        return;
    }
  
    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[char]);
    }
  
    function formatPrice(value) {
        const price = Number(value);
  
        return Number.isFinite(price)
            ? '৳' + price.toLocaleString('en-BD')
            : 'Price unavailable';
    }
  
    function formatTime(value) {
        if (!value) return '';
  
        const raw = String(value);
        const dateObject = new Date(raw.replace(' ', 'T'));
  
        if (Number.isNaN(dateObject.getTime())) {
            return raw;
        }
  
        return dateObject.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }
  
    function formatDate(value) {
        if (!value) return '';
  
        const dateObject = new Date(String(value).replace(' ', 'T'));
  
        if (Number.isNaN(dateObject.getTime())) {
            return String(value);
        }
  
        return dateObject.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short'
        });
    }
  
    function getMovieGenres(movie) {
        return String(movie.genre || 'Movie')
            .split(/[,/|]/)
            .map(item => item.trim())
            .filter(Boolean);
    }
  
    function getMovieSearchText(movie) {
        const showtimes = Array.isArray(movie.showtimes)
            ? movie.showtimes
            : [];
  
        const showtimeText = showtimes.map(show => [
            show.cinema_name,
            show.service_name,
            show.city,
            show.area,
            show.location_name,
            show.screen_name,
            show.screen_type
        ].join(' ')).join(' ');
  
        return [
            movie.movie_title,
            movie.genre,
            movie.language,
            movie.certificate,
            showtimeText
        ].join(' ').toLowerCase();
    }
  
    function getPoster(movie) {
        return window.ChaloCardCovers
            ? window.ChaloCardCovers.resolve('movies', [movie.movie_title, movie.slug], movie.poster_path, 'assets/icons/movies.png')
            : (String(movie.poster_path || '').trim() || 'assets/icons/movies.png');
    }
  
    function getShowtimeDetails(movie) {
        const showtimes = Array.isArray(movie.showtimes)
            ? movie.showtimes
            : [];
  
        return showtimes.map(show => ({
            ...show,
            displayTime: formatTime(show.start_datetime),
            displayDate: formatDate(show.start_datetime),
            displayCinema: show.cinema_name || show.service_name || 'Cinema',
            displayScreen: show.screen_name || 'Screen'
        }));
    }
  
    function getUniqueCinemaNames(movie) {
        return [...new Set(
            getShowtimeDetails(movie)
                .map(show => show.displayCinema)
                .filter(Boolean)
        )];
    }
  
    function getStartingPrice(showtimes) {
        const prices = showtimes
            .map(show => Number(show.price))
            .filter(price => Number.isFinite(price) && price >= 0);
  
        return prices.length ? Math.min(...prices) : 0;
    }
  
    function renderMovieCard(movie) {
        const showtimes = getShowtimeDetails(movie);
        const cinemas = getUniqueCinemaNames(movie);
  
        const startingPrice = getStartingPrice(showtimes);
  
        const showtimeLabels = showtimes.map(show => {
            const time = escapeHTML(show.displayTime);
            const cinemaName = escapeHTML(show.displayCinema);
  
            return `${time} · ${cinemaName}`;
        });
  
        const showtimeText = showtimeLabels.length
            ? showtimeLabels.join(' &nbsp; | &nbsp; ')
            : 'No upcoming showtimes';
  
        const cinemaLabel = cinemas.length
            ? cinemas.map(escapeHTML).join(' · ')
            : 'Cinema details unavailable';
  
        const rating = Number(movie.average_rating);
        const ratingText = rating > 0 ? rating.toFixed(1) : 'New';
  
        const genre = getMovieGenres(movie).join(' / ');
        const languageText = movie.language || 'Language not specified';
  
        const duration = movie.duration_minutes
            ? `${movie.duration_minutes} min`
            : '';
  
        const certificate = movie.certificate || '';
  
        const details = [
            languageText,
            genre,
            duration,
            certificate
        ].filter(Boolean).join(' · ');
  
        const image = escapeHTML(getPoster(movie));
        const title = escapeHTML(movie.movie_title || 'Untitled movie');
  
        const movieId = Number(movie.movie_id);
        const hasShowtimes = showtimes.length > 0;
  
        return `
            <article class="service-card"
                data-name="${escapeHTML((movie.movie_title || '').toLowerCase())}"
                data-category="${escapeHTML((genre + ' ' + languageText).toLowerCase())}"
                data-price="${startingPrice}"
                data-search="${escapeHTML(getMovieSearchText(movie))}">
  
                <div class="card-image">
                    <img
                        loading="lazy"
                        src="${image}"
                        alt="${title}"
                        onerror="this.onerror=null;this.src='assets/chalo-logo.png'">
  
                    <span class="rating">★ ${escapeHTML(ratingText)}</span>
                </div>
  
                <div class="card-body">
                    <div class="card-kicker">${cinemaLabel}</div>
  
                    <h3>${title}</h3>
  
                    <p>${escapeHTML(details)}</p>
  
                    <div class="card-meta">${showtimeText}</div>
  
                    <div class="card-bottom">
                        <strong>From ${formatPrice(startingPrice)}</strong>
  
                        <button
                            class="action-btn"
                            type="button"
                            data-movie-id="${movieId}"
                            ${hasShowtimes ? '' : 'disabled'}>
                            ${giftMode ? 'GIFT' : 'Choose seats'}
                        </button>
                    </div>
                </div>
            </article>
        `;
    }
  
    function applyFilters() {
        const query = (keyword?.value || '').trim().toLowerCase();
  
        const selectedGenres = [
            ...document.querySelectorAll(
                '.filter-group input[type="checkbox"]:checked'
            )
        ].map(input => input.value.toLowerCase());
  
        let filtered = allMovies.filter(movie => {
            const searchText = getMovieSearchText(movie);
            const genreText = getMovieGenres(movie).join(' ').toLowerCase();
  
            const matchesKeyword =
                !query || searchText.includes(query);
  
            const matchesGenre =
                !selectedGenres.length ||
                selectedGenres.some(genre => genreText.includes(genre));
  
            return matchesKeyword && matchesGenre;
        });
  
        if (sortBy?.value === 'name') {
            filtered.sort((a, b) =>
                String(a.movie_title || '').localeCompare(
                    String(b.movie_title || '')
                )
            );
        } else if (sortBy?.value === 'price-low') {
            filtered.sort((a, b) =>
                getStartingPrice(getShowtimeDetails(a)) -
                getStartingPrice(getShowtimeDetails(b))
            );
        } else {
            filtered.sort((a, b) =>
                Number(b.average_rating || 0) -
                Number(a.average_rating || 0)
            );
        }
  
        currentMovies = filtered;
  
        grid.innerHTML = filtered.map(renderMovieCard).join('');
  
        empty.hidden = filtered.length > 0;
  
        if (resultCount) {
            resultCount.textContent = `${filtered.length} movie option(s)`;
        }
    }
  
    async function loadMovies(showMessage = false) {
        // Cancel the previous search so the latest filter selection wins.
        if (requestController) {
            requestController.abort();
        }
  
        requestController = new AbortController();
        const controller = requestController;
  
        if (showMessage && message) {
            message.textContent = 'Loading movies from the database...';
        }
  
        grid.innerHTML = '<p class="empty-state">Loading movies...</p>';
        empty.hidden = true;
  
        const params = new URLSearchParams();
  
        if (city?.value) params.set('city', city.value);
        if (date?.value) params.set('date', date.value);
        if (cinema?.value) params.set('cinema', cinema.value);
        if (language?.value) params.set('language', language.value);
  
        try {
            const response = await fetch(`${API_URL}?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                signal: controller.signal
            });
  
            const result = await response.json();
  
            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Could not load movies.');
            }
  
            // Ignore an outdated response.
            if (requestController !== controller) return;
  
            allMovies = Array.isArray(result.data?.movies)
                ? result.data.movies
                : [];
  
            applyFilters();
  
            if (message) {
                message.textContent = allMovies.length
                    ? 'Movies and showtimes loaded from the database.'
                    : 'No movies or showtimes found for the selected search.';
            }
  
            if (resultHeading) {
                resultHeading.textContent = 'Movies from Chalo';
            }
  
        } catch (error) {
            if (error.name === 'AbortError') return;
  
            console.error('Movie loading error:', error);
  
            if (requestController !== controller) return;
  
            allMovies = [];
            currentMovies = [];
            grid.innerHTML = '';
            empty.hidden = false;
  
            if (resultCount) {
                resultCount.textContent = '0 movie options';
            }
  
            if (message) {
                message.textContent =
                    error.message || 'Unable to load movies. Please try again.';
            }
  
        } finally {
            if (requestController === controller) {
                requestController = null;
            }
        }
    }
  
    // --------------------------------------------------
    // Select showtime and add movie to database cart
    // --------------------------------------------------
  
    function chooseMovieSeat(showtime) {
        return new Promise(async (resolve, reject) => {
            try {
                const response = await fetch(
                    `${API_URL}?action=seats&schedule_id=${encodeURIComponent(showtime.schedule_id)}`,
                    { credentials: 'same-origin', headers: { 'Accept': 'application/json' } }
                );
                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.message || 'Could not load cinema seats.');
                }

                const seats = Array.isArray(result.data?.seats) ? result.data.seats : [];
                if (!seats.length) {
                    throw new Error('No individual seat inventory is configured for this showtime yet.');
                }

                const overlay = document.createElement('div');
                overlay.style.cssText = 'position:fixed;inset:0;background:rgba(10,18,35,.72);z-index:99999;display:flex;align-items:center;justify-content:center;padding:18px;';
                const panel = document.createElement('div');
                panel.style.cssText = 'background:#fff;color:#172033;width:min(560px,100%);max-height:85vh;overflow:auto;border-radius:16px;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.25);';
                panel.innerHTML = `
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
                        <div><h2 style="margin:0 0 5px;">Choose your seat</h2>
                        <p style="margin:0;color:#687386;">${escapeHTML(showtime.displayCinema)} · ${escapeHTML(showtime.displayScreen)}</p></div>
                        <button type="button" data-close aria-label="Close" style="border:0;background:#eef1f5;border-radius:50%;width:36px;height:36px;font-size:20px;cursor:pointer;">×</button>
                    </div>
                    <div style="margin:22px auto 16px;text-align:center;background:#e9eef7;border-radius:8px;padding:8px;font-size:12px;letter-spacing:2px;">SCREEN</div>
                    <div data-seat-grid style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;"></div>
                    <p data-seat-help style="font-size:13px;color:#687386;margin:16px 0 0;">Select one available seat to continue.</p>
                    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
                        <button type="button" data-cancel style="padding:10px 16px;border:1px solid #d8deea;background:#fff;border-radius:8px;cursor:pointer;">Cancel</button>
                        <button type="button" data-confirm disabled style="padding:10px 18px;border:0;background:#0c6b55;color:#fff;border-radius:8px;cursor:pointer;opacity:.5;">Continue</button>
                    </div>`;
                overlay.appendChild(panel);
                document.body.appendChild(overlay);

                const seatGrid = panel.querySelector('[data-seat-grid]');
                const confirm = panel.querySelector('[data-confirm]');
                const help = panel.querySelector('[data-seat-help]');
                let selected = null;

                seats.forEach(seat => {
                    const available = seat.selectable === true;
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.textContent = `${seat.unit_code}\n${seat.class_or_type || 'Seat'}${Number(seat.extra_price) > 0 ? `\n+ ${formatPrice(seat.extra_price)}` : ''}`;
                    button.style.cssText = `white-space:pre-line;min-height:68px;border-radius:10px;border:1px solid ${available ? '#b9d8ce' : '#ddd'};background:${available ? '#eff8f4' : '#f0f1f3'};color:${available ? '#145b47' : '#9aa1aa'};cursor:${available ? 'pointer' : 'not-allowed'};font-size:12px;`;
                    button.disabled = !available;
                    if (!available) button.title = 'Already unavailable';
                    button.addEventListener('click', () => {
                        selected = seat;
                        seatGrid.querySelectorAll('button').forEach(b => {
                            if (!b.disabled) b.style.outline = 'none';
                        });
                        button.style.outline = '3px solid #0c6b55';
                        confirm.disabled = false;
                        confirm.style.opacity = '1';
                        help.textContent = `Selected ${seat.unit_code} · ${seat.class_or_type || 'Seat'}`;
                    });
                    seatGrid.appendChild(button);
                });

                const close = value => {
                    overlay.remove();
                    resolve(value);
                };
                panel.querySelector('[data-close]').addEventListener('click', () => close(null));
                panel.querySelector('[data-cancel]').addEventListener('click', () => close(null));
                overlay.addEventListener('click', event => {
                    if (event.target === overlay) close(null);
                });
                confirm.addEventListener('click', () => close(selected));
            } catch (error) {
                reject(error);
            }
        });
    }

    async function chooseShowtime(movie, button) {
        const showtimes = getShowtimeDetails(movie).filter(show =>
            Number(show.available_capacity ?? 0) > 0 &&
            Number(show.schedule_id) > 0
        );

        if (!showtimes.length) {
            alert('No available showtimes for this movie.');
            return;
        }

        let selectedShowtime = showtimes[0];

        if (showtimes.length > 1) {
            const options = showtimes.map((show, index) =>
                `${index + 1}. ${show.displayCinema} · ${show.displayScreen} · ${show.displayDate} ${show.displayTime} · ${formatPrice(show.price)}`
            ).join('\n');
            const answer = prompt(`Choose a showtime by entering its number:\n\n${options}`, '1');
            if (answer === null) return;
            const selectedIndex = Number(answer) - 1;
            if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= showtimes.length) {
                alert('Invalid showtime selection.');
                return;
            }
            selectedShowtime = showtimes[selectedIndex];
        }

        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Loading seats...';

        try {
            if (!window.ChaloCart || typeof window.ChaloCart.add !== 'function') {
                throw new Error('Cart API not loaded. Please check cart-api.js.');
            }

            const seat = await chooseMovieSeat(selectedShowtime);
            if (!seat) return;

            await window.ChaloCart.add({
                scheduleId: Number(selectedShowtime.schedule_id),
                unitId: Number(seat.unit_id),
                quantity: 1,
                selectionType: 'seat',
                bookingMode: giftMode ? 'gift' : 'self',
                selectedDetails: {
                    movieId: Number(movie.movie_id),
                    movieTitle: movie.movie_title,
                    showtimeId: Number(selectedShowtime.showtime_id),
                    cinema: selectedShowtime.displayCinema,
                    screen: selectedShowtime.displayScreen,
                    date: selectedShowtime.start_datetime,
                    time: selectedShowtime.displayTime,
                    seat: seat.unit_code,
                    seatClass: seat.class_or_type,
                    seatExtraPrice: Number(seat.extra_price || 0)
                }
            });

            button.textContent = 'Added ✓';
            alert(giftMode ? 'Movie gift seat added to your cart.' : `Seat ${seat.unit_code} added to your cart.`);
        } catch (error) {
            console.error('Movie seat/cart error:', error);
            alert(error.message || 'Could not add this movie seat to your cart.');
        } finally {
            button.disabled = false;
            setTimeout(() => { button.textContent = originalText; }, 1300);
        }
    }

    form?.addEventListener('submit', event => {
        event.preventDefault();
        loadMovies(true);
  
        document.querySelector('.catalog-main')?.scrollIntoView({
            behavior: 'smooth'
        });
    });
  
    keyword?.addEventListener('input', applyFilters);
    sortBy?.addEventListener('change', applyFilters);
  
    document.querySelectorAll(
        '.filter-group input[type="checkbox"]'
    ).forEach(input => {
        input.addEventListener('change', applyFilters);
    });
  
    // Handle movie selection and database cart submission.
    grid.addEventListener('click', async event => {
        const button = event.target.closest('.action-btn');
  
        if (!button || button.disabled) return;
  
        const movieId = Number(button.dataset.movieId);
  
        const movie = currentMovies.find(
            item => Number(item.movie_id) === movieId
        );
  
        if (movie) {
            await chooseShowtime(movie, button);
        }
    });
  
    resetButton?.addEventListener('click', () => {
        document.querySelectorAll(
            '.filter-group input[type="checkbox"]'
        ).forEach(input => {
            input.checked = false;
        });
  
        if (keyword) keyword.value = '';
        if (sortBy) sortBy.value = 'recommended';
  
        if (city) city.value = '';
        if (date) date.value = '';
        if (cinema) cinema.value = '';
        if (language) language.value = '';
  
        loadMovies(true);
    });
  
    // Keep the date optional so all upcoming database showtimes load initially.
    if (date) {
        const today = new Date();
        const localToday = new Date(
            today.getTime() - today.getTimezoneOffset() * 60000
        ).toISOString().slice(0, 10);
  
        date.min = localToday;
        date.value = '';
        date.required = false;
    }
  
    // Initial database load.
    loadMovies();
  });
  