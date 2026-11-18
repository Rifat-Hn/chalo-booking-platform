<?php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/database.php';

function movieJsonResponse(bool $success, string $message, array $data = []): void
{
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

try {
    // Seat inventory for a selected cinema showtime.
    if (($_GET['action'] ?? '') === 'seats') {
        $scheduleId = (int)($_GET['schedule_id'] ?? 0);
        if ($scheduleId <= 0) {
            http_response_code(400);
            movieJsonResponse(false, 'A valid showtime schedule is required.');
        }

        $seatStmt = $pdo->prepare("
            SELECT
                unit_id,
                unit_code,
                class_or_type,
                extra_price,
                unit_status
            FROM inventory_units
            WHERE schedule_id = ?
              AND unit_type = 'seat'
            ORDER BY unit_code
        ");
        $seatStmt->execute([$scheduleId]);
        $seats = $seatStmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($seats as &$seat) {
            $seat['unit_id'] = (int)$seat['unit_id'];
            $seat['extra_price'] = (float)$seat['extra_price'];
            $seat['selectable'] = $seat['unit_status'] === 'available';
        }
        unset($seat);

        movieJsonResponse(true, 'Seat inventory loaded.', ['seats' => $seats]);
    }

    $city = trim($_GET['city'] ?? '');
    $date = trim($_GET['date'] ?? '');
    $cinema = trim($_GET['cinema'] ?? '');
    $language = trim($_GET['language'] ?? '');

    if ($date !== '') {
        $dateObject = DateTime::createFromFormat('Y-m-d', $date);

        if (!$dateObject || $dateObject->format('Y-m-d') !== $date) {
            http_response_code(400);
            movieJsonResponse(false, 'Invalid date. Use YYYY-MM-DD.');
        }
    }

    $conditions = [
        'sv.category_id = 6',
        "sv.service_status = 'published'",
        "sch.schedule_status IN ('open', 'scheduled')",
        'sch.available_capacity > 0'
    ];

    $params = [];

    if ($city !== '') {
        $conditions[] = 'loc.city LIKE :city';
        $params[':city'] = '%' . $city . '%';
    }

    if ($date !== '') {
        $conditions[] = 'DATE(sch.start_datetime) = :show_date';
        $params[':show_date'] = $date;
    } else {
        $conditions[] = 'sch.start_datetime >= NOW()';
    }

    if ($cinema !== '' && strtolower($cinema) !== 'any cinema') {
        $conditions[] = '(
            c.cinema_name LIKE :cinema
            OR sv.service_name LIKE :cinema_service
        )';
        $params[':cinema'] = '%' . $cinema . '%';
        $params[':cinema_service'] = '%' . $cinema . '%';
    }

    if ($language !== '' && strtolower($language) !== 'any language') {
        $conditions[] = 'm.language LIKE :language';
        $params[':language'] = '%' . $language . '%';
    }

    $whereSql = implode(' AND ', $conditions);

    $sql = "
        SELECT
            cs.showtime_id,
            cs.movie_id,
            cs.cinema_id,
            cs.screen_id,
            cs.service_id,
            cs.schedule_id,

            m.movie_title,
            m.genre,
            m.language,
            m.duration_minutes,
            m.certificate,
            m.release_date,
            m.poster_path,

            c.cinema_name,
            c.contact_phone,

            scr.screen_name,
            scr.screen_type,
            scr.total_seats,

            sv.service_name,
            sv.description,
            sv.address,
            sv.average_rating,
            sv.total_reviews,

            loc.city,
            loc.area,
            loc.location_name,

            sch.schedule_code,
            sch.start_datetime,
            sch.end_datetime,
            sch.price AS schedule_price,
            sch.capacity,
            sch.available_capacity,

            COALESCE(
                ticket_prices.minimum_ticket_price,
                sch.price,
                sv.base_price
            ) AS minimum_ticket_price,

            COALESCE(
                ticket_prices.ticket_categories,
                ''
            ) AS ticket_categories,

            COALESCE(
                NULLIF(m.poster_path, ''),
                service_image.image_path,
                'assets/icons/movies.png'
            ) AS image_path

        FROM cinema_showtimes cs

        INNER JOIN movies m
            ON m.movie_id = cs.movie_id

        INNER JOIN cinemas c
            ON c.cinema_id = cs.cinema_id

        INNER JOIN cinema_screens scr
            ON scr.screen_id = cs.screen_id

        INNER JOIN schedules sch
            ON sch.schedule_id = cs.schedule_id

        INNER JOIN services sv
            ON sv.service_id = cs.service_id

        LEFT JOIN locations loc
            ON loc.location_id = sv.location_id

        LEFT JOIN (
            SELECT
                screen_id,
                MIN(base_price) AS minimum_ticket_price,
                GROUP_CONCAT(
                    CONCAT(category_name, ':', base_price)
                    ORDER BY base_price ASC
                    SEPARATOR ', '
                ) AS ticket_categories
            FROM cinema_ticket_categories
            GROUP BY screen_id
        ) ticket_prices
            ON ticket_prices.screen_id = cs.screen_id

        LEFT JOIN (
            SELECT service_id, image_path
            FROM service_images
            WHERE is_primary = 1
            GROUP BY service_id
        ) service_image
            ON service_image.service_id = sv.service_id

        WHERE {$whereSql}

        ORDER BY
            sch.start_datetime ASC,
            m.movie_title ASC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $showtimes = $stmt->fetchAll();

    $movies = [];

    foreach ($showtimes as $showtime) {
        $movieId = (int) $showtime['movie_id'];

        if (!isset($movies[$movieId])) {
            $movies[$movieId] = [
                'movie_id' => $movieId,
                'movie_title' => $showtime['movie_title'],
                'genre' => $showtime['genre'],
                'language' => $showtime['language'],
                'duration_minutes' => (int) $showtime['duration_minutes'],
                'certificate' => $showtime['certificate'],
                'release_date' => $showtime['release_date'],
                'poster_path' => $showtime['image_path'],
                'average_rating' => (float) $showtime['average_rating'],
                'total_reviews' => (int) $showtime['total_reviews'],
                'showtimes' => []
            ];
        }

        $movies[$movieId]['showtimes'][] = [
            'showtime_id' => (int) $showtime['showtime_id'],
            'schedule_id' => (int) $showtime['schedule_id'],
            'cinema_id' => (int) $showtime['cinema_id'],
            'screen_id' => (int) $showtime['screen_id'],
            'service_id' => (int) $showtime['service_id'],

            'cinema_name' => $showtime['cinema_name'],
            'service_name' => $showtime['service_name'],
            'contact_phone' => $showtime['contact_phone'],

            'city' => $showtime['city'],
            'area' => $showtime['area'],
            'location_name' => $showtime['location_name'],
            'address' => $showtime['address'],

            'screen_name' => $showtime['screen_name'],
            'screen_type' => $showtime['screen_type'],
            'total_seats' => (int) $showtime['total_seats'],

            'schedule_code' => $showtime['schedule_code'],
            'start_datetime' => $showtime['start_datetime'],
            'end_datetime' => $showtime['end_datetime'],

            'price' => (float) $showtime['minimum_ticket_price'],
            'schedule_price' => (float) $showtime['schedule_price'],
            'available_capacity' => (int) $showtime['available_capacity'],
            'ticket_categories' => $showtime['ticket_categories']
        ];
    }

    $movieList = array_values($movies);

    movieJsonResponse(
        true,
        'Movies and showtimes loaded successfully.',
        [
            'count' => count($movieList),
            'movies' => $movieList
        ]
    );

} catch (PDOException $e) {
    error_log('Movies API database error: ' . $e->getMessage());

    http_response_code(500);

    movieJsonResponse(
        false,
        'Could not load movies. Please check the database query.'
    );

} catch (Throwable $e) {
    error_log('Movies API error: ' . $e->getMessage());

    http_response_code(500);

    movieJsonResponse(
        false,
        'An unexpected error occurred while loading movies.'
    );
}