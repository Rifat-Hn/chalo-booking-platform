<?php

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/database.php';

try {

    // Read search parameters
    $from = trim($_GET['from'] ?? '');
    $to = trim($_GET['to'] ?? '');
    $date = trim($_GET['date'] ?? '');

    // Validate date format
    if ($date !== '') {
        $dateObject = DateTime::createFromFormat('Y-m-d', $date);

        if (!$dateObject || $dateObject->format('Y-m-d') !== $date) {
            throw new InvalidArgumentException('Invalid journey date.');
        }
    }

    // Main bus schedule query
    $sql = "
        SELECT
            s.schedule_id,
            s.service_id,
            s.schedule_code,

            sv.service_name,
            sv.description,
            sv.base_price,
            sv.cancellation_policy,

            (
                SELECT si.image_path
                FROM service_images si
                WHERE si.service_id = sv.service_id
                ORDER BY si.is_primary DESC, si.display_order ASC
                LIMIT 1
            ) AS image_path,

            b.bus_id,
            b.registration_no,
            b.bus_name,
            b.bus_type,
            b.seat_capacity,
            b.amenities,

            pp.business_name AS operator_name,
            pp.average_rating,
            pp.total_reviews,
            pp.support_phone,

            bo.hotline AS operator_hotline,

            s.start_datetime AS departure_datetime,
            s.end_datetime AS arrival_datetime,

            bsd.boarding_time,
            bsd.dropping_time,

            s.price,
            s.capacity,
            s.available_capacity,

            br.bus_route_id,
            br.route_code,
            br.distance_km,
            br.estimated_minutes,

            departure_location.city AS departure_city,
            departure_location.area AS departure_area,
            departure_location.location_name AS departure_terminal,

            arrival_location.city AS arrival_city,
            arrival_location.area AS arrival_area,
            arrival_location.location_name AS arrival_terminal,

            TIMESTAMPDIFF(
                MINUTE,
                bsd.boarding_time,
                bsd.dropping_time
            ) AS duration_minutes,

            (
                SELECT COUNT(*)
                FROM inventory_units iu
                WHERE iu.schedule_id = s.schedule_id
                  AND iu.unit_type = 'seat'
                  AND iu.unit_status = 'available'
            ) AS listed_available_seats

        FROM schedules s

        INNER JOIN services sv
            ON sv.service_id = s.service_id

        INNER JOIN bus_schedule_details bsd
            ON bsd.schedule_id = s.schedule_id

        INNER JOIN buses b
            ON b.bus_id = bsd.bus_id

        INNER JOIN bus_routes br
            ON br.bus_route_id = bsd.bus_route_id

        INNER JOIN bus_operators bo
            ON bo.bus_operator_id = b.bus_operator_id

        INNER JOIN provider_profiles pp
            ON pp.provider_id = bo.provider_id

        INNER JOIN locations departure_location
            ON departure_location.location_id =
               bsd.departure_terminal_id

        INNER JOIN locations arrival_location
            ON arrival_location.location_id =
               bsd.arrival_terminal_id

        WHERE
            sv.category_id = 1
            AND sv.service_status = 'published'
            AND b.active_status = 1
            AND s.schedule_status = 'open'
            AND s.available_capacity > 0
    ";

    $params = [];

    // Normalize apostrophes so Cox's Bazar and Cox’s Bazar can match.
    $normalizedFrom = str_replace(["'", "’"], '', $from);
    $normalizedTo = str_replace(["'", "’"], '', $to);

    // Departure city filter
    if ($from !== '') {
        $sql .= "
            AND REPLACE(
                LOWER(departure_location.city),
                '’',
                ''
            ) LIKE LOWER(:from_city)
        ";

        $params[':from_city'] = '%' . $normalizedFrom . '%';
    }

    // Arrival city filter
    if ($to !== '') {
        $sql .= "
            AND REPLACE(
                LOWER(arrival_location.city),
                '’',
                ''
            ) LIKE LOWER(:to_city)
        ";

        $params[':to_city'] = '%' . $normalizedTo . '%';
    }

    // Journey date filter
    if ($date !== '') {
        $sql .= "
            AND DATE(bsd.boarding_time) = :journey_date
        ";

        $params[':journey_date'] = $date;
    }

    // Order by departure time
    $sql .= "
        ORDER BY bsd.boarding_time ASC
    ";

    // Execute query
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $buses = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format the returned records
    foreach ($buses as &$bus) {

        $bus['schedule_id'] = (int) $bus['schedule_id'];
        $bus['service_id'] = (int) $bus['service_id'];
        $bus['bus_id'] = (int) $bus['bus_id'];

        $bus['price'] = (float) $bus['price'];
        $bus['base_price'] = (float) $bus['base_price'];

        $bus['capacity'] = (int) $bus['capacity'];
        $bus['available_capacity'] = (int) $bus['available_capacity'];
        $bus['seat_capacity'] = (int) $bus['seat_capacity'];

        $bus['average_rating'] = (float) $bus['average_rating'];
        $bus['total_reviews'] = (int) $bus['total_reviews'];

        $bus['distance_km'] = (float) $bus['distance_km'];
        $bus['estimated_minutes'] = (int) $bus['estimated_minutes'];
        $bus['duration_minutes'] = (int) $bus['duration_minutes'];

        $bus['listed_available_seats'] =
            (int) $bus['listed_available_seats'];

        // Decode bus amenities stored as JSON
        if (!empty($bus['amenities'])) {
            $decoded = json_decode($bus['amenities'], true);

            $bus['amenities'] = is_array($decoded)
                ? $decoded
                : [];
        } else {
            $bus['amenities'] = [];
        }
    }

    unset($bus);

    // Return successful response
    echo json_encode([
        'success' => true,
        'message' => count($buses) > 0
            ? 'Bus schedules loaded successfully.'
            : 'No bus schedules found.',

        'data' => [
            'count' => count($buses),
            'buses' => $buses
        ]

    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (InvalidArgumentException $e) {

    http_response_code(400);

    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {

    // Keep the detailed database error in the PHP error log.
    error_log('Bus API database error: ' . $e->getMessage());

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'A database query error occurred. Check the PHP error log.'
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {

    error_log('Bus API error: ' . $e->getMessage());

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'Unable to load bus schedules.'
    ], JSON_UNESCAPED_UNICODE);

}