const root = document.getElementById("travel-map");

if (root) {
    initTravelMap();
}

async function initTravelMap() {
    const details = document.getElementById("travel-map-details");
    const status = document.getElementById("travel-map-status");

    try {
        // Always load the country picker first. It must remain usable even if
        // the externally hosted world-map libraries are unavailable.
        const dataResponse = await fetch("/data/travel-history.json", { cache: "no-store" });
        if (!dataResponse.ok) throw new Error("Could not load travel history.");
        const data = await dataResponse.json();
        renderCountryList(data, details);
        const [d3, topo, worldModule] = await Promise.all([
            import("https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm"),
            import("https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/+esm"),
            import("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json/+esm")
        ]);
        const world = worldModule.default;
        const countries = topo.feature(
            world,
            world.objects.countries
        ).features;

        status.hidden = true;

        // Match countries by both display name and stable atlas numeric ID.
        // World Atlas country names can differ from travel-history labels.
        const visitedIdMap = new Map();
        const countryIds = {
            "Bosnia & Herzegovina": "070",
            "Croatia": "191",
            "San Marino": "674",
            "Switzerland": "756"
        };
        data.places.forEach(place => {
            const id = countryIds[place.name];
            if (id) visitedIdMap.set(id, place);
        });

        const visitedNameMap = new Map();

        data.places.forEach(place => {
            (place.mapNames || []).forEach(name => {
                visitedNameMap.set(normalize(name), place);
                visitedNameMap.set(normalize(place.name), place);
            });
        });

        const width = 1000;
        const height = 520;

        const svg = d3
            .select(root)
            .append("svg")
            .attr("class", "travel-world-svg")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("role", "img")
            .attr(
                "aria-label",
                "World map highlighting places connected to past travels"
            );

        const projection = d3
            .geoNaturalEarth1()
            .fitExtent(
                [[18, 18], [width - 18, height - 18]],
                {
                    type: "Sphere"
                }
            );

        const path = d3.geoPath(projection);

        const mapLayer = svg
            .append("g")
            .attr("class", "travel-world-layer");

        mapLayer
            .append("path")
            .datum({ type: "Sphere" })
            .attr("class", "travel-map-ocean")
            .attr("d", path);

        const countryPaths = mapLayer
            .selectAll(".travel-country")
            .data(countries)
            .join("path")
            .attr("class", feature => {
                const place = findPlace(feature, visitedNameMap);

                return place
                    ? "travel-country is-visited"
                    : "travel-country";
            })
            .attr("d", path)
            .attr("tabindex", feature => {
                return findPlace(feature, visitedNameMap) ? 0 : null;
            })
            .attr("role", feature => {
                return findPlace(feature, visitedNameMap)
                    ? "button"
                    : null;
            })
            .attr("aria-label", feature => {
                const place = findPlace(feature, visitedNameMap);

                return place
                    ? `Show travel memories for ${place.name}`
                    : null;
            });

        countryPaths
            .filter(feature => Boolean(findPlace(feature, visitedNameMap)))
            .on("click", (event, feature) => {
                const place = findPlace(feature, visitedNameMap);
                selectPlace(place, data, details);
            })
            .on("keydown", (event, feature) => {
                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {
                    event.preventDefault();

                    const place = findPlace(
                        feature,
                        visitedNameMap
                    );

                    selectPlace(place, data, details);
                }
            });

        // Small islands and micro-territories can be nearly invisible
        // on a world map. These subtle dots make them discoverable
        // without turning the map into a scoreboard.
        const smallPlaces = data.places.filter(place =>
            place.small &&
            Number.isFinite(place.lat) &&
            Number.isFinite(place.lng)
        );

        const markerLayer = mapLayer
            .append("g")
            .attr("class", "travel-small-place-layer");

        smallPlaces.forEach(place => {
            const projected = projection([
                place.lng,
                place.lat
            ]);

            if (!projected) {
                return;
            }

            markerLayer
                .append("circle")
                .attr("class", "travel-small-place")
                .attr("cx", projected[0])
                .attr("cy", projected[1])
                .attr("r", 3.5)
                .attr("tabindex", 0)
                .attr("role", "button")
                .attr(
                    "aria-label",
                    `Show travel memories for ${place.name}`
                )
                .on("click", () => {
                    selectPlace(place, data, details);
                })
                .on("keydown", event => {
                    if (
                        event.key === "Enter" ||
                        event.key === " "
                    ) {
                        event.preventDefault();
                        selectPlace(place, data, details);
                    }
                })
                .append("title")
                .text(place.name);
        });

        const zoom = d3
            .zoom()
            .scaleExtent([1, 6])
            .on("zoom", event => {
                mapLayer.attr(
                    "transform",
                    event.transform
                );
            });

        svg.call(zoom);

        document
            .getElementById("travel-map-reset")
            ?.addEventListener("click", () => {
                svg
                    .transition()
                    .duration(350)
                    .call(
                        zoom.transform,
                        d3.zoomIdentity
                    );
            });

    } catch (error) {
        console.error("Travel map error:", error);

        status.hidden = false;
        status.textContent =
            "The travel map could not be loaded right now.";
    }
}


