import * as maplibregl from "https://unpkg.com/maplibre-gl@6.11.2/dist/maplibre-gl.mjs";

/* =====================================
   POSTCARDS FROM BEN
   Shared Day Page Engine
===================================== */

function optimizedPhotoUrl(source, width, quality = 82) {
    return `/cdn-cgi/image/format=auto,width=${width},quality=${quality}/${source}`;
}

function applyOptimizedImage(image, source, width, quality = 82) {
    image.onerror = () => {
        image.onerror = null;
        image.src = source;
    };

    image.src = optimizedPhotoUrl(source, width, quality);
}

async function loadDayPage() {

    const source = document.body.dataset.daySource;

    if (!source) {
        console.error("No day data source was specified.");
        return;
    }

    let data;

    try {
        const response = await fetch(source);

        if (!response.ok) {
            throw new Error(
                `Could not load day data: ${response.status}`
            );
        }

        data = await response.json();

    } catch (error) {
        console.error("Unable to load day JSON:", error);
        return;
    }


    /* =====================================
       DETAILED ROAD / WALK GEOMETRY
    ===================================== */

    let detailedRouteData = null;
    let railRouteData = null;

    try {

        const routeSource =
            source
                .replace("../data/", "../routes/")
                .replace(".json", ".geojson");

        const routeResponse =
            await fetch(routeSource);

        if (routeResponse.ok) {

            detailedRouteData =
                await routeResponse.json();

        }

    } catch (error) {

        console.warn(
            "Detailed route geometry unavailable:",
            error
        );

    }


    /* =====================================
       DETAILED RAIL GEOMETRY
    ===================================== */

    try {

        const railSource =
            source
                .replace("../data/", "../routes/")
                .replace(".json", "-rail.geojson");

        const railResponse =
            await fetch(railSource);

        if (railResponse.ok) {

            railRouteData =
                await railResponse.json();

        }

    } catch (error) {

        console.warn(
            "Detailed rail geometry unavailable:",
            error
        );

    }


    /* =====================================
       PAGE TITLE / HERO
    ===================================== */

    document.title =
        `Day ${data.dayNumber} — ${data.title} | Postcards from Ben`;

    document.getElementById("day-label").textContent =
        `Day ${data.dayNumber} · ${data.date}`;

    document.getElementById("day-title").textContent =
        data.title;

    document.getElementById("day-route").textContent =
        data.route;


    /* =====================================
       QUICK FACTS
    ===================================== */

    const factsContainer =
        document.getElementById("day-facts");

    factsContainer.innerHTML = "";

    (data.facts || []).forEach(fact => {

        const item = document.createElement("div");
        item.className = "fact";

        const icon = document.createElement("span");
        icon.className = "fact-icon";
        icon.textContent = fact.icon;

        const content = document.createElement("div");

        const label = document.createElement("span");
        label.className = "fact-label";
        label.textContent = fact.label;

        const value = document.createElement("span");
        value.className = "fact-value";
        value.textContent = fact.value;

        content.append(label, value);
        item.append(icon, content);

        factsContainer.appendChild(item);
    });


    /* =====================================
       INTRODUCTION
    ===================================== */

    document.getElementById("intro-title").textContent =
        data.introTitle || "";

    document.getElementById("intro-text").textContent =
        data.intro || "";


    /* =====================================
       STOPS
    ===================================== */

    const stopList =
        document.getElementById("stop-list");

    stopList.innerHTML = "";

    const stops = data.stops || [];

    stops.forEach((stop, index) => {

        const card = document.createElement("article");
        card.className = "stop-card";
        card.dataset.stopIndex = index;

        const number = document.createElement("div");
        number.className = "stop-number";
        number.textContent =
            String(index + 1).padStart(2, "0");

        const content = document.createElement("div");
        content.className = "stop-content";

        const type = document.createElement("p");
        type.className = "stop-type";
        type.textContent = stop.type;

        const name = document.createElement("h3");
        name.textContent = stop.name;

        const description = document.createElement("p");
        description.textContent = stop.description;

        content.append(type, name, description);

        const hasCoordinates =
            Number.isFinite(Number(stop.latitude)) &&
            Number.isFinite(Number(stop.longitude));

        if (hasCoordinates) {

            const mapButton =
                document.createElement("button");

            mapButton.type = "button";
            mapButton.className = "view-on-map";
            mapButton.dataset.stopIndex = index;
            mapButton.textContent = "📍 View on map";

            content.appendChild(mapButton);
        }
        card.append(number, content);

        stopList.appendChild(card);
    });


    /* =====================================
       INTERACTIVE MAP — MAPLIBRE
    ===================================== */

    document.getElementById("map-title").textContent =
        data.route;

    const mappedStops = stops
        .map((stop, index) => ({
            stop,
            index
        }))
        .filter(item =>
            Number.isFinite(Number(item.stop.latitude)) &&
            Number.isFinite(Number(item.stop.longitude))
        );

    if (
        typeof maplibregl !== "undefined" &&
        mappedStops.length > 0
    ) {

        const firstStop = mappedStops[0].stop;

        const map = new maplibregl.Map({
            container: "day-map",
            style: "https://tiles.openfreemap.org/styles/bright",
            center: [
                Number(firstStop.longitude),
                Number(firstStop.latitude)
            ],
            zoom: 7
        });

        map.addControl(
            new maplibregl.NavigationControl({
                showCompass: false
            }),
            "top-right"
        );

        const bounds =
            new maplibregl.LngLatBounds();

        const coordinates = [];

        const stopMarkers = new Map();



        mappedStops.forEach(({ stop, index }) => {

            const coordinate = [
                Number(stop.longitude),
                Number(stop.latitude)
            ];

            coordinates.push(coordinate);
            bounds.extend(coordinate);

            const popupContent =
                document.createElement("div");

            const title =
                document.createElement("strong");

            title.textContent = stop.name;

            const description =
                document.createElement("p");

            description.textContent =
                stop.description || "";

            popupContent.append(
                title,
                description
            );

            const markerElement =
                document.createElement("button");

            markerElement.type =
                "button";

            markerElement.className =
                "day-map-marker";

            markerElement.textContent =
                String(index + 1).padStart(2, "0");

            markerElement.setAttribute(
                "aria-label",
                `View ${stop.name}`
            );


            const marker =
                new maplibregl.Marker({
                element: markerElement,
                anchor: "center"
            })
                .setLngLat(coordinate)
                .setPopup(
                    new maplibregl.Popup({
                        offset: 24,
                        maxWidth: "300px"
                    }).setDOMContent(
                        popupContent
                    )
                )
                .addTo(map);

            stopMarkers.set(index, marker);

        });


        /* =====================================
           VIEW ON MAP
        ===================================== */

        stopList.addEventListener("click", event => {

            const button =
                event.target.closest(".view-on-map");

            if (!button) {
                return;
            }

            const index =
                Number(button.dataset.stopIndex);

            const stop =
                stops[index];

            const marker =
                stopMarkers.get(index);

            if (!stop || !marker) {
                return;
            }


            document
                .querySelectorAll(".stop-card.is-map-active")
                .forEach(card =>
                    card.classList.remove("is-map-active")
                );


            const card =
                document.querySelector(
                    `[data-stop-index="${index}"]`
                );

            if (card) {
                card.classList.add("is-map-active");
            }


            document
                .getElementById("map-section")
                .scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });


            window.setTimeout(() => {

                map.flyTo({
                    center: [
                        Number(stop.longitude),
                        Number(stop.latitude)
                    ],

                    zoom: Math.max(
                        map.getZoom(),
                        11
                    ),

                    duration: 900,
                    essential: true
                });


                const popup =
                    marker.getPopup();

                if (
                    popup &&
                    !popup.isOpen()
                ) {
                    marker.togglePopup();
                }

            }, 450);

        });


        map.on("load", () => {

            if (coordinates.length > 1) {

                /* =====================================
                   BUILD INDIVIDUAL ROUTE SEGMENTS
                ===================================== */

                const routeFeatures = [];

                const coveredSegments =
                    new Set();


                /* -------------------------
                   REAL DRIVE / WALK ROUTES
                ------------------------- */

                if (
                    detailedRouteData &&
                    Array.isArray(
                        detailedRouteData.features
                    )
                ) {

                    detailedRouteData.features.forEach(
                        feature => {

                            const properties =
                                feature.properties || {};

                            const startIndex =
                                Number(
                                    properties.fromStopIndex
                                );

                            const endIndex =
                                Number(
                                    properties.toStopIndex
                                );

                            if (
                                Number.isFinite(startIndex) &&
                                Number.isFinite(endIndex)
                            ) {

                                for (
                                    let i = startIndex;
                                    i < endIndex;
                                    i++
                                ) {

                                    coveredSegments.add(i);

                                }

                            }

                            routeFeatures.push(
                                feature
                            );

                        }
                    );

                }


                /* -------------------------
                   REAL TRAIN ROUTE
                ------------------------- */

                if (
                    railRouteData &&
                    Array.isArray(
                        railRouteData.features
                    )
                ) {

                    railRouteData.features.forEach(
                        feature => {

                            routeFeatures.push(
                                feature
                            );

                        }
                    );

                }


                /* -------------------------
                   FALLBACK STRAIGHT ROUTES
                ------------------------- */

                for (
                    let i = 0;
                    i < mappedStops.length - 1;
                    i++
                ) {

                    const fromItem =
                        mappedStops[i];

                    const toItem =
                        mappedStops[i + 1];

                    const fromStop =
                        fromItem.stop;

                    const toStop =
                        toItem.stop;

                    const originalIndex =
                        fromItem.index;

                    if (
                        coveredSegments.has(
                            originalIndex
                        )
                    ) {
                        continue;
                    }


                    const mode =
                        fromStop.transportToNext ||
                        "drive";


                    if (
                        mode === "train" &&
                        railRouteData &&
                        Array.isArray(
                            railRouteData.features
                        ) &&
                        railRouteData.features.length > 0
                    ) {
                        continue;
                    }


                    routeFeatures.push({

                        type: "Feature",

                        properties: {
                            mode
                        },

                        geometry: {

                            type: "LineString",

                            coordinates: [
                                [
                                    Number(
                                        fromStop.longitude
                                    ),
                                    Number(
                                        fromStop.latitude
                                    )
                                ],
                                [
                                    Number(
                                        toStop.longitude
                                    ),
                                    Number(
                                        toStop.latitude
                                    )
                                ]
                            ]

                        }

                    });

                }


                map.addSource(
                    "day-route",
                    {
                        type: "geojson",

                        data: {
                            type: "FeatureCollection",
                            features: routeFeatures
                        }
                    }
                );


                /* =====================================
                   WHITE ROUTE HALO
                   Keeps every color visible
                ===================================== */

                map.addLayer({
                    id: "day-route-halo",

                    type: "line",

                    source: "day-route",

                    layout: {
                        "line-cap": "round",
                        "line-join": "round"
                    },

                    paint: {
                        "line-color": "#ffffff",
                        "line-width": 8,
                        "line-opacity": 0.92
                    }
                });


                /* =====================================
                   DRIVING — LIGHT BLUE / SOLID
                ===================================== */

                map.addLayer({
                    id: "day-route-drive",

                    type: "line",

                    source: "day-route",

                    filter: [
                        "==",
                        ["get", "mode"],
                        "drive"
                    ],

                    layout: {
                        "line-cap": "round",
                        "line-join": "round"
                    },

                    paint: {
                        "line-color": "#2D9CDB",
                        "line-width": 5,
                        "line-opacity": 1
                    }
                });


                /* =====================================
                   WALKING — CHARCOAL / DOTTED
                ===================================== */

                map.addLayer({
                    id: "day-route-walk",

                    type: "line",

                    source: "day-route",

                    filter: [
                        "==",
                        ["get", "mode"],
                        "walk"
                    ],

                    layout: {
                        "line-cap": "round",
                        "line-join": "round"
                    },

                    paint: {
                        "line-color": "#30343B",
                        "line-width": 4.5,
                        "line-opacity": 1,
                        "line-dasharray": [
                            0.5,
                            2.5
                        ]
                    }
                });


                /* =====================================
                   TRAIN — RED / SHORT DASHES
                ===================================== */

                map.addLayer({
                    id: "day-route-train",

                    type: "line",

                    source: "day-route",

                    filter: [
                        "==",
                        ["get", "mode"],
                        "train"
                    ],

                    layout: {
                        "line-cap": "round",
                        "line-join": "round"
                    },

                    paint: {
                        "line-color": "#D62828",
                        "line-width": 5,
                        "line-opacity": 1,
                        "line-dasharray": [
                            2,
                            2
                        ]
                    }
                });


                /* =====================================
                   FLIGHT — GOLD / LONG DASHES
                ===================================== */

                map.addLayer({
                    id: "day-route-flight",

                    type: "line",

                    source: "day-route",

                    filter: [
                        "==",
                        ["get", "mode"],
                        "flight"
                    ],

                    layout: {
                        "line-cap": "round",
                        "line-join": "round"
                    },

                    paint: {
                        "line-color": "#E9B949",
                        "line-width": 5,
                        "line-opacity": 1,
                        "line-dasharray": [
                            6,
                            4
                        ]
                    }
                });


                /* =====================================
   CABLE CAR — GREEN
===================================== */

map.addLayer({
    id: "day-route-cable",

    type: "line",

    source: "day-route",

    filter: [
        "==",
        ["get", "mode"],
        "cable"
    ],

    layout: {
        "line-cap": "round",
        "line-join": "round"
    },

    paint: {
        "line-color": "#2A9D6F",
        "line-width": 7,
        "line-opacity": 1
    }
});


/* White dotted center */

map.addLayer({
    id: "day-route-cable-detail",

    type: "line",

    source: "day-route",

    filter: [
        "==",
        ["get", "mode"],
        "cable"
    ],

    layout: {
        "line-cap": "round",
        "line-join": "round"
    },

    paint: {
        "line-color": "#FFFFFF",
        "line-width": 2,
        "line-opacity": 0.95,
        "line-dasharray": [
            0.5,
            2.2
        ]
    }
});


                map.fitBounds(
                    bounds,
                    {
                        padding: 55,
                        maxZoom: 11,
                        duration: 0
                    }
                );

            } else {

                map.jumpTo({
                    center: coordinates[0],
                    zoom: 11
                });

            }

        });

    }


   /* =====================================
   PHOTOS — AUTO-LOAD FROM R2 DAY FOLDER
===================================== */

