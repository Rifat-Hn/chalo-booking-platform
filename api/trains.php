
<?php

/*
 * CHALO - Train Listing API
 * File: api/trains.php
 *
 * Fetches train schedules and seat inventory from MySQL.
 * Requires: config/database.php and api/_bootstrap.php
 */

require_once __DIR__ . '/_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    api_response(false, 'Only GET requests are allowed.', [], 405);
}

try {
    // Search parameters
    $from = api_get('from');
    $to = api_get('to');
    $journeyDate = api_get('date');
    $type = strtolower(api_get('type'));

    // Validate date if supplied
    if ($journeyDate !== '' && !api_valid_date($journeyDate)) {
        api_response(false, 'Invalid journey date. Use YYYY-MM-DD.', [], 422);
    }

    // Validate train type
    $allowedTypes = ['intercity', 'commuter', 'mail', 'local', 'other'];

    if ($type !== '' && !in_array($type, $allowedTypes, true)) {
        api_response(false, 'Invalid train type.', [], 422);
    }

    // Main train listing query
    $sql = "
        SELECT
            sch.schedule_id,
            srv.service_id,

            t.train_id,
            t.train_number,
            t.train_name,
            t.train_type,

            pp.business_name AS operator_name,
            op.hotline AS operator_hotline,

            srv.service_name,
            srv.description,
            srv.average_rating,
            srv.total_reviews,

            sch.schedule_code,
            sch.start_datetime,
            sch.end_datetime,
            sch.price,
            sch.available_capacity,
            sch.capacity,
            sch.schedule_status,

            dep.station_id AS departure_station_id,
            dep.station_name_en AS departure_station,
            dep.station_name_bn AS departure_station_bn,
            depLoc.city AS departure_city,

            arr.station_id AS arrival_station_id,
            arr.station_name_en AS arrival_station,
            arr.station_name_bn AS arrival_station_bn,
            arrLoc.city AS arrival_city,

            (
                SELECT si.image_path
                FROM service_images si
                WHERE si.service_id = srv.service_id
                ORDER BY si.is_primary DESC, si.display_order ASC
                LIMIT 1
            ) AS image_path

        FROM schedules sch

        INNER JOIN services srv
            ON srv.service_id = sch.service_id

        INNER JOIN train_schedule_details tsd
            ON tsd.schedule_id = sch.schedule_id

        INNER JOIN trains t
            ON t.train_id = tsd.train_id

        INNER JOIN train_operators op
            ON op.train_operator_id = t.train_operator_id

        INNER JOIN provider_profiles pp
            ON pp.provider_id = op.provider_id

        INNER JOIN train_stations dep
            ON dep.station_id = tsd.departure_station_id

        INNER JOIN locations depLoc
            ON depLoc.location_id = dep.location_id

        INNER JOIN train_stations arr
            ON arr.station_id = tsd.arrival_station_id

        INNER JOIN locations arrLoc
            ON arrLoc.location_id = arr.location_id

        WHERE
            srv.service_status = 'published'
            AND t.active_status = 1
            AND sch.schedule_status = 'open'
            AND sch.start_datetime >= NOW()
    ";

    $params = [];

    // Optional journey date filter
    if ($journeyDate !== '') {
        $sql .= " AND DATE(sch.start_datetime) = :journey_date ";
        $params['journey_date'] = $journeyDate;
    }

    // Optional departure station filter
    if ($from !== '') {
        $sql .= "
            AND (
                dep.station_name_en LIKE :departure_station
                OR dep.station_name_bn LIKE :departure_station_bn
                OR depLoc.city LIKE :departure_city
            )
        ";

        $params['departure_station'] = '%' . $from . '%';
        $params['departure_station_bn'] = '%' . $from . '%';
        $params['departure_city'] = '%' . $from . '%';
    }

    // Optional arrival station filter
    if ($to !== '') {
        $sql .= "
            AND (
                arr.station_name_en LIKE :arrival_station
                OR arr.station_name_bn LIKE :arrival_station_bn
                OR arrLoc.city LIKE :arrival_city
            )
        ";

        $params['arrival_station'] = '%' . $to . '%';
        $params['arrival_station_bn'] = '%' . $to . '%';
        $params['arrival_city'] = '%' . $to . '%';
    }

    // Optional train type filter
    if ($type !== '') {
        $sql .= " AND t.train_type = :train_type ";
        $params['train_type'] = $type;
    }

    $sql .= "
        ORDER BY sch.start_datetime ASC
        LIMIT 100
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $trains = $stmt->fetchAll();

    // Fetch seat classes and available inventory for each schedule
    $inventoryStmt = $pdo->prepare("
        SELECT
            class_or_type AS class_name,
            COUNT(*) AS total_seats,
            SUM(
                CASE
                    WHEN unit_status = 'available' THEN 1
                    ELSE 0
                END
            ) AS available_seats,
            MIN(
                CASE
                    WHEN unit_status = 'available'
                    THEN extra_price
                    ELSE NULL
                END
            ) AS extra_price

        FROM inventory_units

        WHERE
            schedule_id = :schedule_id
            AND unit_type = 'seat'

        GROUP BY class_or_type
        ORDER BY class_or_type ASC
    ");

    foreach ($trains as &$train) {

        $inventoryStmt->execute([
            'schedule_id' => $train['schedule_id']
        ]);

        $fareOptions = $inventoryStmt->fetchAll();

        foreach ($fareOptions as &$fare) {
            $fare['total_seats'] = (int) $fare['total_seats'];
            $fare['available_seats'] = (int) $fare['available_seats'];
            $fare['extra_price'] = (float) ($fare['extra_price'] ?? 0);

            $fare['final_price'] =
                (float) $train['price'] + $fare['extra_price'];
        }
        unset($fare);

        $train['fare_options'] = $fareOptions;

        // Convert numeric database values to consistent JSON types
        $train['schedule_id'] = (int) $train['schedule_id'];
        $train['service_id'] = (int) $train['service_id'];
        $train['train_id'] = (int) $train['train_id'];

        $train['price'] = (float) $train['price'];
        $train['average_rating'] = (float) $train['average_rating'];

        $train['total_reviews'] = (int) $train['total_reviews'];
        $train['available_capacity'] = (int) $train['available_capacity'];
        $train['capacity'] = (int) $train['capacity'];

        $train['departure_time'] = date(
            'H:i:s',
            strtotime($train['start_datetime'])
        );

        $train['arrival_time'] = $train['end_datetime']
            ? date('H:i:s', strtotime($train['end_datetime']))
            : null;

        $train['currency'] = 'BDT';
    }

    unset($train);

    api_response(
        true,
        count($trains) > 0
            ? 'Train schedules retrieved successfully.'
            : 'No train schedules found for the selected search.',
        [
            'count' => count($trains),
            'trains' => $trains
        ]
    );

} catch (Throwable $exception) {

    error_log('Chalo train API error: ' . $exception->getMessage());

    api_response(
        false,
        'Unable to retrieve train schedules. Please try again.',
        [],
        500
    );
}
