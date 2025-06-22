-- Insert demo users (passwords are hashed versions of the demo passwords)
INSERT INTO users (user_id, role, name, email, password_hash, updated_by, updated_date, is_active) VALUES
(1, 'Admin', 'Alice Johnson', 'alice@example.com', '$2b$10$rQZ9QmjKjKjKjKjKjKjKjOeH8H8H8H8H8H8H8H8H8H8H8H8H8H8H8', NULL, '2025-06-20T12:00:00Z', true),
(2, 'Doctor', 'Dr. Smith', 'smith@hospital.com', '$2b$10$dQZ9QmjKjKjKjKjKjKjKjOeH8H8H8H8H8H8H8H8H8H8H8H8H8H8H8', 1, '2025-06-20T12:30:00Z', true),
(3, 'Patient', 'John Doe', 'john.doe@example.com', '$2b$10$pQZ9QmjKjKjKjKjKjKjKjOeH8H8H8H8H8H8H8H8H8H8H8H8H8H8H8', 2, '2025-06-20T13:00:00Z', true)
ON CONFLICT (email) DO NOTHING;

-- Insert demo reports
INSERT INTO reports (report_id, user_id, name, file_path, file_size, file_type, comments, updated_by, updated_date, is_active) VALUES
(101, 3, 'Blood Test Report', 's3://diagnexus-reports/bloodtest_john_101.pdf', 2048576, 'application/pdf', 'Routine blood work results', 2, '2025-06-20T15:00:00Z', true),
(102, 3, 'X-ray Report', 's3://diagnexus-reports/xray_john_102.pdf', 5242880, 'application/pdf', 'Chest X-ray examination', 2, '2025-06-21T10:00:00Z', true)
ON CONFLICT (report_id) DO NOTHING;

-- Reset sequences
SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users));
SELECT setval('reports_report_id_seq', (SELECT MAX(report_id) FROM reports));
