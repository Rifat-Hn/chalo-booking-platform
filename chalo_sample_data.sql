-- CHALO DEVELOPMENT SEED DATA (fictional availability; safe to re-run with INSERT IGNORE)
USE chalo_db;
-- All availability and schedules are fictional development examples.
-- Password hashes below are placeholders. Replace with PHP password_hash() output.
-- ============================================================
INSERT IGNORE INTO users(user_id,full_name,email,phone,password_hash,role,status,email_verified_at,phone_verified_at) VALUES
(1,'Rahim Ahmed','rahim@example.com','01710000001','REPLACE_WITH_PASSWORD_HASH','customer','active',NOW(),NOW()),
(2,'Nusrat Jahan','nusrat@example.com','01710000002','REPLACE_WITH_PASSWORD_HASH','customer','active',NOW(),NOW()),
(3,'Tanvir Hasan','tanvir@example.com','01710000003','REPLACE_WITH_PASSWORD_HASH','customer','active',NOW(),NOW()),
(4,'Green Line Admin','greenline@example.com','01710000004','REPLACE_WITH_PASSWORD_HASH','provider','active',NOW(),NOW()),
(5,'Sea Pearl Manager','seapearl@example.com','01710000005','REPLACE_WITH_PASSWORD_HASH','provider','active',NOW(),NOW()),
(6,'Cinema Manager','cinema@example.com','01710000006','REPLACE_WITH_PASSWORD_HASH','provider','active',NOW(),NOW()),
(7,'Chalo Administrator','admin@chalo.demo','01710000007','REPLACE_WITH_PASSWORD_HASH','admin','active',NOW(),NOW()),
(8,'The Courtyard Manager','courtyard@example.com','01710000008','REPLACE_WITH_PASSWORD_HASH','provider','active',NOW(),NOW()),
(9,'Railway Demo Manager','railway@example.com','01710000009','REPLACE_WITH_PASSWORD_HASH','provider','active',NOW(),NOW()),
(10,'Launch Service Manager','launch@example.com','01710000010','REPLACE_WITH_PASSWORD_HASH','provider','active',NOW(),NOW()),
(11,'Eventify Manager','eventify@example.com','01710000011','REPLACE_WITH_PASSWORD_HASH','provider','active',NOW(),NOW());

INSERT IGNORE INTO provider_profiles(provider_id,user_id,business_name,business_type,description,verification_status,average_rating,total_reviews,support_email,support_phone) VALUES
(1,4,'Green Line Paribahan','Bus Operator','Intercity AC and business-class bus service.','verified',4.60,128,'support@greenline.demo','09613000001'),
(2,5,'Sea Pearl Beach Resort','Hotel','Beachfront resort in Cox’s Bazar.','verified',4.70,94,'stay@seapearl.demo','09613000002'),
(3,6,'Star Cineplex Demo','Cinema Operator','Multiplex cinema screenings.','verified',4.50,210,'help@star.demo','09613000003'),
(4,8,'The Courtyard Dhaka','Restaurant','Restaurant table reservations.','verified',4.40,67,'book@courtyard.demo','01710000008'),
(5,9,'Bangladesh Railway Demo','Rail Operator','Intercity rail demo listings.','verified',4.30,180,'railhelp@demo','131'),
(6,10,'Sundarban Launch Service','Ferry Operator','Dhaka to southern Bangladesh launch service.','verified',4.20,51,'support@launch.demo','01710000010'),
(7,11,'Eventify Bangladesh','Event Organizer','Concerts and live entertainment.','pending',0,0,'hello@eventify.demo','01710000011');

INSERT IGNORE INTO categories(category_id,category_name,category_slug,description,icon_path,display_order) VALUES
(1,'Bus','bus','Intercity and local bus tickets.','assets/icons/bus.png',1),
(2,'Train','train','Train journeys and rail tickets.','assets/icons/train.png',2),
(3,'River Ferry','river-ferry','Launch and river ferry reservations.','assets/icons/ferry.png',3),
(4,'Hotel','hotel','Hotels, resorts and accommodation.','assets/icons/hotel.png',4),
(5,'Restaurant','restaurant','Restaurant table reservations.','assets/icons/restaurant.png',5),
(6,'Movies','movies','Cinema tickets and showtimes.','assets/icons/movies.png',6),
(7,'Events','events','Concerts, festivals and live events.','assets/icons/events.png',7);

INSERT IGNORE INTO locations(location_id,city,area,location_name,address,location_type) VALUES
(1,'Dhaka','Motijheel','Kamalapur Railway Station','Kamalapur, Dhaka','station'),
(2,'Dhaka','Gabtoli','Gabtoli Bus Terminal','Gabtoli, Dhaka','terminal'),
(3,'Dhaka','Sayedabad','Sayedabad Bus Terminal','Sayedabad, Dhaka','terminal'),
(4,'Cox’s Bazar','Kolatoli','Cox’s Bazar','Cox’s Bazar town','city'),
(5,'Chattogram','Dampara','Dampara Bus Terminal','Dampara, Chattogram','terminal'),
(6,'Dhaka','Sadarghat','Sadarghat Launch Terminal','Sadarghat, Dhaka','port'),
(7,'Barishal','Nathullabad','Barishal City','Barishal','city'),
(8,'Cox’s Bazar','Inani','Sea Pearl Beach Resort','Inani, Cox’s Bazar','hotel'),
(9,'Dhaka','Dhanmondi','The Courtyard Dhanmondi','Dhanmondi, Dhaka','restaurant'),
(10,'Dhaka','Bashundhara City','Star Cineplex Bashundhara City','Panthapath, Dhaka','cinema'),
(11,'Dhaka','Shahbag','Shahbag Event Grounds','Shahbag, Dhaka','venue'),
(12,'Sylhet','Zindabazar','Sylhet City','Sylhet','city'),
(13,'Dhaka','Uttara','Uttara','Uttara, Dhaka','area'),
(14,'Dhaka','Shahbag','Shahbag','Shahbag, Dhaka','area'),
(15,'Dhaka','Bashundhara','Bashundhara Residential Area','Bashundhara, Dhaka','area'),
(16,'Chattogram','Railway Station','Chattogram Railway Station','Chattogram','station');

INSERT IGNORE INTO services(service_id,provider_id,category_id,service_name,slug,description,location_id,origin_location_id,destination_location_id,address,base_price,service_status,cancellation_policy,average_rating,total_reviews) VALUES
(1,1,1,'Dhaka to Cox’s Bazar AC Bus','dhaka-coxs-bazar-ac','Comfortable AC coach from Dhaka to Cox’s Bazar.',4,2,4,'Gabtoli, Dhaka',1800,'published','Cancellation subject to operator policy.',4.60,128),
(2,1,1,'Dhaka to Chattogram Business Class','dhaka-chattogram-bus','Premium intercity bus service.',5,2,5,'Gabtoli, Dhaka',1200,'published','Cancellation subject to operator policy.',4.50,72),
(3,5,2,'Subarna Express: Dhaka to Chattogram','subarna-express','Intercity train demo service.',16,1,16,'Kamalapur, Dhaka',695,'published','Railway cancellation rules apply.',4.30,180),
(4,5,2,'Parabat Express: Dhaka to Sylhet','parabat-express','Intercity train service to Sylhet.',12,1,12,'Kamalapur, Dhaka',500,'published','Railway cancellation rules apply.',4.20,94),
(5,6,3,'Dhaka to Barishal Overnight Launch','dhaka-barishal-launch','Cabin and deck reservation for overnight journey.',7,6,7,'Sadarghat, Dhaka',800,'published','Cabin cancellation subject to operator rules.',4.20,51),
(6,2,4,'Sea Pearl Beach Resort – Deluxe Room','sea-pearl-deluxe','Deluxe room with breakfast and beach access.',8,NULL,NULL,'Inani, Cox’s Bazar',12500,'published','Free cancellation up to 72 hours before check-in.',4.70,94),
(7,2,4,'Sea Pearl Beach Resort – Ocean Suite','sea-pearl-ocean-suite','Ocean-facing suite for couples and families.',8,NULL,NULL,'Inani, Cox’s Bazar',18500,'published','Free cancellation up to 72 hours before check-in.',4.80,43),
(8,4,5,'The Courtyard – Dhanmondi Dining','courtyard-dhanmondi','Table reservation for casual and family dining.',9,NULL,NULL,'Dhanmondi, Dhaka',0,'published','Arrive within 15 minutes of reservation.',4.40,67),
(9,3,6,'Star Cineplex – Bashundhara City','star-cineplex-bashundhara','Cinema show tickets at Bashundhara City.',10,NULL,NULL,'Panthapath, Dhaka',450,'published','Ticket changes follow cinema policy.',4.50,210),
(10,7,7,'Dhaka Live Music Night','dhaka-live-music-night','Live music event demo listing.',11,NULL,NULL,'Shahbag, Dhaka',1200,'published','Event cancellation policy applies.',0,0);

