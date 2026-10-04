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

function tripSlugFromPath() {
    const parts = window.location.pathname
        .split("/")
        .filter(Boolean);

    const tripsIndex = parts.indexOf("trips");

    return tripsIndex >= 0
        ? parts[tripsIndex + 1] || ""
        : "";
}

async function loadR2Folder(prefix) {
    const response =
        await fetch(
            `/api/r2?prefix=${encodeURIComponent(prefix)}`
        );

    if (!response.ok) {
        throw new Error(
            `Could not load photos: ${response.status}`
        );
    }

    const data =
        await response.json();

    return Array.isArray(data.objects)
        ? data.objects
        : [];
}

async function loadPastPostcard() {
    const source =
        document.body.dataset.postcardSource;

    if (!source) {
        return;
    }

    try {
        const response =
            await fetch(source);

        if (!response.ok) {
            throw new Error(
                `Could not load postcard data: ${response.status}`
            );
        }

        const data =
            await response.json();

        document.title =
            `${data.title} | Postcards from Ben`;

        const bindings = {
            "past-postcard-kicker": data.kicker,
            "past-postcard-title": data.title,
            "past-postcard-subtitle": data.subtitle,
            "past-postcard-section-label": data.sectionLabel,
            "past-postcard-intro-title": data.introTitle,
            "past-postcard-story": data.story,
            "past-postcard-photo-title": data.photoTitle,
            "past-postcard-photo-placeholder-text": data.photoPlaceholder
        };

        for (const [id, value] of Object.entries(bindings)) {
            const element =
                document.getElementById(id);

            if (
                element &&
                typeof value === "string"
            ) {
                element.textContent = value;
            }
        }

    } catch (error) {
        console.error(
            "Unable to load past postcard:",
            error
        );
    }

    const slug =
        tripSlugFromPath();

    if (!slug) {
        return;
    }

    /* HERO */

    try {
        const heroPhotos =
            await loadR2Folder(
                `trips/${slug}/hero/`
            );

        const hero =
            heroPhotos[0];

        const header =
            document.querySelector(
                ".past-postcard-hero"
            );

        if (hero && header) {
            const original =
                hero.url;

            const optimized =
                optimizedPhotoUrl(
                    original,
                    2200,
                    84
                );

            const testImage =
                new Image();

            testImage.onload = () => {
                header.style.backgroundImage =
                    `linear-gradient(rgba(12,22,31,.48), rgba(12,22,31,.72)), url("${optimized}")`;
                header.classList.add(
                    "has-photo"
                );
            };

            testImage.onerror = () => {
                header.style.backgroundImage =
                    `linear-gradient(rgba(12,22,31,.48), rgba(12,22,31,.72)), url("${original}")`;
                header.classList.add(
                    "has-photo"
                );
            };

            testImage.src =
                optimized;
        }

    } catch (error) {
        console.warn(
            "Past postcard hero unavailable:",
            error
        );
    }

    /* GALLERY */

    const gallery =
        document.getElementById(
            "past-postcard-gallery"
        );

    if (!gallery) {
        return;
    }

    try {
        const photos =
            await loadR2Folder(
                `trips/${slug}/gallery/`
            );

        if (!photos.length) {
            return;
        }

        gallery.innerHTML = "";

        photos.forEach(
            (photo, index) => {

                const figure =
                    document.createElement(
                        "figure"
                    );

                const button =
                    document.createElement(
                        "button"
                    );

                button.type =
                    "button";

                button.className =
                    "photo-lightbox-button";

                button.setAttribute(
                    "aria-label",
                    `View photo ${index + 1}`
                );

                const image =
                    document.createElement(
                        "img"
                    );

                image.alt =
                    `${document.title.split(" | ")[0]} photo ${index + 1}`;

                image.loading =
                    "lazy";

                applyOptimizedImage(
                    image,
                    photo.url,
                    1200,
                    82
                );

                button.appendChild(
                    image
                );

                button.addEventListener(
                    "click",
                    () => {
                        openPastLightbox(
                            photos,
                            index
                        );
                    }
                );

                figure.appendChild(
                    button
                );

                gallery.appendChild(
                    figure
                );
            }
        );

    } catch (error) {
        console.warn(
            "Past postcard gallery unavailable:",
            error
        );
    }
}

let pastLightboxPhotos = [];
let pastLightboxIndex = 0;

function createPastLightbox() {
    if (
        document.getElementById(
            "photo-lightbox"
        )
    ) {
        return;
    }

    const lightbox =
        document.createElement(
            "div"
        );

    lightbox.id =
        "photo-lightbox";

    lightbox.className =
        "photo-lightbox";

    lightbox.hidden =
        true;

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
            closePastLightbox
        );

    lightbox
        .querySelector(
            ".lightbox-backdrop"
        )
        .addEventListener(
            "click",
            closePastLightbox
        );

    lightbox
        .querySelector(
            ".lightbox-previous"
        )
        .addEventListener(
            "click",
            previousPastLightboxPhoto
        );

    lightbox
        .querySelector(
            ".lightbox-next"
        )
        .addEventListener(
            "click",
            nextPastLightboxPhoto
        );
}

function openPastLightbox(
    photos,
    index
) {
    createPastLightbox();

    pastLightboxPhotos =
        photos;

    pastLightboxIndex =
        index;

    updatePastLightbox();

    const lightbox =
        document.getElementById(
            "photo-lightbox"
        );

    lightbox.hidden =
        false;

    document.body.classList.add(
        "lightbox-open"
    );

    lightbox
        .querySelector(
            ".lightbox-close"
        )
        .focus();
}

function closePastLightbox() {
    const lightbox =
        document.getElementById(
            "photo-lightbox"
        );

    if (!lightbox) {
        return;
    }

    lightbox.hidden =
        true;

    document.body.classList.remove(
        "lightbox-open"
    );
}

function updatePastLightbox() {
    const photo =
        pastLightboxPhotos[
            pastLightboxIndex
        ];

    if (!photo) {
        return;
    }

    const image =
        document.getElementById(
            "lightbox-image"
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
        photo.url,
        2600,
        90
    );

    image.alt =
        `${document.title.split(" | ")[0]} photo ${pastLightboxIndex + 1}`;

    counter.textContent =
        `${pastLightboxIndex + 1} / ${pastLightboxPhotos.length}`;

    download.href =
        photo.url;

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

    const multiple =
        pastLightboxPhotos.length > 1;

    previous.hidden =
        !multiple;

    next.hidden =
        !multiple;
}

function previousPastLightboxPhoto() {
    pastLightboxIndex--;

    if (pastLightboxIndex < 0) {
        pastLightboxIndex =
            pastLightboxPhotos.length - 1;
    }

    updatePastLightbox();
}

function nextPastLightboxPhoto() {
    pastLightboxIndex++;

    if (
        pastLightboxIndex >=
        pastLightboxPhotos.length
    ) {
        pastLightboxIndex = 0;
    }

    updatePastLightbox();
}

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

        if (event.key === "Escape") {
            closePastLightbox();
        }

        if (event.key === "ArrowLeft") {
            previousPastLightboxPhoto();
        }

        if (event.key === "ArrowRight") {
            nextPastLightboxPhoto();
        }
    }
);

loadPastPostcard();
