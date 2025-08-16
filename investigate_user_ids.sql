-- Investigate user IDs and usernames to understand the mapping issue

-- Check all users and their IDs
SELECT 
    id,
    username,
    email,
    created_at
FROM profiles
ORDER BY username;

-- Check specifically for admin0, maryha, and norbitrecker87
SELECT 
    id,
    username,
    email
FROM profiles
WHERE username IN ('admin0', 'maryha', 'norbitrecker87')
ORDER BY username;

-- Check if there are any users with similar usernames
SELECT 
    id,
    username,
    email
FROM profiles
WHERE username LIKE '%mary%' OR username LIKE '%norbit%' OR username LIKE '%admin%'
ORDER BY username;

-- Check the specific user ID that's causing issues
SELECT 
    id,
    username,
    email
FROM profiles
WHERE id = '12abfa92-d00e-44fb-b6c9-94679b3baaaa';

-- Check if there are any users with the same email or similar data
SELECT 
    id,
    username,
    email
FROM profiles
WHERE email LIKE '%mary%' OR email LIKE '%norbit%'
ORDER BY username;

-- Let's also check if there are any duplicate usernames
SELECT 
    username,
    COUNT(*) as count,
    ARRAY_AGG(id) as user_ids,
    ARRAY_AGG(email) as emails
FROM profiles
GROUP BY username
HAVING COUNT(*) > 1
ORDER BY username;