INSERT IGNORE INTO service_images(service_id,image_path,alt_text,is_primary,display_order) VALUES
(1,'assets/images/bus/greenline.jpg','Green Line AC coach',1,1),
(2,'assets/images/bus/shohagh.jpg','Business class bus',1,1),
(3,'assets/icons/train.png','Intercity train',1,1),
(4,'assets/icons/train.png','Train journey',1,1),
(5,'assets/images/ferry/sundarban.jpg','River launch',1,1),
(6,'assets/images/hotel/seapearl.jpg','Sea Pearl deluxe room',1,1),
(7,'assets/images/hotel/seapearl.jpg','Sea Pearl ocean suite',1,1),
(8,'assets/images/restaurant/courtyard.jpg','Restaurant dining area',1,1),
(9,'assets/images/movies/borbaad.jpg','Cinema hall',1,1),
(10,'assets/images/gifts/travel.jpg','Live music event',1,1);

INSERT IGNORE INTO schedules(schedule_id,service_id,schedule_code,start_datetime,end_datetime,check_in_date,check_out_date,capacity,available_capacity,price,schedule_status,notes) VALUES
(1,1,'GL-DAC-0900','2027-01-10 09:00:00','2027-01-10 18:00:00',NULL,NULL,36,34,1800,'open','AC coach demo schedule'),
(2,1,'GL-DAC-2200','2027-01-10 22:00:00','2027-01-11 07:00:00',NULL,NULL,36,36,1800,'open','Night coach demo schedule'),
(3,2,'GL-DCT-0800','2027-01-11 08:00:00','2027-01-11 15:00:00',NULL,NULL,32,30,1200,'open','Business class demo schedule'),
(4,3,'SUB-0715','2027-01-12 07:15:00','2027-01-12 14:00:00',NULL,NULL,60,55,695,'open','Demo train schedule'),
(5,3,'SUB-1600','2027-01-12 16:00:00','2027-01-12 22:45:00',NULL,NULL,60,60,695,'open','Demo train schedule'),
(6,4,'PAR-0600','2027-01-13 06:00:00','2027-01-13 13:00:00',NULL,NULL,50,48,500,'open','Demo train schedule'),
(7,5,'SB-LAUNCH-2030','2027-01-14 20:30:00','2027-01-15 06:30:00',NULL,NULL,80,72,800,'open','Overnight launch demo'),
(8,6,'SP-DELUXE-JAN10','2027-01-10 14:00:00','2027-01-12 11:00:00','2027-01-10','2027-01-12',20,12,12500,'open','Two-night stay price per room'),
(9,7,'SP-SUITE-JAN10','2027-01-10 14:00:00','2027-01-12 11:00:00','2027-01-10','2027-01-12',8,5,18500,'open','Two-night stay price per suite'),
(10,8,'COURT-1300','2027-01-10 13:00:00','2027-01-10 14:30:00',NULL,NULL,12,8,0,'open','Lunch reservation slot'),
(11,8,'COURT-1930','2027-01-10 19:30:00','2027-01-10 21:00:00',NULL,NULL,12,10,0,'open','Dinner reservation slot'),
(12,9,'SC-1700','2027-01-10 17:00:00','2027-01-10 19:15:00',NULL,NULL,100,63,450,'open','Demo screening'),
(13,9,'SC-2030','2027-01-10 20:30:00','2027-01-10 22:45:00',NULL,NULL,100,78,450,'open','Demo screening'),
(14,10,'EVENT-1800','2027-01-15 18:00:00','2027-01-15 22:00:00',NULL,NULL,300,220,1200,'open','General admission demo event');

INSERT IGNORE INTO inventory_units(schedule_id,unit_code,unit_type,class_or_type,extra_price,unit_status) VALUES
(1,'A1','seat','AC Window',100,'available'),(1,'A2','seat','AC Aisle',0,'available'),(1,'A3','seat','AC Window',100,'booked'),(1,'B1','seat','AC Window',100,'available'),
(2,'A1','seat','AC Window',100,'available'),(2,'A2','seat','AC Aisle',0,'available'),(3,'C1','seat','Business Class',150,'available'),(3,'C2','seat','Business Class',150,'available'),
(4,'SN-01','seat','Shovon',0,'available'),(4,'SN-02','seat','Shovon',0,'available'),(4,'AC-01','seat','AC Chair',450,'available'),(4,'AC-02','seat','AC Chair',450,'booked'),
(5,'SN-01','seat','Shovon',0,'available'),(6,'SN-01','seat','Shovon',0,'available'),(7,'CAB-01','cabin','Single Cabin',900,'available'),(7,'CAB-02','cabin','Double Cabin',1500,'available'),(7,'DECK-01','seat','Deck Seat',0,'available'),
(8,'DLX-101','room','Deluxe',0,'available'),(8,'DLX-102','room','Deluxe',0,'available'),(8,'DLX-103','room','Deluxe',0,'booked'),(9,'OS-201','room','Ocean Suite',0,'available'),(9,'OS-202','room','Ocean Suite',0,'available'),
(10,'TBL-01','table','2 Seats',0,'available'),(10,'TBL-02','table','4 Seats',0,'available'),(10,'TBL-03','table','6 Seats',0,'available'),(11,'TBL-01','table','2 Seats',0,'available'),(11,'TBL-02','table','4 Seats',0,'available'),
(12,'HALL-A01','seat','Standard',0,'available'),(12,'HALL-A02','seat','Standard',0,'available'),(12,'HALL-A03','seat','Premium',150,'available'),(12,'HALL-A04','seat','Premium',150,'available'),(13,'HALL-B01','seat','Standard',0,'available'),(13,'HALL-B02','seat','Premium',150,'available'),(14,'GA-001','ticket','General Admission',0,'available'),(14,'GA-002','ticket','General Admission',0,'available'),(14,'VIP-001','ticket','VIP',1000,'available');

-- Example cart: train + hotel + restaurant together.
INSERT IGNORE INTO carts(cart_id,customer_id,cart_status) VALUES (1,1,'active'),(2,2,'active'),(3,3,'active');
INSERT IGNORE INTO cart_items(cart_item_id,cart_id,schedule_id,unit_id,quantity,unit_price,guest_name,guest_phone,special_request,item_status) VALUES
(1,1,4,9,1,695,'Rahim Ahmed','01710000001','Window seat preferred','selected'),
(2,1,8,18,1,12500,'Rahim Ahmed','01710000001','Non-smoking room','selected'),
(3,1,11,26,1,0,'Rahim Ahmed','01710000001','Window-side table if available','selected'),
(4,2,12,28,2,450,'Nusrat Jahan','01710000002',NULL,'selected'),
(5,3,14,35,1,1200,'Tanvir Hasan','01710000003','Gift for a friend','selected');

INSERT IGNORE INTO orders(order_id,order_number,customer_id,cart_id,subtotal,discount_amount,service_fee,tax_amount,grand_total,order_status,payment_status,customer_note) VALUES
(1,'CHL-2027-000001',1,1,13195,500,100,0,12795,'paid','paid','One checkout for train, hotel and restaurant.'),
(2,'CHL-2027-000002',2,2,900,0,50,0,950,'pending_payment','unpaid','Cinema tickets.'),
(3,'CHL-2027-000003',3,3,1200,0,50,0,1250,'paid','paid','Gift event ticket.');

