CREATE INDEX IF NOT EXISTS speed_roads_geom_idx
  ON public.speed_roads
  USING GIST (geom);

ANALYZE public.speed_roads;
