FROM iboates/osm2pgsql:latest

RUN apk add --no-cache postgresql17-client

COPY osm2pgsql/speed_roads.lua /config/speed_roads.lua
COPY docker/importer/import-osm.sh /usr/local/bin/import-osm.sh
RUN chmod +x /usr/local/bin/import-osm.sh