INSERT IGNORE INTO order_items(order_item_id,order_id,service_id,schedule_id,unit_id,quantity,unit_price,line_total,item_description) VALUES
(1,1,3,4,9,1,695,695,'Subarna Express train ticket'),
(2,1,6,8,18,1,12500,12500,'Sea Pearl Deluxe Room, two nights'),
(3,1,8,11,26,1,0,0,'The Courtyard dinner table reservation'),
(4,2,9,12,28,2,450,900,'Star Cineplex movie tickets'),
(5,3,10,14,35,1,1200,1200,'Dhaka Live Music Night gift ticket');

INSERT IGNORE INTO bookings(booking_id,booking_reference,order_item_id,customer_id,booking_status,booked_for_name,booked_for_phone) VALUES
(1,'CHL-BKG-000001',1,1,'confirmed','Rahim Ahmed','01710000001'),
(2,'CHL-BKG-000002',2,1,'confirmed','Rahim Ahmed','01710000001'),
(3,'CHL-BKG-000003',3,1,'confirmed','Rahim Ahmed','01710000001'),
(4,'CHL-BKG-000004',4,2,'pending','Nusrat Jahan','01710000002'),
(5,'CHL-BKG-000005',5,3,'confirmed','A friend of Tanvir','01710000012');
INSERT IGNORE INTO booking_resources(booking_id,unit_id) VALUES (1,9),(2,18),(3,26),(4,28),(5,35);

INSERT IGNORE INTO payments(payment_id,order_id,payment_reference,payment_method,amount,payment_status,gateway_name,gateway_transaction_id,paid_at) VALUES
(1,1,'PAY-CHL-000001','bkash',12795,'successful','Demo bKash Gateway','BKASH-DEMO-77881','2027-01-05 12:10:00'),
(2,2,'PAY-CHL-000002','nagad',950,'pending','Demo Nagad Gateway',NULL,NULL),
(3,3,'PAY-CHL-000003','card',1250,'successful','Demo Card Gateway','CARD-DEMO-11992','2027-01-06 16:20:00');
INSERT IGNORE INTO payment_transactions(payment_id,event_type,gateway_reference,response_code,response_message,raw_response) VALUES
(1,'payment_success','BKASH-DEMO-77881','0000','Demo payment completed','{"demo":true,"status":"success"}'),
(2,'payment_initiated','NAGAD-DEMO-INIT','PENDING','Waiting for payment confirmation','{"demo":true,"status":"pending"}'),
(3,'payment_success','CARD-DEMO-11992','0000','Demo card payment completed','{"demo":true,"status":"success"}');

INSERT IGNORE INTO coupons(coupon_id,coupon_code,description,discount_type,discount_value,minimum_order_amount,maximum_discount,usage_limit,used_count,valid_from,valid_until,is_active) VALUES
(1,'CHALO10','10 percent off eligible bookings','percentage',10,1000,500,1000,12,'2026-01-01 00:00:00','2027-12-31 23:59:59',1),
(2,'WELCOME200','First booking discount','fixed',200,1500,200,500,38,'2026-01-01 00:00:00','2027-06-30 23:59:59',1),
(3,'TRAVEL15','Travel category promotion','percentage',15,3000,700,300,21,'2026-06-01 00:00:00','2027-03-31 23:59:59',1);
INSERT IGNORE INTO gift_details(order_item_id,sender_id,recipient_name,recipient_email,recipient_phone,gift_message,gift_token,delivery_method,delivery_status,scheduled_delivery) VALUES
(5,3,'Sadia Karim','sadia@example.com','01710000012','Hope you enjoy the music night!','CHALO-GIFT-7F9K2P','share_link','sent','2027-01-12 10:00:00');
INSERT IGNORE INTO reviews(customer_id,service_id,booking_id,rating,review_title,comment,review_status) VALUES
(1,3,1,5,'Smooth journey','Clean service and helpful staff. Demo review.','published'),
(1,6,2,5,'Beautiful resort','Great view and comfortable room. Demo review.','published'),
(1,8,3,4,'Good dining','Food and service were good. Demo review.','published');
INSERT IGNORE INTO notifications(user_id,notification_title,notification_message,notification_type,related_booking_id,is_read) VALUES
(1,'Train booking confirmed','Your Subarna Express booking CHL-BKG-000001 is confirmed.','booking',1,0),
(1,'Hotel booking confirmed','Your Sea Pearl reservation is confirmed.','booking',2,0),
(1,'Payment successful','Your Chalo order payment was successful.','payment',NULL,1),
(2,'Complete your payment','Your cinema order is waiting for payment.','payment',4,0),
(3,'Your gift is on its way','Your event gift link has been sent.','gift',5,0);


