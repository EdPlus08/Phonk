const USER = "EdPlus08";
const REPO = "Phonk";

const API = `https://api.github.com/repos/${USER}/${REPO}/contents/audios`;

let allSongs = []; // canciones del repo

// Web Audio API
let audioCtx = null;
let analyser = null;
let dataArray = null;
let animationId = null;
let currentSource = null;
let currentCanvas = null;

// Cargar canciones desde GitHub
async function loadSongs() {
    const container = document.getElementById("song-list");
    const countSpan = document.getElementById("song-count");
    container.innerHTML = "Cargando...";

    try {
        const res = await fetch(API);
        const files = await res.json();

        // Solo mp3 / wav
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

// Pintar lista
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

        const name = file.name.replace(/\.[^/.]+$/, ""); // sin .mp3

        card.innerHTML = `
            <p class="song-title">${name}</p>
            <audio controls src="${file.download_url}"></audio>

            <div class="wave-container">
                <canvas class="wave-canvas"></canvas>
            </div>

            <a href="${file.download_url}" download>
                <button>Descargar</button>
            </a>
        `;

        container.appendChild(card);
    });

    setupSearchHandlers();     // mantiene búsqueda
    setupVisualizerHandlers(); // conecta ondas a los audios
}

// Búsqueda en vivo
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

// Como renderSongs vuelve a pintar, necesitamos re-vincular el input cada vez
function setupSearchHandlers() {
    // Nada extra por ahora, dejamos aquí por si luego quieres más lógica
}

// Configurar visualizer por cada audio
function setupVisualizerHandlers() {
    const cards = document.querySelectorAll(".song-card");

    cards.forEach(card => {
        const audio = card.querySelector("audio");
        const canvas = card.querySelector(".wave-canvas");

        if (!audio || !canvas) return;

        // Ajustar tamaño del canvas al tamaño real en pantalla
        const resizeCanvas = () => {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
        };
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        // Cuando empiece a sonar este audio, conectamos el analizador
        audio.addEventListener("play", () => {
            startVisualizer(audio, canvas);

            // Pausar otros audios
            document.querySelectorAll("audio").forEach(a => {
                if (a !== audio) a.pause();
            });
        });
    });
}

// Iniciar visualizer para un audio concreto
function startVisualizer(audio, canvas) {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 1024;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
    }

    // Cancelar animación anterior
    if (animationId) {
        cancelAnimationFrame(animationId);
    }

    // Desconectar fuente anterior
    if (currentSource) {
        try {
            currentSource.disconnect();
        } catch (e) {
            console.warn(e);
        }
    }

    // Crear nueva fuente
    currentSource = audioCtx.createMediaElementSource(audio);
    currentSource.connect(analyser);
    analyser.connect(audioCtx.destination);

    currentCanvas = canvas;
    drawWave();
}

// Dibujar waveform en tiempo real
function drawWave() {
    if (!currentCanvas || !analyser) return;

    const ctx = currentCanvas.getContext("2d");
    const width = currentCanvas.width;
    const height = currentCanvas.height;

    analyser.getByteTimeDomainData(dataArray);

    // Color dinámico tipo RGB/HSL
    let avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    let hue = (avg / 255) * 360; // 0–360
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

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }

        x += sliceWidth;
    }

    ctx.lineTo(width, height / 2);
    ctx.stroke();

    animationId = requestAnimationFrame(drawWave);
}

// Inicializar
loadSongs();
setupSearch();







