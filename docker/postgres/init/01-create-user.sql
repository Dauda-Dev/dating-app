-- Create dating_user role if it doesn't exist
DO
$do$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'dating_user') THEN
      CREATE ROLE dating_user LOGIN PASSWORD 'secure_password_change_me';
   END IF;
END
$do$;

-- Grant privileges to dating_user
ALTER ROLE dating_user WITH SUPERUSER;
GRANT ALL PRIVILEGES ON DATABASE dating_app TO dating_user;
