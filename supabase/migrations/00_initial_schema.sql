-- 1. Config (Single row table)
CREATE TABLE IF NOT EXISTS config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_active BOOLEAN DEFAULT false,
    meeting_name TEXT,
    meeting_date DATE,
    location TEXT
);

-- 2. Delegates
CREATE TABLE IF NOT EXISTS delegates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    status TEXT DEFAULT 'Pending', -- 'Pending' or 'Attended'
    seat_number TEXT,
    checkin_time TIMESTAMPTZ
);

-- 3. Seats
CREATE TABLE IF NOT EXISTS seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seat_number TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'Empty', -- 'Empty' or 'Occupied'
    delegate_name TEXT
);

-- 4. Checkin_Logs
CREATE TABLE IF NOT EXISTS checkin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    delegate_id UUID REFERENCES delegates(id),
    delegate_name TEXT,
    seat_number TEXT
);

-- Insert dummy config data
INSERT INTO config (is_active, meeting_name, meeting_date, location)
VALUES (false, 'Hội nghị Cán bộ Công chức', '2026-08-20', 'Hội trường UBND Xã Lục Yên');

-- Insert dummy seats
INSERT INTO seats (seat_number, status, delegate_name) VALUES 
('A1', 'Empty', NULL),
('A2', 'Empty', NULL),
('B1', 'Empty', NULL),
('B2', 'Empty', NULL);

-- Insert dummy delegates
INSERT INTO delegates (name, unit, status, seat_number) VALUES
('Nguyễn Văn A', 'Chi bộ 1', 'Pending', 'A1'),
('Trần Thị B', 'Chi bộ 2', 'Pending', 'A2'),
('Lê Văn C', 'Chi bộ 3', 'Pending', 'B1');
