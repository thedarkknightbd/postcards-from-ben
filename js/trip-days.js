/* =====================================
   POSTCARDS FROM BEN
   Trip Day Card Generator
===================================== */

async function loadTripDays() {

    const grid =
        document.getElementById("day-grid");

    if (!grid) {
        return;
    }

    const source =
        grid.dataset.tripSource;

    if (!source) {
        console.error(
            "No trip source specified for day cards."
        );
        return;
    }

    let trip;

    try {

        const response =
            await fetch(source);

        if (!response.ok) {
            throw new Error(
                `Could not load trip data: ${response.status}`
            );
        }

        trip =
            await response.json();

    } catch (error) {

        console.error(
            "Unable to load trip days:",
            error
        );

        return;
    }

    grid.innerHTML = "";


    for (const dayReference of trip.days) {

        try {

            const response =
                await fetch(dayReference.file);

            if (!response.ok) {
                continue;
            }

            const day =
                await response.json();


            const branchCount =
                (day.stops || []).filter(
                    stop =>
                        stop.type === "Branch Visit"
                ).length;


            const card =
                document.createElement("a");

            card.classList.add("day-card");


            if (dayReference.featured) {
                card.classList.add(
                    "featured-day"
                );
            }


            if (branchCount > 0) {
                card.classList.add(
                    "branch-day"
                );
            }


            const paddedDay =
                String(day.dayNumber)
                    .padStart(2, "0");


            card.href =
                `days/day-${paddedDay}.html`;


            const top =
                document.createElement("div");

            top.className =
                "day-card-top";


            const number =
                document.createElement("span");

            number.className =
                "day-card-number";

            number.textContent =
                `Day ${day.dayNumber}`;

            top.appendChild(number);


            if (branchCount > 0) {

                const badge =
                    document.createElement("span");

                badge.className =
                    "branch-badge";

                badge.textContent =
                    branchCount === 1
                        ? "Branch Visit"
                        : `${branchCount} Branch Visits`;

                top.appendChild(badge);
            }


            const date =
                document.createElement("span");

            date.className =
                "day-card-date";

            date.textContent =
                day.date.replace(
                    /,\s*\d{4}$/,
                    ""
                );


            const title =
                document.createElement("h3");

            title.textContent =
                day.title;


            const route =
                document.createElement("p");

            route.textContent =
                day.route;


            card.append(
                top,
                date,
                title,
                route
            );


            grid.appendChild(card);


        } catch (error) {

            console.warn(
                "Unable to load:",
                dayReference.file
            );

        }

    }

}


loadTripDays();