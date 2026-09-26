/* =====================================
   POSTCARDS FROM BEN
   Trip Progress
===================================== */

async function loadTripProgress() {

    const progress =
        document.getElementById("trip-progress");

    if (!progress) {
        return;
    }

    const source =
        progress.dataset.tripSource;

    try {

        const response =
            await fetch(source);

        if (!response.ok) {
            throw new Error(
                "Could not load trip information."
            );
        }

        const trip =
            await response.json();


        /* -------------------------
           DATE HELPERS
        ------------------------- */

        function dateKeyFromString(value) {

            const [year, month, day] =
                value.split("-").map(Number);

            return Date.UTC(
                year,
                month - 1,
                day
            );
        }


        function todayInTimeZone(timeZone) {

            const parts =
                new Intl.DateTimeFormat(
                    "en-US",
                    {
                        timeZone: timeZone,
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit"
                    }
                ).formatToParts(new Date());


            const values = {};

            parts.forEach(part => {

                if (
                    part.type === "year" ||
                    part.type === "month" ||
                    part.type === "day"
                ) {
                    values[part.type] =
                        Number(part.value);
                }

            });


            return Date.UTC(
                values.year,
                values.month - 1,
                values.day
            );
        }


        const start =
            dateKeyFromString(
                trip.startDate
            );

        const end =
            dateKeyFromString(
                trip.endDate
            );

        const today =
            todayInTimeZone(
                trip.timeZone ||
                "Europe/Berlin"
            );

        const millisecondsPerDay =
            24 * 60 * 60 * 1000;


        const label =
            document.getElementById(
                "trip-progress-label"
            );

        const bar =
            document.getElementById(
                "trip-progress-bar"
            );

        const track =
            document.getElementById(
                "trip-progress-track"
            );


        let completedDays = 0;
        let percentage = 0;


        /* -------------------------
           BEFORE THE TRIP
        ------------------------- */

        if (today < start) {

            label.textContent =
                "The adventure begins October 19";

            completedDays = 0;
            percentage = 0;

        }


        /* -------------------------
           DURING THE TRIP
        ------------------------- */

        else if (today <= end) {

            const currentDay =
                Math.floor(
                    (today - start) /
                    millisecondsPerDay
                ) + 1;


            completedDays =
                Math.min(
                    currentDay,
                    trip.dayCount
                );


            percentage =
                (
                    completedDays /
                    trip.dayCount
                ) * 100;


            label.textContent =
                `Day ${completedDays} of ${trip.dayCount}`;

        }


        /* -------------------------
           AFTER THE TRIP
        ------------------------- */

        else {

            completedDays =
                trip.dayCount;

            percentage = 100;

            label.textContent =
                `Adventure Complete · ${trip.dayCount} Days`;

        }


        bar.style.width =
            `${percentage}%`;


        track.setAttribute(
            "aria-valuenow",
            completedDays
        );


        progress.hidden = false;


    } catch (error) {

        console.error(
            "Unable to load trip progress:",
            error
        );

    }

}


loadTripProgress();