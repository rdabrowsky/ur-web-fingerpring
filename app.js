const $ = (id) => document.getElementById(id);
let latestMainHash = "";

const setText = (id, value, tone) => {
  const el = $(id);
  if (!el) return;
  el.textContent = value ?? "-";
  if (tone) el.classList.add(tone);
};

const yesNoTag = (ok) => `<span class="tag ${ok ? "on" : "off"}">${ok ? "present" : "absent"}</span>`;

async function copyElementText(targetId, button) {
  const text = $(targetId)?.textContent?.trim();
  if (!text || text === "computing...") return;
  await navigator.clipboard.writeText(text);
  const previous = button.textContent;
  button.textContent = "copied";
  window.setTimeout(() => {
    button.textContent = previous;
  }, 1200);
}

async function simpleHash(input) {
  const data = new TextEncoder().encode(String(input));
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function initTabs() {
  document.querySelectorAll(".tab-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab;
      document.querySelectorAll(".tab-btn").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      $(`tab-${tab}`)?.classList.add("active");
    });
  });
}

function initControls() {
  $("copy-main-hash")?.addEventListener("click", (event) => {
    if (!latestMainHash) return;
    navigator.clipboard.writeText(latestMainHash);
    const button = event.currentTarget;
    button.textContent = "copied";
    window.setTimeout(() => {
      button.textContent = "copy";
    }, 1200);
  });

  document.querySelectorAll("[data-copy-target]").forEach((button) => {
    button.addEventListener("click", () => copyElementText(button.dataset.copyTarget, button));
  });

  $("rerun-canvas")?.addEventListener("click", async () => {
    setText("canvas-hash", "computing...");
    setText("webgl-hash", "computing...");
    $("webgl-params").innerHTML = `<div class="loading"><div class="spinner"></div>Pobieranie parametrów WebGL...</div>`;
    await initCanvasFingerprint();
  });

  $("rerun-audio")?.addEventListener("click", async () => {
    setText("aud-full-hash", "computing...");
    setText("aud-hash-short", "-");
    $("audio-samples").innerHTML = `<div class="loading"><div class="spinner"></div>Computing samples...</div>`;
    await initAudioFingerprint();
  });

  $("check-custom-font")?.addEventListener("click", () => {
    const font = $("custom-font-name")?.value.trim();
    if (!font) {
      setText("font-tool-status", "Enter the exact font family name first.");
      return;
    }

    const detector = createFontDetector();
    const ok = detector.isInstalled(font);
    prependFontResult(font, ok);
    setText(
      "font-tool-status",
      ok
        ? `${font} was detected by canvas measurement.`
        : `${font} was not detected. Check the exact family name and restart the browser after installation.`,
    );
  });

  $("custom-font-name")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") $("check-custom-font")?.click();
  });

  $("scan-local-fonts")?.addEventListener("click", scanLocalFonts);
}

function initMatrixRain() {
  const canvas = $("matrix-rain");
  const ctx = canvas.getContext("2d");
  const glyphs = "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789";
  const fontSize = 16;
  let columns = 0;
  let drops = [];

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    columns = Math.ceil(canvas.width / fontSize);
    drops = Array.from({ length: columns }, () => Math.random() * canvas.height);
  };

  const draw = () => {
    ctx.fillStyle = "rgba(4, 37, 58, 0.08)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#94f5b8";
    ctx.font = `${fontSize}px JetBrains Mono, monospace`;

    for (let i = 0; i < drops.length; i += 1) {
      const glyph = glyphs[Math.floor(Math.random() * glyphs.length)];
      ctx.fillText(glyph, i * fontSize, drops[i] * fontSize);
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i] += 1;
    }
  };

  resize();
  window.addEventListener("resize", resize);
  window.setInterval(draw, 55);
}

function getWebGlContext(canvas) {
  return (
    canvas.getContext("webgl2") ||
    canvas.getContext("webgl") ||
    canvas.getContext("experimental-webgl")
  );
}

