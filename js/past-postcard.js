async function loadPastPostcard() {
    const source = document.body.dataset.postcardSource;

    if (!source) {
        return;
    }

    try {
        const response = await fetch(source);

        if (!response.ok) {
            throw new Error(`Could not load postcard data: ${response.status}`);
        }

        const data = await response.json();

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
            const element = document.getElementById(id);

            if (element && typeof value === "string") {
                element.textContent = value;
            }
        }

    } catch (error) {
        console.error("Unable to load past postcard:", error);
    }
}

loadPastPostcard();