-- Core category metadata and user role mapping.
INSERT IGNORE INTO categories(category_id,category_name,category_slug,description,icon_path,display_order) VALUES
(8,'Hall Shows','hall-shows','Theatre, stage performances and auditorium shows.','assets/icons/events.png',8);
INSERT IGNORE INTO users(user_id,full_name,email,phone,password_hash,role,status) VALUES
(12,'Hanif Demo Operator','hanif@example.test','01710000012','!DEMO_HASH_NOT_LOGINABLE!','provider','active'),
(13,'Shohagh Demo Operator','shohagh@example.test','01710000013','!DEMO_HASH_NOT_LOGINABLE!','provider','active'),
(14,'Ena Demo Operator','ena@example.test','01710000014','!DEMO_HASH_NOT_LOGINABLE!','provider','active'),
(15,'Green Line Waterways Manager','waterways@example.test','01710000015','!DEMO_HASH_NOT_LOGINABLE!','provider','active'),
(16,'MV Tipu Manager','tipu@example.test','01710000016','!DEMO_HASH_NOT_LOGINABLE!','provider','active'),
(17,'InterContinental Manager','intercontinental@example.test','01710000017','!DEMO_HASH_NOT_LOGINABLE!','provider','active'),
(18,'Sylhet Garden Manager','sylhetgarden@example.test','01710000018','!DEMO_HASH_NOT_LOGINABLE!','provider','active'),
(19,'Kacchi Bhai Manager','kacchi@example.test','01710000019','!DEMO_HASH_NOT_LOGINABLE!','provider','active'),
(20,'Bella Italia Manager','bella@example.test','01710000020','!DEMO_HASH_NOT_LOGINABLE!','provider','active'),
(21,'Cinema Demo Operator','cinema2@example.test','01710000021','!DEMO_HASH_NOT_LOGINABLE!','provider','active'),
(22,'Hall Show Organizer','hallshow@example.test','01710000022','!DEMO_HASH_NOT_LOGINABLE!','provider','active');
INSERT IGNORE INTO provider_profiles(provider_id,user_id,business_name,business_type,description,verification_status,support_email,support_phone) VALUES
(8,12,'Hanif Enterprise','Bus Operator','Illustrative demo operator. Not a live integration.','verified','demo@hanif.test','01710000012'),
(9,13,'Shohagh Paribahan','Bus Operator','Illustrative demo operator. Not a live integration.','verified','demo@shohagh.test','01710000013'),
(10,14,'Ena Transport','Bus Operator','Illustrative demo operator. Not a live integration.','verified','demo@ena.test','01710000014'),
(11,15,'Green Line Waterways','Ferry Operator','Illustrative demo operator. Not a live integration.','verified','demo@waterways.test','01710000015'),
(12,16,'MV Tipu River Service','Ferry Operator','Illustrative demo operator. Not a live integration.','verified','demo@tipu.test','01710000016'),
(13,17,'InterContinental Dhaka','Hotel','Illustrative hotel listing.','verified','demo@intercontinental.test','01710000017'),
(14,18,'Sylhet Garden Resort','Hotel','Illustrative hotel listing.','verified','demo@sylhetgarden.test','01710000018'),
(15,19,'Kacchi Bhai','Restaurant','Illustrative restaurant listing.','verified','demo@kacchi.test','01710000019'),
(16,20,'Bella Italia','Restaurant','Illustrative restaurant listing.','verified','demo@bella.test','01710000020'),
(17,21,'Demo Cinema Network','Cinema Operator','Illustrative cinema listing.','verified','demo@cinema2.test','01710000021'),
(18,22,'Chalo Hall Shows','Event Organizer','Illustrative hall performance organizer.','verified','demo@hallshow.test','01710000022');
INSERT IGNORE INTO locations(location_id,city,area,location_name,address,location_type) VALUES
(17,'Dhaka','Mohakhali','Mohakhali Bus Terminal','Mohakhali, Dhaka','terminal'),
(18,'Dhaka','Kamalapur','Kamalapur Railway Station','Kamalapur, Dhaka','station'),
(19,'Dhaka','Gulshan','InterContinental Dhaka','1 Minto Road, Dhaka','hotel'),
(20,'Sylhet','Airport Road','Sylhet Garden Resort','Airport Road, Sylhet','hotel'),
(21,'Dhaka','Gulshan','Bella Italia Gulshan','Gulshan, Dhaka','restaurant'),
(22,'Dhaka','Dhanmondi','Kacchi Bhai Dhanmondi','Dhanmondi, Dhaka','restaurant'),
(23,'Dhaka','Bashundhara City','Star Cineplex Screen 2','Panthapath, Dhaka','cinema'),
(24,'Dhaka','Jamuna Future Park','Blockbuster Cinemas','Kuril, Dhaka','cinema'),
(25,'Dhaka','Shahbag','Bangladesh Shilpakala Academy','Segunbagicha, Dhaka','venue'),
(26,'Dhaka','Agargaon','Bangladesh-China Friendship Conference Center','Agargaon, Dhaka','venue'),
(27,'Barishal','Launch Ghat','Barishal Launch Terminal','Barishal','port'),
(28,'Bhola','Ilisha','Ilisha Ferry Terminal','Bhola','port');
INSERT IGNORE INTO services(service_id,provider_id,category_id,service_name,slug,description,location_id,origin_location_id,destination_location_id,address,base_price,service_status,cancellation_policy,average_rating,total_reviews) VALUES
(11,8,1,'Hanif Enterprise: Dhaka to Cox’s Bazar','hanif-dhaka-coxs-bazar','Demo intercity AC coach listing.',4,3,4,'Sayedabad, Dhaka',1600,'published','Illustrative cancellation policy.',4.30,30),
(12,9,1,'Shohagh Paribahan: Dhaka to Chattogram','shohagh-dhaka-chattogram','Demo premium coach listing.',5,2,5,'Gabtoli, Dhaka',1400,'published','Illustrative cancellation policy.',4.40,25),
(13,11,3,'Green Line Waterways: Dhaka to Barishal','greenline-waterways-dhaka-barishal','Demo passenger vessel route.',7,6,7,'Sadarghat, Dhaka',950,'published','Illustrative cancellation policy.',4.30,20),
(14,12,3,'MV Tipu: Dhaka to Bhola','mv-tipu-dhaka-bhola','Demo ferry route and cabin inventory.',28,6,28,'Sadarghat, Dhaka',700,'published','Illustrative cancellation policy.',4.10,15),
(15,13,4,'InterContinental Dhaka – Deluxe Room','intercontinental-dhaka-deluxe','Demo hotel listing with room inventory.',19,NULL,NULL,'Minto Road, Dhaka',18000,'published','Illustrative hotel cancellation policy.',4.70,40),
(16,14,4,'Sylhet Garden Resort – Garden View','sylhet-garden-resort','Demo resort listing with room inventory.',20,NULL,NULL,'Airport Road, Sylhet',6500,'published','Illustrative hotel cancellation policy.',4.40,22),
(17,15,5,'Kacchi Bhai – Dhanmondi','kacchi-bhai-dhanmondi','Demo restaurant table reservation.',22,NULL,NULL,'Dhanmondi, Dhaka',0,'published','Arrive within 15 minutes.',4.50,45),
(18,16,5,'Bella Italia – Gulshan','bella-italia-gulshan','Demo Italian restaurant reservation.',21,NULL,NULL,'Gulshan, Dhaka',0,'published','Arrive within 15 minutes.',4.60,33),
(19,3,6,'Borbaad – Star Cineplex','borbaad-star-cineplex','Demo movie screening listing.',10,NULL,NULL,'Bashundhara City, Dhaka',450,'published','Illustrative cinema policy.',4.30,12),
(20,17,6,'A Minecraft Movie – Blockbuster','minecraft-blockbuster','Demo family movie screening.',24,NULL,NULL,'Jamuna Future Park, Dhaka',500,'published','Illustrative cinema policy.',4.20,10),
(21,17,6,'The Last Journey – Star Cineplex','last-journey-star-cineplex','Demo movie screening listing.',23,NULL,NULL,'Bashundhara City, Dhaka',400,'published','Illustrative cinema policy.',4.00,8),
(22,7,7,'Dhaka Live Music Night – Shahbag','dhaka-live-music-night-shahbag','Demo concert ticket listing.',11,NULL,NULL,'Shahbag, Dhaka',1200,'published','Illustrative event policy.',4.20,9),
(23,7,7,'Dhaka Cultural Festival','dhaka-cultural-festival','Demo multi-performer event listing.',26,NULL,NULL,'Agargaon, Dhaka',800,'published','Illustrative event policy.',4.10,7),
(24,18,8,'Theatre Evening – Shilpakala Academy','theatre-evening-shilpakala','Demo hall show listing.',25,NULL,NULL,'Segunbagicha, Dhaka',600,'published','Illustrative hall show policy.',4.50,11),
(25,18,8,'Comedy Night – Convention Centre','comedy-night-convention-centre','Demo indoor performance listing.',26,NULL,NULL,'Agargaon, Dhaka',900,'published','Illustrative hall show policy.',4.30,6);
INSERT IGNORE INTO users(user_id,full_name,email,phone,password_hash,role,status) VALUES
(23,'Ena Demo Operator','ena.transport@example.test','01710000023','!DEMO_HASH_NOT_LOGINABLE!','provider','active');
INSERT IGNORE INTO provider_profiles(provider_id,user_id,business_name,business_type,description,verification_status,support_email,support_phone) VALUES
(19,23,'Ena Transport','Bus Operator','Illustrative demo operator. Not a live integration.','verified','demo@ena-transport.test','01710000023');
INSERT IGNORE INTO services(service_id,provider_id,category_id,service_name,slug,description,location_id,origin_location_id,destination_location_id,address,base_price,service_status,cancellation_policy,average_rating,total_reviews) VALUES
(26,19,1,'Ena Transport: Dhaka to Cox’s Bazar','ena-dhaka-coxs-bazar','Demo intercity AC bus listing.',4,17,4,'Mohakhali, Dhaka',1500,'published','Illustrative cancellation policy.',4.20,18);
INSERT IGNORE INTO service_images(service_id,image_path,alt_text,is_primary,display_order) VALUES
(26,'assets/images/bus/hero.jpg','Ena Transport demo bus',1,1);
INSERT IGNORE INTO schedules(schedule_id,service_id,schedule_code,start_datetime,end_datetime,capacity,available_capacity,price,schedule_status,notes) VALUES
(30,26,'ENA-2130','2027-01-19 21:30:00','2027-01-20 06:30:00',40,36,1500,'open','Fictional demo schedule');
INSERT IGNORE INTO bus_operators(bus_operator_id,provider_id,operator_code,hotline) VALUES (4,19,'ENA','01710000023');
INSERT IGNORE INTO buses(bus_id,bus_operator_id,registration_no,bus_name,bus_type,seat_capacity,amenities) VALUES
(5,4,'DEMO-ENA-001','Ena AC Coach','AC',40,JSON_ARRAY('AC','Charging'));
INSERT IGNORE INTO bus_routes(bus_route_id,service_id,route_code,distance_km,estimated_minutes) VALUES (5,26,'DHK-COX-ENA',390,540);
INSERT IGNORE INTO bus_schedule_details(schedule_id,bus_id,bus_route_id,departure_terminal_id,arrival_terminal_id,boarding_time,dropping_time) VALUES
(30,5,5,17,4,'2027-01-19 21:30:00','2027-01-20 06:30:00');
INSERT IGNORE INTO inventory_units(schedule_id,unit_code,unit_type,class_or_type,extra_price,unit_status) VALUES
(30,'ENA-A1','seat','AC Window',100,'available'),(30,'ENA-A2','seat','AC Aisle',0,'available');

