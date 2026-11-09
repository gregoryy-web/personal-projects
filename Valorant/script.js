'use strict';

const gameDataBase = 'https://valorant-api.com/v1';

const state = {
    agents: [],
    maps: [],
    weapons: [],
    agentRole: 'All',
    agentQuery: '',
    weaponCategory: 'All',
    leaderboardRegion: 'North America',
    loadedPanels: new Set(),
};

const dataCache = new Map();

function getElement(id) {
    return document.getElementById(id);
}

function escapeHtml(value) {
    const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(value ?? '').replace(/[&<>"']/g, (character) => entities[character]);
}

function setStatus(elementId, message, isError = false) {
    const element = getElement(elementId);
    element.textContent = message;
    element.classList.toggle('is-error', isError);
    element.hidden = !message;
}

function buildGradient(colors) {
    const cleaned = (colors || []).map((color) => `#${color.slice(0, 6)}`);
    if (cleaned.length < 2) return 'var(--val-raise)';
    return `linear-gradient(160deg, ${cleaned.join(', ')})`;
}

async function fetchGameData(path, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `${gameDataBase}${path}${query ? `?${query}` : ''}`;

    if (!dataCache.has(url)) {
        const request = fetch(url)
            .then((response) => {
                if (!response.ok) throw new Error(`Request failed (${response.status})`);
                return response.json();
            })
            .then((body) => body.data)
            .catch((error) => {
                dataCache.delete(url);
                throw error;
            });
        dataCache.set(url, request);
    }
    return dataCache.get(url);
}

function buildChips(containerId, labels, activeLabel) {
    getElement(containerId).innerHTML = labels
        .map(
            (label) =>
                `<button type="button" class="chip" data-value="${escapeHtml(label)}" aria-pressed="${label === activeLabel}">${escapeHtml(label)}</button>`
        )
        .join('');
}

function updateChipSelection(containerId, activeLabel) {
    getElement(containerId)
        .querySelectorAll('.chip')
        .forEach((chip) => chip.setAttribute('aria-pressed', String(chip.dataset.value === activeLabel)));
}

const panelLoaders = {
    panelAgents: loadAgents,
    panelMaps: loadMaps,
    panelWeapons: loadWeapons,
    panelPlayers: initPlayers,
    panelLeaderboard: loadLeaderboard,
};

function initTabs() {
    const tabButtons = [...document.querySelectorAll('.tab-button')];

    function activateTab(button, shouldFocus = false) {
        tabButtons.forEach((tab) => {
            const isActive = tab === button;
            tab.setAttribute('aria-selected', String(isActive));
            tab.tabIndex = isActive ? 0 : -1;
            getElement(tab.dataset.panel).hidden = !isActive;
        });
        if (shouldFocus) button.focus();

        const panelId = button.dataset.panel;
        if (!state.loadedPanels.has(panelId)) panelLoaders[panelId]();
    }

    tabButtons.forEach((button, index) => {
        button.addEventListener('click', () => activateTab(button));
        button.addEventListener('keydown', (event) => {
            const offset = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
            if (!offset) return;
            event.preventDefault();
            const nextIndex = (index + offset + tabButtons.length) % tabButtons.length;
            activateTab(tabButtons[nextIndex], true);
        });
    });
}

async function loadAgents() {
    setStatus('agentStatus', 'Loading agents…');
    try {
        const agents = await fetchGameData('/agents', { isPlayableCharacter: 'true' });
        state.agents = [...agents].sort((a, b) => a.displayName.localeCompare(b.displayName));

        const roles = [...new Set(state.agents.map((agent) => agent.role?.displayName).filter(Boolean))].sort();
        buildChips('roleFilters', ['All', ...roles], state.agentRole);

        state.loadedPanels.add('panelAgents');
        renderAgents();
    } catch (error) {
        setStatus('agentStatus', `Couldn't load agents (${error.message}). Check your connection, then switch tabs and come back to retry.`, true);
    }
}

function renderAgents() {
    const query = state.agentQuery.trim().toLowerCase();
    const visibleAgents = state.agents.filter((agent) => {
        const matchesRole = state.agentRole === 'All' || agent.role?.displayName === state.agentRole;
        const matchesQuery = !query || agent.displayName.toLowerCase().includes(query);
        return matchesRole && matchesQuery;
    });

    setStatus('agentStatus', visibleAgents.length ? '' : 'No agents match your search. Clear the search or pick another role.');

    getElement('agentGrid').innerHTML = visibleAgents
        .map(
            (agent) => `
            <div class="col">
                <button type="button" class="agent-card" data-uuid="${agent.uuid}" style="--agent-gradient: ${buildGradient(agent.backgroundGradientColors)}">
                    <span class="agent-art"><img src="${escapeHtml(agent.displayIcon)}" alt="" loading="lazy"></span>
                    <span class="agent-name">${escapeHtml(agent.displayName)}</span>
                    <span class="agent-role">${escapeHtml(agent.role?.displayName ?? '')}</span>
                </button>
            </div>`
        )
        .join('');
}

function stripTags(value) {
    return String(value ?? '').replace(/<[^>]*>/g, '').replace(/\s{2,}/g, ' ').trim();
}

function openAgentDialog(uuid) {
    const agent = state.agents.find((item) => item.uuid === uuid);
    if (!agent) return;

    const abilities = (agent.abilities || []).filter((ability) => ability.displayName);

    getElement('agentDialogContent').innerHTML = `
        <div class="col-12 md:col-5">
            <div class="dialog-art" style="--agent-gradient: ${buildGradient(agent.backgroundGradientColors)}">
                <img src="${escapeHtml(agent.fullPortrait || agent.displayIcon)}" alt="${escapeHtml(agent.displayName)}">
            </div>
        </div>
        <div class="col-12 md:col-7">
            <div class="dialog-info">
                <h2 id="agentDialogTitle">${escapeHtml(agent.displayName)}</h2>
                <p class="dialog-role">
                    ${agent.role?.displayIcon ? `<img src="${escapeHtml(agent.role.displayIcon)}" alt="">` : ''}
                    ${escapeHtml(agent.role?.displayName ?? '')}
                </p>
                <p>${escapeHtml(stripTags(agent.description))}</p>
                <ul class="ability-list">
                    ${abilities
            .map(
                (ability) => `
                        <li class="ability">
                            ${ability.displayIcon ? `<img src="${escapeHtml(ability.displayIcon)}" alt="">` : '<span class="ability-icon-empty"></span>'}
                            <div>
                                <h3>${escapeHtml(ability.displayName)}</h3>
                                <p>${escapeHtml(stripTags(ability.description))}</p>
                            </div>
                        </li>`
            )
            .join('')}
                </ul>
            </div>
        </div>`;

    getElement('agentDialog').showModal();
}

function initAgentEvents() {
    getElement('agentSearch').addEventListener('input', (event) => {
        state.agentQuery = event.target.value;
        renderAgents();
    });

    getElement('roleFilters').addEventListener('click', (event) => {
        const chip = event.target.closest('.chip');
        if (!chip) return;
        state.agentRole = chip.dataset.value;
        updateChipSelection('roleFilters', state.agentRole);
        renderAgents();
    });

    getElement('agentGrid').addEventListener('click', (event) => {
        const card = event.target.closest('.agent-card');
        if (card) openAgentDialog(card.dataset.uuid);
    });

    const dialog = getElement('agentDialog');
    getElement('agentDialogClose').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
        if (event.target === dialog) dialog.close();
    });
}

