
<?php

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/database.php';

try {

    // --------------------------------------------------
    // Read search parameters
    // --------------------------------------------------

    $location = trim($_GET['location'] ?? '');
    $date = trim($_GET['date'] ?? '');
    $partySize = max(1, (int) ($_GET['guests'] ?? $_GET['party_size'] ?? 2));

    if ($date !== '') {
        $dateObject = DateTime::createFromFormat('Y-m-d', $date);

        if (!$dateObject || $dateObject->format('Y-m-d') !== $date) {
            throw new InvalidArgumentException('Invalid reservation date.');
        }
    }

    // --------------------------------------------------
    // Main restaurant query
    // --------------------------------------------------

    $sql = "
        SELECT
            r.restaurant_id,
            r.service_id,

            r.cuisine_type AS restaurant_cuisine,
            r.opening_time AS restaurant_opening_time,
            r.closing_time AS restaurant_closing_time,
            r.average_cost_for_two,
            r.reservation_policy,

            rsd.cuisine_type AS detail_cuisine,
            rsd.opening_time AS detail_opening_time,
            rsd.closing_time AS detail_closing_time,
            rsd.average_cost_for_two AS detail_average_cost,
            rsd.amenities AS restaurant_amenities,

            sv.provider_id,
            sv.service_name,
            sv.slug,
            sv.description,
            sv.address,
            sv.base_price,
            sv.cancellation_policy,
            sv.average_rating,
            sv.total_reviews,

            pp.business_name AS provider_name,
            pp.support_phone,

            loc.city,
            loc.area,
            loc.location_name,

            (
                SELECT si.image_path
                FROM service_images si
                WHERE si.service_id = sv.service_id
                ORDER BY si.is_primary DESC, si.display_order ASC
                LIMIT 1
            ) AS image_path

        FROM restaurants r

        INNER JOIN services sv
            ON sv.service_id = r.service_id

        LEFT JOIN restaurant_service_details rsd
            ON rsd.service_id = sv.service_id

        LEFT JOIN provider_profiles pp
            ON pp.provider_id = sv.provider_id

        LEFT JOIN locations loc
            ON loc.location_id = sv.location_id

        WHERE
            sv.category_id = 5
            AND sv.service_status = 'published'
    ";

    $params = [];

    // Location search
    if ($location !== '') {

        $sql .= "
            AND (
                LOWER(loc.city) LIKE LOWER(:city)
                OR LOWER(loc.area) LIKE LOWER(:area)
                OR LOWER(loc.location_name) LIKE LOWER(:location_name)
                OR LOWER(sv.address) LIKE LOWER(:address)
                OR LOWER(sv.service_name) LIKE LOWER(:service_name)
            )
        ";

        $searchLocation = '%' . $location . '%';

        $params[':city'] = $searchLocation;
        $params[':area'] = $searchLocation;
        $params[':location_name'] = $searchLocation;
        $params[':address'] = $searchLocation;
        $params[':service_name'] = $searchLocation;
    }

    $sql .= "
        ORDER BY
            sv.average_rating DESC,
            sv.service_name ASC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $restaurants = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // --------------------------------------------------
    // Fetch restaurant tables
    // --------------------------------------------------

    if (!empty($restaurants)) {

        $restaurantIds = array_column($restaurants, 'restaurant_id');

        $placeholders = implode(
            ',',
            array_fill(0, count($restaurantIds), '?')
        );

        $tableSql = "
            SELECT
                restaurant_table_id,
                restaurant_id,
                table_code,
                seating_capacity,
                table_area,
                table_status

            FROM restaurant_tables

            WHERE restaurant_id IN ($placeholders)

            ORDER BY restaurant_id, seating_capacity ASC
        ";

        $tableStmt = $pdo->prepare($tableSql);
        $tableStmt->execute($restaurantIds);

        $tableRows = $tableStmt->fetchAll(PDO::FETCH_ASSOC);

        $tablesByRestaurant = [];

        foreach ($tableRows as $table) {

            $restaurantId = (int) $table['restaurant_id'];

            if (!isset($tablesByRestaurant[$restaurantId])) {
                $tablesByRestaurant[$restaurantId] = [];
            }

            $tablesByRestaurant[$restaurantId][] = [
                'restaurant_table_id' => (int) $table['restaurant_table_id'],
                'table_code' => $table['table_code'],
                'seating_capacity' => (int) $table['seating_capacity'],
                'table_area' => $table['table_area'],
                'table_status' => $table['table_status']
            ];
        }

        // --------------------------------------------------
        // Fetch reservation slots
        // --------------------------------------------------

        $slotSql = "
            SELECT
                rs.restaurant_id,
                rs.restaurant_slot_id,
                rs.slot_label,
                rs.max_party_size,
                rs.reservation_duration_minutes,

                s.schedule_id,
                s.schedule_code,
                s.start_datetime,
                s.end_datetime,
                s.capacity,
                s.available_capacity,
                s.price,
                s.schedule_status

            FROM restaurant_slots rs

            INNER JOIN schedules s
                ON s.schedule_id = rs.schedule_id

            WHERE
                rs.restaurant_id IN ($placeholders)
                AND s.schedule_status = 'open'
                AND s.available_capacity > 0
                AND rs.max_party_size >= ?

        ";

        $slotParams = $restaurantIds;
        $slotParams[] = $partySize;

        if ($date !== '') {
            $slotSql .= "
                AND DATE(s.start_datetime) = ?
            ";

            $slotParams[] = $date;
        }

        $slotSql .= "
            ORDER BY
                rs.restaurant_id,
                s.start_datetime ASC
        ";

        $slotStmt = $pdo->prepare($slotSql);
        $slotStmt->execute($slotParams);

        $slotRows = $slotStmt->fetchAll(PDO::FETCH_ASSOC);

        $slotsByRestaurant = [];

        foreach ($slotRows as $slot) {

            $restaurantId = (int) $slot['restaurant_id'];

            if (!isset($slotsByRestaurant[$restaurantId])) {
                $slotsByRestaurant[$restaurantId] = [];
            }

            $slotsByRestaurant[$restaurantId][] = [
                'restaurant_slot_id' => (int) $slot['restaurant_slot_id'],
                'schedule_id' => (int) $slot['schedule_id'],
                'schedule_code' => $slot['schedule_code'],
                'slot_label' => $slot['slot_label'],
                'start_datetime' => $slot['start_datetime'],
                'end_datetime' => $slot['end_datetime'],
                'max_party_size' => (int) $slot['max_party_size'],
                'reservation_duration_minutes' =>
                    (int) $slot['reservation_duration_minutes'],
                'capacity' => (int) $slot['capacity'],
                'available_capacity' => (int) $slot['available_capacity'],
                'price' => (float) $slot['price'],
                'schedule_status' => $slot['schedule_status']
            ];
        }

    } else {

        $tablesByRestaurant = [];
        $slotsByRestaurant = [];
    }

    // --------------------------------------------------
    // Format restaurant records
    // --------------------------------------------------

    foreach ($restaurants as &$restaurant) {

        $restaurantId = (int) $restaurant['restaurant_id'];

        $restaurant['restaurant_id'] = $restaurantId;
        $restaurant['service_id'] = (int) $restaurant['service_id'];

        $restaurant['average_rating'] =
            (float) $restaurant['average_rating'];

        $restaurant['total_reviews'] =
            (int) $restaurant['total_reviews'];

        $restaurant['base_price'] =
            (float) $restaurant['base_price'];

        $restaurant['average_cost_for_two'] = (float) (
            $restaurant['average_cost_for_two']
            ?? $restaurant['detail_average_cost']
            ?? 0
        );

        $restaurant['cuisine_type'] =
            $restaurant['restaurant_cuisine']
            ?? $restaurant['detail_cuisine']
            ?? '';

        $restaurant['opening_time'] =
            $restaurant['restaurant_opening_time']
            ?? $restaurant['detail_opening_time']
            ?? null;

        $restaurant['closing_time'] =
            $restaurant['restaurant_closing_time']
            ?? $restaurant['detail_closing_time']
            ?? null;

        // Decode restaurant amenities
        if (!empty($restaurant['restaurant_amenities'])) {

            $decodedAmenities = json_decode(
                $restaurant['restaurant_amenities'],
                true
            );

            $restaurant['amenities'] = is_array($decodedAmenities)
                ? $decodedAmenities
                : [];

        } else {
            $restaurant['amenities'] = [];
        }

        // Attach tables
        $restaurant['tables'] =
            $tablesByRestaurant[$restaurantId] ?? [];

        // Attach reservation slots
        $restaurant['slots'] =
            $slotsByRestaurant[$restaurantId] ?? [];

        // Count active tables
        $activeTables = array_filter(
            $restaurant['tables'],
            function ($table) {
                return $table['table_status'] === 'active';
            }
        );

        $restaurant['active_table_count'] = count($activeTables);

        // Count available reservation slots
        $restaurant['available_slot_count'] =
            count($restaurant['slots']);

        // Check if the restaurant has a suitable table
        $restaurant['suitable_tables'] = array_values(
            array_filter(
                $restaurant['tables'],
                function ($table) use ($partySize) {
                    return
                        $table['table_status'] === 'active'
                        && $table['seating_capacity'] >= $partySize;
                }
            )
        );

        $restaurant['has_suitable_table'] =
            count($restaurant['suitable_tables']) > 0;

    }

    unset($restaurant);

    // --------------------------------------------------
    // Return JSON response
    // --------------------------------------------------

    echo json_encode([

        'success' => true,

        'message' => count($restaurants) > 0
            ? 'Restaurants loaded successfully.'
            : 'No restaurants found.',

        'data' => [
            'count' => count($restaurants),
            'restaurants' => $restaurants
        ]

    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (InvalidArgumentException $e) {

    http_response_code(400);

    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {

    error_log('Restaurant API database error: ' . $e->getMessage());

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'A database query error occurred. Check the PHP error log.'
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {

    error_log('Restaurant API error: ' . $e->getMessage());

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'Unable to load restaurant listings.'
    ], JSON_UNESCAPED_UNICODE);

}