INSERT IGNORE INTO service_images(service_id,image_path,alt_text,is_primary,display_order) VALUES
(11,'assets/images/bus/hanif.jpg','Hanif Enterprise bus',1,1),(12,'assets/images/bus/shohagh.jpg','Shohagh Paribahan bus',1,1),
(13,'assets/images/ferry/greenline-waterways.jpg','Green Line Waterways vessel',1,1),(14,'assets/images/ferry/tipu.jpg','MV Tipu vessel',1,1),
(15,'assets/images/hotel/intercontinental.jpg','InterContinental Dhaka',1,1),(16,'assets/images/hotel/sylhet.jpg','Sylhet Garden Resort',1,1),
(17,'assets/images/restaurant/kacchi.jpg','Kacchi Bhai restaurant',1,1),(18,'assets/images/restaurant/bella-italia.jpg','Bella Italia restaurant',1,1),
(19,'assets/images/movies/borbaad.jpg','Borbaad movie poster',1,1),(20,'assets/images/movies/minecraft.jpg','A Minecraft Movie poster',1,1),
(21,'assets/images/movies/last-journey.jpg','The Last Journey poster',1,1);
INSERT IGNORE INTO schedules(schedule_id,service_id,schedule_code,start_datetime,end_datetime,check_in_date,check_out_date,capacity,available_capacity,price,schedule_status,notes) VALUES
(15,11,'HANIF-0900','2027-01-16 09:00:00','2027-01-16 18:00:00',NULL,NULL,40,38,1600,'open','Fictional demo schedule'),
(16,12,'SHOHAGH-2200','2027-01-16 22:00:00','2027-01-17 06:00:00',NULL,NULL,36,35,1400,'open','Fictional demo schedule'),
(17,13,'GLW-2030','2027-01-17 20:30:00','2027-01-18 06:30:00',NULL,NULL,100,88,950,'open','Fictional demo schedule'),
(18,14,'TIPU-2100','2027-01-17 21:00:00','2027-01-18 05:30:00',NULL,NULL,120,105,700,'open','Fictional demo schedule'),
(19,15,'IC-DELUXE-0118','2027-01-18 14:00:00','2027-01-20 12:00:00','2027-01-18','2027-01-20',30,24,18000,'open','Two-night illustrative stay'),
(20,16,'SYL-GARDEN-0118','2027-01-18 14:00:00','2027-01-20 11:00:00','2027-01-18','2027-01-20',18,14,6500,'open','Two-night illustrative stay'),
(21,17,'KACCHI-2000','2027-01-18 20:00:00','2027-01-18 21:30:00',NULL,NULL,18,12,0,'open','Dinner slot'),
(22,18,'BELLA-1930','2027-01-18 19:30:00','2027-01-18 21:00:00',NULL,NULL,14,10,0,'open','Dinner slot'),
(23,19,'BORBAAD-1800','2027-01-18 18:00:00','2027-01-18 20:15:00',NULL,NULL,120,70,450,'open','Fictional screening'),
(24,20,'MINECRAFT-1500','2027-01-18 15:00:00','2027-01-18 17:00:00',NULL,NULL,140,90,500,'open','Fictional screening'),
(25,21,'LASTJOURNEY-2100','2027-01-18 21:00:00','2027-01-18 23:00:00',NULL,NULL,100,65,400,'open','Fictional screening'),
(26,22,'LIVE-MUSIC-1900','2027-01-20 19:00:00','2027-01-20 22:30:00',NULL,NULL,500,360,1200,'open','Fictional event'),
(27,23,'CULTURAL-FEST-1700','2027-01-21 17:00:00','2027-01-21 22:00:00',NULL,NULL,700,500,800,'open','Fictional event'),
(28,24,'THEATRE-1830','2027-01-22 18:30:00','2027-01-22 21:00:00',NULL,NULL,300,240,600,'open','Fictional hall show'),
(29,25,'COMEDY-2000','2027-01-23 20:00:00','2027-01-23 22:00:00',NULL,NULL,400,300,900,'open','Fictional hall show');
INSERT IGNORE INTO inventory_units(schedule_id,unit_code,unit_type,class_or_type,extra_price,unit_status) VALUES
(15,'H1','seat','AC Window',100,'available'),(15,'H2','seat','AC Aisle',0,'available'),(16,'S1','seat','Business',100,'available'),
(17,'CAB-01','cabin','Double Cabin',1400,'available'),(17,'DECK-01','seat','Deck Seat',0,'available'),(18,'TIPU-C1','cabin','Family Cabin',1200,'available'),
(21,'KAC-T1','table','2 Guests',0,'available'),(21,'KAC-T2','table','4 Guests',0,'available'),
(22,'BEL-T1','table','2 Guests',0,'available'),(22,'BEL-T2','table','4 Guests',0,'available'),
(23,'BOR-A1','seat','Standard',0,'available'),(23,'BOR-A2','seat','Premium',150,'available'),
(24,'MC-A1','seat','Standard',0,'available'),(24,'MC-A2','seat','Premium',150,'available'),
(25,'LJ-A1','seat','Standard',0,'available'),(25,'LJ-A2','seat','Premium',100,'available'),
(26,'LIVE-GA1','ticket','General',0,'available'),(26,'LIVE-VIP1','ticket','VIP',1000,'available'),
(27,'FEST-GA1','ticket','General',0,'available'),(27,'FEST-VIP1','ticket','VIP',700,'available'),
(28,'TH-A1','seat','Standard',0,'available'),(28,'TH-A2','seat','Premium',200,'available'),
(29,'COM-GA1','ticket','General',0,'available'),(29,'COM-VIP1','ticket','VIP',500,'available');

-- Role and permission seed.
INSERT IGNORE INTO roles(role_id,role_code,role_name,description) VALUES
(1,'customer','Customer','Books services and manages own orders.'),(2,'provider','Service Provider','Manages own listings and bookings.'),(3,'admin','Administrator','Platform administration.');
INSERT IGNORE INTO permissions(permission_id,permission_code,description) VALUES
(1,'booking.create','Create bookings'),(2,'booking.manage_own','Manage own provider bookings'),(3,'listing.manage_own','Manage own listings'),(4,'platform.admin','Full platform administration');
INSERT IGNORE INTO role_permissions(role_id,permission_id) VALUES (1,1),(2,2),(2,3),(3,1),(3,2),(3,3),(3,4);