async function loadMaps() {
    setStatus('mapStatus', 'Loading maps…');
    try {
        const maps = await fetchGameData('/maps');
        state.maps = [...maps].sort((a, b) => a.displayName.localeCompare(b.displayName));
        state.loadedPanels.add('panelMaps');
        renderMaps();
        setStatus('mapStatus', '');
    } catch (error) {
        setStatus('mapStatus', `Couldn't load maps (${error.message}). Check your connection, then switch tabs and come back to retry.`, true);
    }
}

function renderMaps() {
    getElement('mapGrid').innerHTML = state.maps
        .filter((map) => map.splash)
        .map(
            (map) => `
            <div class="col">
                <article class="map-card">
                    <img src="${escapeHtml(map.splash)}" alt="" loading="lazy">
                    <div class="map-caption">
                        <h3>${escapeHtml(map.displayName)}</h3>
                        ${map.coordinates ? `<p>${escapeHtml(map.coordinates)}</p>` : ''}
                    </div>
                </article>
            </div>`
        )
        .join('');
}

function getWeaponCategory(weapon) {
    return weapon.category.split('::').pop();
}

async function loadWeapons() {
    setStatus('weaponStatus', 'Loading weapons…');
    try {
        const weapons = await fetchGameData('/weapons');
        state.weapons = [...weapons].sort(
            (a, b) => (a.shopData?.cost ?? 0) - (b.shopData?.cost ?? 0) || a.displayName.localeCompare(b.displayName)
        );

        const categories = [...new Set(state.weapons.map(getWeaponCategory))];
        buildChips('weaponFilters', ['All', ...categories], state.weaponCategory);

        state.loadedPanels.add('panelWeapons');
        renderWeapons();
    } catch (error) {
        setStatus('weaponStatus', `Couldn't load weapons (${error.message}). Check your connection, then switch tabs and come back to retry.`, true);
    }
}

