/*
 * Chalo custom card cover configuration.
 * Put your own images in assets/covers/<category>/ and add mappings below.
 * Example: hotels: { "sea pearl beach resort": "assets/covers/hotels/sea-pearl.jpg" }
 * Custom mappings take priority over database image_path values.
 */
(() => {
  'use strict';

  const covers = {
    hotels: {
      // "hotel/service name": "assets/covers/hotels/your-image.jpg",
    },
    movies: {
      // "movie title": "assets/covers/movies/your-poster.jpg",
    },
    restaurants: {
      // "restaurant/service name": "assets/covers/restaurants/your-image.jpg",
    },
    buses: {
      // "operator or bus name": "assets/covers/buses/your-image.jpg",
    },
    trains: {
      // "train name": "assets/covers/trains/your-image.jpg",
    },
    ferries: {
      // "vessel or ferry service name": "assets/covers/ferries/your-image.jpg",
    }
  };

  function normalize(value) {
    return String(value ?? '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function resolve(category, names, databasePath, fallbackPath) {
    const categoryMap = covers[category] || {};
    const candidates = Array.isArray(names) ? names : [names];

    for (const candidate of candidates) {
      const key = normalize(candidate);
      if (!key) continue;

      for (const [configuredName, path] of Object.entries(categoryMap)) {
        if (normalize(configuredName) === key && String(path || '').trim()) {
          return String(path).trim();
        }
      }
    }

    return String(databasePath || fallbackPath || 'assets/chalo-logo.png');
  }

  window.ChaloCardCovers = { resolve };
})();