-- Category-specific operator, route and inventory mappings.
INSERT IGNORE INTO bus_operators(bus_operator_id,provider_id,operator_code,hotline) VALUES
(1,1,'GREENLINE','09613000001'),(2,8,'HANIF','01710000012'),(3,9,'SHOHAGH','01710000013');
INSERT IGNORE INTO buses(bus_id,bus_operator_id,registration_no,bus_name,bus_type,seat_capacity,amenities) VALUES
(1,1,'DEMO-GR-001','Green Line AC Coach','AC',36,JSON_ARRAY('AC','WiFi','Charging')),
(2,1,'DEMO-GR-002','Green Line Business Coach','Business',32,JSON_ARRAY('AC','Reclining Seat')),
(3,2,'DEMO-HN-001','Hanif AC Coach','AC',40,JSON_ARRAY('AC','Charging')),
(4,3,'DEMO-SH-001','Shohagh Premium Coach','Business',36,JSON_ARRAY('AC','WiFi'));
INSERT IGNORE INTO bus_routes(bus_route_id,service_id,route_code,distance_km,estimated_minutes) VALUES
(1,1,'DHK-COX-01',390,540),(2,2,'DHK-CTG-01',265,420),(3,11,'DHK-COX-02',390,540),(4,12,'DHK-CTG-02',265,420);
INSERT IGNORE INTO bus_schedule_details(schedule_id,bus_id,bus_route_id,departure_terminal_id,arrival_terminal_id,boarding_time,dropping_time) VALUES
(1,1,1,2,4,'2027-01-10 09:00:00','2027-01-10 18:00:00'),(2,1,1,2,4,'2027-01-10 22:00:00','2027-01-11 07:00:00'),
(3,2,2,2,5,'2027-01-11 08:00:00','2027-01-11 15:00:00'),(15,3,3,3,4,'2027-01-16 09:00:00','2027-01-16 18:00:00'),
(16,4,4,2,5,'2027-01-16 22:00:00','2027-01-17 06:00:00');

INSERT IGNORE INTO train_operators(train_operator_id,provider_id,operator_code,hotline) VALUES (1,5,'BR-DEMO','131');
INSERT IGNORE INTO train_stations(station_id,location_id,station_code,station_name_en) VALUES
(1,1,'DHK-KAM','Kamalapur Railway Station'),(2,16,'CTG-RS','Chattogram Railway Station'),(3,12,'SYL-RS','Sylhet Railway Station');
INSERT IGNORE INTO trains(train_id,train_operator_id,train_number,train_name,train_type) VALUES
(1,1,'702','Subarna Express','intercity'),(2,1,'709','Parabat Express','intercity');
INSERT IGNORE INTO train_routes(train_route_id,service_id,train_id,route_code) VALUES (1,3,1,'DHK-CTG-TRAIN'),(2,4,2,'DHK-SYL-TRAIN');
INSERT IGNORE INTO train_route_stations(train_route_id,station_id,stop_order,departure_time) VALUES
(1,1,1,'07:15:00'),(1,2,2,'14:00:00'),(2,1,1,'06:00:00'),(2,3,2,'13:00:00');
INSERT IGNORE INTO train_coaches(coach_id,train_id,coach_code,coach_class,seat_count) VALUES
(1,1,'KA','Shovon Chair',60),(2,1,'GA','Snigdha',40),(3,2,'KA','Shovon Chair',50),(4,2,'GA','AC Seat',30);
INSERT IGNORE INTO train_seat_classes(train_id,class_code,class_name) VALUES
(1,'SHOVON','Shovon Chair'),(1,'SNIGDHA','Snigdha'),(1,'AC','AC Seat'),(2,'SHOVON','Shovon Chair'),(2,'AC','AC Seat');
INSERT IGNORE INTO train_schedule_details(schedule_id,train_id,train_route_id,departure_station_id,arrival_station_id,train_number) VALUES
(4,1,1,1,2,'702'),(5,1,1,1,2,'702'),(6,2,2,1,3,'709');

INSERT IGNORE INTO ferry_operators(ferry_operator_id,provider_id,hotline) VALUES (1,6,'01710000010'),(2,11,'01710000015'),(3,12,'01710000016');
INSERT IGNORE INTO ferry_vessels(vessel_id,ferry_operator_id,vessel_name,registration_no,vessel_type,passenger_capacity,amenities) VALUES
(1,1,'Sundarban Launch','DEMO-FR-001','launch',80,JSON_ARRAY('Cabin','Dining')),
(2,2,'Green Line Waterways','DEMO-FR-002','ferry',100,JSON_ARRAY('AC','Deck')),
(3,3,'MV Tipu','DEMO-FR-003','launch',120,JSON_ARRAY('Cabin','Deck Seat'));
INSERT IGNORE INTO ferry_routes(ferry_route_id,service_id,origin_port_id,destination_port_id,distance_km,estimated_minutes) VALUES
(1,5,6,7,170,600),(2,13,6,7,170,600),(3,14,6,28,110,510);
INSERT IGNORE INTO ferry_schedule_details(schedule_id,vessel_id,ferry_route_id,departure_datetime,arrival_datetime) VALUES
(7,1,1,'2027-01-14 20:30:00','2027-01-15 06:30:00'),(17,2,2,'2027-01-17 20:30:00','2027-01-18 06:30:00'),(18,3,3,'2027-01-17 21:00:00','2027-01-18 05:30:00');
INSERT IGNORE INTO ferry_accommodation_types(vessel_id,type_name,inventory_type,capacity_per_unit,base_fare) VALUES
(1,'Single Cabin','cabin',1,1700),(1,'Deck Seat','deck',1,800),(2,'AC Seat','seat',1,950),(3,'Family Cabin','cabin',4,4800);

INSERT IGNORE INTO hotels(hotel_id,service_id,star_rating,check_in_time,check_out_time,child_policy) VALUES
(1,6,5,'14:00:00','11:00:00','Children policy subject to property terms.'),
(2,7,5,'14:00:00','11:00:00','Children policy subject to property terms.'),
(3,15,5,'14:00:00','12:00:00','Children policy subject to property terms.'),
(4,16,4,'14:00:00','11:00:00','Children policy subject to property terms.');
INSERT IGNORE INTO amenities(amenity_id,amenity_name,amenity_category) VALUES
(1,'Wi-Fi','connectivity'),(2,'Breakfast','dining'),(3,'Swimming Pool','recreation'),(4,'Air Conditioning','room'),(5,'Beach Access','recreation'),(6,'Parking','facility');
INSERT IGNORE INTO hotel_amenities(hotel_id,amenity_id) VALUES (1,1),(1,2),(1,3),(1,5),(2,1),(2,2),(3,1),(3,2),(3,4),(4,1),(4,6);
INSERT IGNORE INTO hotel_room_classes(room_type_id,hotel_id,room_type_name,bed_type,max_adults,max_children,total_rooms,base_nightly_rate) VALUES
(1,1,'Deluxe Room','King',2,1,20,12500),(2,2,'Ocean Suite','King',3,1,8,18500),
(3,3,'Deluxe King','King',2,1,30,18000),(4,4,'Garden View','Twin',2,1,18,6500);
INSERT IGNORE INTO hotel_room_inventory(room_type_id,room_number,floor_label) VALUES
(1,'DLX-101','1'),(1,'DLX-102','1'),(2,'OS-201','2'),(3,'IC-501','5'),(4,'SG-201','2');
INSERT IGNORE INTO hotel_room_rates(room_type_id,rate_date,nightly_rate,available_rooms,rate_status) VALUES
(1,'2027-01-18',12500,18,'open'),(1,'2027-01-19',12500,18,'open'),(2,'2027-01-18',18500,7,'open'),
(3,'2027-01-18',18000,24,'open'),(3,'2027-01-19',18000,24,'open'),(4,'2027-01-18',6500,14,'open'),(4,'2027-01-19',6500,14,'open');

INSERT IGNORE INTO restaurants(restaurant_id,service_id,cuisine_type,opening_time,closing_time,average_cost_for_two,reservation_policy) VALUES
(1,8,'Continental','12:00:00','23:00:00',1800,'Illustrative demo policy.'),
(2,17,'Bangladeshi','11:00:00','23:00:00',1500,'Illustrative demo policy.'),
(3,18,'Italian','12:00:00','23:00:00',2500,'Illustrative demo policy.');
INSERT IGNORE INTO restaurant_tables(restaurant_id,table_code,seating_capacity,table_area) VALUES
(1,'C-2',2,'Window'),(1,'C-4',4,'Main'),(2,'K-2',2,'Main'),(2,'K-4',4,'Family'),(3,'B-2',2,'Window'),(3,'B-4',4,'Main');
INSERT IGNORE INTO restaurant_slots(restaurant_id,schedule_id,slot_label,max_party_size,reservation_duration_minutes) VALUES
(1,10,'Lunch 1 PM',6,90),(1,11,'Dinner 7:30 PM',6,90),(2,21,'Dinner 8 PM',8,90),(3,22,'Dinner 7:30 PM',6,90);

