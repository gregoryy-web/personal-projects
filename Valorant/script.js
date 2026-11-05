'use strict';

const gameDataBase = 'https://valorant-api.com/v1';

const state = {
    agents: [],
    maps: [],
    weapons: [],
    agentRole: 'All',
    agentQuery: '',
    weaponCategory: 'All',
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
                <p>${escapeHtml(agent.description)}</p>
                <ul class="ability-list">
                    ${abilities
                        .map(
                            (ability) => `
                        <li class="ability">
                            ${ability.displayIcon ? `<img src="${escapeHtml(ability.displayIcon)}" alt="">` : '<span class="ability-icon-empty"></span>'}
                            <div>
                                <h3>${escapeHtml(ability.displayName)}</h3>
                                <p>${escapeHtml(ability.description)}</p>
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

initTabs();
initAgentEvents();
initWeaponEvents();
loadAgents();