function initHardware() {
  const n = navigator;
  const s = screen;
  const conn = n.connection || n.mozConnection || n.webkitConnection;

  setText("hw-cores", n.hardwareConcurrency || "n/a");
  setText("hw-mem", n.deviceMemory ? `${n.deviceMemory} GB` : "n/a");
  setText("hw-dpr", window.devicePixelRatio.toFixed(2));
  setText("hw-touch", n.maxTouchPoints ?? "n/a");
  setText("hw-depth", `${s.colorDepth}-bit`);
  setText("hw-conn", conn ? conn.effectiveType || conn.type || "n/a" : "n/a");

  setText("hw-screen", `${s.width} x ${s.height}`);
  setText("hw-avail", `${s.availWidth} x ${s.availHeight}`);
  setText("hw-window", `${window.innerWidth} x ${window.innerHeight}`);
  setText("hw-depth2", `${s.colorDepth} bit`);
  setText("hw-dpr2", `${window.devicePixelRatio.toFixed(3)}x`);
  setText("hw-orient", s.orientation?.type || (window.innerWidth > window.innerHeight ? "landscape" : "portrait"));

  if (conn) {
    setText("hw-nettype", conn.type || "n/a");
    setText("hw-efftype", conn.effectiveType || "n/a");
    setText("hw-downlink", conn.downlink != null ? `${conn.downlink} Mbps` : "n/a");
    setText("hw-rtt", conn.rtt != null ? `${conn.rtt} ms` : "n/a");
    setText("hw-savedata", conn.saveData ? "enabled" : "disabled");
  } else {
    ["hw-nettype", "hw-efftype", "hw-downlink", "hw-rtt", "hw-savedata"].forEach((id) => setText(id, "n/a"));
  }

  setText("hw-cores2", n.hardwareConcurrency || "n/a");
  setText("hw-mem2", n.deviceMemory ? `${n.deviceMemory} GB` : "n/a");
  setText("hw-touch2", n.maxTouchPoints ?? "n/a");
  setText("hw-vibration", "vibrate" in n ? "present" : "absent");
  setText("hw-share", "share" in n ? "present" : "absent");

  if ("getBattery" in n) {
    n.getBattery()
      .then((battery) => {
        const pct = Math.round(battery.level * 100);
        setText("hw-battery", `${pct}% ${battery.charging ? "charging" : "battery"}`);
      })
      .catch(() => setText("hw-battery", "blocked"));
  } else {
    setText("hw-battery", "n/a");
  }

  try {
    const c = document.createElement("canvas");
    const gl = getWebGlContext(c);
    if (!gl) {
      setText("hw-webgl", "n/a");
      return;
    }

    setText("hw-webgl", gl instanceof WebGL2RenderingContext ? "WebGL 2.0" : "WebGL 1.0");
    setText("hw-gpu", gl.getParameter(gl.RENDERER) || "n/a");
    setText("hw-gpuv", gl.getParameter(gl.VENDOR) || "n/a");
    setText("hw-texsize", gl.getParameter(gl.MAX_TEXTURE_SIZE));
    const viewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    setText("hw-viewport", viewport ? `${viewport[0]} x ${viewport[1]}` : "n/a");
    setText("hw-glsl", gl.getParameter(gl.SHADING_LANGUAGE_VERSION) || "n/a");

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (debugInfo) {
      setText("hw-gpuu", gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "n/a");
      setText("hw-gpuuv", gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || "n/a");
    } else {
      setText("hw-gpuu", "blocked");
      setText("hw-gpuuv", "blocked");
    }
  } catch (error) {
    setText("hw-webgl", `error: ${error.message}`);
  }
}

function parseUserAgent(ua) {
  const parsed = [];
  const checks = [
    [/Edg\/([\d.]+)/, "Edge"],
    [/OPR\/([\d.]+)/, "Opera"],
    [/Firefox\/([\d.]+)/, "Firefox"],
    [/Chrome\/([\d.]+)/, "Chrome"],
    [/Version\/([\d.]+).*Safari/, "Safari"],
    [/Windows NT ([\d.]+)/, "Windows NT"],
    [/Mac OS X ([\d_]+)/, "macOS"],
    [/Android ([\d.]+)/, "Android"],
  ];

  checks.forEach(([regex, label]) => {
    const match = ua.match(regex);
    if (match) parsed.push(`${label} ${match[1].replace(/_/g, ".")}`);
  });
  if (/Linux/.test(ua) && !parsed.some((item) => item.startsWith("Android"))) parsed.push("Linux");
  if (/iPhone|iPad/.test(ua)) parsed.push("iOS");
  return parsed.join(" | ") || "unknown";
}