function renderWeapons() {
    const visibleWeapons = state.weapons.filter(
        (weapon) => state.weaponCategory === 'All' || getWeaponCategory(weapon) === state.weaponCategory
    );

    setStatus('weaponStatus', '');

    getElement('weaponGrid').innerHTML = visibleWeapons
        .map((weapon) => {
            const cost = weapon.shopData?.cost;
            return `
            <div class="col">
                <article class="weapon-card">
                    <img src="${escapeHtml(weapon.displayIcon)}" alt="" loading="lazy">
                    <h3>${escapeHtml(weapon.displayName)}</h3>
                    <p class="weapon-meta">
                        <span>${escapeHtml(getWeaponCategory(weapon))}</span>
                        <span class="weapon-cost">${cost ? `${cost.toLocaleString()} credits` : 'Free'}</span>
                    </p>
                </article>
            </div>`;
        })
        .join('');
}

function initWeaponEvents() {
    getElement('weaponFilters').addEventListener('click', (event) => {
        const chip = event.target.closest('.chip');
        if (!chip) return;
        state.weaponCategory = chip.dataset.value;
        updateChipSelection('weaponFilters', state.weaponCategory);
        renderWeapons();
    });
}

const playerApiBase = 'https://api.henrikdev.xyz/valorant';
const playerApiKey = 'HDEV-e7458999-c7dd-4e35-8513-09c56f93bafc';

async function fetchPlayerData(path) {
    const key = playerApiKey.trim();
    if (!key) throw new Error('Player search is not set up yet: add an API key to playerApiKey in script.js.');

    const response = await fetch(`${playerApiBase}${path}`, { headers: { Authorization: key } });
    if (response.status === 401 || response.status === 403) throw new Error('The API key was rejected. Check it and try again.');
    if (response.status === 404) throw new Error('Player not found. Check the name, tag and region.');
    if (response.status === 429) throw new Error('Too many requests. Wait a minute and try again.');
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    const body = await response.json();
    return body.data;
}

function summarizeMatch(match, puuid) {
    const me = match.players?.find((player) => player.puuid === puuid);
    if (!me) return null;
    const team = match.teams?.find((item) => item.team_id === me.team_id);
    const agentId = String(me.agent?.id ?? '').toLowerCase();
    return {
        map: match.metadata?.map?.name ?? 'Unknown map',
        mode: match.metadata?.queue?.name ?? '',
        started: Date.parse(match.metadata?.started_at ?? '') || 0,
        agent: me.agent?.name ?? '',
        agentIcon: agentId ? `https://media.valorant-api.com/agents/${agentId}/displayicon.png` : '',
        kills: me.stats?.kills ?? 0,
        deaths: me.stats?.deaths ?? 0,
        assists: me.stats?.assists ?? 0,
        won: typeof team?.won === 'boolean' ? team.won : null,
        score: team?.rounds ? `${team.rounds.won}-${team.rounds.lost}` : '',
    };
}

