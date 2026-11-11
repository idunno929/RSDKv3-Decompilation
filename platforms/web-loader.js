// Browser bootstrap for the RSDKv3 WebAssembly build.
// The engine starts only after the user selects a legally obtained Data.rsdk.
var Module = typeof Module !== "undefined" ? Module : {};
Module.noInitialRun = true;
Module.preRun = Module.preRun || [];
Module.preRun.push(function () {
    FS.mkdir("/persistent");
    FS.mount(IDBFS, {}, "/persistent");
    addRunDependency("persistent-filesystem");
    FS.syncfs(true, function (error) {
        if (error)
            console.error("Could not restore browser save data:", error);
        removeRunDependency("persistent-filesystem");
    });
});

Module.onRuntimeInitialized = function () {
    var canvas = document.getElementById("canvas");
    var panel = document.createElement("section");
    panel.id = "rsdk-browser-loader";
    panel.style.cssText = "max-width:560px;margin:24px auto;padding:24px;border-radius:12px;background:#171923;color:#fff;font:16px system-ui;text-align:center;box-shadow:0 8px 32px #0006";
    panel.innerHTML =
        '<h1 style="margin:0 0 8px">Sonic CD — Browser Build</h1>' +
        '<p style="opacity:.8">Choose your own Data.rsdk file to start. Your file and save data stay in this browser.</p>' +
        '<input id="rsdk-file" type="file" accept=".rsdk,application/octet-stream" style="display:none">' +
        '<button id="rsdk-choose" style="padding:12px 18px;margin:6px;border:0;border-radius:8px;font-weight:700;cursor:pointer">Choose Data.rsdk</button>' +
        '<button id="rsdk-start" style="padding:12px 18px;margin:6px;border:0;border-radius:8px;font-weight:700;cursor:pointer" disabled>Start Game</button>' +
        '<button id="rsdk-fullscreen" style="padding:12px 18px;margin:6px;border:0;border-radius:8px;cursor:pointer">Fullscreen</button>' +
        '<p id="rsdk-status" role="status" style="min-height:24px;opacity:.85"></p>';
    document.body.insertBefore(panel, canvas || document.body.firstChild);
    if (canvas) {
        canvas.tabIndex = 0;
        canvas.style.display = "block";
        canvas.style.width = "min(100%, 960px)";
        canvas.style.height = "auto";
        canvas.style.margin = "16px auto";
        canvas.style.background = "#000";
    }

    var picker = document.getElementById("rsdk-file");
    var choose = document.getElementById("rsdk-choose");
    var start = document.getElementById("rsdk-start");
    var fullscreen = document.getElementById("rsdk-fullscreen");
    var status = document.getElementById("rsdk-status");
    var started = false;

    function hasDataFile() {
        return FS.analyzePath("/persistent/Data.rsdk").exists;
    }
    function updateReady() {
        start.disabled = !hasDataFile() || started;
        status.textContent = hasDataFile()
            ? "Data.rsdk is ready. Your browser keeps it for next time."
            : "Select the Data.rsdk file from your Sonic CD 2011 installation.";
    }
    function syncFilesystem() {
        return new Promise(function (resolve, reject) {
            FS.syncfs(false, function (error) {
                if (error) reject(error);
                else resolve();
            });
        });
    }

    choose.addEventListener("click", function () { picker.click(); });
    picker.addEventListener("change", async function () {
        var file = picker.files && picker.files[0];
        if (!file) return;
        if (!/\.rsdk$/i.test(file.name)) {
            status.textContent = "Please choose a .rsdk data file.";
            return;
        }
        choose.disabled = true;
        status.textContent = "Copying game data into browser storage…";
        try {
            FS.writeFile("/persistent/Data.rsdk", new Uint8Array(await file.arrayBuffer()));
            await syncFilesystem();
            status.textContent = "Data.rsdk saved in this browser.";
            updateReady();
        } catch (error) {
            console.error(error);
            status.textContent = "Could not save the file. Check available browser storage and try again.";
        } finally {
            choose.disabled = false;
        }
    });
    start.addEventListener("click", function () {
        if (!hasDataFile() || started) return;
        started = true;
        start.disabled = true;
        choose.disabled = true;
        status.textContent = "Starting the engine…";
        panel.style.display = "none";
        if (canvas) canvas.focus();
        Module.callMain([]);
    });
    fullscreen.addEventListener("click", function () {
        var target = canvas || document.documentElement;
        if (target.requestFullscreen) target.requestFullscreen();
    });

    updateReady();
};
Module.onAbort = function (reason) {
    console.error("RSDKv3 stopped:", reason);
};