function normalize(value = "") {
    return String(value)
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[.'’]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}


function findPlace(feature, visitedNameMap) {
    const numericId = String(feature?.id ?? "").padStart(3, "0");
    const byId = {
        "070": "Bosnia & Herzegovina",
        "191": "Croatia",
        "674": "San Marino",
        "756": "Switzerland"
    };
    const mappedName = byId[numericId];
    if (mappedName) {
        const matched = visitedNameMap.get(normalize(mappedName));
        if (matched) return matched;
    }
    const candidates = [
        feature?.properties?.name,
        feature?.properties?.NAME,
        feature?.properties?.name_long
    ].filter(Boolean);

    for (const candidate of candidates) {
        const match = visitedNameMap.get(
            normalize(candidate)
        );

        if (match) {
            return match;
        }
    }

    return null;
}


// Country buttons are a keyboard- and touch-friendly alternative to SVG shapes.
function renderCountryList(data,details){
    const list=document.getElementById("atlas-country-list");
    if(!list)return;
    list.replaceChildren();
    for(const place of [...data.places].sort((a,b)=>a.name.localeCompare(b.name))){
        const button=document.createElement("button");
        button.type="button";
        button.textContent=place.name;
        button.dataset.country=place.countryCode||"";
        button.setAttribute("aria-pressed","false");
        button.addEventListener("click",()=>{
            selectPlace(place,data,details);
            details?.scrollIntoView({behavior:"smooth",block:"nearest"});
        });
        list.append(button);
    }
}

let atlasPhotoRequest=0;
async function renderAtlasPhotos(place,details){
    if(!document.getElementById("atlas-country-list")||!place.countryCode)return;
    const id=++atlasPhotoRequest;
    const section=document.createElement("section");
    section.className="atlas-photo-section";
    section.setAttribute("aria-label","Photographs from "+place.name);
    const heading=document.createElement("h4");
    heading.textContent="Photographs from "+place.name;
    const message=document.createElement("p");
    message.className="atlas-help";
    message.textContent="Looking for published photographs…";
    section.append(heading,message);
    details.append(section);
    try{
        const res=await fetch("/api/atlas-photos?country="+encodeURIComponent(place.countryCode),{cache:"no-store"});
        if(!res.ok)throw Error("Unavailable");
        const result=await res.json();
        if(id!==atlasPhotoRequest||!section.isConnected)return;
        message.remove();
        if(!result.available){
            const p=document.createElement("p");
            p.className="atlas-help";p.textContent="The photo collection is temporarily unavailable.";
            section.append(p);return;
        }
        if(!result.photos?.length){
            const p=document.createElement("p");
            p.className="atlas-help";
            p.textContent="No published photographs have been tagged to this country yet.";
            section.append(p);return;
        }
        const grid=document.createElement("div");
        grid.className="atlas-photo-grid";
        for(const photo of result.photos){
            const figure=document.createElement("figure");
            const image=document.createElement("img");
            image.src=photo.src;
            image.alt=photo.alt||"Travel photograph";
            image.loading="lazy";
            image.decoding="async";
            image.addEventListener("error",()=>figure.remove(),{once:true});
            const link=document.createElement("a");
            link.href=photo.src;
            link.target="_blank";
            link.rel="noopener noreferrer";
            link.setAttribute("aria-label","Open photograph from "+place.name+" at full size");
            link.append(image);
            const caption=document.createElement("figcaption");
            caption.textContent=photo.caption||photo.destination||place.name;
            figure.append(link,caption);grid.append(figure);
        }
        section.append(grid);
    }catch{
        if(id!==atlasPhotoRequest||!section.isConnected)return;
        message.textContent="Country photographs could not be loaded right now.";
    }
}

function selectPlace(place, data, details) {
    if (!place || !details) {
        return;
    }

    document
        .querySelectorAll(".travel-country.is-selected")
        .forEach(element => {
            element.classList.remove("is-selected");
        });

    const trips = (place.trips || [])
        .map(id => data.trips[id])
        .filter(Boolean);

    const tripMarkup = trips.length
        ? trips.map(trip => `
            <div class="travel-memory">
                <strong>${escapeHtml(trip.title)}</strong>
                <span>${escapeHtml(trip.location)}</span>
                <span>${escapeHtml(trip.date)}</span>

                ${trip.url ? `
                    <a
                        class="travel-memory-link"
                        href="${escapeHtml(trip.url)}">
                        View postcard →
                    </a>
                ` : ""}
            </div>
        `).join("")
        : `
            <p class="travel-memory-note">
                A place from an earlier journey.
            </p>
        `;

    details.innerHTML = `
        <p class="travel-detail-label">
            Postcard from
        </p>

        <h3>
            ${escapeHtml(place.name)}
        </h3>

        ${tripMarkup}
    `;

    details.hidden = false;
    document.querySelectorAll("#atlas-country-list button").forEach(button=>{
        button.setAttribute("aria-pressed",String(button.dataset.country===place.countryCode));
    });
    renderAtlasPhotos(place,details);
}


function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
