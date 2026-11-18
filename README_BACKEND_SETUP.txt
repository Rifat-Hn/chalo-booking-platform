CHALO BACKEND SETUP (XAMPP / PHP / MySQL)
========================================

1. Extract the entire "Main System" folder into:
   C:\xampp\htdocs\Chalo

2. Start Apache and MySQL from XAMPP Control Panel.

3. Open phpMyAdmin:
   http://localhost/phpmyadmin

4. Import chalo_database.sql:
   - Select Import
   - Choose the supplied chalo_database.sql
   - Click Go
   The database created by the SQL file is named chalo_db.

5. Check config/database.php:
   Default XAMPP settings are:
     host: 127.0.0.1
     database: chalo_db
     username: root
     password: (blank)
   Change these if your MySQL credentials differ.

6. Open:
   http://localhost/Chalo/

7. Register a new customer account, then sign in. Registration inserts
   into users and hashes passwords using PHP password_hash().
   Login checks email OR phone with password_verify() and starts a
   PHP session. The header changes to show My Account and Log out.

8. My Account:
   http://localhost/Chalo/account.php
   Shows orders and booking records for the signed-in customer.

IMPORTANT CURRENT SCOPE
-----------------------
- Login, registration, session, logout, and account order-history read
  are connected to MySQL.
- Login uses email or phone number.
- Google OAuth and password-reset email/OTP are not configured.
- The existing train search and seat map still use demonstration data.
  Its Add to Cart currently uses browser localStorage, not the MySQL cart.
- Other category pages (bus/ferry/hotel/restaurant/movies) are not in
  the uploaded archive, so they cannot be wired up here.
- Payment gateway integration is not active. Never treat a demo payment
  as a real transaction.
- Use localhost through Apache. Do not open the PHP project by double
  clicking HTML files or using file:// URLs.
- For deployment, enable HTTPS, configure a non-root DB user, set a
  strong DB password, add CSRF protection and login throttling, and
  configure email/OTP verification.

The database sample users contain placeholder hashes. Register a fresh
account for testing, or replace sample hashes with real password_hash()
values. Do not use placeholder credentials in production.
