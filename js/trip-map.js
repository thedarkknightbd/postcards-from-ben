/* =====================================
   POSTCARDS FROM BEN
   Master Trip Map — MapLibre
===================================== */

const MAPLIBRE_VERSION = "6.11.2";

const MAP_STYLE =
    "https://tiles.openfreemap.org/styles/bright";


async function loadMapLibre() {

    return await import(
        `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.mjs`
    );

}


async function loadTripMap() {

    const mapElement =
        document.getElementById("trip-map");

    if (!mapElement) {
        return;
    }


    const tripSource =
        mapElement.dataset.tripSource;

    if (!tripSource) {

        console.error(
            "No trip data source was specified."
        );

        return;
    }


    let tripData;
    let maplibregl;


    try {

        maplibregl =
            await loadMapLibre();

        const response =
            await fetch(tripSource);

        if (!response.ok) {

            throw new Error(
                `Could not load trip data: ${response.status}`
            );

        }

        tripData =
            await response.json();

    } catch (error) {

        console.error(
            "Unable to load trip map:",
            error
        );

        return;
    }


    /* =====================================
       COLLECT ROUTES + STOPS
    ===================================== */

    const routeFeatures = [];
    const markerStops = [];

    const bounds =
        new maplibregl.LngLatBounds();


    for (const dayReference of tripData.days) {

        let day;

        try {

            const response =
                await fetch(dayReference.file);

            if (!response.ok) {
                continue;
            }

            day =
                await response.json();

        } catch (error) {

            console.warn(
                "Skipping unavailable day:",
                dayReference.file
            );

            continue;
        }


        const mappedStops =
            (day.stops || [])
                .map((stop, index) => ({
                    stop,
                    index
                }))
                .filter(item =>
                    Number.isFinite(
                        Number(item.stop.latitude)
                    ) &&
                    Number.isFinite(
                        Number(item.stop.longitude)
                    )
                );


        if (mappedStops.length === 0) {
            continue;
        }


        mappedStops.forEach(
            ({ stop }) => {

                const coordinate = [
                    Number(stop.longitude),
                    Number(stop.latitude)
                ];

                bounds.extend(
                    coordinate
                );

                markerStops.push({
                    coordinate,
                    stop,
                    day
                });

            }
        );


        /* =====================================
           INDIVIDUAL TRANSPORT SEGMENTS
        ===================================== */

        for (
            let i = 0;
            i < mappedStops.length - 1;
            i++
        ) {

            const fromStop =
                mappedStops[i].stop;

            const toStop =
                mappedStops[i + 1].stop;

            const mode =
                fromStop.transportToNext ||
                dayReference.mode ||
                "drive";


            /*
             * Local days can have markers without
             * needing a route line.
             */

            if (mode === "local") {
                continue;
            }


            routeFeatures.push({

                type: "Feature",

                properties: {
                    mode,
                    dayNumber:
                        day.dayNumber,
                    title:
                        day.title
                },

                geometry: {
                    type: "LineString",

                    coordinates: [
                        [
                            Number(fromStop.longitude),
                            Number(fromStop.latitude)
                        ],
                        [
                            Number(toStop.longitude),
                            Number(toStop.latitude)
                        ]
                    ]
                }

            });

        }

    }


    /* =====================================
       CREATE MAP
    ===================================== */

    const map =
        new maplibregl.Map({

            container:
                "trip-map",

            style:
                MAP_STYLE,

            center:
                [-20, 42],

            zoom:
                1.5,

            maxPitch:
                70,

            canvasContextAttributes: {
                antialias: true
            }

        });


    map.addControl(

        new maplibregl.NavigationControl({
            visualizePitch: true
        }),

        "top-right"

    );


    /* =====================================
       ROUTES + MARKERS
    ===================================== */

    map.on(
        "load",
        () => {


            map.addSource(
                "trip-routes",
                {

                    type: "geojson",

                    data: {
                        type:
                            "FeatureCollection",

                        features:
                            routeFeatures
                    }

                }
            );


            /* =====================================
               WHITE HALO
            ===================================== */

            map.addLayer({

                id:
                    "trip-route-halo",

                type:
                    "line",

                source:
                    "trip-routes",

                layout: {
                    "line-cap":
                        "round",

                    "line-join":
                        "round"
                },

                paint: {
                    "line-color":
                        "#ffffff",

                    "line-width":
                        8,

                    "line-opacity":
                        0.9
                }

            });


            /* =====================================
               DRIVE — LIGHT BLUE / SOLID
            ===================================== */

            map.addLayer({

                id:
                    "trip-route-drive",

                type:
                    "line",

                source:
                    "trip-routes",

                filter: [
                    "==",
                    ["get", "mode"],
                    "drive"
                ],

                layout: {
                    "line-cap":
                        "round",

                    "line-join":
                        "round"
                },

                paint: {
                    "line-color":
                        "#2D9CDB",

                    "line-width":
                        5,

                    "line-opacity":
                        1
                }

            });


            /* =====================================
               WALK — CHARCOAL / DOTTED
            ===================================== */

            map.addLayer({

                id:
                    "trip-route-walk",

                type:
                    "line",

                source:
                    "trip-routes",

                filter: [
                    "==",
                    ["get", "mode"],
                    "walk"
                ],

                layout: {
                    "line-cap":
                        "round",

                    "line-join":
                        "round"
                },

                paint: {
                    "line-color":
                        "#30343B",

                    "line-width":
                        4.5,

                    "line-opacity":
                        1,

                    "line-dasharray":
                        [0.5, 2.5]
                }

            });


            /* =====================================
               TRAIN — RED / SHORT DASHES
            ===================================== */

            map.addLayer({

                id:
                    "trip-route-train",

                type:
                    "line",

                source:
                    "trip-routes",

                filter: [
                    "==",
                    ["get", "mode"],
                    "train"
                ],

                layout: {
                    "line-cap":
                        "round",

                    "line-join":
                        "round"
                },

                paint: {
                    "line-color":
                        "#D62828",

                    "line-width":
                        5,

                    "line-opacity":
                        1,

                    "line-dasharray":
                        [2, 2]
                }

            });


            /* =====================================
               FLIGHT — GOLD / LONG DASHES
            ===================================== */

            map.addLayer({

                id:
                    "trip-route-flight",

                type:
                    "line",

                source:
                    "trip-routes",

                filter: [
                    "==",
                    ["get", "mode"],
                    "flight"
                ],

                layout: {
                    "line-cap":
                        "round",

                    "line-join":
                        "round"
                },

                paint: {
                    "line-color":
                        "#E9B949",

                    "line-width":
                        5,

                    "line-opacity":
                        1,

                    "line-dasharray":
                        [6, 4]
                }

            });


            /* =====================================
               CABLE — GREEN
            ===================================== */

            map.addLayer({

                id:
                    "trip-route-cable",

                type:
                    "line",

                source:
                    "trip-routes",

                filter: [
                    "==",
                    ["get", "mode"],
                    "cable"
                ],

                layout: {
                    "line-cap":
                        "round",

                    "line-join":
                        "round"
                },

                paint: {
                    "line-color":
                        "#2A9D6F",

                    "line-width":
                        7,

                    "line-opacity":
                        1
                }

            });


            /* White dotted cable detail */

            map.addLayer({

                id:
                    "trip-route-cable-detail",

                type:
                    "line",

                source:
                    "trip-routes",

                filter: [
                    "==",
                    ["get", "mode"],
                    "cable"
                ],

                layout: {
                    "line-cap":
                        "round",

                    "line-join":
                        "round"
                },

                paint: {
                    "line-color":
                        "#ffffff",

                    "line-width":
                        2,

                    "line-opacity":
                        0.95,

                    "line-dasharray":
                        [0.5, 2.2]
                }

            });


            /* =====================================
               MARKERS
            ===================================== */

            markerStops.forEach(item => {

                const marker =
                    document.createElement(
                        "button"
                    );

                marker.type =
                    "button";

                marker.className =
                    "trip-map-marker";

                marker.setAttribute(
                    "aria-label",
                    `Day ${item.day.dayNumber}: ${item.stop.name}`
                );


                const popup =
                    document.createElement(
                        "div"
                    );

                popup.className =
                    "trip-map-popup";


                const heading =
                    document.createElement(
                        "strong"
                    );

                heading.textContent =
                    `Day ${item.day.dayNumber} · ${item.day.title}`;


                const location =
                    document.createElement(
                        "div"
                    );

                location.className =
                    "trip-map-popup-location";

                location.textContent =
                    item.stop.name;


                const description =
                    document.createElement(
                        "p"
                    );

                description.textContent =
                    item.stop.description || "";


                popup.append(
                    heading,
                    location,
                    description
                );


                new maplibregl.Marker({
                    element: marker
                })
                    .setLngLat(
                        item.coordinate
                    )
                    .setPopup(

                        new maplibregl.Popup({
                            offset: 16,
                            maxWidth: "300px"
                        })
                            .setDOMContent(
                                popup
                            )

                    )
                    .addTo(map);

            });


            /* =====================================
               FIT FULL JOURNEY
            ===================================== */

            if (!bounds.isEmpty()) {

                map.fitBounds(
                    bounds,
                    {

                        padding: {
                            top: 60,
                            right: 60,
                            bottom: 60,
                            left: 60
                        },

                        maxZoom:
                            6,

                        duration:
                            900

                    }
                );

            }

        }
    );

}


loadTripMap();
