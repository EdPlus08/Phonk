const USER = "TU_USUARIO";
const REPO = "TU_REPO";

const API = `https://api.github.com/repos/EdPlus08/Phonk/contents/audios
`;

async function loadSongs() {
    const container = document.getElementById("song-list");
    container.innerHTML = "Cargando...";

    try {
        const res = await fetch(API);
        const files = await res.json();

        container.innerHTML = "";

        files.forEach(file => {
            if (file.name.endsWith(".mp3") || file.name.endsWith(".wav")) {
                const card = document.createElement("div");
                card.className = "song-card";

                const name = file.name.replace(/\.[^/.]+$/, "");

                card.innerHTML = `
                    <h3>${name}</h3>
                    <audio controls src="${file.download_url}"></audio>
                    <br><br>
                    <a href="${file.download_url}" download>
                        <button>Descargar</button>
                    </a>
                `;

                container.appendChild(card);
            }
        });

        if (container.innerHTML === "") {
            container.innerHTML = "No hay canciones aún.";
        }

    } catch (e) {
        container.innerHTML = "Error al cargar canciones.";
    }
}

loadSongs();