INSERT IGNORE INTO cinemas(cinema_id,service_id,cinema_name,contact_phone) VALUES
(1,9,'Star Cineplex Bashundhara City','09613000000'),(2,20,'Blockbuster Cinemas Jamuna Future Park','09613000001');
INSERT IGNORE INTO cinema_screens(screen_id,cinema_id,screen_name,total_seats,screen_type) VALUES
(1,1,'Screen 1',100,'Standard'),(2,2,'Screen 2',140,'Standard');
INSERT IGNORE INTO movies(movie_id,movie_title,genre,language,duration_minutes,certificate,release_date,poster_path) VALUES
(1,'Demo Screening','Drama','Bangla',135,'PG-13','2026-10-01','assets/images/movies/borbaad.jpg'),
(2,'Borbaad','Drama','Bangla',130,'PG-13','2026-10-01','assets/images/movies/borbaad.jpg'),
(3,'A Minecraft Movie','Adventure','English',101,'PG','2025-04-04','assets/images/movies/minecraft.jpg'),
(4,'The Last Journey','Drama','Bangla',120,'PG-13','2026-09-01','assets/images/movies/last-journey.jpg');
INSERT IGNORE INTO cinema_showtimes(showtime_id,movie_id,cinema_id,screen_id,service_id,schedule_id) VALUES
(1,1,1,1,9,12),(2,1,1,1,9,13),(3,2,1,1,19,23),(4,3,2,2,20,24),(5,4,1,1,21,25);
INSERT IGNORE INTO cinema_ticket_categories(screen_id,category_name,base_price) VALUES
(1,'Standard',450),(1,'Premium',600),(2,'Standard',500),(2,'Premium',650);

INSERT IGNORE INTO event_venues(event_venue_id,service_id,venue_name,location_id,venue_type,capacity) VALUES
(1,10,'Shahbag Event Grounds',11,'open_air',300),(2,22,'Shahbag Event Grounds',11,'open_air',500),
(3,23,'Bangladesh-China Friendship Conference Center',26,'convention_centre',700),
(4,24,'Bangladesh Shilpakala Academy',25,'auditorium',300),(5,25,'Bangladesh-China Friendship Conference Center',26,'convention_centre',400);
INSERT IGNORE INTO events(event_id,service_id,event_title,event_type,organizer_provider_id,event_description,age_limit) VALUES
(1,10,'Dhaka Live Music Night','concert',7,'Fictional demonstration event.','All ages'),
(2,22,'Dhaka Live Music Night','concert',7,'Fictional demonstration event.','All ages'),
(3,23,'Dhaka Cultural Festival','festival',7,'Fictional demonstration event.','All ages'),
(4,24,'Theatre Evening','hall_show',18,'Fictional stage performance.','12+'),
(5,25,'Comedy Night','comedy',18,'Fictional comedy performance.','16+');
INSERT IGNORE INTO event_sessions(event_id,schedule_id,event_venue_id,doors_open_at) VALUES
(1,14,1,'2027-01-15 17:30:00'),(2,26,2,'2027-01-20 18:00:00'),(3,27,3,'2027-01-21 16:00:00'),
(4,28,4,'2027-01-22 18:00:00'),(5,29,5,'2027-01-23 19:30:00');
INSERT IGNORE INTO event_seating_sections(event_venue_id,section_name,section_capacity) VALUES
(1,'General',220),(1,'VIP',80),(2,'General',360),(2,'VIP',140),(3,'General',500),(3,'VIP',200),
(4,'Standard',220),(4,'Premium',80),(5,'General',300),(5,'VIP',100);
INSERT IGNORE INTO event_ticket_categories(event_id,category_name,section_id,ticket_price,total_quantity,available_quantity) VALUES
(1,'General',1,1200,220,160),(1,'VIP',2,2200,80,60),(2,'General',3,1200,360,280),(2,'VIP',4,2500,140,80),
(3,'General',5,800,500,350),(3,'VIP',6,1500,200,150),(4,'Standard',7,600,220,180),(4,'Premium',8,1000,80,60),
(5,'General',9,900,300,230),(5,'VIP',10,1500,100,70);

-- Gift-order and OTP tables are intentionally seeded with no live OTP values or real recipients.


-- Legacy category extension seed data
-- Existing service IDs from the supplied database seed:
INSERT IGNORE INTO bus_service_details(service_id,operator_name,bus_type,amenities,luggage_limit) VALUES
(1,'Green Line Paribahan','AC Sleeper',JSON_ARRAY('AC','Charging','WiFi'), '20 KG'),
(2,'Green Line Paribahan','Business Class',JSON_ARRAY('AC','Reclining Seat','Charging'), '20 KG')
ON DUPLICATE KEY UPDATE operator_name=VALUES(operator_name),bus_type=VALUES(bus_type),amenities=VALUES(amenities),luggage_limit=VALUES(luggage_limit);
INSERT IGNORE INTO ferry_service_details(service_id,vessel_name,vessel_type,amenities,vehicle_allowed) VALUES
(5,'Sundarban Launch','Overnight Launch',JSON_ARRAY('Cabin','Deck Seat','Dining'),FALSE)
ON DUPLICATE KEY UPDATE vessel_name=VALUES(vessel_name),vessel_type=VALUES(vessel_type),amenities=VALUES(amenities);
INSERT IGNORE INTO hotel_service_details(service_id,star_rating,check_in_time,check_out_time,amenities) VALUES
(6,5,'14:00:00','11:00:00',JSON_ARRAY('Breakfast','Beach Access','WiFi')),
(7,5,'14:00:00','11:00:00',JSON_ARRAY('Ocean View','Breakfast','WiFi'))
ON DUPLICATE KEY UPDATE star_rating=VALUES(star_rating),amenities=VALUES(amenities);
INSERT IGNORE INTO hotel_room_types(service_id,room_name,bed_type,max_guests,total_rooms,base_price) VALUES
(6,'Deluxe Room','King',2,20,12500),(7,'Ocean Suite','King',3,8,18500)
ON DUPLICATE KEY UPDATE base_price=VALUES(base_price),total_rooms=VALUES(total_rooms);
INSERT IGNORE INTO restaurant_service_details(service_id,cuisine_type,opening_time,closing_time,average_cost_for_two,amenities) VALUES
(8,'Continental','12:00:00','23:00:00',1800,JSON_ARRAY('Family Dining','Reservation'))
ON DUPLICATE KEY UPDATE cuisine_type=VALUES(cuisine_type),opening_time=VALUES(opening_time),closing_time=VALUES(closing_time);
INSERT IGNORE INTO movie_details(service_id,movie_title,genre,language,duration_minutes,certificate,release_date) VALUES
(9,'Demo Screening','Drama','Bangla',135,'PG-13','2026-10-01')
ON DUPLICATE KEY UPDATE genre=VALUES(genre),language=VALUES(language),duration_minutes=VALUES(duration_minutes);
INSERT IGNORE INTO bus_service_details(service_id,operator_name,bus_type,amenities,luggage_limit) VALUES
(11,'Hanif Enterprise','AC',JSON_ARRAY('AC','Charging'),'20 KG'),
(12,'Shohagh Paribahan','Business Class',JSON_ARRAY('AC','WiFi'),'20 KG'),
(26,'Ena Transport','AC',JSON_ARRAY('AC','Charging'),'20 KG');
INSERT IGNORE INTO ferry_service_details(service_id,vessel_name,vessel_type,amenities,vehicle_allowed) VALUES
(13,'Green Line Waterways','Passenger Ferry',JSON_ARRAY('AC','Deck'),FALSE),
(14,'MV Tipu','Overnight Launch',JSON_ARRAY('Cabin','Deck Seat'),FALSE);
INSERT IGNORE INTO hotel_service_details(service_id,star_rating,check_in_time,check_out_time,amenities) VALUES
(15,5,'14:00:00','12:00:00',JSON_ARRAY('WiFi','Breakfast','Pool')),
(16,4,'14:00:00','11:00:00',JSON_ARRAY('WiFi','Parking','Garden'));
INSERT IGNORE INTO hotel_room_types(service_id,room_name,bed_type,max_guests,total_rooms,base_price) VALUES
(15,'Deluxe King','King',2,30,18000),(16,'Garden View','Twin',2,18,6500);
INSERT IGNORE INTO restaurant_service_details(service_id,cuisine_type,opening_time,closing_time,average_cost_for_two,amenities) VALUES
(17,'Bangladeshi','11:00:00','23:00:00',1500,JSON_ARRAY('Family Dining','Reservation')),
(18,'Italian','12:00:00','23:00:00',2500,JSON_ARRAY('Reservation','WiFi'));
INSERT IGNORE INTO movie_details(service_id,movie_title,genre,language,duration_minutes,certificate,release_date) VALUES
(19,'Borbaad','Drama','Bangla',130,'PG-13','2026-10-01'),
(20,'A Minecraft Movie','Adventure','English',101,'PG','2025-04-04'),
(21,'The Last Journey','Drama','Bangla',120,'PG-13','2026-09-01');