function initSoftware() {
  const n = navigator;
  const ua = n.userAgent || "";

  setText("sw-ua", ua || "n/a");
  setText("sw-ua-parsed", `-> ${parseUserAgent(ua)}`);
  setText("sw-appname", n.appName || "n/a");
  setText("sw-appver", n.appVersion ? `${n.appVersion.slice(0, 80)}${n.appVersion.length > 80 ? "..." : ""}` : "n/a");
  setText("sw-product", n.product || "n/a");
  setText("sw-vendor", n.vendor || "n/a");
  setText("sw-lang", n.language || "n/a");
  setText("sw-langs", n.languages?.join(", ") || "n/a");
  setText("sw-cookies", n.cookieEnabled ? "enabled" : "disabled");
  setText("sw-dnt", n.doNotTrack || window.doNotTrack || "n/a");
  setText("sw-java", n.javaEnabled ? (n.javaEnabled() ? "yes" : "no") : "n/a");

  setText("sw-platform", n.platform || "n/a");
  const osHint = /Win/.test(n.platform)
    ? "Windows"
    : /Mac/.test(n.platform)
      ? "macOS"
      : /Linux/.test(n.platform)
        ? "Linux"
        : /iPhone|iPad/.test(ua)
          ? "iOS"
          : "Unknown";
  setText("sw-os", osHint);
  setText("sw-cpu", n.cpuClass || n.oscpu || "n/a");
  setText("sw-online", n.onLine ? "online" : "offline", n.onLine ? "green" : "red");
  setText("sw-pdf", n.pdfViewerEnabled ? "built-in" : n.mimeTypes?.["application/pdf"] ? "plugin" : "n/a");

  try {
    const options = Intl.DateTimeFormat().resolvedOptions();
    const offset = -new Date().getTimezoneOffset();
    setText("sw-tz", options.timeZone || "n/a");
    setText("sw-utc", `UTC${offset >= 0 ? "+" : ""}${(offset / 60).toFixed(1)}`);
    setText("sw-time", new Date().toLocaleTimeString());
    setText("sw-cal", options.calendar || "n/a");
    setText("sw-numfmt", new Intl.NumberFormat().format(1234567.89));
  } catch {
    setText("sw-tz", "blocked");
  }

  const apis = [
    ["Geolocation", "geolocation" in n],
    ["Bluetooth", "bluetooth" in n],
    ["USB", "usb" in n],
    ["NFC", "nfc" in n],
    ["WebXR", "xr" in n],
    ["Gamepad", "getGamepads" in n],
    ["MIDI", "requestMIDIAccess" in n],
    ["MediaDevices", "mediaDevices" in n],
    ["WebRTC", "RTCPeerConnection" in window],
    ["WebSocket", "WebSocket" in window],
    ["WebWorker", "Worker" in window],
    ["SharedWorker", "SharedWorker" in window],
    ["WASM", "WebAssembly" in window],
    ["Clipboard", "clipboard" in n],
    ["Notifications", "Notification" in window],
    ["Push", "PushManager" in window],
    ["WakeLock", "wakeLock" in n],
    ["Credential", "credentials" in n],
    ["Permissions", "permissions" in n],
    ["ContactPicker", "contacts" in n],
  ];

  $("sw-apis").innerHTML = apis
    .map(([name, ok]) => `<div class="row"><span class="row-key">${name}</span><span>${yesNoTag(ok)}</span></div>`)
    .join("");
}

