import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path


# =====================================
# PATHS
# =====================================

ROOT = Path(__file__).resolve().parents[1]

TRIP_DIR = (
    ROOT
    / "trips"
    / "the-long-way-around"
)

DATA_DIR = TRIP_DIR / "data"
ROUTES_DIR = TRIP_DIR / "routes"

TRIP_FILE = TRIP_DIR / "trip.json"


# =====================================
# OPENROUTESERVICE
# =====================================

API_BASE = (
    "https://api.heigit.org/"
    "openrouteservice/v2/directions"
)

PROFILES = {
    "drive": "driving-car",
    "walk": "foot-walking",
}

ROUTABLE_MODES = {
    "drive",
    "walk",
}


# =====================================
# HELPERS
# =====================================

def has_coordinates(stop):
    try:
        float(stop["latitude"])
        float(stop["longitude"])
        return True

    except (
        KeyError,
        TypeError,
        ValueError,
    ):
        return False


def coordinate(stop):
    return [
        float(stop["longitude"]),
        float(stop["latitude"]),
    ]


def route_mode(stop, default_mode):
    return (
        stop.get("transportToNext")
        or default_mode
        or "drive"
    )


def request_route(
    api_key,
    mode,
    coordinates,
):
    profile = PROFILES[mode]

    url = (
        f"{API_BASE}/"
        f"{profile}/geojson"
    )

    payload = {
        "coordinates": coordinates,
    }

    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(
            "utf-8"
        ),
        headers={
            "Authorization": api_key,
            "Content-Type": "application/json",
            "Accept": "application/geo+json",
        },
        method="POST",
    )

    with urllib.request.urlopen(
        request,
        timeout=90,
    ) as response:

        result = json.loads(
            response.read().decode(
                "utf-8"
            )
        )

    features = result.get(
        "features",
        []
    )

    if not features:
        raise RuntimeError(
            "Routing service returned "
            "no route geometry."
        )

    return features[0]


# =====================================
# FIND ROUTABLE GROUPS
# =====================================

def build_groups(
    stops,
    default_mode,
):
    groups = []

    i = 0

    while i < len(stops) - 1:

        from_stop = stops[i]
        to_stop = stops[i + 1]

        mode = route_mode(
            from_stop,
            default_mode,
        )

        if (
            mode not in ROUTABLE_MODES
            or not has_coordinates(
                from_stop
            )
            or not has_coordinates(
                to_stop
            )
        ):
            i += 1
            continue


        start_index = i

        coordinates = [
            coordinate(from_stop)
        ]

        names = [
            from_stop.get(
                "name",
                f"Stop {i + 1}",
            )
        ]


        j = i

        while j < len(stops) - 1:

            current_from = stops[j]
            current_to = stops[j + 1]

            current_mode = route_mode(
                current_from,
                default_mode,
            )

            if current_mode != mode:
                break

            if (
                not has_coordinates(
                    current_from
                )
                or not has_coordinates(
                    current_to
                )
            ):
                break


            coordinates.append(
                coordinate(current_to)
            )

            names.append(
                current_to.get(
                    "name",
                    f"Stop {j + 2}",
                )
            )

            j += 1


        groups.append({
            "mode": mode,
            "startIndex":
                start_index,
            "endIndex":
                j,
            "coordinates":
                coordinates,
            "names":
                names,
        })


        i = j


    return groups


# =====================================
# MAIN
# =====================================

def main():

    api_key = os.environ.get(
        "ORS_API_KEY"
    )

    if not api_key:
        raise SystemExit(
            "\nORS_API_KEY is not set.\n"
            "Load it into Terminal first."
        )


    ROUTES_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )


    trip = json.loads(
        TRIP_FILE.read_text()
    )


    failures = []
    total_routes = 0


    for day_reference in trip["days"]:

        relative_file = Path(
            day_reference["file"]
        )

        day_path = (
            TRIP_DIR
            / relative_file
        )

        day = json.loads(
            day_path.read_text()
        )

        stops = day.get(
            "stops",
            []
        )

        default_mode = (
            day_reference.get(
                "mode"
            )
        )


        groups = build_groups(
            stops,
            default_mode,
        )


        output_path = (
            ROUTES_DIR
            / (
                relative_file.stem
                + ".geojson"
            )
        )


        if not groups:

            if output_path.exists():
                output_path.unlink()

            print(
                f"Day "
                f"{day.get('dayNumber')}: "
                f"no drive/walk routes"
            )

            continue


        print()
        print(
            f"Day "
            f"{day.get('dayNumber')} "
            f"— {day.get('title')}"
        )


        route_features = []


        for group in groups:

            mode = group["mode"]

            print(
                f"  {mode.upper()}: "
                f"{' → '.join(group['names'])}"
            )


            try:

                feature = request_route(
                    api_key,
                    mode,
                    group["coordinates"],
                )


                properties = (
                    feature.get(
                        "properties",
                        {}
                    )
                )

                summary = (
                    properties.get(
                        "summary",
                        {}
                    )
                )


                route_features.append({
                    "type": "Feature",

                    "properties": {
                        "mode":
                            mode,

                        "fromStopIndex":
                            group[
                                "startIndex"
                            ],

                        "toStopIndex":
                            group[
                                "endIndex"
                            ],

                        "fromName":
                            group[
                                "names"
                            ][0],

                        "toName":
                            group[
                                "names"
                            ][-1],

                        "waypointNames":
                            group[
                                "names"
                            ],

                        "distanceMeters":
                            summary.get(
                                "distance"
                            ),

                        "durationSeconds":
                            summary.get(
                                "duration"
                            ),
                    },

                    "geometry":
                        feature[
                            "geometry"
                        ],
                })


                total_routes += 1

                print(
                    "    ✓ route received"
                )


            except (
                urllib.error.HTTPError,
                urllib.error.URLError,
                RuntimeError,
            ) as error:

                message = str(error)

                if isinstance(
                    error,
                    urllib.error.HTTPError,
                ):

                    try:
                        body = (
                            error.read()
                            .decode("utf-8")
                        )

                        message += (
                            f"\n      {body}"
                        )

                    except Exception:
                        pass


                failures.append(
                    (
                        day.get(
                            "dayNumber"
                        ),
                        group["names"],
                        message,
                    )
                )

                print(
                    f"    ✗ ERROR: "
                    f"{message}"
                )


            # Be polite to the API.
            time.sleep(0.25)


        collection = {
            "type":
                "FeatureCollection",

            "properties": {
                "dayNumber":
                    day.get(
                        "dayNumber"
                    ),

                "title":
                    day.get(
                        "title"
                    ),
            },

            "features":
                route_features,
        }


        output_path.write_text(
            json.dumps(
                collection,
                indent=2,
                ensure_ascii=False,
            )
            + "\n"
        )

        print(
            f"  Saved: "
            f"{output_path.relative_to(ROOT)}"
        )


    print()
    print("=" * 50)

    print(
        f"Generated "
        f"{total_routes} "
        f"real route group(s)."
    )


    if failures:

        print()
        print(
            f"{len(failures)} "
            f"route request(s) failed:"
        )

        for (
            day_number,
            names,
            message,
        ) in failures:

            print(
                f"  Day {day_number}: "
                f"{' → '.join(names)}"
            )

            print(
                f"    {message}"
            )

        raise SystemExit(1)


    print()
    print(
        "All driving and walking "
        "routes generated successfully."
    )


if __name__ == "__main__":
    main()