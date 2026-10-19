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

            title.textContent = day.title || day.route || ("Day " + day.dayNumber);


            const route =
                document.createElement("p");

            route.textContent =
                day.route;


            const photo = document.createElement("div");
            photo.className = "longway-day-photo";
            const dayImages = {
              1: null,
              2: "Schönbrunn Palace.jpg",
              3: "Bratislava Castle with Danube.jpeg",
              4: "Bled Church island in Blue hour.jpg",
              5: "Kamnik alps at sunset.jpg",
              6: "View of the Grand Canal from Rialto to Ca'Foscari.jpg",
              7: "Brescia castello ponte levatoio torre dei Prigionieri panorama di Brescia.jpg",
              8: "Odles as seen from Seceda.JPG",
              9: "Santa Maddalena, Funes, chiesa di San Giovanni in Ranui 06.jpg",
              10: "Riva del Garda Panorama from sentiero del Ponale.jpg",
              11: "Guaita Fortress and San Marino (2023).jpg",
              12: "Bernina express Viaduc de Brusio.jpg",
              13: "Brescia - Piazza della Loggia.jpg",
              14: "Brescia - Piazza Paolo VI (48747822708).jpg",
              15: "Monaco Hercule Harbour Panorama.jpg",
              16: "Mont Blanc de Courmayeur.jpg",
              17: "Château de Chillon(Chillon Castle) on the Lake Geneva Shore (Ank Kumar) 01.jpg",
              18: "Grund from Corniche.JPG",
              19: "Hunebed D27 2020.jpg",
              20: "Mittelrhein-Burg-Stahleck-JR-E-1700-2017-05-27.jpg",
              21: "Römerberg in Frankfurt.jpg",
              22: "Neues Rathaus und Marienplatz München.jpg",
              23: "Liechtenstein-00190 - Vaduz Castle (19627815986).jpg",
              24: "MUC Terminal 2 from air 20251011.jpg"
            };
            const imageFile = dayImages[day.dayNumber];
            if (imageFile || day.dayNumber === 1) {
              const photoUrl = day.dayNumber === 1 ? "https://photos.postcardsfromben.com/trips/the-long-way-around/days/day-01/1792426732089-img_0222.jpeg" : "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(imageFile) + "?width=960";
              const img = new Image();
              img.alt = "";
              img.loading = "lazy";
              img.decoding = "async";
              img.className = "longway-cover-image";
              img.src = photoUrl;
              img.onerror = () => { img.remove(); photo.classList.add("longway-photo-unavailable"); };
              photo.appendChild(img);
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
              branch.innerHTML = "<svg class=\"longway-line-icon\" viewBox=\"0 0 24 24\" width=\"21\" height=\"21\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z\"/><path d=\"M6 12H4a2 2 0 0 0-2 2v8h20v-6a2 2 0 0 0-2-2h-2\"/><path d=\"M10 6h4M10 10h4M10 14h4M10 18h4\"/></svg>" + " Branch Office Visit";
              notes.appendChild(branch);
            }
            details.appendChild(notes);
            card.append(photo, details);
            grid.appendChild(card);


        } catch (error) {

            console.warn(
                "Unable to load:",
                dayReference.file
            );

        }

    }


    // External cover photograph credits are separate from personal day journals.
    const credits = document.createElement("details");
    credits.className = "longway-photo-credits";
    const summary = document.createElement("summary");
    summary.textContent = "Cover photograph credits and licensing";
    credits.appendChild(summary);
    const creditList = document.createElement("ol");
    const creditFiles = {"2":"Schönbrunn Palace.jpg","3":"Bratislava Castle with Danube.jpeg","4":"Bled Church island in Blue hour.jpg","5":"Kamnik alps at sunset.jpg","6":"View of the Grand Canal from Rialto to Ca'Foscari.jpg","7":"Brescia castello ponte levatoio torre dei Prigionieri panorama di Brescia.jpg","8":"Odle, Puez, Sella and Langkofel groups from Seceda, South Tyrol.jpg","9":"Santa Maddalena, Funes, chiesa di San Giovanni in Ranui 06.jpg","10":"Riva del Garda Panorama from sentiero del Ponale.jpg","11":"Guaita Fortress and San Marino (2023).jpg","12":"Bernina express Viaduc de Brusio.jpg","13":"Brescia - Piazza della Loggia.jpg","14":"Brescia - Piazza Paolo VI (48747822708).jpg","15":"Monaco Hercule Harbour Panorama.jpg","16":"Mont Blanc de Courmayeur.jpg","17":"Chillon Castle at Lake Geneva.jpg","18":"Luxembourg Grund Old Town.jpg","19":"Hunebed D27 2020.jpg","20":"Mittelrhein-Burg-Stahleck-JR-E-1700-2017-05-27.jpg","21":"Römerberg in Frankfurt.jpg","22":"Neues Rathaus und Marienplatz München.jpg","23":"Liechtenstein-00190 - Vaduz Castle (19627815986).jpg","24":"MUC Terminal 2 from air 20251011.jpg"};
    Object.entries(creditFiles).forEach(([number, file]) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = "https://commons.wikimedia.org/wiki/File:" + encodeURIComponent(file.replaceAll(" ", "_"));
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Day " + number + ": " + file.replace(/\.(jpg|jpeg|png)$/i, "");
      item.appendChild(link);
      const verifiedCredits = {
        "17": { author: "Ank Kumar", license: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/" },
        "18": { author: "Nikilux", license: "CC BY-SA 3.0 Luxembourg", url: "https://creativecommons.org/licenses/by-sa/3.0/lu/deed.en" }
      };
      const credit = verifiedCredits[number];
      if (credit) {
        const details = document.createElement("span");
        details.append(" · Photo: " + credit.author + " · ");
        const license = document.createElement("a");
        license.href = credit.url;
        license.target = "_blank";
        license.rel = "noopener noreferrer";
        license.textContent = credit.license;
        details.appendChild(license);
        details.append(" · Card image cropped to fit");
        item.appendChild(details);
      }
      creditList.appendChild(item);
    });
    credits.appendChild(creditList);
    grid.insertAdjacentElement("afterend", credits);

}


loadTripDays();