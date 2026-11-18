
<?php

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/database.php';

try {

    // --------------------------------------------------
    // Read search parameters
    // --------------------------------------------------

    $location = trim($_GET['location'] ?? '');
    $checkin = trim($_GET['checkin'] ?? '');
    $checkout = trim($_GET['checkout'] ?? '');
    $guests = max(1, (int) ($_GET['guests'] ?? 1));

    // Validate dates
    $checkinDate = null;
    $checkoutDate = null;

    if ($checkin !== '') {
        $checkinDate = DateTime::createFromFormat('Y-m-d', $checkin);

        if (!$checkinDate || $checkinDate->format('Y-m-d') !== $checkin) {
            throw new InvalidArgumentException('Invalid check-in date.');
        }
    }

    if ($checkout !== '') {
        $checkoutDate = DateTime::createFromFormat('Y-m-d', $checkout);

        if (!$checkoutDate || $checkoutDate->format('Y-m-d') !== $checkout) {
            throw new InvalidArgumentException('Invalid check-out date.');
        }
    }

    if ($checkinDate && $checkoutDate && $checkoutDate <= $checkinDate) {
        throw new InvalidArgumentException(
            'Check-out date must be after check-in date.'
        );
    }

    // --------------------------------------------------
    // Main hotel query
    // --------------------------------------------------

    $sql = "
        SELECT
            sv.service_id,
            sv.provider_id,
            sv.service_name,
            sv.slug,
            sv.description,
            sv.address,
            sv.base_price,
            sv.cancellation_policy,
            sv.average_rating,
            sv.total_reviews,

            h.hotel_id,
            h.star_rating AS hotel_star_rating,
            h.check_in_time,
            h.check_out_time,
            h.child_policy,

            hsd.star_rating AS detail_star_rating,
            hsd.amenities AS hotel_amenities,

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

        FROM services sv

        INNER JOIN hotels h
            ON h.service_id = sv.service_id

        LEFT JOIN hotel_service_details hsd
            ON hsd.service_id = sv.service_id

        LEFT JOIN provider_profiles pp
            ON pp.provider_id = sv.provider_id

        LEFT JOIN locations loc
            ON loc.location_id = sv.location_id

        WHERE
            sv.category_id = 4
            AND sv.service_status = 'published'
    ";

    $params = [];

    if ($location !== '') {
        $sql .= "
            AND (
                LOWER(loc.city) LIKE LOWER(:location_city)
                OR LOWER(loc.area) LIKE LOWER(:location_area)
                OR LOWER(loc.location_name) LIKE LOWER(:location_name)
                OR LOWER(sv.address) LIKE LOWER(:location_address)
            )
        ";

        $searchLocation = '%' . $location . '%';

        $params[':location_city'] = $searchLocation;
        $params[':location_area'] = $searchLocation;
        $params[':location_name'] = $searchLocation;
        $params[':location_address'] = $searchLocation;
    }

    $sql .= "
        ORDER BY
            sv.average_rating DESC,
            sv.service_name ASC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $hotels = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Load real future stay schedules for each hotel. These are the only
    // schedule IDs that can be inserted into cart_items.
    $schedulesByService = [];
    if ($hotels) {
        $hotelServiceIds = array_map('intval', array_column($hotels, 'service_id'));
        $schedulePlaceholders = implode(',', array_fill(0, count($hotelServiceIds), '?'));
        $stayStmt = $pdo->prepare("
            SELECT schedule_id, service_id, check_in_date, check_out_date,
                   price, available_capacity
            FROM schedules
            WHERE service_id IN ($schedulePlaceholders)
              AND check_in_date IS NOT NULL
              AND check_out_date IS NOT NULL
              AND check_in_date >= CURDATE()
              AND schedule_status = 'open'
              AND available_capacity > 0
            ORDER BY check_in_date ASC
        ");
        $stayStmt->execute($hotelServiceIds);
        foreach ($stayStmt->fetchAll(PDO::FETCH_ASSOC) as $stay) {
            $serviceId = (int)$stay['service_id'];
            $schedulesByService[$serviceId][] = [
                'schedule_id' => (int)$stay['schedule_id'],
                'check_in_date' => $stay['check_in_date'],
                'check_out_date' => $stay['check_out_date'],
                'price' => (float)$stay['price'],
                'available_capacity' => (int)$stay['available_capacity']
            ];
        }
    }

    // --------------------------------------------------
    // Fetch room types from hotel_room_types
    // --------------------------------------------------

    $roomTypesSql = "
        SELECT
            room_type_id,
            service_id,
            room_name,
            bed_type,
            max_guests,
            total_rooms,
            base_price

        FROM hotel_room_types

        ORDER BY service_id, base_price ASC
    ";

    $roomTypesStmt = $pdo->query($roomTypesSql);
    $roomTypeRows = $roomTypesStmt->fetchAll(PDO::FETCH_ASSOC);

    $roomTypesByService = [];

    foreach ($roomTypeRows as $room) {

        $serviceId = (int) $room['service_id'];

        if (!isset($roomTypesByService[$serviceId])) {
            $roomTypesByService[$serviceId] = [];
        }

        $roomTypesByService[$serviceId][] = [
            'room_type_id' => (int) $room['room_type_id'],
            'room_name' => $room['room_name'],
            'bed_type' => $room['bed_type'],
            'max_guests' => (int) $room['max_guests'],
            'total_rooms' => (int) $room['total_rooms'],
            'base_price' => (float) $room['base_price']
        ];
    }

    // --------------------------------------------------
    // Fetch room classes and daily rates
    // --------------------------------------------------

    $roomClassSql = "
        SELECT
            h.hotel_id,
            h.service_id,

            hrc.room_type_id,
            hrc.room_type_name,
            hrc.bed_type,
            hrc.max_adults,
            hrc.max_children,
            hrc.total_rooms,
            hrc.base_nightly_rate

        FROM hotel_room_classes hrc

        INNER JOIN hotels h
            ON h.hotel_id = hrc.hotel_id

        ORDER BY h.service_id, hrc.base_nightly_rate ASC
    ";

    $roomClassStmt = $pdo->query($roomClassSql);
    $roomClassRows = $roomClassStmt->fetchAll(PDO::FETCH_ASSOC);

    $roomClassesByService = [];

    foreach ($roomClassRows as $room) {

        $serviceId = (int) $room['service_id'];

        if (!isset($roomClassesByService[$serviceId])) {
            $roomClassesByService[$serviceId] = [];
        }

        $roomClassesByService[$serviceId][] = [
            'room_type_id' => (int) $room['room_type_id'],
            'room_name' => $room['room_type_name'],
            'bed_type' => $room['bed_type'],
            'max_adults' => (int) $room['max_adults'],
            'max_children' => (int) $room['max_children'],
            'total_rooms' => (int) $room['total_rooms'],
            'base_nightly_rate' => (float) $room['base_nightly_rate'],
            'rates' => []
        ];
    }

    // --------------------------------------------------
    // Fetch date-specific room rates when dates supplied
    // --------------------------------------------------

    if ($checkin !== '' && $checkout !== '') {

        $rateSql = "
            SELECT
                h.service_id,
                hrc.room_type_id,
                hrr.rate_date,
                hrr.nightly_rate,
                hrr.available_rooms,
                hrr.rate_status

            FROM hotel_room_rates hrr

            INNER JOIN hotel_room_classes hrc
                ON hrc.room_type_id = hrr.room_type_id

            INNER JOIN hotels h
                ON h.hotel_id = hrc.hotel_id

            WHERE
                hrr.rate_date >= :checkin
                AND hrr.rate_date < :checkout

            ORDER BY h.service_id, hrc.room_type_id, hrr.rate_date
        ";

        $rateStmt = $pdo->prepare($rateSql);

        $rateStmt->execute([
            ':checkin' => $checkin,
            ':checkout' => $checkout
        ]);

        $rateRows = $rateStmt->fetchAll(PDO::FETCH_ASSOC);

        $ratesByRoom = [];

        foreach ($rateRows as $rate) {

            $roomTypeId = (int) $rate['room_type_id'];

            if (!isset($ratesByRoom[$roomTypeId])) {
                $ratesByRoom[$roomTypeId] = [];
            }

            $ratesByRoom[$roomTypeId][] = [
                'date' => $rate['rate_date'],
                'nightly_rate' => (float) $rate['nightly_rate'],
                'available_rooms' => (int) $rate['available_rooms'],
                'rate_status' => $rate['rate_status']
            ];
        }

        foreach ($roomClassesByService as $serviceId => &$rooms) {

            foreach ($rooms as &$room) {

                $roomTypeId = $room['room_type_id'];

                $room['rates'] = $ratesByRoom[$roomTypeId] ?? [];

                $room['date_availability_confirmed'] =
                    count($room['rates']) ===
                    (int) $checkinDate->diff($checkoutDate)->days;

                $room['date_available'] = $room['date_availability_confirmed'];

                if ($room['date_available']) {

                    foreach ($room['rates'] as $rate) {

                        if (
                            $rate['rate_status'] !== 'open' ||
                            $rate['available_rooms'] < 1
                        ) {
                            $room['date_available'] = false;
                            break;
                        }
                    }
                }
            }

            unset($room);
        }

        unset($rooms);
    }


    // Select the exact schedule matching the requested stay dates.
    $hotelSchedulesByService = [];
    if ($checkin !== '' && $checkout !== '') {
        foreach ($schedulesByService as $serviceId => $stays) {
            foreach ($stays as $stay) {
                if (
                    $stay['check_in_date'] === $checkin &&
                    $stay['check_out_date'] === $checkout
                ) {
                    $hotelSchedulesByService[$serviceId] = $stay;
                    break;
                }
            }
        }
    }

    // --------------------------------------------------
    // Attach room data and format hotel records
    // --------------------------------------------------

    foreach ($hotels as &$hotel) {

        $serviceId = (int) $hotel['service_id'];

        $hotel['service_id'] = $serviceId;
        $hotel['hotel_id'] = (int) $hotel['hotel_id'];

        $hotel['base_price'] = (float) $hotel['base_price'];

        $hotel['average_rating'] =
            (float) $hotel['average_rating'];

        $hotel['total_reviews'] =
            (int) $hotel['total_reviews'];

        $hotel['hotel_star_rating'] =
            (int) ($hotel['hotel_star_rating'] ?? $hotel['detail_star_rating'] ?? 0);

        $hotel['room_types'] =
            $roomTypesByService[$serviceId] ?? [];

        $hotel['room_classes'] =
            $roomClassesByService[$serviceId] ?? [];

        $hotel['available_stays'] = $schedulesByService[$serviceId] ?? [];
        $matchedSchedule = $hotelSchedulesByService[$serviceId] ?? null;
        $hotel['schedule_id'] = $matchedSchedule['schedule_id'] ?? null;
        $hotel['schedule_price'] = $matchedSchedule['price'] ?? null;
        $hotel['available_capacity'] = $matchedSchedule['available_capacity'] ?? 0;

        // Decode JSON amenities
        if (!empty($hotel['hotel_amenities'])) {

            $decodedAmenities = json_decode(
                $hotel['hotel_amenities'],
                true
            );

            $hotel['hotel_amenities'] = is_array($decodedAmenities)
                ? $decodedAmenities
                : [];

        } else {
            $hotel['hotel_amenities'] = [];
        }

        // Guest-capacity filtering
        $hotel['suitable_room_types'] = array_values(
            array_filter(
                $hotel['room_types'],
                function ($room) use ($guests) {
                    return $room['max_guests'] >= $guests;
                }
            )
        );

        $hotel['suitable_room_classes'] = array_values(
            array_filter(
                $hotel['room_classes'],
                function ($room) use ($guests) {
                    return $room['max_adults'] + $room['max_children'] >= $guests;
                }
            )
        );
    }

    unset($hotel);

    // --------------------------------------------------
    // Return JSON response
    // --------------------------------------------------

    echo json_encode([

        'success' => true,

        'message' => count($hotels) > 0
            ? 'Hotels loaded successfully.'
            : 'No hotels found.',

        'data' => [
            'count' => count($hotels),
            'hotels' => $hotels
        ]

    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (InvalidArgumentException $e) {

    http_response_code(400);

    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {

    error_log('Hotel API database error: ' . $e->getMessage());

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'A database query error occurred. Check the PHP error log.'
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {

    error_log('Hotel API error: ' . $e->getMessage());

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'Unable to load hotel listings.'
    ], JSON_UNESCAPED_UNICODE);

}
