-- MySQL initialization script for Course Management Platform
USE course_management;

-- Set proper character set and collation for the database
ALTER DATABASE course_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Grant additional privileges if needed
GRANT PROCESS ON *.* TO 'course_user'@'%';
GRANT SELECT ON performance_schema.* TO 'course_user'@'%';

-- Set some MySQL optimizations for development
SET GLOBAL innodb_buffer_pool_size = 134217728;
SET GLOBAL max_connections = 100;
SET GLOBAL query_cache_size = 0;
SET GLOBAL query_cache_type = 0;

SELECT 'MySQL initialization completed successfully' as status;
