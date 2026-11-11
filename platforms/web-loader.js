// Chromebook launcher for the RSDKv3 WebAssembly build.
var Module = typeof Module !== "undefined" ? Module : {};
Module.noInitialRun = true;
Module.print = function (text) { console.log(text); };
Module.printErr = function (text) { console.error(text); };

(function () {
    var engineReady = false;
    var started = false;
    var launcherStatus = null;
    var launcherPanel = null;

    function updateStart() {
        var start = document.getElementById("rsdk-start");
        var selectedData = window.rsdkSelectedData;
        if (!start) return;
        start.disabled = !(selectedData && engineReady && !started);
        if (started || !launcherStatus) return;
        if (selectedData && engineReady)
            launcherStatus.textContent = "Data.rsdk is ready. Select Start Game to launch Sonic CD.";
        else if (selectedData)
            launcherStatus.textContent = "Data.rsdk selected. Waiting for the engine to finish preparing…";
        else if (engineReady)
            launcherStatus.textContent = "Engine ready. Choose your Data.rsdk file to continue.";
    }

    Module.onRuntimeInitialized = function () {
        engineReady = true;
        updateStart();
    };
    Module.onAbort = function (reason) {
        if (launcherStatus) launcherStatus.textContent = "The engine stopped while starting: " + reason;
        if (launcherPanel) launcherPanel.style.display = "block";
        console.error("RSDKv3 stopped:", reason);
    };
    Module.setStatus = function (message) {
        if (!started && launcherStatus && message) launcherStatus.textContent = message;
    };

    function createLauncher() {
        var panel = document.getElementById("rsdk-launcher");
        if (!panel) return;
        launcherPanel = panel;
        launcherStatus = document.getElementById("rsdk-status");
        window.rsdkSelectedData = null;

        var picker = document.getElementById("rsdk-file");
        var choose = document.getElementById("rsdk-choose");
        var start = document.getElementById("rsdk-start");
        if (!picker || !choose || !start || panel.dataset.rsdkWired === "1") return;
        panel.dataset.rsdkWired = "1";

        choose.addEventListener("click", function () { picker.click(); });
        picker.addEventListener("change", async function () {
            var file = picker.files && picker.files[0];
            if (!file) return;
            if (!/\.rsdk$/i.test(file.name)) {
                launcherStatus.textContent = "That file does not have an .rsdk extension. Please choose Data.rsdk.";
                return;
            }
            choose.disabled = true;
            launcherStatus.textContent = "Reading Data.rsdk…";
            try {
                window.rsdkSelectedData = new Uint8Array(await file.arrayBuffer());
                updateStart();
            } catch (error) {
                console.error(error);
                window.rsdkSelectedData = null;
                launcherStatus.textContent = "The browser could not read that file. Please try selecting it again.";
            } finally {
                choose.disabled = false;
            }
        });

        start.addEventListener("click", function () {
            var data = window.rsdkSelectedData;
            if (!data || !engineReady || started) return;
            try {
                FS.writeFile("/Data.rsdk", data);
                started = true;
                panel.style.display = "none";
                var canvas = document.getElementById("canvas");
                if (canvas) {
                    canvas.tabIndex = 0;
                    canvas.focus();
                }
                Module.callMain([]);
            } catch (error) {
                console.error(error);
                launcherStatus.textContent = "Could not prepare Data.rsdk for the engine: " + error;
                started = false;
                panel.style.display = "block";
                updateStart();
            }
        });

        updateStart();
    }

    if (document.readyState === "loading")
        document.addEventListener("DOMContentLoaded", createLauncher);
    else
        createLauncher();
})();
