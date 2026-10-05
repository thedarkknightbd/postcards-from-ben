(() => {
    const FORM = document.getElementById("postcard-form");
    const MESSAGE = document.getElementById("postcard-message");
    const COUNT = document.getElementById("postcard-count");
    const STATUS = document.getElementById("postcard-status");
    const BUTTON = document.getElementById("postcard-submit");
    const SOURCE = document.getElementById("postcard-source");
    const PHOTO_DAY = document.getElementById("postcard-photo-day");
    const PHOTO_OPTIONS = document.getElementById("postcard-photo-options");
    const PHOTO_STATUS = document.getElementById("postcard-photo-status");
    const PHOTO_PREVIEW = document.getElementById("postcard-photo-preview");
    const PHOTO_PREVIEW_IMAGE = document.getElementById("postcard-photo-preview-image");
    const PHOTO_PREVIEW_CAPTION = document.getElementById("postcard-photo-preview-caption");

    const POSTCARD_ENDPOINT = "https://postcards-mailbox.bjdominguez.workers.dev";
    const PHOTO_API = "/api/r2";
    const MAX_MESSAGE_LENGTH = 2000;
    let selectedPhoto = null;

    const params = new URLSearchParams(window.location.search);
    const source = params.get("from");
    if (source) SOURCE.value = source.substring(0, 120);

    function photoNote() {
        if (!selectedPhoto) return "";
        return `\n\nPhoto from The Long Way Around — Day ${selectedPhoto.day}: ${selectedPhoto.url}`;
    }

    function updateCount() {
        COUNT.textContent = MESSAGE.value.length + photoNote().length;
    }

    MESSAGE.addEventListener("input", updateCount);

    function friendlyFilename(key) {
        const filename = String(key || "").split("/").pop().replace(/\.[^.]+$/, "");
        return filename
            .replace(/^\d{10,}-/, "")
            .replace(/[_-]+/g, " ")
            .replace(/\s+/g, " ")
            .trim() || "Trip photo";
    }

    function clearPhotoSelection() {
        selectedPhoto = null;
        PHOTO_PREVIEW.hidden = true;
        PHOTO_PREVIEW_IMAGE.removeAttribute("src");
        PHOTO_PREVIEW_IMAGE.alt = "";
        PHOTO_PREVIEW_CAPTION.textContent = "";
        PHOTO_OPTIONS.querySelectorAll(".postcard-photo-option").forEach(option => {
            option.setAttribute("aria-pressed", "false");
        });
        updateCount();
    }

    function selectPhoto(photo, day) {
        selectedPhoto = {
            url: photo.url,
            day,
            caption: friendlyFilename(photo.key)
        };
        PHOTO_OPTIONS.querySelectorAll(".postcard-photo-option").forEach(option => {
            option.setAttribute("aria-pressed", String(option.dataset.photoUrl === photo.url));
        });
        PHOTO_PREVIEW_IMAGE.src = photo.url;
        PHOTO_PREVIEW_IMAGE.alt = selectedPhoto.caption;
        PHOTO_PREVIEW_CAPTION.textContent = `${selectedPhoto.caption} · Day ${day}`;
        PHOTO_PREVIEW.hidden = false;
        PHOTO_STATUS.textContent = "Photo selected. It will be included as a link in your private email.";
        updateCount();
    }

    function renderPhotos(objects, day) {
        PHOTO_OPTIONS.replaceChildren();
        clearPhotoSelection();

        const photos = (Array.isArray(objects) ? objects : [])
            .filter(photo =>
                photo &&
                typeof photo.url === "string" &&
                photo.url.startsWith("https://photos.postcardsfromben.com/") &&
                /\.(avif|gif|heic|heif|jpe?g|png|webp)(\?|$)/i.test(photo.url)
            );

        if (!photos.length) {
            PHOTO_STATUS.textContent = "No photos for this day yet. Check another day, or send your note without a photo.";
            return;
        }

        PHOTO_STATUS.textContent = `Choose one of ${photos.length} photos from Day ${day}.`;

        photos.forEach(photo => {
            const caption = friendlyFilename(photo.key);
            const option = document.createElement("button");
            option.type = "button";
            option.className = "postcard-photo-option";
            option.setAttribute("aria-pressed", "false");
            option.setAttribute("aria-label", `Choose ${caption}`);
            option.dataset.photoUrl = photo.url;

            const image = document.createElement("img");
            image.src = photo.url;
            image.alt = "";
            image.loading = "lazy";

            const label = document.createElement("span");
            label.textContent = caption;

            option.append(image, label);
            option.addEventListener("click", () => selectPhoto(photo, day));
            PHOTO_OPTIONS.appendChild(option);
        });
    }

    async function loadPhotosForDay() {
        const day = PHOTO_DAY.value;
        clearPhotoSelection();
        PHOTO_OPTIONS.replaceChildren();
        PHOTO_STATUS.textContent = "Loading photos…";

        try {
            const folder = `trips/the-long-way-around/days/day-${String(day).padStart(2, "0")}/`;
            const response = await fetch(`${PHOTO_API}?prefix=${encodeURIComponent(folder)}`);
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Could not load trip photos.");
            renderPhotos(result.objects, day);
        } catch {
            PHOTO_STATUS.textContent = "Trip photos couldn’t be loaded right now. You can still send your note without a photo.";
        }
    }

    for (let day = 1; day <= 24; day++) {
        const option = document.createElement("option");
        option.value = String(day);
        option.textContent = `Day ${day}`;
        PHOTO_DAY.appendChild(option);
    }

    PHOTO_DAY.addEventListener("change", loadPhotosForDay);
    loadPhotosForDay();

    FORM.addEventListener("submit", async event => {
        event.preventDefault();
        STATUS.className = "postcard-status";
        STATUS.textContent = "";

        if (!SOURCE || !POSTCARD_ENDPOINT) {
            STATUS.classList.add("is-error");
            STATUS.textContent = "The postcard mailbox is not connected yet.";
            return;
        }

        const formData = new FormData(FORM);
        const message = MESSAGE.value.trim() + photoNote();

        const payload = {
            name: formData.get("name")?.toString().trim(),
            email: formData.get("email")?.toString().trim(),
            message,
            source: formData.get("source")?.toString().trim(),
            website: formData.get("website")?.toString().trim(),
            turnstileToken: formData.get("cf-turnstile-response")?.toString()
        };

        if (!payload.name) {
            STATUS.classList.add("is-error");
            STATUS.textContent = "Please add your name.";
            return;
        }

        if (!MESSAGE.value.trim()) {
            STATUS.classList.add("is-error");
            STATUS.textContent = "Please write a note before sending.";
            return;
        }

        if (payload.message.length > MAX_MESSAGE_LENGTH) {
            STATUS.classList.add("is-error");
            STATUS.textContent = "Please shorten your note a little so it fits with the selected photo link.";
            return;
        }

        if (!payload.turnstileToken) {
            STATUS.classList.add("is-error");
            STATUS.textContent = "Please complete the verification first.";
            return;
        }

        BUTTON.disabled = true;
        BUTTON.textContent = "Sending…";

        try {
            const response = await fetch(POSTCARD_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!response.ok || !result.ok) {
                throw new Error(result.error || "Unable to send postcard.");
            }

            FORM.reset();
            MESSAGE.value = "";
            clearPhotoSelection();
            updateCount();
            STATUS.classList.add("is-success");
            STATUS.textContent = "Photo postcard sent. Thanks for writing back.";
            BUTTON.textContent = "Photo Postcard Sent";

            if (window.turnstile) window.turnstile.reset();

            setTimeout(() => {
                BUTTON.disabled = false;
                BUTTON.textContent = "Send Photo Postcard";
            }, 2500);
        } catch (error) {
            STATUS.classList.add("is-error");
            STATUS.textContent = "Your photo postcard couldn’t be sent. Please try again.";
            BUTTON.disabled = false;
            BUTTON.textContent = "Send Photo Postcard";

            if (window.turnstile) window.turnstile.reset();
        }
    });

    updateCount();
})();
