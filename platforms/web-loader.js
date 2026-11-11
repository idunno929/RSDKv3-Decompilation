// Standalone Chromebook launcher for the RSDKv3 WebAssembly build.
// This UI is created before WebAssembly initialization so it remains visible
// even while the engine is compiling. The game starts only after Data.rsdk is chosen.
var Module = typeof Module !== "undefined" ? Module : {};
Module.noInitialRun = true;
Module.print = function (text) { console.log(text); };
Module.printErr = function (text) { console.error(text); };

(function () {
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

        var picker = document.getElementById("rsdk-file");
        var choose = document.getElementById("rsdk-choose");
        var start = document.getElementById("rsdk-start");
        var status = document.getElementById("rsdk-status");
        var selectedData = null;
        var engineReady = false;
        var started = false;

        function updateStart() {
            start.disabled = !(selectedData && engineReady && !started);
            if (started) return;
            if (selectedData && engineReady)
                status.textContent = "Data.rsdk is ready. Select Start Game to launch Sonic CD.";
            else if (selectedData)
                status.textContent = "Data.rsdk selected. Waiting for the engine to finish preparing…";
            else if (engineReady)
                status.textContent = "Engine ready. Choose your Data.rsdk file to continue.";
        }

        choose.addEventListener("click", function () { picker.click(); });
        picker.addEventListener("change", async function () {
            var file = picker.files && picker.files[0];
            if (!file) return;
            if (!/\.rsdk$/i.test(file.name)) {
                status.textContent = "That file does not have an .rsdk extension. Please choose Data.rsdk.";
                return;
            }
            choose.disabled = true;
            status.textContent = "Reading Data.rsdk…";
            try {
                selectedData = new Uint8Array(await file.arrayBuffer());
                status.textContent = "Data.rsdk loaded into memory.";
                updateStart();
            } catch (error) {
                console.error(error);
                selectedData = null;
                status.textContent = "The browser could not read that file. Please try selecting it again.";
            } finally {
                choose.disabled = false;
            }
        });

        start.addEventListener("click", function () {
            if (!selectedData || !engineReady || started) return;
            try {
                // The engine looks for Engine.dataFile (Data.rsdk) in its working directory.
                FS.writeFile("/Data.rsdk", selectedData);
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
                status.textContent = "Could not prepare Data.rsdk for the engine: " + error;
                started = false;
                panel.style.display = "block";
                updateStart();
            }
        });

        Module.onRuntimeInitialized = function () {
            engineReady = true;
            updateStart();
        };
        Module.onAbort = function (reason) {
            status.textContent = "The engine stopped while starting: " + reason;
            panel.style.display = "block";
            console.error("RSDKv3 stopped:", reason);
        };
        Module.setStatus = function (message) {
            if (!started && message) status.textContent = message;
        };
    }

    if (document.readyState === "loading")
        document.addEventListener("DOMContentLoaded", createLauncher);
    else
        createLauncher();
})();
