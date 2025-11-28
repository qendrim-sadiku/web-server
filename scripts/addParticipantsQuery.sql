-- SQL Query to add participants to bookings for user ID 621
-- 
-- First, find the booking IDs for user 621:
-- SELECT id FROM Bookings WHERE userId = 621;
--
-- Then, insert participants for those bookings.
-- Replace <BOOKING_ID> with actual booking IDs from the query above.

-- Example: Add participants to a specific booking
-- Replace <BOOKING_ID> with the actual booking ID

INSERT INTO Participants (bookingId, name, surname, age, category, createdAt, updatedAt)
VALUES
  -- Adult participants (no age required)
  (<BOOKING_ID>, 'John', 'Doe', NULL, 'Adult', NOW(), NOW()),
  (<BOOKING_ID>, 'Jane', 'Smith', NULL, 'Adult', NOW(), NOW()),
  
  -- Teenager participant (age required)
  (<BOOKING_ID>, 'Alex', 'Johnson', 16, 'Teenager', NOW(), NOW()),
  
  -- Child participant (age required)
  (<BOOKING_ID>, 'Emma', 'Williams', 10, 'Child', NOW(), NOW());

-- Alternative: Add participants to ALL bookings for user 621
-- This uses a subquery to get all booking IDs for user 621

INSERT INTO Participants (bookingId, name, surname, age, category, createdAt, updatedAt)
SELECT 
  b.id as bookingId,
  'John' as name,
  'Doe' as surname,
  NULL as age,
  'Adult' as category,
  NOW() as createdAt,
  NOW() as updatedAt
FROM Bookings b
WHERE b.userId = 621
UNION ALL
SELECT 
  b.id,
  'Jane',
  'Smith',
  NULL,
  'Adult',
  NOW(),
  NOW()
FROM Bookings b
WHERE b.userId = 621
UNION ALL
SELECT 
  b.id,
  'Alex',
  'Johnson',
  16,
  'Teenager',
  NOW(),
  NOW()
FROM Bookings b
WHERE b.userId = 621;