INSERT IGNORE INTO gift_packages(package_name,gift_category,linked_service_id,description,price,validity_days,image_path) VALUES
('Cox’s Bazar Couple Escape','honeymoon',6,'Illustrative couple stay package. Confirm dates with the provider.',18500,365,'assets/coxsbazar.png'),
('Romantic Dinner for Two','dining',8,'Illustrative restaurant gift; reservation subject to availability.',5000,180,'assets/icons/restaurant.png'),
('Resort Weekend Stay','hotel_stay',6,'Illustrative resort stay gift package.',12500,365,'assets/coxsbazar.png'),
('Flexible Chalo Gift Voucher','voucher',NULL,'Flexible value voucher; redemption rules must be configured.',3000,365,'assets/gift-box.png')
ON DUPLICATE KEY UPDATE price=VALUES(price),description=VALUES(description);



-- Unified cart, checkout, gift separation, booking participants and payment lifecycle examples.
INSERT IGNORE INTO cart_item_details(cart_item_id,booking_mode,selection_type,selected_details,booking_for_name,booking_for_phone) VALUES
(1,'self','seat',JSON_OBJECT('seat_code','SN-01','class','Shovon'),'Rahim Ahmed','01710000001'),
(2,'self','room',JSON_OBJECT('room_type','Deluxe Room','nights',2),'Rahim Ahmed','01710000001'),
(3,'self','table',JSON_OBJECT('party_size',2,'slot','Dinner'),'Rahim Ahmed','01710000001'),
(4,'self','seat',JSON_OBJECT('seats',2,'screen','Screen 1'),'Nusrat Jahan','01710000002'),
(5,'gift','ticket',JSON_OBJECT('ticket_category','General'),'Sadia Karim','01710000012');
INSERT IGNORE INTO order_checkout_details(order_id,booking_mode,purchaser_name,purchaser_phone,purchaser_email,checkout_note) VALUES
(1,'self','Rahim Ahmed','01710000001','rahim@example.com','Self booking demo.'),
(2,'self','Nusrat Jahan','01710000002','nusrat@example.com','Self booking demo.'),
(3,'gift','Tanvir Hasan','01710000003','tanvir@example.com','Gift purchased for a separate recipient.');
INSERT IGNORE INTO gift_orders(order_id,purchaser_user_id,recipient_full_name,recipient_phone,recipient_email,recipient_address,personal_message,gift_status,delivery_method,scheduled_delivery_at) VALUES
(3,3,'Sadia Karim','01710000012','sadia@example.test','Dhanmondi, Dhaka','Hope you enjoy the event!','sent','share_link','2027-01-12 10:00:00');
INSERT IGNORE INTO gift_vouchers(gift_order_id,voucher_code,face_value,currency,expires_at,voucher_status) VALUES
(1,'CHALO-DEMO-GIFT-0003',1200,'BDT','2028-01-12 23:59:59','active');
INSERT IGNORE INTO booking_participants(booking_id,participant_type,full_name,phone,email) VALUES
(1,'passenger','Rahim Ahmed','01710000001','rahim@example.com'),
(2,'guest','Rahim Ahmed','01710000001','rahim@example.com'),
(3,'guest','Rahim Ahmed','01710000001','rahim@example.com'),
(4,'attendee','Nusrat Jahan','01710000002','nusrat@example.com'),
(5,'attendee','Sadia Karim','01710000012','sadia@example.test');
INSERT IGNORE INTO booking_inventory_allocations(booking_id,inventory_unit_id,allocation_status) VALUES
(1,9,'confirmed'),(2,18,'confirmed'),(3,26,'confirmed'),(4,28,'held'),(5,35,'confirmed');
INSERT IGNORE INTO booking_tickets(booking_id,ticket_reference,qr_verification_token,ticket_type,ticket_status) VALUES
(4,'CHL-TKT-DEMO-0004',SHA2('CHL-TKT-DEMO-0004',256),'Cinema','issued'),
(5,'CHL-TKT-DEMO-0005',SHA2('CHL-TKT-DEMO-0005',256),'Event Gift Ticket','issued');
INSERT IGNORE INTO payment_attempts(payment_attempt_id,order_id,payment_id,attempt_number,payment_method,amount,currency,attempt_status,gateway_reference,gateway_transaction_id,initiated_at,verified_at) VALUES
(1,1,1,1,'bkash',12795,'BDT','successful','BKASH-DEMO-77881','BKASH-DEMO-77881','2027-01-05 12:09:00','2027-01-05 12:10:00'),
(2,2,2,1,'nagad',950,'BDT','pending','NAGAD-DEMO-INIT',NULL,'2027-01-05 12:11:00',NULL),
(3,3,3,1,'card',1250,'BDT','successful','CARD-DEMO-11992','CARD-DEMO-11992','2027-01-06 16:19:00','2027-01-06 16:20:00');
INSERT IGNORE INTO order_lifecycle(order_id,master_order_status) VALUES (1,'confirmed'),(2,'awaiting_payment'),(3,'confirmed');
INSERT IGNORE INTO booking_lifecycle(booking_id,individual_booking_status) VALUES
(1,'confirmed'),(2,'confirmed'),(3,'confirmed'),(4,'temporarily_held'),(5,'confirmed');
INSERT IGNORE INTO booking_status_history(booking_id,old_status,new_status,change_reason) VALUES
(1,NULL,'confirmed','Development seed booking confirmation'),
(4,NULL,'temporarily_held','Development seed temporary inventory hold');
INSERT IGNORE INTO notification_deliveries(notification_id,channel,destination,delivery_status,sent_at,delivered_at) VALUES
(1,'in_app','user:1','delivered','2027-01-05 12:10:00','2027-01-05 12:10:00');
INSERT IGNORE INTO ratings(user_id,service_id,booking_id,rating_value,rating_comment) VALUES
(1,3,1,5,'Development sample rating.'),(1,6,2,5,'Development sample rating.');

INSERT IGNORE INTO service_images(service_id,image_path,alt_text,is_primary,display_order) VALUES
(22,'assets/images/gifts/travel.jpg','Dhaka live music event demo',1,1),
(23,'assets/images/gifts/hero.jpg','Dhaka cultural festival demo',1,1),
(24,'assets/images/gifts/anniversary.jpg','Theatre evening demo',1,1),
(25,'assets/images/gifts/birthday.jpg','Comedy night demo',1,1);
INSERT IGNORE INTO user_profiles(user_id,preferred_language,city,district) VALUES
(1,'bn','Dhaka','Dhaka'),(2,'bn','Dhaka','Dhaka'),(3,'bn','Dhaka','Dhaka');
INSERT IGNORE INTO user_contacts(user_id,contact_type,contact_value,is_primary,is_verified) VALUES
(1,'phone','01710000001',1,1),(1,'email','rahim@example.com',1,1),
(2,'phone','01710000002',1,1),(3,'phone','01710000003',1,1);
