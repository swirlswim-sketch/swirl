-- Custom goals currently only store a name + flat distance (no map line).
-- Premium users can now search two real places (Mapbox Geocoding) and get
-- an actual straight-line route between them instead of just typing a
-- number -- this column holds that generated line.
alter table user_routes add column if not exists custom_geojson jsonb;
