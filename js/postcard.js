(() => {

    const FORM =
        document.getElementById("postcard-form");

    const MESSAGE =
        document.getElementById("postcard-message");

    const COUNT =
        document.getElementById("postcard-count");

    const STATUS =
        document.getElementById("postcard-status");

    const BUTTON =
        document.getElementById("postcard-submit");

    const SOURCE =
        document.getElementById("postcard-source");


    /*
     * We will replace this after creating
     * the Cloudflare Worker.
     */
    const POSTCARD_ENDPOINT =
        "https://postcards-mailbox.bjdominguez.workers.dev";


    // --------------------------------------------------------
    // Where did the visitor come from?
    // --------------------------------------------------------

    const params =
        new URLSearchParams(window.location.search);

    const source =
        params.get("from");

    if (source) {

        SOURCE.value =
            source.substring(0, 120);

    }


    // --------------------------------------------------------
    // Character counter
    // --------------------------------------------------------

    const updateCount = () => {

        COUNT.textContent =
            MESSAGE.value.length;

    };

    MESSAGE.addEventListener(
        "input",
        updateCount
    );

    updateCount();


    // --------------------------------------------------------
    // Submit postcard
    // --------------------------------------------------------

    FORM.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            STATUS.className =
                "postcard-status";

            STATUS.textContent = "";


            if (
                POSTCARD_ENDPOINT ===
                "REPLACE_WITH_WORKER_URL"
            ) {

                STATUS.classList.add(
                    "is-error"
                );

                STATUS.textContent =
                    "The postcard mailbox is not connected yet.";

                return;

            }


            const formData =
                new FormData(FORM);


            const payload = {

                name:
                    formData
                        .get("name")
                        ?.toString()
                        .trim(),

                email:
                    formData
                        .get("email")
                        ?.toString()
                        .trim(),

                message:
                    MESSAGE
                        .value
                        .trim(),

                source:
                    formData
                        .get("source")
                        ?.toString()
                        .trim(),

                website:
                    formData
                        .get("website")
                        ?.toString()
                        .trim(),

                turnstileToken:
                    formData
                        .get(
                            "cf-turnstile-response"
                        )
                        ?.toString()

            };


            if (!payload.name) {

                STATUS.classList.add(
                    "is-error"
                );

                STATUS.textContent =
                    "Please add your name.";

                return;

            }


            if (!payload.message) {

                STATUS.classList.add(
                    "is-error"
                );

                STATUS.textContent =
                    "Don't forget to write your postcard.";

                return;

            }


            if (!payload.turnstileToken) {

                STATUS.classList.add(
                    "is-error"
                );

                STATUS.textContent =
                    "Please complete the verification first.";

                return;

            }


            BUTTON.disabled = true;

            BUTTON.textContent =
                "Sending…";


            try {

                const response =
                    await fetch(
                        POSTCARD_ENDPOINT,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    payload
                                )
                        }
                    );


                const result =
                    await response.json();


                if (
                    !response.ok ||
                    !result.ok
                ) {

                    throw new Error(
                        result.error ||
                        "Unable to send postcard."
                    );

                }


                FORM.reset();

                MESSAGE.value = "";

                updateCount();


                STATUS.classList.add(
                    "is-success"
                );

                STATUS.textContent =
                    "Postcard sent. Thanks for writing back.";


                BUTTON.textContent =
                    "Postcard Sent";


                if (
                    window.turnstile
                ) {

                    window.turnstile.reset();

                }


                setTimeout(
                    () => {

                        BUTTON.disabled = false;

                        BUTTON.textContent =
                            "Send Postcard";

                    },
                    2500
                );

            }

            catch (error) {

                STATUS.classList.add(
                    "is-error"
                );

                STATUS.textContent =
                    "Your postcard couldn't be sent. Please try again.";


                BUTTON.disabled = false;

                BUTTON.textContent =
                    "Send Postcard";


                if (
                    window.turnstile
                ) {

                    window.turnstile.reset();

                }

            }

        }
    );

})();
