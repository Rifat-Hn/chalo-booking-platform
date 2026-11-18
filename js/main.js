/* =========================================================
   SECTION 1: MOBILE NAVIGATION
   ========================================================= */
const menuToggle = document.querySelector("#menuToggle");
const mainNav = document.querySelector("#mainNav");

if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", () => {
    const opened = mainNav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(opened));
  });
  mainNav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      mainNav.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

/* =========================================================
   SECTION 2: CATEGORY TABS + CATEGORY-SPECIFIC SEARCH FIELDS
   ========================================================= */
const bookingTabs = document.querySelectorAll(".booking-tab");
const searchLayouts = document.querySelectorAll(".search-layout");
const searchButton = document.querySelector(".search-button");
const bookingFeedback = document.querySelector("#bookingFeedback");
let chosenCategory = "Bus";

const categoryConfig = {
  "Bus": { layout: "transport", button: "Search buses" },
  "Train": { layout: "transport", button: "Search trains" },
  "River Ferries": { layout: "transport", button: "Search ferries" },
  "Hotels": { layout: "hotels", button: "Search hotels" },
  "Restaurants": { layout: "restaurants", button: "Find a table" },
  "Movies": { layout: "movies", button: "Search movies" }
};

function setCategory(category) {
  chosenCategory = categoryConfig[category] ? category : "Bus";
  const config = categoryConfig[chosenCategory];

  bookingTabs.forEach(tab => {
    const active = tab.dataset.category === chosenCategory;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  searchLayouts.forEach(layout => {
    const active = layout.dataset.layout === config.layout;
    layout.hidden = !active;
    layout.classList.toggle("active", active);
  });

  if (searchButton) searchButton.innerHTML = `${config.button} <span>→</span>`;
  if (bookingFeedback) bookingFeedback.textContent = "";
}

bookingTabs.forEach(tab => {
  tab.addEventListener("click", () => setCategory(tab.dataset.category));
});

/* =========================================================
   SECTION 3: DATE LIMITS / CATEGORY-SPECIFIC FORM VALIDATION
   ========================================================= */
const today = new Date();
const todayString = [
  today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, "0"),
  String(today.getDate()).padStart(2, "0")
].join("-");

document.querySelectorAll('input[type="date"]').forEach(input => {
  input.min = todayString;
});

const checkIn = document.querySelector("#checkInDate");
const checkOut = document.querySelector("#checkOutDate");

if (checkIn && checkOut) {
  checkIn.addEventListener("change", () => {
    checkOut.min = checkIn.value || todayString;
    if (checkOut.value && checkIn.value && checkOut.value <= checkIn.value) {
      checkOut.value = "";
    }
  });
}

function validTimeRange(fromId, toId) {
  const from = document.getElementById(fromId)?.value;
  const to = document.getElementById(toId)?.value;
  if (!from || !to) return { valid: false, message: "Please select both start and end times." };
  if (from >= to) return { valid: false, message: "The end time must be later than the start time." };
  return { valid: true };
}

const bookingForm = document.querySelector("#bookingForm");

if (bookingForm && bookingFeedback) {
  bookingForm.addEventListener("submit", event => {
    event.preventDefault();
    bookingFeedback.textContent = "";

    let summary = "";

    if (["Bus", "Train", "River Ferries"].includes(chosenCategory)) {
      const from = document.querySelector("#fromLocation").value;
      const to = document.querySelector("#toLocation").value;
      const date = document.querySelector("#departureDate").value;
      const travelers = document.querySelector("#travelers").value;

      if (from === to) {
        bookingFeedback.textContent = "Choose two different locations.";
        return;
      }
      if (!date) {
        bookingFeedback.textContent = "Please select your departure date.";
        return;
      }
      summary = `${chosenCategory}: ${from} → ${to} · ${date} · ${travelers}`;
    } else if (chosenCategory === "Hotels") {
      const inDate = checkIn.value;
      const outDate = checkOut.value;
      const location = document.querySelector("#hotelLocation").value;
      const guests = document.querySelector("#hotelGuests").value;

      if (!inDate || !outDate) {
        bookingFeedback.textContent = "Please select both check-in and check-out dates.";
        return;
      }
      if (outDate <= inDate) {
        bookingFeedback.textContent = "Check-out must be after check-in.";
        return;
      }
      summary = `Hotels in ${location} · Check-in ${inDate} · Check-out ${outDate} · ${guests}`;
    } else if (chosenCategory === "Restaurants") {
      const range = validTimeRange("restaurantFromTime", "restaurantToTime");
      const date = document.querySelector("#restaurantDate").value;
      const seats = document.querySelector("#restaurantSeats").value;
      if (!range.valid) {
        bookingFeedback.textContent = range.message;
        return;
      }
      if (!date) {
        bookingFeedback.textContent = "Please select your restaurant reservation date.";
        return;
      }
      summary = `Restaurant reservation · ${document.querySelector("#restaurantFromTime").value}–${document.querySelector("#restaurantToTime").value} · ${date} · ${seats}`;
    } else if (chosenCategory === "Movies") {
      const range = validTimeRange("movieFromTime", "movieToTime");
      const date = document.querySelector("#movieDate").value;
      const seats = document.querySelector("#movieSeats").value;
      if (!range.valid) {
        bookingFeedback.textContent = range.message;
        return;
      }
      if (!date) {
        bookingFeedback.textContent = "Please select the movie date.";
        return;
      }
      summary = `Movies · showtime range ${document.querySelector("#movieFromTime").value}–${document.querySelector("#movieToTime").value} · ${date} · ${seats}`;
    }

    bookingFeedback.textContent = `${summary}. This is a search preview; live availability will be connected later.`;
  });
}

/* =========================================================
   SECTION 4: FOOTER YEAR
   ========================================================= */
const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();
