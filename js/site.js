/* =====================================
   POSTCARDS FROM BEN
   Interactive Maps
===================================== */

const dayMap = document.getElementById("day-map");

if (dayMap && typeof L !== "undefined") {

    const map = L.map("day-map");

    L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        }
    ).addTo(map);


    // Day 1 locations

    const fortWorth = [32.7555, -97.3308];
    const detroit = [42.3314, -83.0458];
    const munich = [48.1351, 11.5820];


    // Markers

    L.marker(fortWorth)
        .addTo(map)
        .bindPopup(
            "<strong>Fort Worth, Texas</strong><br>The Long Way Around begins here."
        );

    L.marker(detroit)
        .addTo(map)
        .bindPopup(
            "<strong>Detroit, Michigan</strong><br>Connection for Munich."
        );

    L.marker(munich)
        .addTo(map)
        .bindPopup(
            "<strong>Munich, Germany</strong><br>Arrival in Europe."
        );


    // Route

    const route = L.polyline(
        [
            fortWorth,
            detroit,
            munich
        ],
        {
            weight: 4,
            opacity: 0.8
        }
    ).addTo(map);


    // Automatically show the entire adventure

    map.fitBounds(
        route.getBounds(),
        {
            padding: [35, 35]
        }
    );
}