const FONT_LIST = [
  "Arial",
  "Arial Black",
  "Arial Narrow",
  "Arial Rounded MT Bold",
  "Bookman Old Style",
  "Bradley Hand ITC",
  "Century",
  "Century Gothic",
  "Comic Sans MS",
  "Courier",
  "Courier New",
  "Georgia",
  "Impact",
  "Lucida Console",
  "Monospace",
  "Monotype Corsiva",
  "Papyrus",
  "Tahoma",
  "Times",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
  "Helvetica",
  "Helvetica Neue",
  "Palatino",
  "Palatino Linotype",
  "Garamond",
  "Calibri",
  "Cambria",
  "Candara",
  "Constantia",
  "Corbel",
  "Franklin Gothic Medium",
  "Gill Sans",
  "Gill Sans MT",
  "Segoe UI",
  "Segoe UI Light",
  "Segoe UI Semibold",
  "Meiryo",
  "MS Gothic",
  "MS Mincho",
  "MS PGothic",
  "Osaka",
  "Ubuntu",
  "DejaVu Sans",
  "Liberation Sans",
  "Liberation Serif",
  "Liberation Mono",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Source Sans Pro",
  "Noto Sans",
  "Fira Sans",
  "Fira Code",
  "JetBrains Mono",
  "Consolas",
  "Monaco",
  "Menlo",
  "Inconsolata",
  "Source Code Pro",
  "Droid Sans",
  "Droid Serif",
  "Droid Sans Mono",
  "Apple Color Emoji",
  "Segoe UI Emoji",
  "Segoe UI Symbol",
  "Symbol",
  "Wingdings",
  "Wingdings 2",
  "Wingdings 3",
  "Webdings",
  "MS Outlook",
  "Small Fonts",
  "Marlett",
  "Angsana New",
  "Browallia New",
  "Cordia New",
  "DilleniaUPC",
  "EucrosiaUPC",
  "FreesiaUPC",
  "IrisUPC",
  "JasmineUPC",
  "KodchiangUPC",
  "LilyUPC",
];

function createFontDetector() {
  const canvas = document.createElement("canvas");
  canvas.width = 700;
  canvas.height = 80;
  const ctx = canvas.getContext("2d");
  const testString = "mmmmmmmmmmlliWWW BrowserFingerprint";
  const fontSize = 18;
  const baseFonts = ["monospace", "sans-serif", "serif"];

  const getWidth = (font) => {
    ctx.font = `${fontSize}px ${font}`;
    return ctx.measureText(testString).width;
  };

  const baseWidths = Object.fromEntries(baseFonts.map((font) => [font, getWidth(font)]));
  const isInstalled = (font) =>
    baseFonts.some((base) => Math.abs(getWidth(`"${font}",${base}`) - baseWidths[base]) > 0.01);

  return { isInstalled };
}

function createFontItem(font, ok) {
  const item = document.createElement("div");
  item.className = `font-item${ok ? " found" : ""}`;

  const name = document.createElement("span");
  name.className = "font-name";
  name.style.fontFamily = `"${font}", sans-serif`;
  name.textContent = font;

  const badge = document.createElement("span");
  badge.className = `font-badge ${ok ? "found" : "not-found"}`;
  badge.textContent = ok ? "FOUND" : "N/A";

  item.append(name, badge);
  return item;
}

function prependFontResult(font, ok) {
  const list = $("font-list");
  if (!list) return;
  const existing = Array.from(list.querySelectorAll(".font-name")).find(
    (item) => item.textContent.toLowerCase() === font.toLowerCase(),
  );
  if (existing) {
    existing.closest(".font-item")?.remove();
  }
  list.prepend(createFontItem(font, ok));
}

async function scanLocalFonts() {
  if (!("queryLocalFonts" in window)) {
    setText("font-tool-status", "Local Font Access API is not available in this browser. Use the exact-name check instead.");
    return;
  }

  try {
    setText("font-tool-status", "Waiting for browser permission to read local font names...");
    const localFonts = await window.queryLocalFonts();
    const names = localFonts.flatMap((font) => [font.family, font.fullName, font.postscriptName]).filter(Boolean);
    const families = [...new Set(names)].sort((a, b) => a.localeCompare(b));
    const list = $("font-list");
    list.innerHTML = "";

    if (families.length === 0) {
      setText("font-installed", 0);
      setText("font-total-count", 0);
      setText("font-count", "00");
      setText("font-ratio", "0%");
      $("font-progress").style.width = "100%";
      setText("font-progress-pct", "100%");
      setText("font-progress-label", "Local font access returned no font names");
      setText(
        "font-tool-status",
        `Permission was granted, but the browser returned 0 fonts. Try Chrome/Edge desktop, restart the browser after installing fonts, or use the exact-name check.`,
      );
      return;
    }

    families.forEach((font) => list.appendChild(createFontItem(font, true)));

    setText("font-installed", families.length);
    setText("font-total-count", families.length);
    setText("font-count", String(families.length).padStart(2, "0"));
    setText("font-ratio", "100%");
    $("font-progress").style.width = "100%";
    setText("font-progress-pct", "100%");
    setText("font-progress-label", "Local font access scan complete");
    setText(
      "font-tool-status",
      `Loaded ${families.length} local font names from ${localFonts.length} browser font records.`,
    );
  } catch (error) {
    setText("font-tool-status", `Local font scan failed or was denied: ${error.message}`);
  }
}

