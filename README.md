# OSM Speed API

> Fast local speed-limit lookup from GPS coordinates using OpenStreetMap, PostGIS, and Docker.

[![Node.js](https://img.shields.io/badge/Node.js-22+-3C873A?logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostGIS](https://img.shields.io/badge/PostGIS-17%20%2B%203.5-336791?logo=postgresql&logoColor=white)](https://postgis.net/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

`OSM Speed API` is a local-first service for navigation apps that need to retrieve the nearest road and its speed limit from GPS coordinates.

It is designed for:

- fast local lookup
- no third-party API limits
- full control of source data
- easy refresh from Geofabrik extracts

---

## What It Does

Given a GPS point:

- finds the nearest drivable road
- returns road metadata
- returns `maxspeed` when tagged in OSM
- supports directional speed tags such as `maxspeed:forward` / `maxspeed:backward`
- falls back to a readable `displayName` even when a segment has no explicit road name

---

## Tech Stack

- Node.js + Express
- PostgreSQL + PostGIS
- `osm2pgsql` flex import
- Docker Compose
- Geofabrik Vietnam extract:
  `https://download.geofabrik.de/asia/vietnam-latest.osm.pbf`

---

## Architecture

```text
Geofabrik .osm.pbf
        |
        v
 downloader  ---> local /data mount
        |
        v
  importer (osm2pgsql)
        |
        v
 PostgreSQL + PostGIS
        |
        v
      API
        |
        v
  /api/speed-limit
```

---

## Quick Start

### 1. Download the Vietnam extract

```powershell
docker compose run --rm downloader
```

### 2. Import into PostGIS

```powershell
docker compose run --rm importer
```

### 3. Start the API

```powershell
docker compose up -d api
```

### 4. Test it

```powershell
curl "http://localhost:3000/health"
curl "http://localhost:3000/api/speed-limit?lat=10.778431013165987&lon=106.72224874302465"
```

---

## Example Response

```json
{
  "input": {
    "lat": 10.778431013165987,
    "lon": 106.72224874302465,
    "heading": null,
    "radiusMeters": 60
  },
  "found": true,
  "candidateCount": 9,
  "road": {
    "osmId": "1274986720",
    "name": "Nguyen Co Thach",
    "displayName": "Nguyen Co Thach",
    "ref": null,
    "highway": "secondary",
    "distanceMeters": 0,
    "roadHeadingDegrees": 163,
    "oneway": 1,
    "maxspeedType": null,
    "sourceMaxspeed": null,
    "speedLimit": {
      "raw": "60",
      "value": 60,
      "unit": "km/h",
      "kph": 60,
      "source": "maxspeed",
      "direction": null
    },
    "rawTags": {
      "lanes": "4",
      "surface": "asphalt"
    }
  }
}
```

---

## API

### `GET /api/speed-limit`

```text
/api/speed-limit?lat=10.77689&lon=106.70081&heading=85
```

Query parameters:

- `lat` required
- `lon` required
- `heading` optional
- `radiusMeters` optional

### `POST /api/speed-limit`

```json
{
  "lat": 10.77689,
  "lon": 106.70081,
  "heading": 85,
  "radiusMeters": 60
}
```

### `GET /health`

Returns:

```json
{ "ok": true }
```

---

## Environment

Copy the example file:

```powershell
Copy-Item .env.example .env
```

Main variables:

| Variable | Purpose | Default |
|---|---|---|
| `IMAGE_API` | API image name | `osm-speed-api:latest` |
| `IMAGE_IMPORTER` | Importer image name | `osm-speed-importer:latest` |
| `PBF_DATA_DIR` | Local mounted folder for `.pbf` reuse | `./data` |
| `PBF_FILENAME` | Extract filename | `vietnam-latest.osm.pbf` |
| `PBF_DOWNLOAD_URL` | Source download URL | Geofabrik Vietnam |
| `POSTGRES_DB` | Database name | `osm` |
| `POSTGRES_USER` | Database user | `osm` |
| `POSTGRES_PASSWORD` | Database password | `change-me` |
| `POSTGRES_PORT` | Host port for Postgres | `5432` |
| `PORT` | API port | `3000` |

---

## Custom Data Directory

If you want to reuse the `.pbf` file outside the project folder:

```text
PBF_DATA_DIR=D:/osm-data/vietnam
PBF_FILENAME=vietnam-latest.osm.pbf
```

Then run the same workflow:

```powershell
docker compose run --rm downloader
docker compose run --rm importer
docker compose up -d api
```

---

## Build and Push Images

This project includes a separate build compose file:

```text
docker-compose.build.yml
```

Build images:

```powershell
docker compose -f docker-compose.build.yml build
```

Push images:

```powershell
docker compose -f docker-compose.build.yml push
```

Or with npm scripts:

```powershell
npm run docker:build
npm run docker:push
```

---

## Notes

- The API prefers the nearest road with explicit `maxspeed`.
- `road.name` is the raw OSM segment name.
- `road.displayName` is a display-friendly fallback from nearby named segments, `ref`, or labels like `Unnamed service`.
- If the nearest segment has no `maxspeed`, `road.speedLimit` will be `null`.
- Postgres binds to `127.0.0.1` by default.
- Change `POSTGRES_PASSWORD` before using this outside local development.

---

## Useful Commands

```powershell
npm run docker:download
npm run docker:import
npm run docker:up
npm run docker:down
npm run docker:logs
npm test
```

---

## Repository

GitHub:

```text
https://github.com/Vinhuit/osm-speed-api
```
