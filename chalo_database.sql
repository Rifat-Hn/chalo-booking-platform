-- CHALO | All-in-One Booking Platform
-- MySQL 8.0+ | Non-destructive install / upgrade foundation. Never drops existing tables.
CREATE DATABASE IF NOT EXISTS chalo_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE chalo_db;
-- 1. Accounts and roles
CREATE TABLE IF NOT EXISTS users (
 user_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 full_name VARCHAR(120) NOT NULL, email VARCHAR(150) NOT NULL UNIQUE,
 phone VARCHAR(25) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL,
 role ENUM('customer','provider','admin') NOT NULL DEFAULT 'customer',
 profile_image VARCHAR(255), status ENUM('active','pending','suspended') NOT NULL DEFAULT 'active',
 email_verified_at DATETIME, phone_verified_at DATETIME,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_user_role_status(role,status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS provider_profiles (
 provider_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id BIGINT UNSIGNED NOT NULL UNIQUE, business_name VARCHAR(160) NOT NULL,
 business_type VARCHAR(80) NOT NULL, description TEXT, trade_license_no VARCHAR(80),
 verification_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
 average_rating DECIMAL(3,2) NOT NULL DEFAULT 0, total_reviews INT UNSIGNED NOT NULL DEFAULT 0,
 support_email VARCHAR(150), support_phone VARCHAR(25),
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE,
 INDEX idx_provider_verification(verification_status)
) ENGINE=InnoDB;

-- 2. Categories and geographic locations
CREATE TABLE IF NOT EXISTS categories (
 category_id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 category_name VARCHAR(80) NOT NULL UNIQUE, category_slug VARCHAR(90) NOT NULL UNIQUE,
 description VARCHAR(255), icon_path VARCHAR(255), is_active BOOLEAN NOT NULL DEFAULT TRUE,
 display_order TINYINT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS locations (
 location_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 city VARCHAR(80) NOT NULL, area VARCHAR(100), location_name VARCHAR(150) NOT NULL,
 address TEXT, latitude DECIMAL(10,7), longitude DECIMAL(10,7),
 location_type ENUM('city','area','station','terminal','port','venue','hotel','restaurant','cinema','other') DEFAULT 'other',
 INDEX idx_location_city_area(city,area), INDEX idx_location_name(location_name)
) ENGINE=InnoDB;

-- 3. Provider listings. A service can represent a route, hotel, restaurant, cinema or event.
CREATE TABLE IF NOT EXISTS services (
 service_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 provider_id BIGINT UNSIGNED NOT NULL, category_id SMALLINT UNSIGNED NOT NULL,
 service_name VARCHAR(180) NOT NULL, slug VARCHAR(200) NOT NULL UNIQUE,
 description TEXT, location_id BIGINT UNSIGNED,
 origin_location_id BIGINT UNSIGNED, destination_location_id BIGINT UNSIGNED,
 address TEXT, base_price DECIMAL(12,2) NOT NULL DEFAULT 0, currency CHAR(3) NOT NULL DEFAULT 'BDT',
 service_status ENUM('draft','pending','published','paused','rejected') NOT NULL DEFAULT 'pending',
 cancellation_policy TEXT, terms_and_conditions TEXT,
 average_rating DECIMAL(3,2) NOT NULL DEFAULT 0, total_reviews INT UNSIGNED NOT NULL DEFAULT 0,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY(provider_id) REFERENCES provider_profiles(provider_id),
 FOREIGN KEY(category_id) REFERENCES categories(category_id),
 FOREIGN KEY(location_id) REFERENCES locations(location_id) ON DELETE SET NULL,
 FOREIGN KEY(origin_location_id) REFERENCES locations(location_id) ON DELETE SET NULL,
 FOREIGN KEY(destination_location_id) REFERENCES locations(location_id) ON DELETE SET NULL,
 CHECK(base_price>=0), INDEX idx_service_category_status(category_id,service_status),
 INDEX idx_service_provider(provider_id), INDEX idx_service_route(origin_location_id,destination_location_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS service_images (
 image_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, service_id BIGINT UNSIGNED NOT NULL,
 image_path VARCHAR(255) NOT NULL, alt_text VARCHAR(180), is_primary BOOLEAN DEFAULT FALSE,
 display_order SMALLINT UNSIGNED DEFAULT 0,
 FOREIGN KEY(service_id) REFERENCES services(service_id) ON DELETE CASCADE,
 INDEX idx_images_service(service_id,display_order)
) ENGINE=InnoDB;

-- 4. Schedules: departures, showtimes, event times, restaurant slots, hotel date windows.
CREATE TABLE IF NOT EXISTS schedules (
 schedule_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, service_id BIGINT UNSIGNED NOT NULL,
 schedule_code VARCHAR(60), start_datetime DATETIME NOT NULL, end_datetime DATETIME,
 check_in_date DATE, check_out_date DATE,
 capacity INT UNSIGNED NOT NULL DEFAULT 1, available_capacity INT UNSIGNED NOT NULL DEFAULT 1,
 price DECIMAL(12,2) NOT NULL, schedule_status ENUM('scheduled','open','sold_out','cancelled','completed') DEFAULT 'open',
 notes VARCHAR(255), FOREIGN KEY(service_id) REFERENCES services(service_id) ON DELETE CASCADE,
 CHECK(price>=0), CHECK(available_capacity<=capacity),
 INDEX idx_schedule_service_date(service_id,start_datetime), INDEX idx_schedule_status_date(schedule_status,start_datetime)
) ENGINE=InnoDB;

-- Units can be seats, rooms, tables, cabins, cinema seats or event tickets.
CREATE TABLE IF NOT EXISTS inventory_units (
 unit_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, schedule_id BIGINT UNSIGNED NOT NULL,
 unit_code VARCHAR(40) NOT NULL, unit_type ENUM('seat','room','table','ticket','cabin','other') DEFAULT 'other',
 class_or_type VARCHAR(60), extra_price DECIMAL(10,2) NOT NULL DEFAULT 0,
 unit_status ENUM('available','held','booked','blocked','maintenance') DEFAULT 'available',
 FOREIGN KEY(schedule_id) REFERENCES schedules(schedule_id) ON DELETE CASCADE,
 UNIQUE KEY uq_schedule_unit(schedule_id,unit_code), CHECK(extra_price>=0),
 INDEX idx_inventory_availability(schedule_id,unit_status)
) ENGINE=InnoDB;

-- 5. Shopping cart: different service categories can coexist in one cart.
CREATE TABLE IF NOT EXISTS carts (
 cart_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, customer_id BIGINT UNSIGNED NOT NULL,
 cart_status ENUM('active','converted','abandoned') DEFAULT 'active',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY(customer_id) REFERENCES users(user_id), INDEX idx_cart_customer_status(customer_id,cart_status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cart_items (
 cart_item_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, cart_id BIGINT UNSIGNED NOT NULL,
 schedule_id BIGINT UNSIGNED NOT NULL, unit_id BIGINT UNSIGNED,
 quantity SMALLINT UNSIGNED NOT NULL DEFAULT 1, unit_price DECIMAL(12,2) NOT NULL,
 guest_name VARCHAR(120), guest_phone VARCHAR(25), special_request TEXT,
 item_status ENUM('selected','unselected','removed') DEFAULT 'selected',
 added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(cart_id) REFERENCES carts(cart_id) ON DELETE CASCADE,
 FOREIGN KEY(schedule_id) REFERENCES schedules(schedule_id),
 FOREIGN KEY(unit_id) REFERENCES inventory_units(unit_id) ON DELETE SET NULL,
 CHECK(quantity>0), CHECK(unit_price>=0), INDEX idx_cart_items(cart_id,item_status)
) ENGINE=InnoDB;

-- 6. Unified checkout. One order can contain several category-specific bookings.
CREATE TABLE IF NOT EXISTS orders (
 order_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, order_number VARCHAR(35) NOT NULL UNIQUE,
 customer_id BIGINT UNSIGNED NOT NULL, cart_id BIGINT UNSIGNED,
 subtotal DECIMAL(12,2) NOT NULL, discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
 service_fee DECIMAL(12,2) NOT NULL DEFAULT 0, tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
 grand_total DECIMAL(12,2) NOT NULL, currency CHAR(3) DEFAULT 'BDT',
 order_status ENUM('pending_payment','paid','partially_cancelled','cancelled','completed','refunded') DEFAULT 'pending_payment',
 payment_status ENUM('unpaid','processing','paid','partially_refunded','refunded','failed') DEFAULT 'unpaid',
 customer_note TEXT, placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(customer_id) REFERENCES users(user_id), FOREIGN KEY(cart_id) REFERENCES carts(cart_id) ON DELETE SET NULL,
 CHECK(subtotal>=0 AND discount_amount>=0 AND service_fee>=0 AND tax_amount>=0 AND grand_total>=0),
 INDEX idx_orders_customer_date(customer_id,placed_at), INDEX idx_orders_status(order_status,payment_status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
 order_item_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, order_id BIGINT UNSIGNED NOT NULL,
 service_id BIGINT UNSIGNED NOT NULL, schedule_id BIGINT UNSIGNED NOT NULL, unit_id BIGINT UNSIGNED,
 quantity SMALLINT UNSIGNED NOT NULL DEFAULT 1, unit_price DECIMAL(12,2) NOT NULL,
 line_total DECIMAL(12,2) NOT NULL, item_description VARCHAR(255),
 FOREIGN KEY(order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
 FOREIGN KEY(service_id) REFERENCES services(service_id), FOREIGN KEY(schedule_id) REFERENCES schedules(schedule_id),
 FOREIGN KEY(unit_id) REFERENCES inventory_units(unit_id) ON DELETE SET NULL,
 CHECK(quantity>0 AND unit_price>=0 AND line_total>=0), INDEX idx_order_items_order(order_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bookings (
 booking_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, booking_reference VARCHAR(35) NOT NULL UNIQUE,
 order_item_id BIGINT UNSIGNED NOT NULL UNIQUE, customer_id BIGINT UNSIGNED NOT NULL,
 booking_status ENUM('pending','confirmed','cancelled','completed','no_show','refunded') DEFAULT 'pending',
 booked_for_name VARCHAR(120), booked_for_phone VARCHAR(25), booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 cancellation_reason TEXT, cancelled_at DATETIME,
 FOREIGN KEY(order_item_id) REFERENCES order_items(order_item_id), FOREIGN KEY(customer_id) REFERENCES users(user_id),
 INDEX idx_booking_customer_status(customer_id,booking_status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS booking_resources (
 booking_resource_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, booking_id BIGINT UNSIGNED NOT NULL,
 unit_id BIGINT UNSIGNED NOT NULL,
 FOREIGN KEY(booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
 FOREIGN KEY(unit_id) REFERENCES inventory_units(unit_id), UNIQUE KEY uq_booking_resource(booking_id,unit_id),
 INDEX idx_resource_unit(unit_id)
) ENGINE=InnoDB;

-- 7. Payments and gateway audit trail. Multiple payment attempts per order are allowed.
CREATE TABLE IF NOT EXISTS payments (
 payment_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, order_id BIGINT UNSIGNED NOT NULL,
 payment_reference VARCHAR(45) NOT NULL UNIQUE,
 payment_method ENUM('bkash','nagad','rocket','card','internet_banking','cash','other') NOT NULL,
 amount DECIMAL(12,2) NOT NULL, currency CHAR(3) DEFAULT 'BDT',
 payment_status ENUM('initiated','pending','successful','failed','cancelled','refunded','partially_refunded') DEFAULT 'initiated',
 gateway_name VARCHAR(80), gateway_transaction_id VARCHAR(120), paid_at DATETIME,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(order_id) REFERENCES orders(order_id), CHECK(amount>=0), INDEX idx_payment_order_status(order_id,payment_status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payment_transactions (
 transaction_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, payment_id BIGINT UNSIGNED NOT NULL,
 event_type VARCHAR(60) NOT NULL, gateway_reference VARCHAR(120), response_code VARCHAR(50),
 response_message VARCHAR(255), raw_response JSON, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(payment_id) REFERENCES payments(payment_id) ON DELETE CASCADE,
 INDEX idx_gateway_reference(gateway_reference)
) ENGINE=InnoDB;

-- 8. Promotions, gift reservations, reviews and customer notifications.
CREATE TABLE IF NOT EXISTS coupons (
 coupon_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, coupon_code VARCHAR(35) NOT NULL UNIQUE,
 description VARCHAR(255), discount_type ENUM('fixed','percentage') NOT NULL,
 discount_value DECIMAL(10,2) NOT NULL, minimum_order_amount DECIMAL(12,2) DEFAULT 0,
 maximum_discount DECIMAL(12,2), usage_limit INT UNSIGNED, used_count INT UNSIGNED DEFAULT 0,
 valid_from DATETIME NOT NULL, valid_until DATETIME NOT NULL, is_active BOOLEAN DEFAULT TRUE,
 CHECK(discount_value>=0), INDEX idx_coupon_dates(is_active,valid_from,valid_until)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS gift_details (
 gift_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, order_item_id BIGINT UNSIGNED NOT NULL UNIQUE,
 sender_id BIGINT UNSIGNED NOT NULL, recipient_name VARCHAR(120) NOT NULL,
 recipient_email VARCHAR(150), recipient_phone VARCHAR(25) NOT NULL, gift_message VARCHAR(500),
 gift_token VARCHAR(70) NOT NULL UNIQUE, delivery_method ENUM('sms','email','share_link') DEFAULT 'share_link',
 delivery_status ENUM('pending','sent','delivered','redeemed','cancelled') DEFAULT 'pending',
 scheduled_delivery DATETIME, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(order_item_id) REFERENCES order_items(order_item_id), FOREIGN KEY(sender_id) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reviews (
 review_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, customer_id BIGINT UNSIGNED NOT NULL,
 service_id BIGINT UNSIGNED NOT NULL, booking_id BIGINT UNSIGNED NOT NULL,
 rating TINYINT UNSIGNED NOT NULL, review_title VARCHAR(150), comment TEXT,
 review_status ENUM('published','hidden','reported') DEFAULT 'published', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(customer_id) REFERENCES users(user_id), FOREIGN KEY(service_id) REFERENCES services(service_id),
 FOREIGN KEY(booking_id) REFERENCES bookings(booking_id), UNIQUE KEY uq_customer_booking_review(customer_id,booking_id),
 CHECK(rating BETWEEN 1 AND 5), INDEX idx_reviews_service(service_id,review_status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
 notification_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL,
 notification_title VARCHAR(150) NOT NULL, notification_message TEXT NOT NULL,
 notification_type ENUM('booking','payment','promotion','gift','system') DEFAULT 'system',
 related_booking_id BIGINT UNSIGNED, is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE,
 FOREIGN KEY(related_booking_id) REFERENCES bookings(booking_id) ON DELETE SET NULL,
 INDEX idx_notifications_user(user_id,is_read,created_at)
) ENGINE=InnoDB;



-- ============================================================
-- CHALO DATABASE EXTENSIONS (additive; compatible with existing core tables)
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
 role_id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 role_code VARCHAR(40) NOT NULL UNIQUE, role_name VARCHAR(80) NOT NULL,
 description VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS permissions (
 permission_id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 permission_code VARCHAR(80) NOT NULL UNIQUE, description VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS role_permissions (
 role_id SMALLINT UNSIGNED NOT NULL, permission_id SMALLINT UNSIGNED NOT NULL,
 PRIMARY KEY(role_id,permission_id),
 FOREIGN KEY(role_id) REFERENCES roles(role_id) ON DELETE CASCADE,
 FOREIGN KEY(permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS user_profiles (
 user_id BIGINT UNSIGNED PRIMARY KEY, date_of_birth DATE, gender ENUM('female','male','other','prefer_not_to_say'),
 profile_photo VARCHAR(255), preferred_language VARCHAR(10) DEFAULT 'bn',
 address_line1 VARCHAR(255), address_line2 VARCHAR(255), city VARCHAR(100), district VARCHAR(100), postal_code VARCHAR(20),
 FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS user_contacts (
 contact_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL,
 contact_type ENUM('phone','email','emergency') NOT NULL, contact_value VARCHAR(180) NOT NULL,
 is_primary BOOLEAN NOT NULL DEFAULT FALSE, is_verified BOOLEAN NOT NULL DEFAULT FALSE,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE,
 UNIQUE KEY uq_user_contact(user_id,contact_type,contact_value), INDEX idx_contact_lookup(contact_type,contact_value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Transport operator master records and service-specific route data.
CREATE TABLE IF NOT EXISTS bus_operators (
 bus_operator_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, provider_id BIGINT UNSIGNED NOT NULL UNIQUE,
 operator_code VARCHAR(40) UNIQUE, hotline VARCHAR(25), website VARCHAR(255),
 FOREIGN KEY(provider_id) REFERENCES provider_profiles(provider_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS buses (
 bus_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, bus_operator_id BIGINT UNSIGNED NOT NULL,
 registration_no VARCHAR(40) UNIQUE, bus_name VARCHAR(100), bus_type ENUM('AC','Non-AC','Business','Sleeper','Double Decker','Other') NOT NULL,
 seat_capacity SMALLINT UNSIGNED NOT NULL, amenities JSON, active_status BOOLEAN DEFAULT TRUE,
 FOREIGN KEY(bus_operator_id) REFERENCES bus_operators(bus_operator_id), CHECK(seat_capacity>0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS bus_routes (
 bus_route_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, service_id BIGINT UNSIGNED NOT NULL UNIQUE,
 route_code VARCHAR(50) UNIQUE, distance_km DECIMAL(8,2), estimated_minutes INT UNSIGNED,
 FOREIGN KEY(service_id) REFERENCES services(service_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS bus_route_stops (
 stop_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, bus_route_id BIGINT UNSIGNED NOT NULL,
 location_id BIGINT UNSIGNED NOT NULL, stop_order SMALLINT UNSIGNED NOT NULL,
 arrival_offset_minutes INT UNSIGNED, departure_offset_minutes INT UNSIGNED,
 FOREIGN KEY(bus_route_id) REFERENCES bus_routes(bus_route_id) ON DELETE CASCADE,
 FOREIGN KEY(location_id) REFERENCES locations(location_id), UNIQUE KEY uq_bus_stop_order(bus_route_id,stop_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS bus_schedule_details (
 schedule_id BIGINT UNSIGNED PRIMARY KEY, bus_id BIGINT UNSIGNED NOT NULL, bus_route_id BIGINT UNSIGNED NOT NULL,
 departure_terminal_id BIGINT UNSIGNED NOT NULL, arrival_terminal_id BIGINT UNSIGNED NOT NULL,
 boarding_time DATETIME NOT NULL, dropping_time DATETIME NOT NULL,
 FOREIGN KEY(schedule_id) REFERENCES schedules(schedule_id) ON DELETE CASCADE,
 FOREIGN KEY(bus_id) REFERENCES buses(bus_id), FOREIGN KEY(bus_route_id) REFERENCES bus_routes(bus_route_id),
 FOREIGN KEY(departure_terminal_id) REFERENCES locations(location_id), FOREIGN KEY(arrival_terminal_id) REFERENCES locations(location_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS train_operators (
 train_operator_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, provider_id BIGINT UNSIGNED NOT NULL UNIQUE,
 operator_code VARCHAR(40) UNIQUE, hotline VARCHAR(25),
 FOREIGN KEY(provider_id) REFERENCES provider_profiles(provider_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS train_stations (
 station_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, location_id BIGINT UNSIGNED NOT NULL UNIQUE,
 station_code VARCHAR(30) UNIQUE, station_name_bn VARCHAR(150), station_name_en VARCHAR(150) NOT NULL,
 FOREIGN KEY(location_id) REFERENCES locations(location_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS trains (
 train_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, train_operator_id BIGINT UNSIGNED NOT NULL,
 train_number VARCHAR(30) NOT NULL UNIQUE, train_name VARCHAR(150) NOT NULL,
 train_type ENUM('intercity','commuter','mail','local','other') DEFAULT 'intercity', active_status BOOLEAN DEFAULT TRUE,
 FOREIGN KEY(train_operator_id) REFERENCES train_operators(train_operator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS train_routes (
 train_route_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, service_id BIGINT UNSIGNED NOT NULL UNIQUE,
 train_id BIGINT UNSIGNED NOT NULL, route_code VARCHAR(50) UNIQUE,
 FOREIGN KEY(service_id) REFERENCES services(service_id) ON DELETE CASCADE,
 FOREIGN KEY(train_id) REFERENCES trains(train_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS train_route_stations (
 route_station_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, train_route_id BIGINT UNSIGNED NOT NULL,
 station_id BIGINT UNSIGNED NOT NULL, stop_order SMALLINT UNSIGNED NOT NULL,
 arrival_time TIME, departure_time TIME, day_offset TINYINT UNSIGNED DEFAULT 0,
 FOREIGN KEY(train_route_id) REFERENCES train_routes(train_route_id) ON DELETE CASCADE,
 FOREIGN KEY(station_id) REFERENCES train_stations(station_id), UNIQUE KEY uq_train_stop(train_route_id,stop_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS train_coaches (
 coach_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, train_id BIGINT UNSIGNED NOT NULL,
 coach_code VARCHAR(20) NOT NULL, coach_class VARCHAR(50) NOT NULL, seat_count SMALLINT UNSIGNED NOT NULL,
 FOREIGN KEY(train_id) REFERENCES trains(train_id) ON DELETE CASCADE,
 UNIQUE KEY uq_train_coach(train_id,coach_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS train_schedule_details (
 schedule_id BIGINT UNSIGNED PRIMARY KEY, train_id BIGINT UNSIGNED NOT NULL, train_route_id BIGINT UNSIGNED NOT NULL,
 departure_station_id BIGINT UNSIGNED NOT NULL, arrival_station_id BIGINT UNSIGNED NOT NULL,
 train_number VARCHAR(30) NOT NULL, FOREIGN KEY(schedule_id) REFERENCES schedules(schedule_id) ON DELETE CASCADE,
 FOREIGN KEY(train_id) REFERENCES trains(train_id), FOREIGN KEY(train_route_id) REFERENCES train_routes(train_route_id),
 FOREIGN KEY(departure_station_id) REFERENCES train_stations(station_id), FOREIGN KEY(arrival_station_id) REFERENCES train_stations(station_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS train_seat_classes (
 seat_class_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, train_id BIGINT UNSIGNED NOT NULL,
 class_code VARCHAR(30) NOT NULL, class_name VARCHAR(80) NOT NULL, description VARCHAR(255),
 FOREIGN KEY(train_id) REFERENCES trains(train_id) ON DELETE CASCADE, UNIQUE KEY uq_train_class(train_id,class_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ferry_operators (
 ferry_operator_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, provider_id BIGINT UNSIGNED NOT NULL UNIQUE,
 hotline VARCHAR(25), FOREIGN KEY(provider_id) REFERENCES provider_profiles(provider_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS ferry_vessels (
 vessel_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, ferry_operator_id BIGINT UNSIGNED NOT NULL,
 vessel_name VARCHAR(150) NOT NULL, registration_no VARCHAR(50) UNIQUE,
 vessel_type ENUM('launch','ferry','speedboat','steamer','other') DEFAULT 'launch', passenger_capacity INT UNSIGNED NOT NULL,
 amenities JSON, active_status BOOLEAN DEFAULT TRUE,
 FOREIGN KEY(ferry_operator_id) REFERENCES ferry_operators(ferry_operator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS ferry_routes (
 ferry_route_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, service_id BIGINT UNSIGNED NOT NULL UNIQUE,
 origin_port_id BIGINT UNSIGNED NOT NULL, destination_port_id BIGINT UNSIGNED NOT NULL,
 distance_km DECIMAL(8,2), estimated_minutes INT UNSIGNED,
 FOREIGN KEY(service_id) REFERENCES services(service_id) ON DELETE CASCADE,
 FOREIGN KEY(origin_port_id) REFERENCES locations(location_id), FOREIGN KEY(destination_port_id) REFERENCES locations(location_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS ferry_schedule_details (
 schedule_id BIGINT UNSIGNED PRIMARY KEY, vessel_id BIGINT UNSIGNED NOT NULL, ferry_route_id BIGINT UNSIGNED NOT NULL,
 departure_datetime DATETIME NOT NULL, arrival_datetime DATETIME NOT NULL,
 FOREIGN KEY(schedule_id) REFERENCES schedules(schedule_id) ON DELETE CASCADE,
 FOREIGN KEY(vessel_id) REFERENCES ferry_vessels(vessel_id), FOREIGN KEY(ferry_route_id) REFERENCES ferry_routes(ferry_route_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS ferry_accommodation_types (
 accommodation_type_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, vessel_id BIGINT UNSIGNED NOT NULL,
 type_name VARCHAR(80) NOT NULL, inventory_type ENUM('seat','cabin','deck','suite') NOT NULL,
 capacity_per_unit TINYINT UNSIGNED DEFAULT 1, base_fare DECIMAL(12,2) NOT NULL,
 FOREIGN KEY(vessel_id) REFERENCES ferry_vessels(vessel_id) ON DELETE CASCADE,
 UNIQUE KEY uq_vessel_accommodation(vessel_id,type_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Hotels and room stock; room rates can be date-specific and are snapshots at booking.
CREATE TABLE IF NOT EXISTS hotels (
 hotel_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, service_id BIGINT UNSIGNED NOT NULL UNIQUE,
 star_rating TINYINT UNSIGNED, check_in_time TIME, check_out_time TIME, child_policy VARCHAR(255),
 FOREIGN KEY(service_id) REFERENCES services(service_id) ON DELETE CASCADE, CHECK(star_rating IS NULL OR star_rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS amenities (
 amenity_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, amenity_name VARCHAR(100) NOT NULL UNIQUE,
 amenity_category VARCHAR(60)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS hotel_amenities (
 hotel_id BIGINT UNSIGNED NOT NULL, amenity_id BIGINT UNSIGNED NOT NULL,
 PRIMARY KEY(hotel_id,amenity_id), FOREIGN KEY(hotel_id) REFERENCES hotels(hotel_id) ON DELETE CASCADE,
 FOREIGN KEY(amenity_id) REFERENCES amenities(amenity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS hotel_room_classes (
 room_type_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, hotel_id BIGINT UNSIGNED NOT NULL,
 room_type_name VARCHAR(100) NOT NULL, bed_type VARCHAR(60), max_adults TINYINT UNSIGNED DEFAULT 2,
 max_children TINYINT UNSIGNED DEFAULT 0, total_rooms SMALLINT UNSIGNED NOT NULL,
 base_nightly_rate DECIMAL(12,2) NOT NULL, FOREIGN KEY(hotel_id) REFERENCES hotels(hotel_id) ON DELETE CASCADE,
 UNIQUE KEY uq_hotel_room_type(hotel_id,room_type_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS hotel_room_inventory (
 room_inventory_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, room_type_id BIGINT UNSIGNED NOT NULL,
 room_number VARCHAR(30) NOT NULL, floor_label VARCHAR(20), room_status ENUM('active','maintenance','inactive') DEFAULT 'active',
 FOREIGN KEY(room_type_id) REFERENCES hotel_room_classes(room_type_id) ON DELETE CASCADE,
 UNIQUE KEY uq_room_number(room_type_id,room_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS hotel_room_rates (
 room_rate_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, room_type_id BIGINT UNSIGNED NOT NULL,
 rate_date DATE NOT NULL, nightly_rate DECIMAL(12,2) NOT NULL, available_rooms SMALLINT UNSIGNED NOT NULL,
 rate_status ENUM('open','closed','sold_out') DEFAULT 'open',
 FOREIGN KEY(room_type_id) REFERENCES hotel_room_classes(room_type_id) ON DELETE CASCADE,
 UNIQUE KEY uq_room_rate_date(room_type_id,rate_date), INDEX idx_room_rate_search(rate_date,rate_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Restaurant table inventory and bookable slots.
CREATE TABLE IF NOT EXISTS restaurants (
 restaurant_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, service_id BIGINT UNSIGNED NOT NULL UNIQUE,
 cuisine_type VARCHAR(100), opening_time TIME, closing_time TIME, average_cost_for_two DECIMAL(12,2),
 reservation_policy TEXT, FOREIGN KEY(service_id) REFERENCES services(service_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS restaurant_tables (
 restaurant_table_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, restaurant_id BIGINT UNSIGNED NOT NULL,
 table_code VARCHAR(30) NOT NULL, seating_capacity TINYINT UNSIGNED NOT NULL,
 table_area VARCHAR(60), table_status ENUM('active','maintenance','inactive') DEFAULT 'active',
 FOREIGN KEY(restaurant_id) REFERENCES restaurants(restaurant_id) ON DELETE CASCADE,
 UNIQUE KEY uq_restaurant_table(restaurant_id,table_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS restaurant_slots (
 restaurant_slot_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, restaurant_id BIGINT UNSIGNED NOT NULL,
 schedule_id BIGINT UNSIGNED NOT NULL UNIQUE, slot_label VARCHAR(60), max_party_size TINYINT UNSIGNED NOT NULL,
 reservation_duration_minutes SMALLINT UNSIGNED DEFAULT 90,
 FOREIGN KEY(restaurant_id) REFERENCES restaurants(restaurant_id) ON DELETE CASCADE,
 FOREIGN KEY(schedule_id) REFERENCES schedules(schedule_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cinema, movie, screen, showtime and ticket-class records.
CREATE TABLE IF NOT EXISTS cinemas (
 cinema_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, service_id BIGINT UNSIGNED NOT NULL UNIQUE,
 cinema_name VARCHAR(150) NOT NULL, contact_phone VARCHAR(25),
 FOREIGN KEY(service_id) REFERENCES services(service_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS cinema_screens (
 screen_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, cinema_id BIGINT UNSIGNED NOT NULL,
 screen_name VARCHAR(80) NOT NULL, total_seats SMALLINT UNSIGNED NOT NULL, screen_type VARCHAR(50),
 FOREIGN KEY(cinema_id) REFERENCES cinemas(cinema_id) ON DELETE CASCADE,
 UNIQUE KEY uq_cinema_screen(cinema_id,screen_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS movies (
 movie_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, movie_title VARCHAR(180) NOT NULL,
 genre VARCHAR(100), language VARCHAR(60), duration_minutes SMALLINT UNSIGNED,
 certificate VARCHAR(20), release_date DATE, poster_path VARCHAR(255),
 UNIQUE KEY uq_movie_title_release(movie_title,release_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS cinema_showtimes (
 showtime_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, movie_id BIGINT UNSIGNED NOT NULL,
 cinema_id BIGINT UNSIGNED NOT NULL, screen_id BIGINT UNSIGNED NOT NULL,
 service_id BIGINT UNSIGNED NOT NULL, schedule_id BIGINT UNSIGNED NOT NULL UNIQUE,
 FOREIGN KEY(movie_id) REFERENCES movies(movie_id), FOREIGN KEY(cinema_id) REFERENCES cinemas(cinema_id),
 FOREIGN KEY(screen_id) REFERENCES cinema_screens(screen_id), FOREIGN KEY(service_id) REFERENCES services(service_id),
 FOREIGN KEY(schedule_id) REFERENCES schedules(schedule_id) ON DELETE CASCADE,
 INDEX idx_showtime_movie(movie_id), INDEX idx_showtime_cinema(cinema_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS cinema_ticket_categories (
 ticket_category_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, screen_id BIGINT UNSIGNED NOT NULL,
 category_name VARCHAR(60) NOT NULL, base_price DECIMAL(12,2) NOT NULL,
 FOREIGN KEY(screen_id) REFERENCES cinema_screens(screen_id) ON DELETE CASCADE,
 UNIQUE KEY uq_screen_ticket_category(screen_id,category_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Events includes hall shows, stage performances, concerts and other public events.
CREATE TABLE IF NOT EXISTS event_venues (
 event_venue_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, service_id BIGINT UNSIGNED NOT NULL UNIQUE,
 venue_name VARCHAR(160) NOT NULL, location_id BIGINT UNSIGNED NOT NULL,
 venue_type ENUM('concert_hall','auditorium','stadium','convention_centre','open_air','other') DEFAULT 'other',
 capacity INT UNSIGNED, FOREIGN KEY(service_id) REFERENCES services(service_id) ON DELETE CASCADE,
 FOREIGN KEY(location_id) REFERENCES locations(location_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS events (
 event_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, service_id BIGINT UNSIGNED NOT NULL UNIQUE,
 event_title VARCHAR(180) NOT NULL, event_type ENUM('concert','hall_show','theatre','comedy','festival','sports','other') NOT NULL,
 organizer_provider_id BIGINT UNSIGNED NOT NULL, event_description TEXT, age_limit VARCHAR(30),
 FOREIGN KEY(service_id) REFERENCES services(service_id) ON DELETE CASCADE,
 FOREIGN KEY(organizer_provider_id) REFERENCES provider_profiles(provider_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS event_sessions (
 event_session_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, event_id BIGINT UNSIGNED NOT NULL,
 schedule_id BIGINT UNSIGNED NOT NULL UNIQUE, event_venue_id BIGINT UNSIGNED NOT NULL,
 doors_open_at DATETIME, FOREIGN KEY(event_id) REFERENCES events(event_id) ON DELETE CASCADE,
 FOREIGN KEY(schedule_id) REFERENCES schedules(schedule_id) ON DELETE CASCADE,
 FOREIGN KEY(event_venue_id) REFERENCES event_venues(event_venue_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS event_seating_sections (
 section_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, event_venue_id BIGINT UNSIGNED NOT NULL,
 section_name VARCHAR(80) NOT NULL, section_capacity INT UNSIGNED NOT NULL,
 FOREIGN KEY(event_venue_id) REFERENCES event_venues(event_venue_id) ON DELETE CASCADE,
 UNIQUE KEY uq_venue_section(event_venue_id,section_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS event_ticket_categories (
 event_ticket_category_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, event_id BIGINT UNSIGNED NOT NULL,
 category_name VARCHAR(80) NOT NULL, section_id BIGINT UNSIGNED NULL,
 ticket_price DECIMAL(12,2) NOT NULL, total_quantity INT UNSIGNED NOT NULL, available_quantity INT UNSIGNED NOT NULL,
 FOREIGN KEY(event_id) REFERENCES events(event_id) ON DELETE CASCADE,
 FOREIGN KEY(section_id) REFERENCES event_seating_sections(section_id) ON DELETE SET NULL,
 UNIQUE KEY uq_event_ticket_cat(event_id,category_name), CHECK(available_quantity<=total_quantity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Unified cross-category cart: selected options are typed JSON snapshots, not bookings.
CREATE TABLE IF NOT EXISTS cart_item_details (
 cart_item_id BIGINT UNSIGNED PRIMARY KEY,
 booking_mode ENUM('self','gift') NOT NULL DEFAULT 'self',
 selection_type ENUM('seat','room','table','ticket','cabin','quantity','other') DEFAULT 'other',
 selected_details JSON, booking_for_name VARCHAR(120), booking_for_phone VARCHAR(25),
 booking_for_email VARCHAR(150), requested_start_date DATE, requested_end_date DATE,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(cart_item_id) REFERENCES cart_items(cart_item_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS order_checkout_details (
 order_id BIGINT UNSIGNED PRIMARY KEY, booking_mode ENUM('self','gift') NOT NULL DEFAULT 'self',
 purchaser_name VARCHAR(120) NOT NULL, purchaser_phone VARCHAR(25) NOT NULL,
 purchaser_email VARCHAR(150), checkout_note TEXT,
 FOREIGN KEY(order_id) REFERENCES orders(order_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS booking_participants (
 participant_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, booking_id BIGINT UNSIGNED NOT NULL,
 participant_type ENUM('passenger','guest','attendee','child','other') DEFAULT 'guest',
 full_name VARCHAR(120) NOT NULL, phone VARCHAR(25), email VARCHAR(150), date_of_birth DATE,
 identity_type VARCHAR(40), identity_last4 VARCHAR(8), special_requirements TEXT,
 FOREIGN KEY(booking_id) REFERENCES bookings(booking_id) ON DELETE RESTRICT,
 INDEX idx_booking_participants(booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS booking_inventory_allocations (
 allocation_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, booking_id BIGINT UNSIGNED NOT NULL,
 inventory_unit_id BIGINT UNSIGNED NOT NULL, allocation_status ENUM('held','confirmed','released','cancelled') DEFAULT 'held',
 allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, released_at DATETIME,
 FOREIGN KEY(booking_id) REFERENCES bookings(booking_id) ON DELETE RESTRICT,
 FOREIGN KEY(inventory_unit_id) REFERENCES inventory_units(unit_id) ON DELETE RESTRICT,
 UNIQUE KEY uq_booking_inventory(booking_id,inventory_unit_id), INDEX idx_inventory_allocation(inventory_unit_id,allocation_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Gift is attached to the whole master order at initial checkout; recipient != payer.
CREATE TABLE IF NOT EXISTS gift_orders (
 gift_order_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, order_id BIGINT UNSIGNED NOT NULL UNIQUE,
 purchaser_user_id BIGINT UNSIGNED NOT NULL, recipient_full_name VARCHAR(120) NOT NULL,
 recipient_phone VARCHAR(25) NOT NULL, recipient_email VARCHAR(150), recipient_address TEXT,
 personal_message VARCHAR(1000), gift_status ENUM('pending','scheduled','sent','delivered','redeemed','cancelled','expired') DEFAULT 'pending',
 delivery_method ENUM('sms','email','share_link','manual') DEFAULT 'share_link',
 scheduled_delivery_at DATETIME, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(order_id) REFERENCES orders(order_id) ON DELETE RESTRICT,
 FOREIGN KEY(purchaser_user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
 INDEX idx_gift_recipient_phone(recipient_phone), INDEX idx_gift_status(gift_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS otp_challenges (
 otp_challenge_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, purchaser_user_id BIGINT UNSIGNED NOT NULL,
 order_id BIGINT UNSIGNED NULL, phone_number VARCHAR(25) NOT NULL, otp_hash VARCHAR(255) NOT NULL,
 challenge_purpose ENUM('checkout','login','phone_verification','password_reset') DEFAULT 'checkout',
 expires_at DATETIME NOT NULL, verification_status ENUM('pending','verified','expired','locked','cancelled') DEFAULT 'pending',
 attempt_count TINYINT UNSIGNED NOT NULL DEFAULT 0, max_attempts TINYINT UNSIGNED NOT NULL DEFAULT 5,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, verified_at DATETIME,
 FOREIGN KEY(purchaser_user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
 FOREIGN KEY(order_id) REFERENCES orders(order_id) ON DELETE RESTRICT,
 INDEX idx_otp_user_status(purchaser_user_id,verification_status), INDEX idx_otp_expiry(expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_attempts (
 payment_attempt_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, order_id BIGINT UNSIGNED NOT NULL,
 payment_id BIGINT UNSIGNED NULL, attempt_number SMALLINT UNSIGNED NOT NULL,
 payment_method ENUM('bkash','nagad','rocket','bank','paypal','card','cash','other') NOT NULL,
 amount DECIMAL(12,2) NOT NULL, currency CHAR(3) DEFAULT 'BDT',
 attempt_status ENUM('pending','processing','successful','failed','cancelled','expired') DEFAULT 'pending',
 gateway_reference VARCHAR(150), gateway_transaction_id VARCHAR(150), request_payload JSON, response_payload JSON,
 initiated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, verified_at DATETIME,
 FOREIGN KEY(order_id) REFERENCES orders(order_id) ON DELETE RESTRICT,
 FOREIGN KEY(payment_id) REFERENCES payments(payment_id) ON DELETE SET NULL,
 UNIQUE KEY uq_order_attempt(order_id,attempt_number), INDEX idx_attempt_gateway(gateway_reference,gateway_transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS refunds (
 refund_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, payment_id BIGINT UNSIGNED NOT NULL,
 order_id BIGINT UNSIGNED NOT NULL, booking_id BIGINT UNSIGNED NULL,
 refund_reference VARCHAR(60) NOT NULL UNIQUE, amount DECIMAL(12,2) NOT NULL,
 currency CHAR(3) DEFAULT 'BDT', refund_reason TEXT,
 refund_status ENUM('requested','pending','processing','successful','failed','cancelled') DEFAULT 'requested',
 gateway_refund_reference VARCHAR(150), requested_at DATETIME DEFAULT CURRENT_TIMESTAMP, processed_at DATETIME,
 FOREIGN KEY(payment_id) REFERENCES payments(payment_id) ON DELETE RESTRICT,
 FOREIGN KEY(order_id) REFERENCES orders(order_id) ON DELETE RESTRICT,
 FOREIGN KEY(booking_id) REFERENCES bookings(booking_id) ON DELETE RESTRICT,
 CHECK(amount>0), INDEX idx_refund_order_status(order_id,refund_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS booking_tickets (
 ticket_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, booking_id BIGINT UNSIGNED NOT NULL,
 ticket_reference VARCHAR(60) NOT NULL UNIQUE, qr_verification_token CHAR(64) NOT NULL UNIQUE,
 ticket_type VARCHAR(60), ticket_status ENUM('issued','used','cancelled','expired') DEFAULT 'issued',
 issued_at DATETIME DEFAULT CURRENT_TIMESTAMP, used_at DATETIME,
 FOREIGN KEY(booking_id) REFERENCES bookings(booking_id) ON DELETE RESTRICT,
 INDEX idx_ticket_booking(booking_id,ticket_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS gift_vouchers (
 voucher_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, gift_order_id BIGINT UNSIGNED NOT NULL,
 voucher_code VARCHAR(70) NOT NULL UNIQUE, face_value DECIMAL(12,2), currency CHAR(3) DEFAULT 'BDT',
 expires_at DATETIME, voucher_status ENUM('active','redeemed','expired','cancelled') DEFAULT 'active',
 redeemed_by_user_id BIGINT UNSIGNED NULL, redeemed_at DATETIME,
 FOREIGN KEY(gift_order_id) REFERENCES gift_orders(gift_order_id) ON DELETE RESTRICT,
 FOREIGN KEY(redeemed_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS notification_deliveries (
 delivery_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, notification_id BIGINT UNSIGNED NOT NULL,
 channel ENUM('in_app','sms','email','push') NOT NULL, destination VARCHAR(180),
 delivery_status ENUM('queued','sent','delivered','failed','read') DEFAULT 'queued',
 provider_message_id VARCHAR(150), error_message VARCHAR(255), sent_at DATETIME, delivered_at DATETIME,
 FOREIGN KEY(notification_id) REFERENCES notifications(notification_id) ON DELETE CASCADE,
 INDEX idx_notification_delivery(notification_id,delivery_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS ratings (
 rating_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL,
 service_id BIGINT UNSIGNED NOT NULL, booking_id BIGINT UNSIGNED NOT NULL,
 rating_value TINYINT UNSIGNED NOT NULL, rating_comment VARCHAR(500), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
 FOREIGN KEY(service_id) REFERENCES services(service_id) ON DELETE RESTRICT,
 FOREIGN KEY(booking_id) REFERENCES bookings(booking_id) ON DELETE RESTRICT,
 UNIQUE KEY uq_rating_booking(user_id,booking_id), CHECK(rating_value BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Workflow status extensions preserve legacy ENUM definitions used by the current PHP backend.
CREATE TABLE IF NOT EXISTS order_lifecycle (
 order_id BIGINT UNSIGNED PRIMARY KEY,
 master_order_status ENUM('pending','awaiting_payment','paid','processing','partially_confirmed','confirmed','partially_cancelled','cancelled','refund_pending','refunded','failed') NOT NULL DEFAULT 'pending',
 status_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY(order_id) REFERENCES orders(order_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS booking_lifecycle (
 booking_id BIGINT UNSIGNED PRIMARY KEY,
 individual_booking_status ENUM('pending','temporarily_held','confirmed','failed','cancelled','refund_pending','refunded') NOT NULL DEFAULT 'pending',
 status_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY(booking_id) REFERENCES bookings(booking_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Explicit category-specific status history; never infer order state from one booking.
CREATE TABLE IF NOT EXISTS booking_status_history (
 booking_status_history_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, booking_id BIGINT UNSIGNED NOT NULL,
 old_status VARCHAR(40), new_status VARCHAR(40) NOT NULL, changed_by_user_id BIGINT UNSIGNED NULL,
 change_reason VARCHAR(255), changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(booking_id) REFERENCES bookings(booking_id) ON DELETE RESTRICT,
 FOREIGN KEY(changed_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
 INDEX idx_booking_history(booking_id,changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Legacy-compatible category extension tables retained from supplied project.
-- CHALO CATEGORY EXTENSION (MySQL 8.0+)
-- Import AFTER chalo_database_FIXED.sql.
-- This file is safe to re-import: tables use IF NOT EXISTS and demo rows use upserts.
-- It does NOT drop or recreate core tables or existing customer data.

CREATE TABLE IF NOT EXISTS bus_service_details (
 service_id BIGINT UNSIGNED PRIMARY KEY,
 operator_name VARCHAR(150), bus_type VARCHAR(80), amenities JSON,
 luggage_limit VARCHAR(80), FOREIGN KEY(service_id) REFERENCES services(service_id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS ferry_service_details (
 service_id BIGINT UNSIGNED PRIMARY KEY,
 vessel_name VARCHAR(150), vessel_type VARCHAR(80), amenities JSON,
 vehicle_allowed BOOLEAN DEFAULT FALSE,
 FOREIGN KEY(service_id) REFERENCES services(service_id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS hotel_service_details (
 service_id BIGINT UNSIGNED PRIMARY KEY,
 star_rating TINYINT UNSIGNED, check_in_time TIME, check_out_time TIME, amenities JSON,
 FOREIGN KEY(service_id) REFERENCES services(service_id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS hotel_room_types (
 room_type_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 service_id BIGINT UNSIGNED NOT NULL, room_name VARCHAR(120) NOT NULL,
 bed_type VARCHAR(80), max_guests TINYINT UNSIGNED DEFAULT 2,
 total_rooms SMALLINT UNSIGNED DEFAULT 1, base_price DECIMAL(12,2) NOT NULL,
 FOREIGN KEY(service_id) REFERENCES services(service_id) ON DELETE CASCADE,
 UNIQUE KEY uq_room_service_name(service_id,room_name)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS restaurant_service_details (
 service_id BIGINT UNSIGNED PRIMARY KEY,
 cuisine_type VARCHAR(100), opening_time TIME, closing_time TIME,
 average_cost_for_two DECIMAL(12,2), amenities JSON,
 FOREIGN KEY(service_id) REFERENCES services(service_id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS movie_details (
 movie_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 service_id BIGINT UNSIGNED NOT NULL,
 movie_title VARCHAR(180) NOT NULL, genre VARCHAR(100), language VARCHAR(60),
 duration_minutes SMALLINT UNSIGNED, certificate VARCHAR(20), release_date DATE,
 FOREIGN KEY(service_id) REFERENCES services(service_id) ON DELETE CASCADE,
 INDEX idx_movie_title(movie_title), UNIQUE KEY uq_movie_service_title(service_id,movie_title)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS gift_packages (
 gift_package_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 package_name VARCHAR(180) NOT NULL, gift_category ENUM('honeymoon','birthday','anniversary','travel','dining','hotel_stay','voucher') NOT NULL,
 linked_service_id BIGINT UNSIGNED NULL, description TEXT, price DECIMAL(12,2) NOT NULL,
 validity_days SMALLINT UNSIGNED DEFAULT 365, image_path VARCHAR(255), is_active BOOLEAN DEFAULT TRUE,
 FOREIGN KEY(linked_service_id) REFERENCES services(service_id) ON DELETE SET NULL,
 UNIQUE KEY uq_gift_package_name(package_name)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS gift_redemptions (
 redemption_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 gift_id BIGINT UNSIGNED NOT NULL UNIQUE, redeemed_by BIGINT UNSIGNED NULL,
 redeemed_at DATETIME NULL, redemption_status ENUM('unused','redeemed','expired','cancelled') DEFAULT 'unused',
 FOREIGN KEY(gift_id) REFERENCES gift_details(gift_id) ON DELETE CASCADE,
 FOREIGN KEY(redeemed_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