function renderPlayer(account, rank, matches) {
    const tierName = rank?.tier?.name;
    const rankText = tierName && tierName !== 'Unrated' ? `${tierName} ${rank.rr ?? 0} RR` : 'Unranked';
    const cardArt = account.card ? `https://media.valorant-api.com/playercards/${account.card}/smallart.png` : '';
    getElement('playerProfile').innerHTML = `
        <div class="player-profile">
            ${cardArt ? `<img src="${escapeHtml(cardArt)}" alt="">` : ''}
            <div>
                <h3>${escapeHtml(account.name)}<span class="player-tag">#${escapeHtml(account.tag)}</span></h3>
                <p>Level ${escapeHtml(account.account_level)} &middot; ${escapeHtml(rankText)}</p>
            </div>
        </div>`;

    const decided = matches.filter((match) => match.won !== null);
    const wins = decided.filter((match) => match.won).length;
    const kills = matches.reduce((sum, match) => sum + match.kills, 0);
    const deaths = matches.reduce((sum, match) => sum + match.deaths, 0);
    const tiles = [
        ['Matches', matches.length],
        ['Win rate', decided.length ? `${Math.round((wins / decided.length) * 100)}%` : '–'],
        ['K/D', deaths ? (kills / deaths).toFixed(2) : kills.toFixed(2)],
        ['Avg kills', matches.length ? (kills / matches.length).toFixed(1) : '–'],
    ];
    getElement('playerStats').innerHTML = tiles
        .map(([label, value]) => `<div class="stat-tile"><span class="stat-value">${escapeHtml(value)}</span><span class="stat-label">${label}</span></div>`)
        .join('');

    getElement('matchList').innerHTML = matches.length
        ? matches
              .map((match) => {
                  const result = match.won === null ? 'none' : match.won ? 'win' : 'loss';
                  const label = match.won === null ? 'Played' : match.won ? 'Win' : 'Loss';
                  return `
            <article class="match-row is-${result}">
                ${match.agentIcon ? `<img src="${escapeHtml(match.agentIcon)}" alt="">` : '<span class="match-icon-empty"></span>'}
                <div class="match-main">
                    <h3>${escapeHtml(match.map)}</h3>
                    <p>${escapeHtml(match.agent)} &middot; ${escapeHtml(match.mode)} &middot; ${new Date(match.started).toLocaleDateString()}</p>
                </div>
                <div class="match-kda">${match.kills} / ${match.deaths} / ${match.assists}</div>
                <div class="match-result">${label}${match.score ? ` ${escapeHtml(match.score)}` : ''}</div>
            </article>`;
              })
              .join('')
        : '<p class="status">No recent matches found for this player.</p>';
}

