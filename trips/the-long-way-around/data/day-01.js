window.dayData = {

    dayNumber: 1,

    date: "October 19, 2026",

    title: "The Journey Begins",

    route: "Fort Worth → Detroit → Munich",

    facts: [
        {
            icon: "✈️",
            label: "Day Type",
            value: "Travel Day"
        },
        {
            icon: "📍",
            label: "Starting Point",
            value: "Fort Worth, Texas"
        },
        {
            icon: "🌍",
            label: "Destination",
            value: "Munich, Germany"
        },
        {
            icon: "🌙",
            label: "Tonight",
            value: "Overnight Flight"
        }
    ],

    introTitle: "The Long Way Around begins.",

    intro:
        "After months of planning, the journey finally starts in Fort Worth. " +
        "From Texas, I head to Detroit before boarding the overnight flight " +
        "across the Atlantic to Munich.",

    stops: [
        {
            type: "Starting Point",
            name: "Fort Worth",
            description:
                "The journey begins at home in Fort Worth, Texas.",
            coordinates: [32.7555, -97.3308]
        },

        {
            type: "Connection",
            name: "Detroit",
            description:
                "Connect in Detroit before the overnight transatlantic flight.",
            coordinates: [42.3314, -83.0458]
        },

        {
            type: "Arrival",
            name: "Munich",
            description:
                "Arrive in Germany the following morning, where the European road trip begins.",
            coordinates: [48.1351, 11.5820]
        }
    ],

    photos: [

        /*
        Later you'll add photos like:

        {
            file: "../images/day-01/departure.jpg",
            caption: "Leaving Fort Worth"
        },

        {
            file: "../images/day-01/dtw.jpg",
            caption: "Connecting through Detroit"
        }
        */

    ],

    journal: "",

    videos: [

        /*
        Later:

        {
            youtubeId: "ABC123XYZ",
            title: "Day 1 — The Journey Begins"
        }
        */

    ],

    previousDay: null,

    nextDay: "day-02.html"
};