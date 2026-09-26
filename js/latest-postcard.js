/* =====================================
   POSTCARDS FROM BEN
   Latest Postcard
===================================== */

async function loadLatestPostcard() {

    const section =
        document.getElementById(
            "latest-postcard-section"
        );

    if (!section) {
        return;
    }

    try {

        const tripResponse =
            await fetch(
                "trips/the-long-way-around/trip.json"
            );

        if (!tripResponse.ok) {
            throw new Error(
                "Could not load trip data."
            );
        }

        const trip =
            await tripResponse.json();


        /*
         Start with Day 24 and work backward.
         The newest day containing a journal,
         photo, or video becomes Latest Postcard.
        */

        const days =
            [...trip.days].reverse();


        for (const dayReference of days) {

            const dayUrl =
                new URL(
                    dayReference.file,
                    tripResponse.url
                ).href;

            const dayResponse =
                await fetch(dayUrl);

            if (!dayResponse.ok) {
                continue;
            }

            const day =
                await dayResponse.json();


            const hasJournal =
                typeof day.journal === "string" &&
                day.journal.trim() !== "";

            const hasPhotos =
                Array.isArray(day.photos) &&
                day.photos.length > 0;

            const hasVideos =
                Array.isArray(day.videos) &&
                day.videos.length > 0;


            if (
                !hasJournal &&
                !hasPhotos &&
                !hasVideos
            ) {
                continue;
            }


            document.getElementById(
                "latest-postcard-meta"
            ).textContent =
                `Day ${day.dayNumber} · ${day.date}`;


            document.getElementById(
                "latest-postcard-title"
            ).textContent =
                day.title;


            let excerpt;


            if (hasJournal) {

                excerpt =
                    day.journal
                        .replace(/\s+/g, " ")
                        .trim();

                if (excerpt.length > 180) {

                    excerpt =
                        excerpt
                            .slice(0, 177)
                            .trimEnd() + "…";

                }

            } else if (hasPhotos) {

                excerpt =
                    `New photos from ${day.title}.`;

            } else {

                excerpt =
                    `A new video update from ${day.title}.`;

            }


            document.getElementById(
                "latest-postcard-excerpt"
            ).textContent =
                excerpt;


            const paddedDay =
                String(day.dayNumber)
                    .padStart(2, "0");


            document.getElementById(
                "latest-postcard-link"
            ).href =
                `trips/the-long-way-around/days/day-${paddedDay}.html`;


            section.hidden = false;

            return;
        }


    } catch (error) {

        console.error(
            "Unable to load latest postcard:",
            error
        );

    }

}


loadLatestPostcard();