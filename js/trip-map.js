/* =====================================
   POSTCARDS FROM BEN
   Master Trip Map
===================================== */

async function loadTripMap() {

    const mapElement =
        document.getElementById("trip-map");

    if (
        !mapElement ||
        typeof L === "undefined"
    ) {
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

    try {

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
       CREATE MAP
    ===================================== */

    const map =
        L.map("trip-map");


    L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,

            attribution:
                '&copy; OpenStreetMap contributors'
        }
    ).addTo(map);



    const allCoordinates = [];



    /* =====================================
       LOAD EACH COMPLETED DAY
    ===================================== */

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
                Number.isFinite(stop.latitude) &&
                Number.isFinite(stop.longitude)
            );


        if (mappedStops.length === 0) {
            continue;
        }



        const dayCoordinates = [];



        /* =====================================
           MARKERS
        ===================================== */

        mappedStops.forEach(stop => {

            const coordinate = [
                stop.latitude,
                stop.longitude
            ];

            dayCoordinates.push(coordinate);
            allCoordinates.push(coordinate);


            const popup =
                document.createElement("div");


            const heading =
                document.createElement("strong");

            heading.textContent =
                `Day ${day.dayNumber} · ${day.title}`;


            const location =
                document.createElement("div");

            location.textContent =
                stop.name;


            const description =
                document.createElement("div");

            description.textContent =
                stop.description;


            popup.append(
                heading,
                location,
                description
            );


            L.marker(coordinate)
                .addTo(map)
                .bindPopup(popup);

        });



        /* =====================================
           ROUTE LINE
        ===================================== */

        if (dayCoordinates.length > 1) {

            const routeOptions = {
                weight: 4,
                opacity: 0.8
            };


            /*
             Flight = dashed
             Train = shorter dashes
             Driving = solid
            */

            if (dayReference.mode === "flight") {

                routeOptions.dashArray =
                    "10 12";

            }

            if (dayReference.mode === "train") {

                routeOptions.dashArray =
                    "4 8";

            }


            L.polyline(
                dayCoordinates,
                routeOptions
            ).addTo(map);

        }

    }



    /* =====================================
       FIT ENTIRE TRIP INTO VIEW
    ===================================== */

    if (allCoordinates.length > 1) {

        map.fitBounds(
            allCoordinates,
            {
                padding: [40, 40]
            }
        );

    } else if (allCoordinates.length === 1) {

        map.setView(
            allCoordinates[0],
            8
        );

    }

}

loadTripMap();