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

                const link =
                    document.createElement(
                        "a"
                    );

                link.href =
                    photo.url;

                link.target =
                    "_blank";

                link.rel =
                    "noopener";

                link.setAttribute(
                    "aria-label",
                    `Open photo ${index + 1}`
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

                link.appendChild(
                    image
                );

                figure.appendChild(
                    link
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

loadPastPostcard();
