/* =====================================
   POSTCARDS FROM BEN
   Master Trip Map — MapLibre
===================================== */

const MAPLIBRE_VERSION = "6.11.2";

const MAP_STYLE =
    "https://tiles.openfreemap.org/styles/dark";


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
            (day.stops || []).filter(stop =>
                Number.isFinite(
                    Number(stop.latitude)
                ) &&
                Number.isFinite(
                    Number(stop.longitude)
                )
            );


        if (mappedStops.length === 0) {
            continue;
        }



        const coordinates =
            mappedStops.map(stop => {

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


                return coordinate;

            });



        /* =====================================
           ROUTE SEGMENT
        ===================================== */

        if (
            coordinates.length > 1 &&
            dayReference.mode !== "local"
        ) {

            routeFeatures.push({

                type: "Feature",

                properties: {

                    mode:
                        dayReference.mode ||
                        "drive",

                    dayNumber:
                        day.dayNumber,

                    title:
                        day.title

                },

                geometry: {

                    type: "LineString",

                    coordinates

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



    /* =====================================
       CONTROLS
    ===================================== */

    map.addControl(

        new maplibregl.NavigationControl({
            visualizePitch: true
        }),

        "top-right"

    );


    if (maplibregl.GlobeControl) {

        map.addControl(

            new maplibregl.GlobeControl(),

            "top-right"

        );

    }



    /* =====================================
       GLOBE VIEW
    ===================================== */

    map.on(
        "style.load",
        () => {

            map.setProjection({
                type: "globe"
            });

        }
    );



    /* =====================================
       ROUTES + MARKERS
    ===================================== */

    map.on(
        "load",
        () => {


            /* -------------------------
               ROUTE DATA
            ------------------------- */

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



            /* -------------------------
               DRIVING
            ------------------------- */

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
                        "#f6f4ef",

                    "line-width":
                        3.5,

                    "line-opacity":
                        0.9

                }

            });



            /* -------------------------
               TRAIN
            ------------------------- */

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
                        "#f6f4ef",

                    "line-width":
                        4,

                    "line-opacity":
                        0.95,

                    "line-dasharray":
                        [2, 2]

                }

            });



            /* -------------------------
               FLIGHT
            ------------------------- */

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
                        "#f6f4ef",

                    "line-width":
                        3,

                    "line-opacity":
                        0.8,

                    "line-dasharray":
                        [6, 4]

                }

            });



            /* -------------------------
               CABLE CAR
            ------------------------- */

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
                        "#f6f4ef",

                    "line-width":
                        3,

                    "line-opacity":
                        0.9,

                    "line-dasharray":
                        [1, 3]

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
                    item.stop.description;



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