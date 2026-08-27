if ("serviceWorker" in navigator && location.protocol !== "file:" && location.origin !== "null") {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./service-worker.js").catch((error) => {
            console.warn("Service worker registration failed:", error);
        });
    });
}