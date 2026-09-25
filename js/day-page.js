/* =====================================
   POSTCARDS FROM BEN
   Shared Trip Day Engine
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
       HERO
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

    if (data.facts && data.facts.length > 0) {

        data.facts.forEach(fact => {

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

    }


    /* =====================================
       INTRO
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

    if (data.stops && data.stops.length > 0) {

        data.stops.forEach((stop, index) => {

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

            content.append(
                type,
                name,
                description
            );

            card.append(
                number,
                content
            );

            stopList.appendChild(card);

        });

    }


    /* =====================================
       MAP
    ===================================== */

    const mapElement =
        document.getElementById("day-map");

    document.getElementById("map-title").textContent =
        data.route;


    const mappedStops =
        (data.stops || []).filter(stop =>
            Number.isFinite(stop.latitude) &&
            Number.isFinite(stop.longitude)
        );


    if (
        mapElement &&
        typeof L !== "undefined" &&
        mappedStops.length > 0
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


        mappedStops.forEach(stop => {

            const coordinate = [
                stop.latitude,
                stop.longitude
            ];

            coordinates.push(coordinate);


            L.marker(coordinate)
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


    if (
        data.photos &&
        data.photos.length > 0
    ) {

        photosSection.hidden = false;
        photoGrid.innerHTML = "";


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

    } else {

        photosSection.hidden = true;

    }


    /* =====================================
       POSTCARD / JOURNAL
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
        journalCard.innerHTML = "";


        const paragraphs =
            data.journal
                .split("\n")
                .filter(text =>
                    text.trim() !== ""
                );


        paragraphs.forEach(text => {

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


    if (
        data.videos &&
        data.videos.length > 0
    ) {

        videoSection.hidden = false;
        videoGrid.innerHTML = "";


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


loadDayPage();