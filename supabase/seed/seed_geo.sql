-- Adds map geometry to the routes seeded in seed.sql: a simplified
-- real-world polyline per route, and lat/lng for every checkpoint.
-- Safe to re-run (plain UPDATEs against fixed seed UUIDs).

-- ============================================================
-- The English Channel
-- ============================================================
update routes set geojson = '{
  "type": "LineString",
  "coordinates": [[1.3020, 51.1226], [1.4000, 51.0000], [1.5500, 50.8600], [1.5844, 50.8567]]
}'::jsonb where id = '11111111-1111-1111-1111-111111111101';

update route_checkpoints set lat = 51.1226, lng = 1.3020 where route_id = '11111111-1111-1111-1111-111111111101' and order_index = 0;
update route_checkpoints set lat = 51.0000, lng = 1.4000 where route_id = '11111111-1111-1111-1111-111111111101' and order_index = 1;
update route_checkpoints set lat = 50.8600, lng = 1.5500 where route_id = '11111111-1111-1111-1111-111111111101' and order_index = 2;
update route_checkpoints set lat = 50.8567, lng = 1.5844 where route_id = '11111111-1111-1111-1111-111111111101' and order_index = 3;

-- ============================================================
-- Lake Windermere End-to-End
-- ============================================================
update routes set geojson = '{
  "type": "LineString",
  "coordinates": [[-2.9600, 54.4319], [-2.9450, 54.3550], [-2.9580, 54.2775]]
}'::jsonb where id = '11111111-1111-1111-1111-111111111102';

update route_checkpoints set lat = 54.4319, lng = -2.9600 where route_id = '11111111-1111-1111-1111-111111111102' and order_index = 0;
update route_checkpoints set lat = 54.3550, lng = -2.9450 where route_id = '11111111-1111-1111-1111-111111111102' and order_index = 1;
update route_checkpoints set lat = 54.2775, lng = -2.9580 where route_id = '11111111-1111-1111-1111-111111111102' and order_index = 2;

-- ============================================================
-- Strait of Gibraltar
-- ============================================================
update routes set geojson = '{
  "type": "LineString",
  "coordinates": [[-5.6053, 36.0128], [-5.5600, 35.9700], [-5.5100, 35.9300], [-5.4864, 35.9106]]
}'::jsonb where id = '11111111-1111-1111-1111-111111111103';

update route_checkpoints set lat = 36.0128, lng = -5.6053 where route_id = '11111111-1111-1111-1111-111111111103' and order_index = 0;
update route_checkpoints set lat = 35.9700, lng = -5.5600 where route_id = '11111111-1111-1111-1111-111111111103' and order_index = 1;
update route_checkpoints set lat = 35.9300, lng = -5.5100 where route_id = '11111111-1111-1111-1111-111111111103' and order_index = 2;
update route_checkpoints set lat = 35.9106, lng = -5.4864 where route_id = '11111111-1111-1111-1111-111111111103' and order_index = 3;

-- ============================================================
-- Loch Ness
-- ============================================================
update routes set geojson = '{
  "type": "LineString",
  "coordinates": [[-4.6805, 57.1447], [-4.4406, 57.3242], [-4.2900, 57.4200]]
}'::jsonb where id = '11111111-1111-1111-1111-111111111104';

update route_checkpoints set lat = 57.1447, lng = -4.6805 where route_id = '11111111-1111-1111-1111-111111111104' and order_index = 0;
update route_checkpoints set lat = 57.3242, lng = -4.4406 where route_id = '11111111-1111-1111-1111-111111111104' and order_index = 1;
update route_checkpoints set lat = 57.4200, lng = -4.2900 where route_id = '11111111-1111-1111-1111-111111111104' and order_index = 2;

-- ============================================================
-- Manhattan Island Circumnavigation
-- ============================================================
update routes set geojson = '{
  "type": "LineString",
  "coordinates": [[-74.0170, 40.7033], [-73.9310, 40.7795], [-73.9527, 40.8517], [-74.0170, 40.7033]]
}'::jsonb where id = '11111111-1111-1111-1111-111111111105';

update route_checkpoints set lat = 40.7033, lng = -74.0170 where route_id = '11111111-1111-1111-1111-111111111105' and order_index = 0;
update route_checkpoints set lat = 40.7795, lng = -73.9310 where route_id = '11111111-1111-1111-1111-111111111105' and order_index = 1;
update route_checkpoints set lat = 40.8517, lng = -73.9527 where route_id = '11111111-1111-1111-1111-111111111105' and order_index = 2;
update route_checkpoints set lat = 40.7033, lng = -74.0170 where route_id = '11111111-1111-1111-1111-111111111105' and order_index = 3;

-- ============================================================
-- The Amazon (Source to Sea)
-- ============================================================
update routes set geojson = '{
  "type": "LineString",
  "coordinates": [[-71.6931, -15.5203], [-73.2516, -3.7437], [-60.0217, -3.1190], [-48.4902, -1.4558]]
}'::jsonb where id = '11111111-1111-1111-1111-111111111106';

update route_checkpoints set lat = -15.5203, lng = -71.6931 where route_id = '11111111-1111-1111-1111-111111111106' and order_index = 0;
update route_checkpoints set lat = -3.7437, lng = -73.2516 where route_id = '11111111-1111-1111-1111-111111111106' and order_index = 1;
update route_checkpoints set lat = -3.1190, lng = -60.0217 where route_id = '11111111-1111-1111-1111-111111111106' and order_index = 2;
update route_checkpoints set lat = -1.4558, lng = -48.4902 where route_id = '11111111-1111-1111-1111-111111111106' and order_index = 3;
