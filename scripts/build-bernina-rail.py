import json
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

OUTPUT = (
    ROOT
    / "trips"
    / "the-long-way-around"
    / "routes"
    / "day-12-rail.geojson"
)

OVERPASS_URL = (
    "https://overpass-api.de/api/interpreter"
)

BERNINA_RELATION = 89842


query = f"""
[out:json][timeout:90];

relation({BERNINA_RELATION});
out body;

way(r);
out geom;
"""


data = urllib.parse.urlencode({
    "data": query
}).encode("utf-8")


request = urllib.request.Request(
    OVERPASS_URL,
    data=data,
    headers={
        "User-Agent":
            "PostcardsFromBen/1.0"
    },
    method="POST",
)


print(
    "Downloading Bernina railway geometry..."
)


with urllib.request.urlopen(
    request,
    timeout=120,
) as response:

    result = json.loads(
        response.read().decode(
            "utf-8"
        )
    )


relation = next(
    (
        element
        for element in result["elements"]
        if (
            element["type"] == "relation"
            and element["id"]
                == BERNINA_RELATION
        )
    ),
    None,
)


if not relation:
    raise SystemExit(
        "Bernina relation was not returned."
    )


ways = {
    element["id"]: element
    for element in result["elements"]
    if (
        element["type"] == "way"
        and element.get("geometry")
    )
}


member_way_ids = [
    member["ref"]
    for member in relation["members"]
    if member["type"] == "way"
]


segments = []

for way_id in member_way_ids:

    way = ways.get(way_id)

    if not way:
        continue

    coords = [
        [
            point["lon"],
            point["lat"],
        ]
        for point in way["geometry"]
    ]

    if len(coords) >= 2:
        segments.append(coords)


if not segments:
    raise SystemExit(
        "No Bernina railway segments found."
    )


# =====================================
# CONNECT SEGMENTS IN ROUTE ORDER
# =====================================

rail_coordinates = []


def distance(a, b):

    return (
        (a[0] - b[0]) ** 2
        + (a[1] - b[1]) ** 2
    )


for segment in segments:

    if not rail_coordinates:

        rail_coordinates.extend(
            segment
        )

        continue


    previous = rail_coordinates[-1]


    normal_distance = distance(
        previous,
        segment[0],
    )


    reverse_distance = distance(
        previous,
        segment[-1],
    )


    if reverse_distance < normal_distance:
        segment.reverse()


    if (
        rail_coordinates[-1]
        == segment[0]
    ):

        rail_coordinates.extend(
            segment[1:]
        )

    else:

        rail_coordinates.extend(
            segment
        )


geojson = {
    "type": "FeatureCollection",

    "properties": {
        "dayNumber": 12,
        "title":
            "The Bernina Express",
        "source":
            "OpenStreetMap relation 89842",
    },

    "features": [
        {
            "type": "Feature",

            "properties": {
                "mode": "train",
                "fromName": "Tirano",
                "toName": "St. Moritz",
            },

            "geometry": {
                "type": "LineString",
                "coordinates":
                    rail_coordinates,
            },
        }
    ],
}


OUTPUT.parent.mkdir(
    parents=True,
    exist_ok=True,
)


OUTPUT.write_text(
    json.dumps(
        geojson,
        indent=2,
        ensure_ascii=False,
    )
    + "\n"
)


print(
    f"Saved {OUTPUT.relative_to(ROOT)}"
)

print(
    f"Rail coordinates: "
    f"{len(rail_coordinates)}"
)

print(
    "Bernina railway geometry complete."
)