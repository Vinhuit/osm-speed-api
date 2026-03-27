# OSM Speed API

A local API for retrieving `speed_limit` from GPS coordinates (`lat/lon`) for navigation apps, using OpenStreetMap data from Geofabrik and PostGIS for fast local queries.

- fast
- no rate limits
- fully local data ownership

## Stack

- Node.js + Express
- PostgreSQL + PostGIS
- Docker Compose for `db + api + downloader + importer`
- image names are environment-driven:
- `IMAGE_API=osm-speed-api:latest`
- `IMAGE_IMPORTER=osm-speed-importer:latest`
- `osm2pgsql` flex import into `public.speed_roads`
- Source data: `https://download.geofabrik.de/asia/vietnam-latest.osm.pbf`

## Run with Docker

The `.pbf` file is stored locally on your machine and mounted into the importer container for reuse. The default mount directory is:

```text
./data
```

You can change it to another directory, for example:

```powershell
Copy-Item .env.example .env
```

Edit `.env`:

```text
PBF_DATA_DIR=D:/osm-data/vietnam
POSTGRES_PASSWORD=change-me
```

Then place the file here:

```text
D:/osm-data/vietnam/vietnam-latest.osm.pbf
```

1. Download the `.pbf` file with the downloader container:

```powershell
docker compose run --rm downloader
```

or:

```powershell
npm run docker:download
```

2. Import the data into PostGIS with the importer container:

```powershell
docker compose run --rm importer
```

or:

```powershell
npm run docker:import
```

You can also place the file manually in the local mount:

```text
data/vietnam-latest.osm.pbf
```

3. Start the API:

```powershell
docker compose up -d api
```

or:

```powershell
npm run docker:up
```

Other machines do not need local image builds. `docker compose` pull/run is enough.

If you want to pull from a registry, set custom image names in `.env`:

```text
IMAGE_API=your-registry/osm-speed-api:latest
IMAGE_IMPORTER=your-registry/osm-speed-importer:latest
```

## Build Images

If you need to rebuild and push images to Docker Hub:

```powershell
docker compose -f docker-compose.build.yml build
docker compose -f docker-compose.build.yml push
```

or:

```powershell
npm run docker:build
npm run docker:push
```

The dedicated build file is:

```text
docker-compose.build.yml
```

If you use a custom external mount directory:

```powershell
Copy-Item .env.example .env
```

Edit `.env`:

```text
PBF_DATA_DIR=D:/osm-data/vietnam
PBF_FILENAME=vietnam-latest.osm.pbf
POSTGRES_PASSWORD=change-me
```

Then run the same 3 commands:

```powershell
docker compose run --rm downloader
docker compose run --rm importer
docker compose up -d api
```

The `importer` will automatically:

- verify the `.pbf` file in the local volume
- use the bundled `speed_roads.lua` style file from the image
- `DROP TABLE public.speed_roads` if it already exists
- import again with `osm2pgsql`
- start `db` automatically if the dependency is not running yet

View logs:

```powershell
npm run docker:logs
```

## API

### `GET /api/speed-limit`

Example:

```text
GET /api/speed-limit?lat=10.77689&lon=106.70081&heading=85
```

### `POST /api/speed-limit`

```json
{
  "lat": 10.77689,
  "lon": 106.70081,
  "heading": 85,
  "radiusMeters": 60
}
```

## Example Response

```json
{
  "input": {
    "lat": 10.77689,
    "lon": 106.70081,
    "heading": 85,
    "radiusMeters": 60
  },
  "found": true,
  "candidateCount": 4,
  "road": {
    "osmId": 123456789,
    "name": "Vo Van Kiet",
    "displayName": "Vo Van Kiet",
    "ref": null,
    "highway": "primary",
    "distanceMeters": 6.1,
    "roadHeadingDegrees": 88.5,
    "oneway": 0,
    "maxspeedType": "VN:urban",
    "sourceMaxspeed": "sign",
    "speedLimit": {
      "raw": "60",
      "value": 60,
      "unit": "km/h",
      "kph": 60,
      "source": "maxspeed",
      "direction": null
    },
    "rawTags": {
      "source:maxspeed": "sign",
      "maxspeed:conditional": null,
      "lanes": "4",
      "surface": "asphalt",
      "bridge": null,
      "tunnel": null
    }
  }
}
```

## Notes

- The API returns the nearest road within the search radius and prefers roads with explicit `maxspeed`.
- `road.name` is the raw OSM segment name. `road.displayName` is the display label after falling back to a nearby segment name, `ref`, or a label like `Unnamed service`.
- `heading` is optional, but if the navigation app sends it, the API can choose `maxspeed:forward` or `maxspeed:backward` more accurately.
- If the nearest road has no `maxspeed` tag in OSM, `road.speedLimit` will be `null`.
- Speed data quality depends on OSM tagging coverage in each area.
- Postgres credentials are environment-driven. Change `POSTGRES_PASSWORD` before using this outside local development.
- Postgres is only bound to `127.0.0.1` by default.

## Run Locally Without Docker

```powershell
npm install
Copy-Item .env.example .env
npm start
```

## Useful Commands

```powershell
npm run docker:download
npm run docker:import
npm run docker:up
npm run docker:down
npm test
```
