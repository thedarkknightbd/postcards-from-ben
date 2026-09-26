/* =====================================
   POSTCARDS FROM BEN
   Shared Day Page Engine
===================================== */

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
        card.append(number, content);

        stopList.appendChild(card);
    });


    /* =====================================
       INTERACTIVE MAP
    ===================================== */

    document.getElementById("map-title").textContent =
        data.route;

    const mappedStops = stops.filter(stop =>
        Number.isFinite(Number(stop.latitude)) &&
        Number.isFinite(Number(stop.longitude))
    );

    if (
        typeof L !== "undefined" &&
        mappedStops.length > 0
    ) {

        const map = L.map("day-map");

        L.tileLayer(
            "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                maxZoom: 19,
                attribution:
                    "&copy; OpenStreetMap contributors"
            }
        ).addTo(map);

        const coordinates = [];

        mappedStops.forEach(stop => {

            const coordinate = [
                Number(stop.latitude),
                Number(stop.longitude)
            ];

            coordinates.push(coordinate);

            L.marker(coordinate)
                .addTo(map)
                .bindPopup(
                    `<strong>${stop.name}</strong><br>${stop.description}`
                );
        });

        if (coordinates.length > 1) {

            const route = L.polyline(
                coordinates,
                {
                    weight: 4,
                    opacity: 0.8
                }
            ).addTo(map);

            map.fitBounds(
                route.getBounds(),
                {
                    padding: [35, 35]
                }
            );

        } else {

            map.setView(
                coordinates[0],
                10
            );
        }
    }


   /* =====================================
   PHOTOS
===================================== */

const photosSection =
    document.getElementById("photos-section");

const photoGrid =
    document.getElementById("photo-grid");

photoGrid.innerHTML = "";

if (
    data.photos &&
    data.photos.length > 0
) {

    photosSection.hidden = false;

    data.photos.forEach((photo, index) => {

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

        image.src = photo.file;

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
                    data.photos,
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
       VIDEOS
    ===================================== */

    const videoSection =
        document.getElementById("video-section");

    const videoGrid =
        document.getElementById("video-grid");

    videoGrid.innerHTML = "";

    if (
        data.videos &&
        data.videos.length > 0
    ) {

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


    image.src =
        photo.file;

    image.alt =
        photo.caption ||
        `Travel photo ${lightboxIndex + 1}`;


    caption.textContent =
        photo.caption || "";


    counter.textContent =
        `${lightboxIndex + 1} / ${lightboxPhotos.length}`;


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