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

    // Register these callbacks immediately. Emscripten can finish initializing
    // before the browser fires DOMContentLoaded.
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
        if (document.getElementById("rsdk-launcher")) return;

        var style = document.createElement("style");
        style.textContent =
            "html,body{margin:0;min-height:100%;background:#101522;color:#fff;font-family:system-ui,sans-serif}" +
            "#rsdk-launcher{box-sizing:border-box;width:min(92%,620px);margin:7vh auto 24px;padding:28px 22px;text-align:center;background:#1b263b;border:1px solid #34445f;border-radius:18px;box-shadow:0 16px 50px #0008}" +
            "#rsdk-launcher h1{font-size:clamp(25px,5vw,38px);margin:0 0 8px}#rsdk-launcher p{line-height:1.5;color:#d3dced}" +
            ".rsdk-button{display:inline-block;margin:7px;padding:13px 20px;border:0;border-radius:10px;background:#f5c542;color:#172033;font-size:16px;font-weight:700;cursor:pointer}" +
            ".rsdk-button:disabled{opacity:.45;cursor:default}#rsdk-status{min-height:48px;margin-top:14px;font-size:14px}" +
            "#canvas{display:block;width:min(100%,960px);height:auto;margin:12px auto;background:#000}";
        document.head.appendChild(style);

        var panel = document.createElement("main");
        panel.id = "rsdk-launcher";
        panel.innerHTML =
            '<h1>Sonic CD — RSDKv3</h1>' +
            '<p>Choose your legally obtained <b>Data.rsdk</b> file, then start the game.</p>' +
            '<input id="rsdk-file" type="file" accept=".rsdk,application/octet-stream" hidden>' +
            '<button class="rsdk-button" id="rsdk-choose">Choose Data.rsdk</button>' +
            '<button class="rsdk-button" id="rsdk-start" disabled>Start Game</button>' +
            '<p id="rsdk-status" role="status">Preparing the game engine… You can select your Data.rsdk while it loads.</p>';
        document.body.insertBefore(panel, document.body.firstChild);
        launcherPanel = panel;

        var picker = document.getElementById("rsdk-file");
        var choose = document.getElementById("rsdk-choose");
        var start = document.getElementById("rsdk-start");
        launcherStatus = document.getElementById("rsdk-status");
        window.rsdkSelectedData = null;

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
