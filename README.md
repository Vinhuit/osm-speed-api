# Speed Limit API from Geofabrik Vietnam

API local để lấy `speed_limit` theo GPS (`lat/lon`) cho app navigation, dùng dữ liệu OpenStreetMap tải từ Geofabrik và query trong PostGIS nên:

- nhanh
- không bị rate limit
- chủ động toàn bộ dữ liệu local

## Stack

- Node.js + Express
- PostgreSQL + PostGIS
- Docker Compose cho `db + api + downloader + importer`
- `api` và `importer` pull trực tiếp từ Docker Hub:
- `caubequay00/speedapiosm-api:latest`
- `caubequay00/speedapiosm-importer:latest`
- `osm2pgsql` flex import vào bảng `public.speed_roads`
- Dữ liệu nguồn: `https://download.geofabrik.de/asia/vietnam-latest.osm.pbf`

## Chạy trong Docker

File `.pbf` được lưu local trên máy và mount vào container importer để tái sử dụng. Mặc định thư mục mount là:

```text
./data
```

Bạn có thể đổi sang thư mục khác, ví dụ:

```powershell
Copy-Item .env.example .env
```

Sửa trong `.env`:

```text
PBF_DATA_DIR=D:/osm-data/vietnam
```

Sau đó đặt file ở:

```text
D:/osm-data/vietnam/vietnam-latest.osm.pbf
```

1. Tải file `.pbf` bằng container downloader:

```powershell
docker compose run --rm downloader
```

hoặc:

```powershell
npm run docker:download
```

2. Import vào PostGIS bằng container importer:

```powershell
docker compose run --rm importer
```

hoặc:

```powershell
npm run docker:import
```

Bạn cũng có thể tự đặt sẵn file tại local mount:

```text
data/vietnam-latest.osm.pbf
```

3. Chạy API:

```powershell
docker compose up -d api
```

hoặc:

```powershell
npm run docker:up
```

Máy khác không cần build local image, chỉ cần `docker compose` pull/run là đủ.

## Build image

Nếu cần build lại image và push lên Docker Hub:

```powershell
docker compose -f docker-compose.build.yml build
docker compose -f docker-compose.build.yml push
```

hoặc:

```powershell
npm run docker:build
npm run docker:push
```

File build riêng là:

```text
docker-compose.build.yml
```

Nếu dùng thư mục mount riêng ngoài project:

```powershell
Copy-Item .env.example .env
```

Sửa `.env`:

```text
PBF_DATA_DIR=D:/osm-data/vietnam
PBF_FILENAME=vietnam-latest.osm.pbf
```

Rồi chạy đúng 3 lệnh:

```powershell
docker compose run --rm downloader
docker compose run --rm importer
docker compose up -d api
```

`importer` sẽ tự:

- kiểm tra file `.pbf` trong volume local
- dùng style `speed_roads.lua` đã đóng gói sẵn trong image
- `DROP TABLE public.speed_roads` cũ nếu đã có
- import lại bằng `osm2pgsql`
- tự kéo `db` lên nếu dependency chưa chạy

Xem log:

```powershell
npm run docker:logs
```

## API

### `GET /api/speed-limit`

Ví dụ:

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

## Response mẫu

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

## Ghi chú dữ liệu

- API trả road gần nhất trong bán kính tìm kiếm và ưu tiên road có `maxspeed` explicit.
- `road.name` là tên gốc của segment OSM; `road.displayName` là tên hiển thị sau khi fallback sang segment lân cận, `ref`, hoặc nhãn kiểu `Unnamed service`.
- `heading` là optional, nhưng nếu app navigation gửi được thì API sẽ chọn đúng `maxspeed:forward` hoặc `maxspeed:backward` tốt hơn.
- Nếu road gần nhất không có `maxspeed` trong OSM thì `road.speedLimit` sẽ là `null`.
- Dữ liệu tốc độ phụ thuộc chất lượng tag OSM ở từng khu vực.

## Chạy local không Docker

```powershell
npm install
Copy-Item .env.example .env
npm start
```

## Lệnh hữu ích

```powershell
npm run docker:download
npm run docker:import
npm run docker:up
npm run docker:down
npm test
```
