local drivable_highways = {
  motorway = true,
  motorway_link = true,
  trunk = true,
  trunk_link = true,
  primary = true,
  primary_link = true,
  secondary = true,
  secondary_link = true,
  tertiary = true,
  tertiary_link = true,
  unclassified = true,
  residential = true,
  living_street = true,
  service = true,
  road = true
}

local speed_roads = osm2pgsql.define_way_table('speed_roads', {
  { column = 'osm_id', type = 'bigint', not_null = true },
  { column = 'name', type = 'text' },
  { column = 'ref', type = 'text' },
  { column = 'highway', type = 'text', not_null = true },
  { column = 'maxspeed', type = 'text' },
  { column = 'maxspeed_forward', type = 'text' },
  { column = 'maxspeed_backward', type = 'text' },
  { column = 'maxspeed_type', type = 'text' },
  { column = 'source_maxspeed', type = 'text' },
  { column = 'oneway', type = 'int2' },
  { column = 'tags', type = 'jsonb' },
  { column = 'geom', type = 'linestring', projection = 4326, not_null = true }
}, { schema = 'public' })

function osm2pgsql.process_way(object)
  local highway = object.tags.highway

  if not highway or not drivable_highways[highway] then
    return
  end

  speed_roads:insert({
    osm_id = object.id,
    name = object.tags.name,
    ref = object.tags.ref,
    highway = highway,
    maxspeed = object.tags.maxspeed,
    maxspeed_forward = object.tags["maxspeed:forward"],
    maxspeed_backward = object.tags["maxspeed:backward"],
    maxspeed_type = object.tags["maxspeed:type"],
    source_maxspeed = object.tags["source:maxspeed"],
    oneway = object.tags.oneway == '-1' and -1 or object.tags.oneway == 'yes' and 1 or 0,
    tags = {
      ["source:maxspeed"] = object.tags["source:maxspeed"],
      ["maxspeed:conditional"] = object.tags["maxspeed:conditional"],
      lanes = object.tags.lanes,
      surface = object.tags.surface,
      bridge = object.tags.bridge,
      tunnel = object.tags.tunnel
    },
    geom = object:as_linestring()
  })
end
