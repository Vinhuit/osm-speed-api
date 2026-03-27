#!/bin/sh
set -eu

PBF_FILE="/data/${PBF_FILENAME:-vietnam-latest.osm.pbf}"

if [ ! -s "$PBF_FILE" ]; then
  echo "Missing PBF file: $PBF_FILE" >&2
  exit 1
fi

echo "Dropping old speed_roads table if it exists..."
psql "postgresql://osm:${PGPASSWORD}@db:5432/osm" -v ON_ERROR_STOP=1 -c "DROP TABLE IF EXISTS public.speed_roads CASCADE;"

echo "Importing $PBF_FILE ..."
exec osm2pgsql \
  --database osm \
  --host db \
  --port 5432 \
  --username osm \
  --create \
  --slim \
  --drop \
  --cache 2000 \
  --number-processes 4 \
  --output flex \
  --style /config/speed_roads.lua \
  "$PBF_FILE"
