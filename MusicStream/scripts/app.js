// Variabili globali per Preferiti e Audio
        let favorites = JSON.parse(localStorage.getItem('music_favs') || '[]');
        window.currentAudio = null;
        window.currentPlayBtn = null;

        window.playPreview = function (btn, url) {
            if (window.currentAudio) {
                window.currentAudio.pause();
                if (window.currentPlayBtn) {
                    window.currentPlayBtn.innerHTML = '▶ Ascolta';
                }
                if (window.currentAudio.src === url) {
                    window.currentAudio = null;
                    window.currentPlayBtn = null;
                    return;
                }
            }
            window.currentAudio = new Audio(url);
            window.currentPlayBtn = btn;
            btn.innerHTML = '⏸ Pausa';
            window.currentAudio.play();
            window.currentAudio.onended = function () {
                btn.innerHTML = '▶ Ascolta';
                window.currentAudio = null;
                window.currentPlayBtn = null;
            };
        };

        window.toggleFavorite = function (id, title, subtitle, audioUrl, type, imgUrl) {
            const index = favorites.findIndex(f => f.id === id);
            if (index > -1) {
                favorites.splice(index, 1);
            } else {
                favorites.push({ id, title, subtitle, audioUrl: audioUrl || '', type: type || 'song', imgUrl: imgUrl || '' });
            }
            localStorage.setItem('music_favs', JSON.stringify(favorites));

            // Aggiorna le icone nella pagina senza ricaricare le API
            document.querySelectorAll('.fav-btn').forEach(btn => {
                if (btn.id === 'fav-' + id) btn.classList.toggle('active');
            });

            // Re-render dell'intera sezione preferiti isolata
            renderFavorites();
        };

        window.isFavorite = function (id) {
            return favorites.some(f => f.id === id);
        };

        window.renderFavorites = function () {
            const favSec = document.getElementById('favorites-section');
            const songsCard = document.getElementById('favorites-songs-card');
            const albumsCard = document.getElementById('favorites-albums-card');
            const songsContainer = document.getElementById('favorites-songs-container');
            const albumsContainer = document.getElementById('favorites-albums-container');

            if (favorites.length === 0) {
                favSec.style.display = 'none';
                return;
            }

            favSec.style.display = 'block';

            const songs = favorites.filter(fav => fav.type !== 'album');
            const albums = favorites.filter(fav => fav.type === 'album');

            if (songs.length > 0) {
                songsCard.style.display = 'block';
                songsContainer.innerHTML = songs.map(fav => {
                    const btnBg = fav.imgUrl ? 'background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.3); color:#fff; backdrop-filter:blur(4px);' : 'background:var(--accent); color:#fff; border:none;';
                    const audioPlayer = fav.audioUrl ? `<button onclick="playPreview(this, '${fav.audioUrl}')" style="${btnBg} padding:6px 14px; border-radius:20px; cursor:pointer; font-size:0.75rem; font-weight:600; margin-top:auto; transition:0.2s; width:max-content; align-self:flex-start;">▶ Ascolta</button>` : '';
                    const bgStyle = fav.imgUrl ? `background: linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('${fav.imgUrl}') no-repeat center center / cover; color: #f8fafc; padding: 20px;` : `background: var(--card-hover); padding: 20px;`;
                    const titleColor = fav.imgUrl ? `color:#ffffff;` : ``;
                    const subtitleColor = fav.imgUrl ? `color:#a5b4fc;` : `color:var(--accent);`;
                    const btnColor = fav.imgUrl ? `color:#f8fafc;` : ``;

                    return `
                    <li style="border-bottom:none; ${bgStyle} border-radius: 12px; position:relative; min-height: 160px; height: 100%; display: flex; flex-direction: column;">
                        <button id="fav-${fav.id}" class="fav-btn active" style="top:15px; right:15px; ${btnColor}" onclick="toggleFavorite('${fav.id}', '', '', '', '', '')">♥</button>
                        <div class="content-title" style="font-size:1.15rem; ${titleColor} margin-bottom:5px;">${fav.title}</div>
                        <div class="content-subtitle" style="cursor:pointer; ${subtitleColor}" onclick="openBio('${fav.subtitle.replace(/'/g, "&#39;")}')">${fav.subtitle} ℹ️</div>
                        ${audioPlayer}
                    </li>
                    `;
                }).join('');
            } else {
                songsCard.style.display = 'none';
                songsContainer.innerHTML = '';
            }

            if (albums.length > 0) {
                albumsCard.style.display = 'block';
                albumsContainer.innerHTML = albums.map(fav => {
                    return `
                    <li style="border-bottom:none; background: linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url('${fav.imgUrl}') no-repeat center center / cover; color: #f8fafc; padding: 20px; border-radius: 12px; position:relative; min-height:160px; height:100%; display:flex; flex-direction:column;">
                        <button id="fav-${fav.id}" class="fav-btn active" style="top:15px; right:15px; color:#f8fafc;" onclick="toggleFavorite('${fav.id}', '', '', '', '', '')">♥</button>
                        <div class="content-title" style="font-size:1.15rem; color:#ffffff; margin-bottom:5px;">${fav.title}</div>
                        <div class="content-subtitle" style="cursor:pointer; color:#a5b4fc;" onclick="openBio('${fav.subtitle.replace(/'/g, "&#39;")}')">${fav.subtitle} ℹ️</div>
                        <div id="album-tracks-${fav.id}" style="margin-top:auto;">
                            <button onclick="loadAlbumTracks('${fav.id}')" style="background:none; border:none; color:#a5b4fc; text-decoration:underline; cursor:pointer; font-size:0.8rem; padding:0; margin:0; font-family:'Poppins', sans-serif;">Visualizza Brani ▼</button>
                        </div>
                    </li>
                    `;
                }).join('');
            } else {
                albumsCard.style.display = 'none';
                albumsContainer.innerHTML = '';
            }
        };

        window.loadAlbumTracks = function (id) {
            const container = document.getElementById('album-tracks-' + id);
            container.innerHTML = '<span style="font-size:0.85rem; color:#cbd5f5;">Ricerca brani in corso...</span>';
            fetch(`https://itunes.apple.com/lookup?id=${id}&entity=song`)
                .then(r => r.json())
                .then(d => {
                    if (d.results && d.results.length > 1) {
                        const tracks = d.results.slice(1);
                        let html = `<div style="max-height: 220px; overflow-y: auto; margin-top:15px; padding-right:10px;" class="album-tracks-list">`;
                        html += tracks.map(t => {
                            const playingCode = t.previewUrl ? `<button onclick="playPreview(this, '${t.previewUrl}')" style="background:transparent; border:1px solid rgba(255,255,255,0.4); color:#fff; padding:4px 10px; border-radius:15px; cursor:pointer; font-size:0.7rem; margin-top:6px; transition:0.2s;">▶ Ascolta</button>` : '';
                            return `<div style="margin-bottom:12px; padding-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.15);">
                                <div style="font-size:0.85rem; font-weight:500;">${t.trackNumber}. ${t.trackName}</div>
                                ${playingCode}
                            </div>`;
                        }).join('');
                        html += `</div>`;
                        container.innerHTML = html;
                    } else {
                        container.innerHTML = '<span style="font-size:0.85rem; color:#cbd5f5;">Nessun brano trovato per questo album.</span>';
                    }
                }).catch(() => {
                    container.innerHTML = '<span style="font-size:0.85rem; color:#cbd5f5;">Errore caricamento brani. Riprova più tardi.</span>';
                });
        };

        window.openBio = function (artistName) {
            const modal = document.getElementById('wiki-modal');
            const title = document.getElementById('wiki-modal-title');
            const body = document.getElementById('wiki-modal-body');

            modal.classList.add('active');
            title.innerText = artistName;
            body.innerHTML = 'Caricamento biografia da Wikipedia... <br><br><small>(Potrebbe richiedere qualche istante)</small>';

            fetch(`https://it.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages&exintro&pithumbsize=200&generator=search&gsrsearch=${encodeURIComponent(artistName + " artista musicale")}&gsrlimit=1&format=json&origin=*`)
                .then(res => res.json())
                .then(data => {
                    if (!data.query || !data.query.pages) {
                        body.innerHTML = 'Nessuna biografia trovata su Wikipedia in italiano per questo artista.';
                    } else {
                        const pages = data.query.pages;
                        const pageId = Object.keys(pages)[0];
                        let extract = pages[pageId].extract;
                        let pageTitle = pages[pageId].title;
                        let imgHtml = '';
                        if (pages[pageId].thumbnail && pages[pageId].thumbnail.source) {
                            imgHtml = `<img src="${pages[pageId].thumbnail.source}" alt="${artistName}" style="float:left; margin:0 15px 10px 0; border-radius:12px; width:120px; box-shadow:0 4px 10px rgba(0,0,0,0.1);">`;
                        }
                        body.innerHTML = imgHtml + extract + `<div style="clear:both;"></div><br><a href="https://it.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}" target="_blank" style="color:var(--accent);font-weight:bold;text-decoration:none;">Scopri di più su Wikipedia ➔</a>`;
                    }
                }).catch(() => {
                    body.innerHTML = 'Errore di connessione durante la ricerca della biografia.';
                });
        };

        document.addEventListener('DOMContentLoaded', function () {
            const container = document.getElementById('dynamic-grid-container');
            const countrySelect = document.getElementById('country-select');
            const searchInput = document.getElementById('music-search-input');
            const darkModeToggle = document.getElementById('dark-mode-toggle');

            // Carica preferiti iniziali
            renderFavorites();

            // --- Dark Mode ---
            if (localStorage.getItem('dark_mode') === 'true') {
                document.body.classList.add('dark-mode');
                darkModeToggle.innerText = '☀️';
            }
            darkModeToggle.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                const isDark = document.body.classList.contains('dark-mode');
                localStorage.setItem('dark_mode', isDark);
                darkModeToggle.innerText = isDark ? '☀️' : '🌙';
            });

            // --- Modal Close ---
            document.getElementById('wiki-modal-close').addEventListener('click', () => {
                document.getElementById('wiki-modal').classList.remove('active');
            });
            document.getElementById('wiki-modal').addEventListener('click', (e) => {
                if (e.target.id === 'wiki-modal') document.getElementById('wiki-modal').classList.remove('active');
            });

            // --- Search Function ---
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.trim();
                clearTimeout(searchTimeout);
                if (term.length < 2) {
                    if (term === '') fetchMusicData(currentCountry);
                    return;
                }

                searchTimeout = setTimeout(() => {
                    container.innerHTML = '<div style="text-align: center; width: 100%; grid-column: 1 / -1; color: var(--text-secondary); font-size: 1.1rem;"><p>Ricerca globale in corso...</p></div>';

                    fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=12`)
                        .then(res => res.json())
                        .then(data => {
                            if (data.results && data.results.length > 0) {
                                let html = `
                            <div class="content-card" style="grid-column: 1 / -1;">
                                <h3>🔍 Risultati Ricerca Internazionale</h3>
                                <ul class="content-list" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
                                    ${data.results.map(song => {
                                    const id = song.trackId.toString();
                                    const albumId = song.collectionId ? song.collectionId.toString() : '';
                                    const audioPlayer = song.previewUrl ? `<button onclick="playPreview(this, '${song.previewUrl}')" style="background:var(--accent); border:none; color:#fff; padding:6px 14px; border-radius:20px; cursor:pointer; font-size:0.75rem; font-weight:600; margin-top:10px;">▶ Ascolta</button>` : '';
                                    const imgHires = song.artworkUrl100 ? song.artworkUrl100.replace('100x100', '600x600') : '';

                                    const albumTrackBtnHtml = albumId ? `<button id="fav-${albumId}" class="fav-btn ${isFavorite(albumId) ? 'active' : ''}" style="position:static; transform:none; font-size:1rem; padding:2px;" onclick="toggleFavorite('${albumId}', '${song.collectionName.replace(/'/g, "&#39;")}', '${song.artistName.replace(/'/g, "&#39;")}', '', 'album', '${imgHires}')" title="Salva Intero Album">💿 ♥</button>` : '';

                                    return `
                                        <li style="border-bottom:none; background: var(--card-hover); padding: 15px; border-radius: 12px; position:relative;">
                                            <div style="position:absolute; top:12px; right:12px; display:flex; gap:10px; z-index:5;">
                                                <button id="fav-${id}" class="fav-btn ${isFavorite(id) ? 'active' : ''}" style="position:static; transform:none; font-size:1rem; padding:2px;" onclick="toggleFavorite('${id}', '${song.trackName.replace(/'/g, "&#39;")}', '${song.artistName.replace(/'/g, "&#39;")}', '${song.previewUrl || ''}', 'song', '${imgHires}')" title="Salva Singolo Brano">🎵 ♥</button>
                                                ${albumTrackBtnHtml}
                                            </div>
                                            <div class="album-item" style="margin-bottom: 15px; padding-right:60px;">
                                                <img src="${song.artworkUrl100}" alt="Cover" class="album-cover" style="width:60px; height:60px;">
                                                <div>
                                                    <div class="content-title" style="font-size:0.95rem;">${song.trackName}</div>
                                                    <div class="content-subtitle">${song.artistName}</div>
                                                    <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">Album: ${song.collectionName}</div>
                                                </div>
                                            </div>
                                            ${audioPlayer}
                                        </li>
                                        `;
                                }).join('')}
                                </ul>
                            </div>`;
                                container.innerHTML = html;
                            } else {
                                container.innerHTML = '<div style="text-align: center; width: 100%; grid-column: 1 / -1; color: var(--text-secondary);">Nessun risultato trovato. Prova con altre parole chiave.</div>';
                            }
                        }).catch(() => {
                            container.innerHTML = '<div style="text-align: center; width: 100%; grid-column: 1 / -1; color: var(--text-secondary);">Errore di connessione durante la ricerca. Riprova.</div>';
                        });
                }, 800);
            });

            function fetchMusicData(countryCode) {
                // Mostra un feedback di caricamento
                container.innerHTML = '<div style="text-align: center; width: 100%; grid-column: 1 / -1; color: var(--text-secondary); font-size: 1.1rem;"><p>Caricamento classifiche in corso...</p></div>';

                // URL delle API gratuite e pubbliche di iTunes (Apple Music) dinamiche per paese
                const SONGS_URL = `https://itunes.apple.com/${countryCode}/rss/topsongs/limit=5/json`;
                const ALBUMS_URL = `https://itunes.apple.com/${countryCode}/rss/topalbums/limit=5/json`;

                Promise.all([
                    fetch(SONGS_URL).then(res => res.json()),
                    fetch(ALBUMS_URL).then(res => res.json())
                ])
                    .then(([songsData, albumsData]) => {
                        let html = '';
                        const songs = songsData.feed.entry || [];
                        const albums = albumsData.feed.entry || [];

                        // 1. TOP SINGOLI
                        if (songs.length > 0) {
                            html += `
                        <div class="content-card">
                            <h3>🎵 Brani del Momento</h3>
                            <ul class="content-list">
                                ${songs.map(song => {
                                const id = song.id.attributes['im:id'];
                                const audioUrl = song.link && song.link.length > 1 ? song.link[1].attributes.href : '';
                                const audioPlayer = audioUrl ? `<button onclick="playPreview(this, '${audioUrl}')" style="background:var(--accent); border:none; color:#fff; padding:6px 14px; border-radius:20px; cursor:pointer; font-size:0.75rem; font-weight:600; margin-top:10px;">▶ Ascolta</button>` : '';
                                const artistName = song['im:artist'].label.replace(/'/g, "&#39;");
                                const titleName = song['im:name'].label.replace(/'/g, "&#39;");
                                const imgStr = song['im:image'] ? song['im:image'][song['im:image'].length - 1].label : '';
                                const imgHires = imgStr.replace(/\d+x\d+/, '600x600');
                                return `
                                    <li>
                                        <button id="fav-${id}" class="fav-btn ${isFavorite(id) ? 'active' : ''}" onclick="toggleFavorite('${id}', '${titleName}', '${artistName}', '${audioUrl || ''}', 'song', '${imgHires}')">♥</button>
                                        <div class="content-title">${song['im:name'].label}</div>
                                        <div class="content-subtitle">${song['im:artist'].label}</div>
                                        <div class="content-body" style="font-size: 0.85rem;">Album: ${song['im:collection']['im:name'].label} &bull; Genere: ${song.category.attributes.label}</div>
                                        ${audioPlayer}
                                    </li>
                                    `;
                            }).join('')}
                            </ul>
                        </div>
                        `;
                        }

                        // 2. ARTISTI IN VOGA
                        if (albums.length > 0 || songs.length > 0) {
                            const artists = [];
                            const seen = new Set();

                            albums.forEach(album => {
                                const artistName = album['im:artist'].label;
                                if (!seen.has(artistName) && artists.length < 5) {
                                    seen.add(artistName);
                                    artists.push({
                                        name: artistName,
                                        genre: album.category.attributes.label,
                                        link: album['im:artist'].attributes ? album['im:artist'].attributes.href : '#'
                                    });
                                }
                            });

                            html += `
                        <div class="content-card">
                            <h3>🎤 Artisti in Voga</h3>
                            <ul class="content-list">
                                ${artists.map(artist => `
                                    <li>
                                        <div class="content-title" style="cursor:pointer; color:var(--accent);" onclick="openBio('${artist.name.replace(/'/g, "&#39;")}')">${artist.name} ℹ️</div>
                                        <div class="content-subtitle">${artist.genre}</div>
                                        <div class="content-body" style="margin-top:6px;">
                                            <a href="https://play.google.com/store/apps/details?id=com.fazio.musicstream" target="_blank" style="color:#4f46e5; font-size:0.8rem; text-decoration:none; font-weight:500;">
                                                Risultati offerti da MusicStream ➔
                                            </a>
                                        </div>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                        `;
                        }

                        // 3. TOP ALBUM 
                        if (albums.length > 0) {
                            html += `
                        <div class="content-card">
                            <h3>💿 Classifica Album</h3>
                            <ul class="content-list">
                                ${albums.map(album => {
                                const id = album.id.attributes['im:id'];
                                const img = album['im:image'] ? album['im:image'][album['im:image'].length - 1].label : '';
                                const title = album['im:name'].label;
                                const titleClean = title.replace(/'/g, "&#39;");
                                const artist = album['im:artist'].label;
                                const artistClean = artist.replace(/'/g, "&#39;");
                                const releaseDate = album['im:releaseDate'] ? album['im:releaseDate'].attributes.label : 'Recente';

                                return `
                                    <li>
                                        <button id="fav-${id}" class="fav-btn ${isFavorite(id) ? 'active' : ''}" onclick="toggleFavorite('${id}', '${titleClean}', '${artistClean}', '', 'album', '${img.replace('100x100', '600x600')}')">♥</button>
                                        <div class="album-item">
                                            <img src="${img}" alt="Cover" class="album-cover" onerror="this.src='https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100&q=80'">
                                            <div>
                                                <div class="content-title" style="font-size:1rem;">${title}</div>
                                                <div class="content-subtitle">${artist}</div>
                                                <div class="content-subtitle" style="margin-bottom:0; font-size:0.75rem;">Uscita: ${releaseDate}</div>
                                            </div>
                                        </div>
                                    </li>
                                    `;
                            }).join('')}
                            </ul>
                        </div>
                        `;
                        }

                        if (html !== '') {
                            container.innerHTML = html;
                        } else {
                            container.innerHTML = '<div style="text-align: center; width: 100%; grid-column: 1 / -1; color: var(--text-secondary);">Nessuna novità disponibile al momento per questa nazione.</div>';
                        }
                    })
                    .catch(error => {
                        console.error('Errore nel fetch delle API:', error);
                        container.innerHTML = '<div style="text-align: center; width: 100%; grid-column: 1 / -1; color: var(--text-secondary);">Impossibile caricare le classifiche in questo momento. Verifica la tua connessione o riprova più tardi.</div>';
                    });
            }

            // Inizializzazione Logica Custom Dropdown
            let currentCountry = 'it';
            fetchMusicData(currentCountry);

            const dropdown = document.getElementById('custom-dropdown');
            const selectedBox = document.getElementById('custom-dropdown-selected');
            const optionsList = document.getElementById('custom-dropdown-options');
            const options = optionsList.querySelectorAll('li');

            // Apri/Chiudi il menù
            selectedBox.addEventListener('click', function (e) {
                dropdown.classList.toggle('open');
                e.stopPropagation(); // Evita che il clic si propaghi chiudendolo subito
            });

            // Chiudi il menù se si clicca fuori
            document.addEventListener('click', function () {
                dropdown.classList.remove('open');
            });

            // Selezione della nazione
            options.forEach(option => {
                option.addEventListener('click', function () {
                    const value = this.getAttribute('data-value');
                    const text = this.innerText;
                    const imgSrc = this.querySelector('img').src;

                    // Aggiorna la vista del menù con l'elemento selezionato
                    selectedBox.querySelector('.selected-text').innerText = text;
                    selectedBox.querySelector('.selected-flag').src = imgSrc;

                    dropdown.classList.remove('open');

                    // Esegue la fetch solo se la nazione è effettivamente cambiata
                    if (currentCountry !== value) {
                        currentCountry = value;
                        fetchMusicData(currentCountry);
                    }
                });
            });
        });