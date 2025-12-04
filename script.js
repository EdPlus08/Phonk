const USER = "EdPlus08";
const REPO = "Phonk";

const API = `https://api.github.com/repos/${USER}/${REPO}/contents/audios`;

let allSongs = []; // canciones del repo
let currentAnimationId = null;
let currentCanvas = null;
let currentAudio = null;

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

// ---------- Player + waveform ----------
function setupPlayers() {
    const cards = document.querySelectorAll(".song-card");

    cards.forEach(card => {
        const audio = card.querySelector("audio");
        const playBtn = card.querySelector(".play-btn");
        const timeLabel = card.querySelector(".time-label");
        const canvas = card.querySelector(".wave-canvas");

        if (!audio || !playBtn || !timeLabel || !canvas) return;

        // Ajustar tamaño del canvas
        const resizeCanvas = () => {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
        };
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        // Duración cuando se carga metadata
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
                }
            });
            document.querySelectorAll(".play-btn").forEach(btn => {
                if (btn !== playBtn) btn.textContent = "▶";
            });

            if (audio.paused) {
                try {
                    await audio.play();
                    playBtn.textContent = "⏸";
                    startFakeVisualizer(audio, canvas);
                } catch (err) {
                    console.error(err);
                }
            } else {
                audio.pause();
                playBtn.textContent = "▶";
                stopFakeVisualizer();
            }
        });
    });
}

// ---------- Waveform "fake" sincronizada con el tiempo ----------
function startFakeVisualizer(audio, canvas) {
    // parar animación anterior
    stopFakeVisualizer();

    currentAudio = audio;
    currentCanvas = canvas;

    function draw() {
        if (!currentAudio || currentAudio.paused || currentAudio.ended) {
            stopFakeVisualizer();
            return;
        }

        const ctx = currentCanvas.getContext("2d");
        const width = currentCanvas.width;
        const height = currentCanvas.height;

        ctx.clearRect(0, 0, width, height);

        const now = currentAudio.currentTime || 0;
        const duration = currentAudio.duration || 1;
        const progress = now / duration;

        // Color RGB suave basado en el tiempo
        const hue = (now * 40) % 360;
        ctx.strokeStyle = `hsl(${hue}, 80%, 65%)`;
        ctx.lineWidth = 2;

        ctx.beginPath();

        const segments = 80;
        const sliceWidth = width / segments;
        let x = 0;

        for (let i = 0; i <= segments; i++) {
            const t = (i / segments) * Math.PI * 2;

            // base de onda
            let ampBase = Math.sin(t * 2 + now * 3);

            // un poquito de "golpe" al ritmo del progreso
            const pulse = Math.sin(progress * Math.PI * 4 + i * 0.3);

            const amplitude = (ampBase * 0.4 + pulse * 0.2) * height * 0.4;

            const y = height / 2 + amplitude;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);

            x += sliceWidth;
        }

        ctx.stroke();

        currentAnimationId = requestAnimationFrame(draw);
    }

    currentAnimationId = requestAnimationFrame(draw);
}

function stopFakeVisualizer() {
    if (currentAnimationId) {
        cancelAnimationFrame(currentAnimationId);
        currentAnimationId = null;
    }
    currentAudio = null;
    currentCanvas = null;
}

// ---------- Init ----------
loadSongs();
setupSearch();










