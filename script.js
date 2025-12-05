const USER = "EdPlus08";
const REPO = "Phonk";

const API = `https://api.github.com/repos/${USER}/${REPO}/contents/audios`;

let allSongs = [];
const waveAnimations = new WeakMap();    // guarda id de animación por audio
const sourceMap = new WeakMap();         // guarda la fuente de audio por elemento

let audioCtx = null;
let analyser = null;
let dataArray = null;

// ---------- Utilidad: formatear tiempo ----------
function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

// ---------- Inicializar AudioContext + Analyser ----------
function ensureAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        // analyser -> destino
        analyser.connect(audioCtx.destination);
    }
}

// ---------- Cargar canciones desde GitHub ----------
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

// ---------- Pintar lista ----------
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

        const name = file.name.replace(/\.[^/.]+$/, ""); // sin .mp3/.wav

        card.innerHTML = `
            <p class="song-title">${name}</p>

            <div class="custom-player">
                <button class="play-btn">▶</button>
                <span class="time-label">0:00 / 0:00</span>
                <div class="wave-container">
                    <canvas class="wave-canvas"></canvas>
                </div>
            </div>

            <!-- IMPORTANTE: crossorigin para que el analizador pueda leer datos -->
            <audio src="${file.download_url}" crossorigin="anonymous"></audio>

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

// ---------- Configurar player custom + ondas ----------
function setupPlayers() {
    const cards = document.querySelectorAll(".song-card");

    cards.forEach(card => {
        const audio = card.querySelector("audio");
        const playBtn = card.querySelector(".play-btn");
        const timeLabel = card.querySelector(".time-label");
        const canvas = card.querySelector(".wave-canvas");
        const waveContainer = card.querySelector(".wave-container");

        if (!audio || !playBtn || !timeLabel || !canvas || !waveContainer) return;

        // Asegurar tamaño del canvas
        const resizeCanvas = () => {
            canvas.width = waveContainer.clientWidth;
            canvas.height = waveContainer.clientHeight;
        };
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        // Duración cuando carga metadata
        audio.addEventListener("loadedmetadata", () => {
            timeLabel.textContent = `0:00 / ${formatTime(audio.duration)}`;
        });

        // Actualizar tiempo actual
        audio.addEventListener("timeupdate", () => {
            timeLabel.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
        });

        // Botón play/pause
        playBtn.addEventListener("click", async () => {
            // Pausar todos los demás
            document.querySelectorAll(".song-card audio").forEach(a => {
                if (a !== audio) {
                    a.pause();
                    stopWave(a);
                }
            });
            document.querySelectorAll(".play-btn").forEach(btn => {
                if (btn !== playBtn) btn.textContent = "▶";
            });

            ensureAudioContext();
            if (audioCtx.state === "suspended") {
                await audioCtx.resume();
            }

            if (audio.paused) {
                try {
                    await audio.play();
                    playBtn.textContent = "⏸";
                    startWaveReal(audio, canvas);
                } catch (err) {
                    console.error(err);
                }
            } else {
                audio.pause();
                playBtn.textContent = "▶";
                stopWave(audio);
            }
        });

        // Click en la barra para adelantar/retroceder
        waveContainer.addEventListener("click", (e) => {
            const rect = waveContainer.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percent = clickX / rect.width;
            if (!isNaN(audio.duration)) {
                audio.currentTime = percent * audio.duration;
            }
        });

        audio.addEventListener("ended", () => {
            playBtn.textContent = "▶";
            stopWave(audio);
        });
    });
}

// ---------- Onda REAL al ritmo del sonido ----------
function startWaveReal(audio, canvas) {
    stopWave(audio); // limpiar animación anterior

    ensureAudioContext();

    // crear MediaElementSource UNA sola vez por audio
    let source = sourceMap.get(audio);
    if (!source) {
        source = audioCtx.createMediaElementSource(audio);
        source.connect(analyser);
        sourceMap.set(audio, source);
    }

    function draw() {
        if (!audio || audio.paused || audio.ended) {
            stopWave(audio);
            return;
        }

        const ctx = canvas.getContext("2d");
        const width = canvas.width;
        const height = canvas.height;

        // datos de frecuencia del sonido real
        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, width, height);

        // promedio para color
        let avg = 0;
        for (let i = 0; i < dataArray.length; i++) avg += dataArray[i];
        avg /= dataArray.length;
        const hue = (avg / 255) * 360;

        ctx.strokeStyle = `hsl(${hue}, 80%, 65%)`;
        ctx.lineWidth = 2;

        ctx.beginPath();

        const bars = 80;
        const step = Math.floor(dataArray.length / bars);
        const barWidth = width / bars;

        for (let i = 0; i < bars; i++) {
            const value = dataArray[i * step] / 255;  // 0–1
            const barHeight = value * (height * 0.9);
            const x = i * barWidth;
            const y = height - barHeight;

            // dibujar como línea "ondulada"
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }

        ctx.stroke();

        const id = requestAnimationFrame(draw);
        waveAnimations.set(audio, id);
    }

    const id = requestAnimationFrame(draw);
    waveAnimations.set(audio, id);
}

function stopWave(audio) {
    const id = waveAnimations.get(audio);
    if (id) {
        cancelAnimationFrame(id);
        waveAnimations.delete(audio);
    }
}

// ---------- Init ----------
loadSongs();
setupSearch();