async function searchPlayer(event) {
    event.preventDefault();
    const name = getElement('playerName').value.trim();
    const tag = getElement('playerTag').value.trim().replace(/^#/, '');
        if (!name || !tag) return;

    const button = getElement('playerSubmit');
    button.disabled = true;
    setStatus('playerStatus', 'Searching…');
    ['playerProfile', 'playerStats', 'matchList'].forEach((id) => (getElement(id).innerHTML = ''));

    const encoded = `${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
    try {
        const account = await fetchPlayerData(`/v2/account/${encoded}`);
        const playerRegion = account.region;
        const [rank, rawMatches] = await Promise.all([
            fetchPlayerData(`/v3/mmr/${playerRegion}/pc/${encoded}`).then((data) => data?.current).catch(() => null),
            fetchPlayerData(`/v4/matches/${playerRegion}/pc/${encoded}?size=10`),
        ]);
        const matches = (rawMatches || [])
            .map((match) => summarizeMatch(match, account.puuid))
            .filter(Boolean)
            .sort((a, b) => b.started - a.started);
        renderPlayer(account, rank, matches);
        setStatus('playerStatus', '');
    } catch (error) {
        setStatus('playerStatus', error.message, true);
    } finally {
        button.disabled = false;
    }
}

function initPlayers() {
    state.loadedPanels.add('panelPlayers');
    getElement('playerForm').addEventListener('submit', searchPlayer);
    setStatus('playerStatus', '');
}

const leaderboardRegions = {
    'North America': 'na',
    Europe: 'eu',
    'Asia Pacific': 'ap',
    Korea: 'kr',
    'Latin America': 'latam',
    Brazil: 'br',
};
const leaderboardSize = 25;
const leaderboardCache = new Map();

function getTierName(tier) {
    if (tier && typeof tier === 'object') return tier.name ?? '';
    const id = Number(tier);
    if (id >= 27) return 'Radiant';
    if (id >= 24) return `Immortal ${id - 23}`;
    if (id >= 21) return `Ascendant ${id - 20}`;
    return '';
}

async function fetchLeaderboard(regionCode) {
    if (!leaderboardCache.has(regionCode)) {
        const data = await fetchPlayerData(`/v3/leaderboard/${regionCode}/pc?size=${leaderboardSize}`);
        const players = Array.isArray(data) ? data : data?.players ?? [];
        leaderboardCache.set(regionCode, players);
    }
    return leaderboardCache.get(regionCode);
}

async function loadLeaderboard() {
    buildChips('leaderboardRegions', Object.keys(leaderboardRegions), state.leaderboardRegion);
    state.loadedPanels.add('panelLeaderboard');
    await renderLeaderboard();
}

async function renderLeaderboard() {
    const region = state.leaderboardRegion;
    const list = getElement('leaderboardList');
    list.innerHTML = '';
    setStatus('leaderboardStatus', `Loading top players in ${region}…`);

    try {
        const players = await fetchLeaderboard(leaderboardRegions[region]);
        if (region !== state.leaderboardRegion) return;

        if (!players.length) {
            setStatus('leaderboardStatus', 'No leaderboard data is available for this region right now.');
            return;
        }
        setStatus('leaderboardStatus', '');

        list.innerHTML = players
            .slice(0, leaderboardSize)
            .map((player, index) => {
                const hidden = player.is_anonymized || !player.name;
                const position = player.leaderboard_rank ?? index + 1;
                const art = player.card ? `https://media.valorant-api.com/playercards/${player.card}/smallart.png` : '';
                const tier = getTierName(player.tier);
                const rr = player.rr ?? player.ranked_rating;
                const rankText = [tier, rr != null ? `${rr} RR` : ''].filter(Boolean).join(' · ');
                const nameHtml = hidden
                    ? '<strong>Anonymous player</strong>'
                    : `<strong>${escapeHtml(player.name)}</strong><span class="player-tag">#${escapeHtml(player.tag)}</span>`;
                return `
            <button type="button" class="rank-row${position <= 3 ? ' is-podium' : ''}"
                data-name="${hidden ? '' : escapeHtml(player.name)}" data-tag="${hidden ? '' : escapeHtml(player.tag)}"
                ${hidden ? 'disabled' : ''}>
                <span class="rank-pos">${escapeHtml(position)}</span>
                ${art ? `<img src="${escapeHtml(art)}" alt="" loading="lazy">` : '<span class="match-icon-empty"></span>'}
                <span class="rank-name">${nameHtml}</span>
                <span class="rank-tier">${escapeHtml(rankText)}</span>
                <span class="rank-wins">${player.wins != null ? `${escapeHtml(player.wins)} wins` : ''}</span>
            </button>`;
            })
            .join('');
    } catch (error) {
        if (region !== state.leaderboardRegion) return;
        setStatus('leaderboardStatus', `Couldn't load the leaderboard (${error.message}). Pick a region to retry.`, true);
    }
}

function openPlayerFromLeaderboard(name, tag) {
    getElement('tabPlayers').click();
    getElement('playerName').value = name;
    getElement('playerTag').value = tag;
    getElement('playerForm').requestSubmit();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initLeaderboardEvents() {
    getElement('leaderboardRegions').addEventListener('click', (event) => {
        const chip = event.target.closest('.chip');
        if (!chip || chip.dataset.value === state.leaderboardRegion) return;
        state.leaderboardRegion = chip.dataset.value;
        updateChipSelection('leaderboardRegions', state.leaderboardRegion);
        renderLeaderboard();
    });

    getElement('leaderboardList').addEventListener('click', (event) => {
        const row = event.target.closest('.rank-row');
        if (!row || row.disabled) return;
        openPlayerFromLeaderboard(row.dataset.name, row.dataset.tag);
    });
}

initTabs();
initAgentEvents();
initLeaderboardEvents();
initWeaponEvents();
loadAgents();