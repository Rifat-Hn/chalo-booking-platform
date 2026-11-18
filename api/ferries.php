<?php

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/database.php';

try {

    // Read search parameters
    $from = trim($_GET['from'] ?? '');
    $to = trim($_GET['to'] ?? '');
    $date = trim($_GET['date'] ?? '');

    // Validate date
    if ($date !== '') {
        $dateObject = DateTime::createFromFormat('Y-m-d', $date);

        if (!$dateObject || $dateObject->format('Y-m-d') !== $date) {
            throw new InvalidArgumentException('Invalid journey date.');
        }
    }

    // Convert dropdown labels into database city names
    $stationAliases = [
        'Dhaka (Sadarghat)' => 'Dhaka',
        'Sadarghat' => 'Dhaka',
        'Barishal' => 'Barishal',
        'Chandpur' => 'Chandpur',
        'Bhola' => 'Bhola'
    ];

    $fromCity = $stationAliases[$from] ?? $from;
    $toCity = $stationAliases[$to] ?? $to;

    // Main ferry schedule query
    $sql = "
        SELECT
            s.schedule_id,
            s.service_id,
            s.schedule_code,

            sv.service_name,
            sv.description,
            sv.base_price,
            sv.cancellation_policy,
            sv.average_rating,
            sv.total_reviews,

            fv.vessel_id,
            fv.vessel_name,
            fv.registration_no,
            fv.vessel_type,
            fv.passenger_capacity,
            fv.amenities,

            fo.ferry_operator_id,
            fo.hotline AS operator_hotline,

            pp.business_name AS operator_name,
            pp.average_rating AS operator_rating,
            pp.total_reviews AS operator_reviews,
            pp.support_phone,

            fsd.departure_datetime,
            fsd.arrival_datetime,

            s.start_datetime,
            s.end_datetime,
            s.price,
            s.capacity,
            s.available_capacity,
            s.schedule_status,

            fr.ferry_route_id,
            fr.distance_km,
            fr.estimated_minutes,

            origin.city AS departure_city,
            origin.area AS departure_area,
            origin.location_name AS departure_terminal,

            destination.city AS arrival_city,
            destination.area AS arrival_area,
            destination.location_name AS arrival_terminal,

            (
                SELECT si.image_path
                FROM service_images si
                WHERE si.service_id = sv.service_id
                ORDER BY si.is_primary DESC, si.display_order ASC
                LIMIT 1
            ) AS image_path

        FROM schedules s

        INNER JOIN services sv
            ON sv.service_id = s.service_id

        INNER JOIN ferry_schedule_details fsd
            ON fsd.schedule_id = s.schedule_id

        INNER JOIN ferry_vessels fv
            ON fv.vessel_id = fsd.vessel_id

        INNER JOIN ferry_operators fo
            ON fo.ferry_operator_id = fv.ferry_operator_id

        INNER JOIN provider_profiles pp
            ON pp.provider_id = sv.provider_id

        INNER JOIN ferry_routes fr
            ON fr.ferry_route_id = fsd.ferry_route_id

        INNER JOIN locations origin
            ON origin.location_id = fr.origin_port_id

        INNER JOIN locations destination
            ON destination.location_id = fr.destination_port_id

        WHERE
            sv.category_id = 3
            AND sv.service_status = 'published'
            AND fv.active_status = 1
            AND s.schedule_status = 'open'
            AND s.available_capacity > 0
    ";

    $params = [];

    // Departure city filter
    if ($fromCity !== '') {
        $sql .= "
            AND LOWER(origin.city) LIKE LOWER(:from_city)
        ";

        $params[':from_city'] = '%' . $fromCity . '%';
    }

    // Arrival city filter
    if ($toCity !== '') {
        $sql .= "
            AND LOWER(destination.city) LIKE LOWER(:to_city)
        ";

        $params[':to_city'] = '%' . $toCity . '%';
    }

    // Journey date filter
    if ($date !== '') {
        $sql .= "
            AND DATE(fsd.departure_datetime) = :journey_date
        ";

        $params[':journey_date'] = $date;
    }

    $sql .= "
        ORDER BY fsd.departure_datetime ASC
    ";

    // Execute main query
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $ferries = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Fetch inventory for the returned schedules
    if (!empty($ferries)) {

        $scheduleIds = array_column($ferries, 'schedule_id');

        $placeholders = implode(
            ',',
            array_fill(0, count($scheduleIds), '?')
        );

        $inventorySql = "
            SELECT
                schedule_id,
                unit_id,
                unit_code,
                unit_type,
                class_or_type,
                extra_price,
                unit_status

            FROM inventory_units

            WHERE schedule_id IN ($placeholders)

            AND unit_type IN ('cabin', 'seat')

            ORDER BY schedule_id, unit_type, extra_price
        ";

        $inventoryStmt = $pdo->prepare($inventorySql);
        $inventoryStmt->execute($scheduleIds);

        $inventoryRows = $inventoryStmt->fetchAll(PDO::FETCH_ASSOC);

        // Group inventory by schedule
        $inventoryBySchedule = [];

        foreach ($inventoryRows as $unit) {

            $scheduleId = $unit['schedule_id'];

            if (!isset($inventoryBySchedule[$scheduleId])) {
                $inventoryBySchedule[$scheduleId] = [];
            }

            $inventoryBySchedule[$scheduleId][] = [
                'unit_id' => (int) $unit['unit_id'],
                'unit_code' => $unit['unit_code'],
                'unit_type' => $unit['unit_type'],
                'class_or_type' => $unit['class_or_type'],
                'extra_price' => (float) $unit['extra_price'],
                'unit_status' => $unit['unit_status']
            ];
        }

    } else {
        $inventoryBySchedule = [];
    }

    // Format returned records
    foreach ($ferries as &$ferry) {

        $ferry['schedule_id'] = (int) $ferry['schedule_id'];
        $ferry['service_id'] = (int) $ferry['service_id'];
        $ferry['vessel_id'] = (int) $ferry['vessel_id'];

        $ferry['price'] = (float) $ferry['price'];
        $ferry['base_price'] = (float) $ferry['base_price'];

        $ferry['capacity'] = (int) $ferry['capacity'];
        $ferry['available_capacity'] = (int) $ferry['available_capacity'];

        $ferry['passenger_capacity'] =
            (int) $ferry['passenger_capacity'];

        $ferry['distance_km'] = (float) $ferry['distance_km'];

        $ferry['estimated_minutes'] =
            (int) $ferry['estimated_minutes'];

        $ferry['average_rating'] =
            (float) $ferry['average_rating'];

        $ferry['total_reviews'] =
            (int) $ferry['total_reviews'];

        $ferry['operator_rating'] =
            (float) $ferry['operator_rating'];

        $ferry['operator_reviews'] =
            (int) $ferry['operator_reviews'];

        // Decode vessel amenities
        if (!empty($ferry['amenities'])) {

            $decoded = json_decode($ferry['amenities'], true);

            $ferry['amenities'] = is_array($decoded)
                ? $decoded
                : [];

        } else {
            $ferry['amenities'] = [];
        }

        // Attach schedule inventory
        $scheduleId = $ferry['schedule_id'];

        $ferry['inventory'] =
            $inventoryBySchedule[$scheduleId] ?? [];
    }

    unset($ferry);

    // Return JSON response
    echo json_encode([

        'success' => true,

        'message' => count($ferries) > 0
            ? 'Ferry schedules loaded successfully.'
            : 'No ferry schedules found.',

        'data' => [
            'count' => count($ferries),
            'ferries' => $ferries
        ]

    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (InvalidArgumentException $e) {

    http_response_code(400);

    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {

    error_log('Ferry API database error: ' . $e->getMessage());

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'A database query error occurred. Check the PHP error log.'
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {

    error_log('Ferry API error: ' . $e->getMessage());

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'Unable to load ferry schedules.'
    ], JSON_UNESCAPED_UNICODE);

}