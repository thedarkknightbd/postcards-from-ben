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
                        (stop.type === "Branch Visit" || stop.type === "Branch Office Visit")
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
                        ? "Branch Office Visit"
                        : `${branchCount} Branch Office Visits`;

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


            const photo = document.createElement("div");
            photo.className = "longway-day-photo";
            const dayImages = {
              2:"https://commons.wikimedia.org/wiki/Special:FilePath/Odles_as_seen_from_Seceda.JPG?width=640",
              8:"https://commons.wikimedia.org/wiki/Special:FilePath/Odles_as_seen_from_Seceda.JPG?width=640",
              9:"https://commons.wikimedia.org/wiki/Special:FilePath/Odles_as_seen_from_Seceda.JPG?width=640"
            };
            if (dayImages[day.dayNumber]) {
              photo.style.backgroundImage = "url(" + JSON.stringify(dayImages[day.dayNumber]) + ")";
            }
            const photoNumber = document.createElement("span");
            photoNumber.className = "longway-photo-number";
            photoNumber.textContent = "Day " + day.dayNumber;
            photo.appendChild(photoNumber);
            const photoDate = document.createElement("span");
            photoDate.className = "longway-photo-date";
            photoDate.textContent = date.textContent;
            photo.appendChild(photoDate);
            const details = document.createElement("div");
            details.className = "longway-day-details";
            details.append(title, route);
            const notes = document.createElement("div");
            notes.className = "longway-day-notes";
            if (dayReference.featured) {
              const star = document.createElement("span");
              star.textContent = "★ Featured Day";
              notes.appendChild(star);
            }
            if (branchCount) {
              const branch = document.createElement("span");
              branch.textContent = "♜ Branch Office Visit";
              notes.appendChild(branch);
            }
            if ((day.stops || []).some(stop => /meeting/i.test(stop.type || ""))) {
              const meeting = document.createElement("span");
              meeting.textContent = "● Congregation Meeting";
              notes.appendChild(meeting);
            }
            details.appendChild(notes);
            card.append(photo, details);
            const prefix = "trips/the-long-way-around/days/day-" + paddedDay + "/";
            fetch("/api/r2?prefix=" + encodeURIComponent(prefix))
              .then(response => response.ok ? response.json() : null)
              .then(data => {
                const obj = data && Array.isArray(data.objects) && data.objects.find(o => o.url && /\\.(jpe?g|png|webp|avif)(\\?|$)/i.test(o.url));
                if (obj) photo.style.backgroundImage = "url(" + JSON.stringify(obj.url) + ")";
              }).catch(() => {});


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