-- Swirl seed data: badges, routes, checkpoints.
-- Uses fixed UUIDs so this script is idempotent and checkpoints can
-- reference badges/routes directly. Safe to re-run.

-- ============================================================
-- Badges
-- ============================================================
insert into badges (id, name, description, badge_type, threshold_value) values
  ('22222222-2222-2222-2222-222222222201', 'First Stroke', 'Logged your first swim', 'distance', 0),
  ('22222222-2222-2222-2222-222222222202', '1km Club', 'Swum 1,000m in total', 'distance', 1000),
  ('22222222-2222-2222-2222-222222222203', '5km', 'Swum 5,000m in total', 'distance', 5000),
  ('22222222-2222-2222-2222-222222222204', '10km', 'Swum 10,000m in total', 'distance', 10000),
  ('22222222-2222-2222-2222-222222222205', '50km', 'Swum 50,000m in total', 'distance', 50000),
  ('22222222-2222-2222-2222-222222222206', '100km', 'Swum 100,000m in total', 'distance', 100000),
  ('22222222-2222-2222-2222-222222222207', '500km', 'Swum 500,000m in total', 'distance', 500000),
  ('22222222-2222-2222-2222-222222222211', 'Three Days', 'A 3-day swimming streak', 'streak', 3),
  ('22222222-2222-2222-2222-222222222212', 'One Week', 'A 7-day swimming streak', 'streak', 7),
  ('22222222-2222-2222-2222-222222222213', 'One Month', 'A 30-day swimming streak', 'streak', 30),
  ('22222222-2222-2222-2222-222222222221', 'Channel Crosser', 'Completed the English Channel', 'special', null),
  ('22222222-2222-2222-2222-222222222222', 'Loch Legend', 'Completed Loch Ness', 'special', null)
on conflict (id) do nothing;

-- ============================================================
-- Routes
-- ============================================================
insert into routes (id, name, description, total_distance_m, activity_type, difficulty, tags) values
  ('11111111-1111-1111-1111-111111111101', 'The English Channel',
    'Shakespeare Beach, Dover to Cap Gris-Nez, France. The most famous open water swim in the world.',
    33800, 'swim', 'deep', array['iconic', 'international']),
  ('11111111-1111-1111-1111-111111111102', 'Lake Windermere End-to-End',
    'Waterhead to Lakeside, through England''s longest natural lake.',
    17000, 'swim', 'open_water', array['uk', 'lake']),
  ('11111111-1111-1111-1111-111111111103', 'Strait of Gibraltar',
    'Tarifa, Spain to Punta Cires, Morocco. Europe to Africa.',
    14400, 'swim', 'deep', array['iconic', 'international']),
  ('11111111-1111-1111-1111-111111111104', 'Loch Ness',
    'Fort Augustus to Loch End. 36.5km of famously cold, dark water.',
    36500, 'swim', 'open_water', array['uk', 'lake']),
  ('11111111-1111-1111-1111-111111111105', 'Manhattan Island Circumnavigation',
    'A full loop around Manhattan island. One of open water swimming''s iconic urban challenges.',
    45000, 'swim', 'deep', array['urban', 'iconic']),
  ('11111111-1111-1111-1111-111111111106', 'The Amazon (Source to Sea)',
    'The ultimate long-term goal. 6,400km from the Andes to the Atlantic. A lifetime of swimming.',
    6400000, 'swim', 'deep', array['epic', 'international'])
on conflict (id) do nothing;

-- ============================================================
-- Checkpoints: The English Channel
-- ============================================================
insert into route_checkpoints (route_id, name, description, distance_from_start_m, badge_id, order_index) values
  ('11111111-1111-1111-1111-111111111101', 'Dover Harbour exit', 'The start line.', 0, null, 0),
  ('11111111-1111-1111-1111-111111111101', 'Varne Ridge sandbank', null, 17000, null, 1),
  ('11111111-1111-1111-1111-111111111101', 'French territorial waters', null, 30000, null, 2),
  ('11111111-1111-1111-1111-111111111101', 'Cap Gris-Nez', 'Journey''s end. Complete.', 33800, '22222222-2222-2222-2222-222222222221', 3)
on conflict (route_id, order_index) do nothing;

-- ============================================================
-- Checkpoints: Lake Windermere End-to-End
-- ============================================================
insert into route_checkpoints (route_id, name, description, distance_from_start_m, badge_id, order_index) values
  ('11111111-1111-1111-1111-111111111102', 'Waterhead', 'The start line.', 0, null, 0),
  ('11111111-1111-1111-1111-111111111102', 'Storrs Point', null, 8500, null, 1),
  ('11111111-1111-1111-1111-111111111102', 'Lakeside', 'Journey''s end. Complete.', 17000, null, 2)
on conflict (route_id, order_index) do nothing;

-- ============================================================
-- Checkpoints: Strait of Gibraltar
-- ============================================================
insert into route_checkpoints (route_id, name, description, distance_from_start_m, badge_id, order_index) values
  ('11111111-1111-1111-1111-111111111103', 'Tarifa', 'The start line.', 0, null, 0),
  ('11111111-1111-1111-1111-111111111103', 'Halfway point', null, 7200, null, 1),
  ('11111111-1111-1111-1111-111111111103', 'Moroccan waters', null, 12000, null, 2),
  ('11111111-1111-1111-1111-111111111103', 'Punta Cires', 'Journey''s end. Complete.', 14400, null, 3)
on conflict (route_id, order_index) do nothing;

-- ============================================================
-- Checkpoints: Loch Ness
-- ============================================================
insert into route_checkpoints (route_id, name, description, distance_from_start_m, badge_id, order_index) values
  ('11111111-1111-1111-1111-111111111104', 'Fort Augustus', 'The start line.', 0, null, 0),
  ('11111111-1111-1111-1111-111111111104', 'Urquhart Castle', null, 18000, null, 1),
  ('11111111-1111-1111-1111-111111111104', 'Loch End', 'Journey''s end. Complete.', 36500, '22222222-2222-2222-2222-222222222222', 2)
on conflict (route_id, order_index) do nothing;

-- ============================================================
-- Checkpoints: Manhattan Island Circumnavigation
-- ============================================================
insert into route_checkpoints (route_id, name, description, distance_from_start_m, badge_id, order_index) values
  ('11111111-1111-1111-1111-111111111105', 'Battery Park', 'The start line.', 0, null, 0),
  ('11111111-1111-1111-1111-111111111105', 'Hell Gate', null, 22500, null, 1),
  ('11111111-1111-1111-1111-111111111105', 'George Washington Bridge', null, 35000, null, 2),
  ('11111111-1111-1111-1111-111111111105', 'Battery Park return', 'Journey''s end. Complete.', 45000, null, 3)
on conflict (route_id, order_index) do nothing;

-- ============================================================
-- Checkpoints: The Amazon (Source to Sea)
-- ============================================================
insert into route_checkpoints (route_id, name, description, distance_from_start_m, badge_id, order_index) values
  ('11111111-1111-1111-1111-111111111106', 'Andes source', 'The start line.', 0, null, 0),
  ('11111111-1111-1111-1111-111111111106', 'Iquitos, Peru', null, 1800000, null, 1),
  ('11111111-1111-1111-1111-111111111106', 'Manaus, Brazil', null, 3700000, null, 2),
  ('11111111-1111-1111-1111-111111111106', 'Belém, Atlantic coast', 'Journey''s end. Complete.', 6400000, null, 3)
on conflict (route_id, order_index) do nothing;