const photosSection =
    document.getElementById("photos-section");

const photoGrid =
    document.getElementById("photo-grid");

photoGrid.innerHTML = "";

let pagePhotos = [];

try {

    const dayFolder =
        String(data.dayNumber).padStart(2, "0");

    const photoPrefix =
        `trips/the-long-way-around/days/day-${dayFolder}/`;

    const photoResponse =
        await fetch(
            `/api/r2?prefix=${encodeURIComponent(photoPrefix)}`
        );

    if (photoResponse.ok) {

        const photoData =
            await photoResponse.json();

        pagePhotos =
            Array.isArray(photoData.objects)
                ? photoData.objects.map(photo => ({
                    file: photo.url,
                    key: photo.key
                  }))
                : [];

    } else {

        console.warn(
            "R2 photo listing unavailable:",
            photoResponse.status
        );

    }

} catch (error) {

    console.warn(
        "Unable to load photos from R2:",
        error
    );

}


/* Fallback for any older JSON-managed photo entries */

if (
    pagePhotos.length === 0 &&
    Array.isArray(data.photos)
) {

    pagePhotos = data.photos;

}


if (pagePhotos.length > 0) {

    photosSection.hidden = false;

    pagePhotos.forEach((photo, index) => {

        const figure =
            document.createElement("figure");

        figure.className =
            "photo-item";


        const button =
            document.createElement("button");

        button.type = "button";
        button.className =
            "photo-lightbox-button";

        button.setAttribute(
            "aria-label",
            photo.caption
                ? `View photo: ${photo.caption}`
                : `View photo ${index + 1}`
        );


        const image =
            document.createElement("img");

        applyOptimizedImage(
            image,
            photo.file,
            1200,
            82
        );

        image.alt =
            photo.caption || "Travel photo";

        image.loading = "lazy";


        button.appendChild(image);

        figure.appendChild(button);


        if (photo.caption) {

            const caption =
                document.createElement("figcaption");

            caption.textContent =
                photo.caption;

            figure.appendChild(caption);
        }


        button.addEventListener(
            "click",
            () => {
                openLightbox(
                    pagePhotos,
                    index
                );
            }
        );


        photoGrid.appendChild(figure);
    });

} else {

    photosSection.hidden = true;

}


    /* =====================================
       JOURNAL
    ===================================== */

    const journalSection =
        document.getElementById("journal-section");

    const journalCard =
        document.getElementById("journal-card");

    journalCard.innerHTML = "";

    if (
        data.journal &&
        data.journal.trim() !== ""
    ) {

        journalSection.hidden = false;

        data.journal
            .split("\n")
            .filter(text => text.trim() !== "")
            .forEach(text => {

                const paragraph =
                    document.createElement("p");

                paragraph.textContent = text;

                journalCard.appendChild(paragraph);
            });

    } else {
        journalSection.hidden = true;
    }


    /* =====================================
       VIDEOS — AUTO-LOAD FROM R2
    ===================================== */

    const videoSection =
        document.getElementById("video-section");

    const videoGrid =
        document.getElementById("video-grid");

    videoGrid.innerHTML = "";

    let pageVideos = [];

    try {

        const dayFolder =
            String(data.dayNumber).padStart(2, "0");

        const videoPrefix =
            `trips/the-long-way-around/days/day-${dayFolder}/videos/`;

        const videoResponse =
            await fetch(
                `/api/r2?prefix=${encodeURIComponent(videoPrefix)}`
            );

        if (videoResponse.ok) {

            const videoData =
                await videoResponse.json();

            pageVideos =
                Array.isArray(videoData.objects)
                    ? videoData.objects
                    : [];

        } else {

            console.warn(
                "R2 video listing unavailable:",
                videoResponse.status
            );

        }

    } catch (error) {

        console.warn(
            "Unable to load videos from R2:",
            error
        );

    }


    if (pageVideos.length > 0) {

        videoSection.hidden = false;

        pageVideos.forEach((video, index) => {

            const wrapper =
                document.createElement("div");

            wrapper.className =
                "video-wrapper";

            const player =
                document.createElement("video");

            player.src =
                video.url;

            player.controls =
                true;

            player.preload =
                "metadata";

            player.playsInline =
                true;

            player.setAttribute(
                "aria-label",
                `Travel video ${index + 1}`
            );

            wrapper.appendChild(player);
            videoGrid.appendChild(wrapper);
        });

    } else if (
        Array.isArray(data.videos) &&
        data.videos.length > 0
    ) {

        /* Legacy YouTube entries remain supported if present. */

        videoSection.hidden = false;

        data.videos.forEach(video => {

            const wrapper =
                document.createElement("div");

            wrapper.className =
                "video-wrapper";

            const iframe =
                document.createElement("iframe");

            iframe.src =
                `https://www.youtube.com/embed/${video.youtubeId}`;

            iframe.title =
                video.title || "Travel video";

            iframe.loading = "lazy";
            iframe.allowFullscreen = true;

            wrapper.appendChild(iframe);
            videoGrid.appendChild(wrapper);
        });

    } else {

        videoSection.hidden = true;

    }


    /* =====================================
       NAVIGATION
    ===================================== */

    const navigation =
        document.getElementById("day-navigation");

    navigation.innerHTML = "";

    if (data.previousDay) {

        const previous =
            document.createElement("a");

        previous.href =
            data.previousDay;

        previous.textContent =
            "← Previous Day";

        navigation.appendChild(previous);

    } else {

        navigation.appendChild(
            document.createElement("span")
        );
    }

    const overview =
        document.createElement("a");

    overview.href =
        "../index.html";

    overview.className =
        "overview-link";

    overview.textContent =
        "Trip Overview";

    navigation.appendChild(overview);

    if (data.nextDay) {

        const next =
            document.createElement("a");

        next.href =
            data.nextDay;

        next.className =
            "next-day";

        next.textContent =
            "Next Day →";

        navigation.appendChild(next);
    }
}


