const data = window.dayData;

if (!data) {
    throw new Error("Day data could not be loaded.");
}


/* =====================================
   PAGE TITLE
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

data.facts.forEach(fact => {

    const item = document.createElement("div");

    item.className = "fact";

    item.innerHTML = `
        <span class="fact-icon">${fact.icon}</span>

        <div>
            <span class="fact-label">
                ${fact.label}
            </span>

            <span class="fact-value">
                ${fact.value}
            </span>
        </div>
    `;

    factsContainer.appendChild(item);

});



/* =====================================
   INTRO
===================================== */

document.getElementById("intro-title").textContent =
    data.introTitle;

document.getElementById("intro-text").textContent =
    data.intro;



/* =====================================
   STOPS
===================================== */

const stopList =
    document.getElementById("stop-list");

data.stops.forEach((stop, index) => {

    const card = document.createElement("article");

    card.className = "stop-card";

    const number =
        String(index + 1).padStart(2, "0");

    card.innerHTML = `

        <div class="stop-number">
            ${number}
        </div>

        <div class="stop-content">

            <p class="stop-type">
                ${stop.type}
            </p>

            <h3>
                ${stop.name}
            </h3>

            <p>
                ${stop.description}
            </p>

        </div>

    `;

    stopList.appendChild(card);

});



/* =====================================
   INTERACTIVE MAP
===================================== */

document.getElementById("map-title").textContent =
    data.route;


if (
    typeof L !== "undefined" &&
    data.stops.length > 0
) {

    const map =
        L.map("day-map");

    L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,

            attribution:
                '&copy; OpenStreetMap contributors'
        }

    ).addTo(map);


    const coordinates = [];


    data.stops.forEach(stop => {

        if (!stop.coordinates) {
            return;
        }

        coordinates.push(stop.coordinates);


        L.marker(stop.coordinates)

            .addTo(map)

            .bindPopup(
                `<strong>${stop.name}</strong><br>${stop.description}`
            );

    });


    if (coordinates.length > 1) {

        const route =
            L.polyline(
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

    }

}



/* =====================================
   PHOTOS
===================================== */

const photosSection =
    document.getElementById("photos-section");

const photoGrid =
    document.getElementById("photo-grid");


if (data.photos && data.photos.length > 0) {

    photosSection.hidden = false;


    data.photos.forEach(photo => {

        const figure =
            document.createElement("figure");


        const image =
            document.createElement("img");

        image.src = photo.file;

        image.alt =
            photo.caption || "Travel photo";

        image.loading = "lazy";


        figure.appendChild(image);


        if (photo.caption) {

            const caption =
                document.createElement("figcaption");

            caption.textContent =
                photo.caption;

            figure.appendChild(caption);

        }


        photoGrid.appendChild(figure);

    });

}



/* =====================================
   JOURNAL
===================================== */

const journalSection =
    document.getElementById("journal-section");

const journalCard =
    document.getElementById("journal-card");


if (
    data.journal &&
    data.journal.trim() !== ""
) {

    journalSection.hidden = false;

    const paragraphs =
        data.journal
            .split("\n")
            .filter(text => text.trim() !== "");


    paragraphs.forEach(text => {

        const paragraph =
            document.createElement("p");

        paragraph.textContent = text;

        journalCard.appendChild(paragraph);

    });

}



/* =====================================
   VIDEO
===================================== */

const videoSection =
    document.getElementById("video-section");

const videoGrid =
    document.getElementById("video-grid");


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


        wrapper.innerHTML = `

            <iframe
                src="https://www.youtube.com/embed/${video.youtubeId}"
                title="${video.title}"
                loading="lazy"
                allowfullscreen>
            </iframe>

        `;


        videoGrid.appendChild(wrapper);

    });

}



/* =====================================
   PREVIOUS / OVERVIEW / NEXT
===================================== */

const navigation =
    document.getElementById("day-navigation");


if (data.previousDay) {

    const previous =
        document.createElement("a");

    previous.href =
        data.previousDay;

    previous.textContent =
        "← Previous Day";

    navigation.appendChild(previous);

} else {

    const spacer =
        document.createElement("span");

    navigation.appendChild(spacer);

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