async function initFonts() {
  const detector = createFontDetector();

  const list = $("font-list");
  list.innerHTML = "";
  let found = 0;

  setText("font-total-count", FONT_LIST.length);

  for (let i = 0; i < FONT_LIST.length; i += 1) {
    const font = FONT_LIST[i];
    const ok = detector.isInstalled(font);
    if (ok) found += 1;

    list.appendChild(createFontItem(font, ok));

    const pct = Math.round(((i + 1) / FONT_LIST.length) * 100);
    $("font-progress").style.width = `${pct}%`;
    setText("font-progress-pct", `${pct}%`);
    setText("font-progress-label", `Testowanie: ${font}`);
    setText("font-installed", found);
    setText("font-count", String(found).padStart(2, "0"));
    setText("font-ratio", `${Math.round((found / (i + 1)) * 100)}%`);

    if (i % 10 === 0) await new Promise((resolve) => window.setTimeout(resolve, 0));
  }

  setText("font-progress-label", "Skanowanie zakończone");
  setText("font-ratio", `${Math.round((found / FONT_LIST.length) * 100)}%`);
}

function drawFingerprintCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  const { width: w, height: h } = canvas;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#04253a";
  ctx.fillRect(0, 0, w, h);

  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, "rgba(148,245,184,0.82)");
  gradient.addColorStop(0.5, "rgba(117,166,153,0.55)");
  gradient.addColorStop(1, "rgba(225,221,191,0.72)");
  ctx.fillStyle = gradient;
  ctx.fillRect(20, 20, w - 40, h - 40);

  ctx.fillStyle = "#e1ddbf";
  ctx.font = "bold 16px Arial";
  ctx.fillText("BrowserFingerprint :: hardware glyphs", 30, 60);

  ctx.font = "12px Courier New";
  ctx.fillStyle = "#94f5b8";
  ctx.fillText("Cwm fjordbank glyphs vext quiz - Matrix node 04253A", 30, 90);

  ctx.beginPath();
  ctx.moveTo(30, 130);
  ctx.bezierCurveTo(105, 80, 300, 180, w - 30, 110);
  ctx.strokeStyle = "rgba(225,221,191,0.95)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const ops = ["source-over", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn"];
  for (let i = 0; i < ops.length; i += 1) {
    ctx.globalCompositeOperation = ops[i];
    ctx.beginPath();
    ctx.arc(w - 92 + i * 11, h - 62, 32 - i * 2, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${120 + i * 18}, 62%, 62%, 0.48)`;
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";

  for (let i = 0; i < 34; i += 1) {
    ctx.fillStyle = `rgba(${(76 + i * 5) % 255},${(131 + i * 7) % 255},${(122 + i * 11) % 255},0.72)`;
    ctx.fillRect(18 + i * 14, h - 30, 8, 8);
  }

  ctx.font = "20px serif";
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = 0.9;
  ctx.fillText("matrix canvas fp", w - 178, h - 14);
  ctx.globalAlpha = 1;
}

function drawChannels(sourceCanvas) {
  const srcCtx = sourceCanvas.getContext("2d");
  const src = srcCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const channels = [
    ["r", 0],
    ["g", 1],
    ["b", 2],
    ["a", 3],
  ];

  channels.forEach(([name, ci]) => {
    const chCanvas = $(`ch-${name}`);
    const chCtx = chCanvas.getContext("2d");
    const output = chCtx.createImageData(chCanvas.width, chCanvas.height);
    const scaleX = sourceCanvas.width / chCanvas.width;
    const scaleY = sourceCanvas.height / chCanvas.height;

    for (let y = 0; y < chCanvas.height; y += 1) {
      for (let x = 0; x < chCanvas.width; x += 1) {
        const sx = Math.floor(x * scaleX);
        const sy = Math.floor(y * scaleY);
        const sourceIndex = (sy * sourceCanvas.width + sx) * 4;
        const destIndex = (y * chCanvas.width + x) * 4;
        const value = src.data[sourceIndex + ci];
        output.data[destIndex] = ci === 0 ? value : 0;
        output.data[destIndex + 1] = ci === 1 ? value : 0;
        output.data[destIndex + 2] = ci === 2 ? value : 0;
        output.data[destIndex + 3] = ci === 3 ? value : 255;
      }
    }

    chCtx.putImageData(output, 0, 0);
  });
}

async function initWebGlFingerprint(canvas) {
  const gl = getWebGlContext(canvas);
  if (!gl) {
    setText("webgl-hash", "WebGL not supported");
    $("webgl-params").innerHTML = `<div class="row"><span class="row-key">WebGL</span><span class="row-val red">absent</span></div>`;
    return;
  }

  const vertex = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertex, "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}");
  gl.compileShader(vertex);

  const fragment = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(
    fragment,
    "precision mediump float;uniform float t;void main(){float r=sin(gl_FragCoord.x*0.014+t)*0.5+0.5;float g=cos(gl_FragCoord.y*0.017+t*1.3)*0.5+0.5;float b=sin((gl_FragCoord.x+gl_FragCoord.y)*0.009+t*0.7)*0.5+0.5;gl_FragColor=vec4(r,g,b,1.);}",
  );
  gl.compileShader(fragment);

  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const loc = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.uniform1f(gl.getUniformLocation(program, "t"), 1.234);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.02, 0.15, 0.22, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  setText("webgl-hash", await simpleHash(canvas.toDataURL("image/png")));

  const params = [
    ["MAX_TEXTURE_SIZE", gl.MAX_TEXTURE_SIZE],
    ["MAX_CUBE_MAP_TEXTURE_SIZE", gl.MAX_CUBE_MAP_TEXTURE_SIZE],
    ["MAX_RENDERBUFFER_SIZE", gl.MAX_RENDERBUFFER_SIZE],
    ["MAX_VERTEX_ATTRIBS", gl.MAX_VERTEX_ATTRIBS],
    ["MAX_TEXTURE_IMAGE_UNITS", gl.MAX_TEXTURE_IMAGE_UNITS],
    ["MAX_VERTEX_TEXTURE_IMAGE_UNITS", gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS],
    ["MAX_COMBINED_TEXTURE_IMAGE_UNITS", gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS],
    ["MAX_VERTEX_UNIFORM_VECTORS", gl.MAX_VERTEX_UNIFORM_VECTORS],
    ["MAX_FRAGMENT_UNIFORM_VECTORS", gl.MAX_FRAGMENT_UNIFORM_VECTORS],
    ["ALIASED_LINE_WIDTH_RANGE", gl.ALIASED_LINE_WIDTH_RANGE],
  ];

  $("webgl-params").innerHTML = params
    .map(([name, parameter]) => {
      const value = gl.getParameter(parameter);
      const display = ArrayBuffer.isView(value) ? Array.from(value).join(" - ") : value;
      return `<div class="row"><span class="row-key">${name}</span><span class="row-val">${display}</span></div>`;
    })
    .join("");
}

async function initCanvasFingerprint() {
  const canvas = $("fp-canvas");
  drawFingerprintCanvas(canvas);
  setText("canvas-hash", await simpleHash(canvas.toDataURL("image/png")));

  const ctx = canvas.getContext("2d");
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const uniquePixels = new Set();
  for (let i = 0; i < image.data.length; i += 4) {
    uniquePixels.add(`${image.data[i]},${image.data[i + 1]},${image.data[i + 2]},${image.data[i + 3]}`);
  }

  setText("cv-pixels", uniquePixels.size.toLocaleString());
  setText("cv-alpha", image.data[3] === 255 ? "opaque" : "transparent");
  setText("cv-text", "font + GPU dependent");
  drawChannels(canvas);
  await initWebGlFingerprint($("webgl-canvas"));
}

function drawFrequency(samples) {
  const canvas = $("freq-canvas");
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const bars = 120;

  ctx.fillStyle = "#04253a";
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < bars; i += 1) {
    const start = Math.floor((i / bars) * samples.length);
    const end = Math.floor(((i + 1) / bars) * samples.length);
    let sum = 0;
    for (let j = start; j < end; j += 1) sum += Math.abs(samples[j] || 0);
    const avg = sum / Math.max(1, end - start);
    const barHeight = Math.min(h, avg * h * 18);
    const x = (i / bars) * w;
    ctx.fillStyle = `hsl(${126 + i * 0.45}, 62%, ${48 + avg * 38}%)`;
    ctx.fillRect(x, h - barHeight, Math.ceil(w / bars), barHeight);
  }
}

async function initAudioFingerprint() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OfflineCtx) {
      setText("aud-full-hash", "AudioContext not supported");
      return;
    }

    const liveCtx = AudioCtx ? new AudioCtx() : null;
    const sampleRate = liveCtx?.sampleRate || 44100;
    const bufferSize = 4096;

    setText("aud-sr", `${sampleRate} Hz`);
    setText("aud-sr2", `${sampleRate} Hz`);
    setText("aud-channels", liveCtx?.destination?.maxChannelCount ?? "n/a");
    setText("aud-state", liveCtx?.state || "offline");
    setText("aud-latency", liveCtx?.baseLatency != null ? `${liveCtx.baseLatency.toFixed(4)} s` : "n/a");
    setText("aud-outlat", liveCtx?.outputLatency != null ? `${liveCtx.outputLatency.toFixed(4)} s` : "n/a");
    setText("aud-bufsize", bufferSize);

    const offCtx = new OfflineCtx(1, bufferSize, sampleRate);
    const oscillator = offCtx.createOscillator();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(10000, offCtx.currentTime);

    const compressor = offCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-50, offCtx.currentTime);
    compressor.knee.setValueAtTime(40, offCtx.currentTime);
    compressor.ratio.setValueAtTime(12, offCtx.currentTime);
    compressor.attack.setValueAtTime(0, offCtx.currentTime);
    compressor.release.setValueAtTime(0.25, offCtx.currentTime);

    oscillator.connect(compressor);
    compressor.connect(offCtx.destination);
    oscillator.start(0);

    const rendered = await offCtx.startRendering();
    const samples = rendered.getChannelData(0);
    const sampleString = Array.from(samples.slice(0, 512), (sample) => sample.toFixed(10)).join(",");
    const hash = await simpleHash(sampleString);

    setText("aud-full-hash", hash);
    setText("aud-hash-short", hash.slice(0, 8));
    drawFrequency(samples);

    const samplesEl = $("audio-samples");
    samplesEl.innerHTML = "";
    Array.from(samples.slice(0, 24)).forEach((sample, index) => {
      const cell = document.createElement("div");
      cell.className = "sample-cell";
      cell.innerHTML = `<div class="sample-idx">[${index}]</div><div class="sample-val">${sample.toFixed(6)}</div>`;
      samplesEl.appendChild(cell);
    });

    if (liveCtx) liveCtx.close();
  } catch (error) {
    setText("aud-full-hash", `Error: ${error.message}`);
  }
}

async function computeMainHash() {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    navigator.hardwareConcurrency,
    navigator.deviceMemory,
    window.devicePixelRatio,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.maxTouchPoints,
    navigator.platform,
  ].join("|");
  const hash = await simpleHash(components);
  latestMainHash = hash;
  setText("main-hash", hash);
}

window.addEventListener("DOMContentLoaded", async () => {
  initTabs();
  initControls();
  initMatrixRain();
  initHardware();
  initSoftware();
  await Promise.all([computeMainHash(), initCanvasFingerprint(), initAudioFingerprint()]);
  initFonts();
});
