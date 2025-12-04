const USER = "EdPlus08";
const REPO = "Phonk";

const API = `https://api.github.com/repos/${USER}/${REPO}/contents/audios`;

let allSongs = []; // canciones del repo

// Web Audio API globals
let audioCtx = null;
let analyser = null;
let dataArray = null;
let animationId = null;
let currentAudio = null;
let currentCanvas = null;

// Mapa para no recrear la fuente muchas veces
const sourceMap = new WeakMap();

// ---------- Utilidades de tiempo ----------
function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

// ---------- Carga de canciones ----------
async function loadSongs() {
    const container = document.getElementById("song-list");
    const countSpan = document.getElementById("song-count");
    container.innerHTML = "Cargando...";

    try {
        const res = await fetch(API);
        const files = await res.json();

        allSongs = files.filter(file =>
            file.name.toLowerCase().endsWith(".mp3") ||
            file.name.toLowerCase().endsWith(".wav")
        );

        renderSongs(allSongs);

        if (countSpan) {
            countSpan.textContent = `${allSongs.length} tema${allSongs.length === 1 ? "" : "s"}`;
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = "Error al cargar canciones.";
    }
}

// ---------- Render de lista ----------
function renderSongs(list) {
    const container = document.getElementById("song-list");
    container.innerHTML = "";

    if (!list || list.length === 0) {
        container.innerHTML = "No se encontraron canciones.";
        return;
    }

    list.forEach(file => {
        const card = document.createElement("div");
        card.className = "song-card";

        const name = file.name.replace(/\.[^/.]+$/, ""); // quitar extensión

        card.innerHTML = `
            <p class="song-title">${name}</p>

            <div class="custom-player">
                <button class="play-btn">▶</button>
                <span class="time-label">0:00 / 0:00</span>
                <div class="wave-container">
                    <canvas class="wave-canvas"></canvas>
                </div>
            </div>

            <audio src="${file.download_url}"></audio>

            <a href="${file.download_url}" download>
                <button>Descargar</button>
            </a>
        `;

        container.appendChild(card);
    });

    setupPlayers();
}

// ---------- Búsqueda ----------
function setupSearch() {
    const searchInput = document.getElementById("search");
    if (!searchInput) return;

    searchInput.addEventListener("input", () => {
        const term = searchInput.value.trim().toLowerCase();

        if (term === "") {
            renderSongs(allSongs);
        } else {
            const filtered = allSongs.filter(file =>
                file.name.toLowerCase().includes(term)
            );
            renderSongs(filtered);
        }
    });
}

// ---------- Player + visualizer ----------
function setupPlayers() {
    const cards = document.querySelectorAll(".song-card");

    cards.forEach(card => {
        const audio = card.querySelector("audio");
        const playBtn = card.querySelector(".play-btn");
        const timeLabel = card.querySelector(".time-label");
        const canvas = card.querySelector(".wave-canvas");

        if (!audio || !playBtn || !timeLabel || !canvas) return;

        // Ajustar canvas
        const resizeCanvas = () => {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
        };
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        // Actualizar duración cuando se carga metadata
        audio.addEventListener("loadedmetadata", () => {
            timeLabel.textContent = `0:00 / ${formatTime(audio.duration)}`;
        });

        // Actualizar tiempo actual
        audio.addEventListener("timeupdate", () => {
            timeLabel.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
        });

        // Botón play/pause
        playBtn.addEventListener("click", async () => {
            // Pausar todos los demás audios
            document.querySelectorAll(".song-card audio").forEach(a => {
                if (a !== audio) {
                    a.pause();
                    a.currentTime = a.currentTime; // forzar evento
                }
            });
            document.querySelectorAll(".play-btn").forEach(btn => {
                if (btn !== playBtn) btn.textContent = "▶";
            });

            if (audio.paused) {
                await audio.play();
                playBtn.textContent = "⏸";
                startVisualizer(audio, canvas);
            } else {
                audio.pause();
                playBtn.textContent = "▶";
                stopVisualizer();
            }
        });
    });
}

function initAudioGraph() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 1024;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        analyser.connect(audioCtx.destination);
    }
}

function startVisualizer(audio, canvas) {
    initAudioGraph();

    // cancelar animación anterior
    if (animationId) cancelAnimationFrame(animationId);

    currentAudio = audio;
    currentCanvas = canvas;

    let source = sourceMap.get(audio);
    if (!source) {
        source = audioCtx.createMediaElementSource(audio);
        source.connect(analyser);
        sourceMap.set(audio, source);
    }

    drawWave();
}

function stopVisualizer() {
    if (animationId) cancelAnimationFrame(animationId);
    animationId = null;
}

// Dibuja la onda (waveform) en el canvas actual
function drawWave() {
    if (!currentCanvas || !analyser) return;

    const ctx = currentCanvas.getContext("2d");
    const width = currentCanvas.width;
    const height = currentCanvas.height;

    analyser.getByteTimeDomainData(dataArray);

    // Color RGB dinámico (HSL)
    let avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    let hue = (avg / 255) * 360;
    const strokeColor = `hsl(${hue}, 80%, 65%)`;

    ctx.clearRect(0, 0, width, height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = strokeColor;
    ctx.beginPath();

    const sliceWidth = width / dataArray.length;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0; // 0–2
        const y = (v * height) / 2;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

        x += sliceWidth;
    }

    ctx.lineTo(width, height / 2);
    ctx.stroke();

    animationId = requestAnimationFrame(drawWave);
}

// ---------- Init ----------
loadSongs();
setupSearch();