/* =====================================
   PHOTO LIGHTBOX
===================================== */

let lightboxPhotos = [];
let lightboxIndex = 0;


function createLightbox() {

    if (
        document.getElementById(
            "photo-lightbox"
        )
    ) {
        return;
    }


    const lightbox =
        document.createElement("div");

    lightbox.id =
        "photo-lightbox";

    lightbox.className =
        "photo-lightbox";

    lightbox.hidden = true;


    lightbox.innerHTML = `
        <div class="lightbox-backdrop"></div>

        <div
            class="lightbox-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Photo viewer"
        >

            <button
                type="button"
                class="lightbox-close"
                aria-label="Close photo viewer"
            >
                ×
            </button>

            <button
                type="button"
                class="lightbox-nav lightbox-previous"
                aria-label="Previous photo"
            >
                ‹
            </button>

            <div class="lightbox-image-area">

                <img
                    id="lightbox-image"
                    src=""
                    alt=""
                >

                <p
                    id="lightbox-caption"
                    class="lightbox-caption">
                </p>

                <p
                    id="lightbox-counter"
                    class="lightbox-counter">
                </p>

                <a
                    id="lightbox-download"
                    class="lightbox-download"
                    href="#"
                    download
                >
                    Open original to save
                </a>

            </div>

            <button
                type="button"
                class="lightbox-nav lightbox-next"
                aria-label="Next photo"
            >
                ›
            </button>

        </div>
    `;


    document.body.appendChild(
        lightbox
    );


    lightbox
        .querySelector(
            ".lightbox-close"
        )
        .addEventListener(
            "click",
            closeLightbox
        );


    lightbox
        .querySelector(
            ".lightbox-backdrop"
        )
        .addEventListener(
            "click",
            closeLightbox
        );


    lightbox
        .querySelector(
            ".lightbox-previous"
        )
        .addEventListener(
            "click",
            previousLightboxPhoto
        );


    lightbox
        .querySelector(
            ".lightbox-next"
        )
        .addEventListener(
            "click",
            nextLightboxPhoto
        );


    let touchStartX = null;
    let touchStartY = null;

    lightbox.addEventListener(
        "touchstart",
        event => {
            if (event.touches.length !== 1) {
                return;
            }

            touchStartX = event.touches[0].clientX;
            touchStartY = event.touches[0].clientY;
        },
        { passive: true }
    );

    lightbox.addEventListener(
        "touchend",
        event => {
            if (
                touchStartX === null ||
                touchStartY === null ||
                event.changedTouches.length !== 1 ||
                lightboxPhotos.length < 2
            ) {
                touchStartX = null;
                touchStartY = null;
                return;
            }

            const deltaX =
                event.changedTouches[0].clientX - touchStartX;

            const deltaY =
                event.changedTouches[0].clientY - touchStartY;

            touchStartX = null;
            touchStartY = null;

            if (
                Math.abs(deltaX) < 50 ||
                Math.abs(deltaX) <= Math.abs(deltaY)
            ) {
                return;
            }

            if (deltaX > 0) {
                previousLightboxPhoto();
            } else {
                nextLightboxPhoto();
            }
        },
        { passive: true }
    );
}


