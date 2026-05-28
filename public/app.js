const statusText = document.getElementById('statusText');
const dock = document.getElementById('dock');
const xpraFrame = document.getElementById('xpraFrame');
let xpraLoaded = false;

async function updateStatus(message) {
  statusText.textContent = message;
}

async function fetchApps() {
  try {
    const response = await fetch('/api/apps');
    const data = await response.json();
    return data.apps || [];
  } catch (error) {
    console.error(error);
    await updateStatus('Unable to load app list.');
    return [];
  }
}

function createDockItem(app) {
  const item = document.createElement('button');
  item.className = 'dock-item';
  item.innerHTML = `<span>${app.icon}</span><div class="dock-label">${app.label}</div>`;
  item.addEventListener('click', () => launchApp(app));
  return item;
}

async function loadDock() {
  const apps = await fetchApps();
  dock.innerHTML = '';
  if (!apps.length) {
    await updateStatus('No apps available.');
    return;
  }

  apps.forEach((app) => {
    dock.appendChild(createDockItem(app));
  });

  await updateStatus('Ready. Use the dock to launch apps.');
}

async function launchApp(app) {
  await updateStatus(`Launching ${app.label}...`);
  try {
    const resp = await fetch('/api/launch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: app.id })
    });

    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data.error || 'Launch failed');
    }

    if (!xpraLoaded) {
      xpraFrame.src = '/xpra/';
      xpraFrame.style.display = 'block';
      xpraLoaded = true;
    }

    await updateStatus(data.message || `${app.label} launched.`);
  } catch (error) {
    console.error(error);
    await updateStatus(`Failed to launch ${app.label}.`);
  }
}

window.addEventListener('DOMContentLoaded', loadDock);