function openLightbox(
    photos,
    index
) {

    createLightbox();

    lightboxPhotos = photos;
    lightboxIndex = index;

    updateLightbox();


    const lightbox =
        document.getElementById(
            "photo-lightbox"
        );

    lightbox.hidden = false;

    document.body.classList.add(
        "lightbox-open"
    );


    lightbox
        .querySelector(
            ".lightbox-close"
        )
        .focus();
}


function closeLightbox() {

    const lightbox =
        document.getElementById(
            "photo-lightbox"
        );

    if (!lightbox) {
        return;
    }

    lightbox.hidden = true;

    document.body.classList.remove(
        "lightbox-open"
    );
}


function updateLightbox() {

    const photo =
        lightboxPhotos[
            lightboxIndex
        ];

    if (!photo) {
        return;
    }


    const image =
        document.getElementById(
            "lightbox-image"
        );

    const caption =
        document.getElementById(
            "lightbox-caption"
        );

    const counter =
        document.getElementById(
            "lightbox-counter"
        );

    const download =
        document.getElementById(
            "lightbox-download"
        );


    applyOptimizedImage(
        image,
        photo.file,
        2400,
        88
    );

    image.alt =
        photo.caption ||
        `Travel photo ${lightboxIndex + 1}`;


    caption.textContent =
        photo.caption || "";


    counter.textContent =
        `${lightboxIndex + 1} / ${lightboxPhotos.length}`;

    const originalSource =
        photo.file || "";

    download.href =
        originalSource;

    download.setAttribute(
        "download",
        photo.key
            ? photo.key.split("/").pop()
            : "photo"
    );

    download.target =
        "_blank";

    download.rel =
        "noopener";


    const previous =
        document.querySelector(
            ".lightbox-previous"
        );

    const next =
        document.querySelector(
            ".lightbox-next"
        );


    const multiplePhotos =
        lightboxPhotos.length > 1;

    previous.hidden =
        !multiplePhotos;

    next.hidden =
        !multiplePhotos;
}


function previousLightboxPhoto() {

    lightboxIndex--;

    if (lightboxIndex < 0) {

        lightboxIndex =
            lightboxPhotos.length - 1;
    }

    updateLightbox();
}


function nextLightboxPhoto() {

    lightboxIndex++;

    if (
        lightboxIndex >=
        lightboxPhotos.length
    ) {

        lightboxIndex = 0;
    }

    updateLightbox();
}


/* Keyboard controls */

document.addEventListener(
    "keydown",
    event => {

        const lightbox =
            document.getElementById(
                "photo-lightbox"
            );

        if (
            !lightbox ||
            lightbox.hidden
        ) {
            return;
        }


        if (
            event.key === "Escape"
        ) {

            closeLightbox();

        }


        if (
            event.key === "ArrowLeft"
        ) {

            previousLightboxPhoto();

        }


        if (
            event.key === "ArrowRight"
        ) {

            nextLightboxPhoto();

        }

    }
);

loadDayPage();