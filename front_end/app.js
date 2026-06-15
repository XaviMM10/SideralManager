const API_BASE_URL = "https://sideral-manager.vercel.app";
const APP_PASSWORD = "change-me";

// El usuario ve texto, pero el backend recibe integers.
// Estos IDs deben coincidir con statuses.id en la base de datos.
const JOB_STATUS_OPTIONS = [
  { id: 1, label: "Activo" },
  { id: 2, label: "Pendiente" },
  { id: 3, label: "Finalizado" },
  { id: 4, label: "Cancelado" },
];

const JOB_STATUS_LABELS = Object.fromEntries(
  JOB_STATUS_OPTIONS.map((option) => [String(option.id), option.label]),
);

// Estos IDs deben coincidir con completions.id en la base de datos.
const COMPLETION_OPTIONS = [
  { id: 1, label: "Pedido" },
  { id: 2, label: "Cobrado" },
  { id: 3, label: "Recibido" },
  { id: 4, label: "Facturado" },
  { id: 5, label: "Pendiente" },
  { id: 6, label: "Cancelado" },
];

const COMPLETION_LABELS = Object.fromEntries(
  COMPLETION_OPTIONS.map((option) => [String(option.id), option.label]),
);

const SESSION_KEY = "sideral-manager-unlocked";

const state = {
  clients: [],
  jobs: [],
  workEntries: [],
  supplyEntries: [],
  selectedClientId: null,
  selectedJobId: null,
};

const el = {
  loginView: document.querySelector("#login-view"),
  appView: document.querySelector("#app-view"),
  loginForm: document.querySelector("#login-form"),
  passwordInput: document.querySelector("#password-input"),
  loginError: document.querySelector("#login-error"),
  logoutButton: document.querySelector("#logout-button"),
  refreshButton: document.querySelector("#refresh-button"),
  globalError: document.querySelector("#global-error"),
  clientsList: document.querySelector("#clients-list"),
  jobsList: document.querySelector("#jobs-list"),
  clientsCount: document.querySelector("#clients-count"),
  jobsCount: document.querySelector("#jobs-count"),
  clientsStatus: document.querySelector("#clients-status"),
  jobsStatus: document.querySelector("#jobs-status"),
  workStatus: document.querySelector("#work-status"),
  supplyStatus: document.querySelector("#supply-status"),
  clientForm: document.querySelector("#client-form"),
  jobForm: document.querySelector("#job-form"),
  workEntryForm: document.querySelector("#work-entry-form"),
  supplyEntryForm: document.querySelector("#supply-entry-form"),
  jobDetails: document.querySelector("#job-details"),
  workEntries: document.querySelector("#work-entries"),
  supplyEntries: document.querySelector("#supply-entries"),
};

function isUnlocked() {
  return sessionStorage.getItem(SESSION_KEY) === "true";
}

function showLogin() {
  el.loginView.classList.remove("hidden");
  el.appView.classList.add("hidden");
  el.passwordInput.focus();
}

function showApp() {
  el.loginView.classList.add("hidden");
  el.appView.classList.remove("hidden");
  loadInitialData();
}

function setGlobalError(message = "") {
  el.globalError.textContent = message;
  el.globalError.classList.toggle("hidden", !message);
}

function setStatus(target, message = "") {
  target.textContent = message;
}

function setFormEnabled(form, enabled) {
  form.classList.toggle("disabled-section", !enabled);
  [...form.elements].forEach((field) => {
    field.disabled = !enabled;
  });
}

function selectedClient() {
  return state.clients.find((client) => client.id === state.selectedClientId) || null;
}

function selectedJob() {
  return state.jobs.find((job) => job.id === state.selectedJobId) || null;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
}

function jobStatusLabel(value) {
  if (value === null || value === undefined || value === "") return "—";
  return JOB_STATUS_LABELS[String(value)] || String(value);
}

function renderJobStatusOptions() {
  const select = el.jobForm?.querySelector('[name="status"]');
  if (!select) return;

  select.innerHTML = [
    '<option value="">Estado</option>',
    ...JOB_STATUS_OPTIONS.map(
      (option) => `<option value="${option.id}">${escapeHtml(option.label)}</option>`,
    ),
  ].join("");
}

function completionLabel(value) {
  if (value === null || value === undefined || value === "") return "—";
  return COMPLETION_LABELS[String(value)] || String(value);
}

function renderCompletionOptions() {
  const select = el.supplyEntryForm?.querySelector('[name="completion"]');
  if (!select) return;

  select.innerHTML = [
    '<option value="">Estado de suministro</option>',
    ...COMPLETION_OPTIONS.map(
      (option) => `<option value="${option.id}">${escapeHtml(option.label)}</option>`,
    ),
  ].join("");
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  let payload = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    payload = await response.json();
  }

  if (!response.ok) {
    const message = payload?.detail || payload?.message || `Error en la petición: ${response.status}`;
    throw new Error(Array.isArray(message) ? message.map((item) => item.msg).join(", ") : message);
  }

  return payload;
}

async function loadInitialData() {
  setGlobalError("");
  setStatus(el.clientsStatus, "Cargando clientes...");
  state.selectedClientId = null;
  state.selectedJobId = null;
  state.jobs = [];
  state.workEntries = [];
  state.supplyEntries = [];
  render();

  try {
    state.clients = await api("/clients");
    setStatus(el.clientsStatus, state.clients.length ? "" : "Todavía no hay clientes. Crea el primero arriba.");
    render();
  } catch (error) {
    setGlobalError(`No se pudieron cargar los clientes. ${error.message}`);
    setStatus(el.clientsStatus, "No se pudieron cargar los clientes.");
  }
}

async function selectClient(clientId) {
  state.selectedClientId = clientId;
  state.selectedJobId = null;
  state.workEntries = [];
  state.supplyEntries = [];
  state.jobs = [];
  setGlobalError("");
  setStatus(el.jobsStatus, "Cargando trabajos...");
  render();

  try {
    const allJobs = await api("/jobs");
    state.jobs = allJobs.filter((job) => Number(job.client_id) === Number(clientId));
    setStatus(el.jobsStatus, state.jobs.length ? "" : "Todavía no hay trabajos para este cliente.");
    render();
  } catch (error) {
    setGlobalError(`No se pudieron cargar los trabajos. ${error.message}`);
    setStatus(el.jobsStatus, "No se pudieron cargar los trabajos.");
  }
}

async function selectJob(jobId) {
  state.selectedJobId = jobId;
  state.workEntries = [];
  state.supplyEntries = [];
  setGlobalError("");
  setStatus(el.workStatus, "Cargando partes de trabajo...");
  setStatus(el.supplyStatus, "Cargando partes de suministros...");
  render();

  try {
    const [workEntries, supplyEntries] = await Promise.all([
      loadEntries("work-entries", jobId),
      loadEntries("supply-entries", jobId),
    ]);
    state.workEntries = workEntries;
    state.supplyEntries = supplyEntries;
    setStatus(el.workStatus, workEntries.length ? "" : "Todavía no hay partes de trabajo.");
    setStatus(el.supplyStatus, supplyEntries.length ? "" : "Todavía no hay partes de suministros.");
    render();
  } catch (error) {
    setGlobalError(`No se pudieron cargar los partes. ${error.message}`);
    setStatus(el.workStatus, "No se pudieron cargar los partes de trabajo.");
    setStatus(el.supplyStatus, "No se pudieron cargar los partes de suministros.");
  }
}

async function loadEntries(resource, jobId) {
  const entries = await api(`/${resource}?job_id=${encodeURIComponent(jobId)}`);
  return Array.isArray(entries) ? entries : [];
}

async function createClient(event) {
  event.preventDefault();
  const formData = new FormData(el.clientForm);
  const name = formData.get("name")?.trim();
  const address = formData.get("address")?.trim() || null;

  if (!name) return setGlobalError("El nombre del cliente es obligatorio.");

  try {
    await api("/clients", {
      method: "POST",
      body: JSON.stringify({ name, address }),
    });
    el.clientForm.reset();
    await loadInitialData();
  } catch (error) {
    setGlobalError(`No se pudo crear el cliente. ${error.message}`);
  }
}

async function createJob(event) {
  event.preventDefault();
  const client = selectedClient();
  if (!client) return setGlobalError("Selecciona un cliente antes de crear un trabajo.");

  const formData = new FormData(el.jobForm);
  const title = formData.get("title")?.trim();
  const description = formData.get("description")?.trim() || null;
  const status = normalizeNumber(formData.get("status"));

  if (!title || status === null) return setGlobalError("El título y el estado del trabajo son obligatorios.");

  try {
    await api("/jobs", {
      method: "POST",
      body: JSON.stringify({ client_id: client.id, title, description, status }),
    });
    el.jobForm.reset();
    await selectClient(client.id);
  } catch (error) {
    setGlobalError(`No se pudo crear el trabajo. ${error.message}`);
  }
}

async function createWorkEntry(event) {
  event.preventDefault();
  const job = selectedJob();
  if (!job) return setGlobalError("Selecciona un trabajo antes de crear un parte de trabajo.");

  const formData = new FormData(el.workEntryForm);
  const date = formData.get("date");
  const title = formData.get("title")?.trim();

  if (!date || !title) return setGlobalError("La fecha y el título del parte de trabajo son obligatorios.");

  const payload = {
    job_id: job.id,
    date,
    title,
    num_workers: normalizeNumber(formData.get("num_workers")),
    hours_per_worker: normalizeNumber(formData.get("hours_per_worker")),
    location: formData.get("location")?.trim() || null,
    description: formData.get("description")?.trim() || null,
  };

  try {
    await api("/work-entries", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    el.workEntryForm.reset();
    await selectJob(job.id);
  } catch (error) {
    setGlobalError(`No se pudo crear el parte de trabajo. ${error.message}`);
  }
}

async function createSupplyEntry(event) {
  event.preventDefault();
  const job = selectedJob();
  if (!job) return setGlobalError("Selecciona un trabajo antes de crear un parte de suministros.");

  const formData = new FormData(el.supplyEntryForm);
  const date = formData.get("date");
  const supplier = formData.get("supplier")?.trim();
  const reference = formData.get("reference")?.trim();
  const totalAmount = normalizeNumber(formData.get("total_amount"));
  const completion = normalizeNumber(formData.get("completion"));
  const description = formData.get("description")?.trim();

  if (!date || !supplier || !reference || totalAmount === null || completion === null || !description) {
    return setGlobalError(
      "Fecha, proveedor, referencia, importe, estado y descripción son obligatorios para el parte de suministros.",
    );
  }

  const payload = {
    job_id: job.id,
    date,
    supplier,
    reference,
    total_amount: totalAmount,
    completion, // integer para el backend, texto solo en la interfaz
    description,
  };

  try {
    await api("/supply-entries", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    el.supplyEntryForm.reset();
    await selectJob(job.id);
  } catch (error) {
    setGlobalError(`No se pudo crear el parte de suministros. ${error.message}`);
  }
}

async function deleteResource(resource, id, afterDelete) {
  const confirmed = confirm("¿Eliminar este elemento? Esta acción no se puede deshacer.");
  if (!confirmed) return;

  try {
    await api(`/${resource}/${id}`, { method: "DELETE" });
    await afterDelete();
  } catch (error) {
    setGlobalError(`No se pudo eliminar el elemento. ${error.message}`);
  }
}

async function editClient(client) {
  const name = prompt("Nombre del cliente", client.name || "");
  if (name === null) return;
  const address = prompt("Dirección del cliente", client.address || "");
  if (address === null) return;

  try {
    await api(`/clients/${client.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: name.trim(), address: address.trim() || null }),
    });
    await loadInitialData();
  } catch (error) {
    setGlobalError(`No se pudo actualizar el cliente. ${error.message}`);
  }
}

async function editJob(job) {
  const title = prompt("Título del trabajo", job.title || "");
  if (title === null) return;
  const description = prompt("Descripción del trabajo", job.description || "");
  if (description === null) return;
  const statusPrompt = JOB_STATUS_OPTIONS.map((option) => `${option.id} = ${option.label}`).join("\n");
  const status = prompt(`Estado del trabajo:\n${statusPrompt}`, job.status || "");
  if (status === null) return;

  const statusId = normalizeNumber(status);
  if (statusId === null || !JOB_STATUS_LABELS[String(statusId)]) {
    return setGlobalError("Estado de trabajo inválido. Usa uno de los IDs disponibles.");
  }

  try {
    await api(`/jobs/${job.id}`, {
      method: "PATCH",
      body: JSON.stringify({ title: title.trim(), description: description.trim() || null, status: statusId }),
    });
    await selectClient(state.selectedClientId);
  } catch (error) {
    setGlobalError(`No se pudo actualizar el trabajo. ${error.message}`);
  }
}

function render() {
  renderClients();
  renderJobs();
  renderJobDetails();
  renderEntries();
  setFormEnabled(el.jobForm, Boolean(state.selectedClientId));
  setFormEnabled(el.workEntryForm, Boolean(state.selectedJobId));
  setFormEnabled(el.supplyEntryForm, Boolean(state.selectedJobId));
}

function renderClients() {
  el.clientsCount.textContent = state.clients.length;
  el.clientsList.innerHTML = state.clients
    .map((client) => {
      const jobsForClient = state.jobs.filter((job) => Number(job.client_id) === Number(client.id));
      return `
        <div class="item-card ${client.id === state.selectedClientId ? "selected" : ""}">
          <button class="plain-card-button" data-action="select-client" data-id="${client.id}" aria-label="Seleccionar ${escapeHtml(client.name)}">
            <div class="item-title-row">
              <p class="item-title">${escapeHtml(client.name)}</p>
              <span class="pill">${jobsForClient.length}</span>
            </div>
            <p class="item-meta">${escapeHtml(client.address || "Sin dirección")}</p>
          </button>
          <div class="card-actions">
            <button class="button button-secondary button-small" data-action="edit-client" data-id="${client.id}">Editar</button>
            <button class="button button-danger button-small" data-action="delete-client" data-id="${client.id}">Eliminar</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderJobs() {
  el.jobsCount.textContent = state.jobs.length;
  el.jobsList.innerHTML = state.jobs
    .map(
      (job) => `
        <div class="item-card ${job.id === state.selectedJobId ? "selected" : ""}">
          <button class="plain-card-button" data-action="select-job" data-id="${job.id}" aria-label="Seleccionar ${escapeHtml(job.title)}">
            <div class="item-title-row">
              <p class="item-title">${escapeHtml(job.title)}</p>
              <span class="pill">${escapeHtml(jobStatusLabel(job.status))}</span>
            </div>
            <p class="item-meta">${escapeHtml(job.description || "Sin descripción")}</p>
          </button>
          <div class="card-actions">
            <button class="button button-secondary button-small" data-action="edit-job" data-id="${job.id}">Editar</button>
            <button class="button button-danger button-small" data-action="delete-job" data-id="${job.id}">Eliminar</button>
          </div>
        </div>
      `,
    )
    .join("");
}

function renderJobDetails() {
  const job = selectedJob();
  const client = selectedClient();

  if (!job) {
    el.jobDetails.className = "detail-card empty-state";
    el.jobDetails.textContent = state.selectedClientId
      ? "Selecciona un trabajo para ver detalles, partes de trabajo y partes de suministros."
      : "Selecciona un cliente y después un trabajo para ver los partes.";
    return;
  }

  el.jobDetails.className = "detail-card";
  el.jobDetails.innerHTML = `
    <dl>
      <dt>Título</dt><dd>${escapeHtml(job.title)}</dd>
      <dt>Cliente</dt><dd>${escapeHtml(client?.name || `#${job.client_id}`)}</dd>
      <dt>Estado</dt><dd>${escapeHtml(jobStatusLabel(job.status))}</dd>
      <dt>Descripción</dt><dd>${escapeHtml(job.description || "—")}</dd>
    </dl>
  `;
}

function renderEntries() {
  el.workEntries.innerHTML = renderTable({
    rows: state.workEntries,
    columns: [
      ["date", "Fecha"],
      ["title", "Título"],
      ["location", "Ubicación"],
      ["num_workers", "Trabajadores"],
      ["hours_per_worker", "Horas / trabajador"],
      ["description", "Descripción"],
    ],
    resource: "work-entries",
  });

  el.supplyEntries.innerHTML = renderTable({
    rows: state.supplyEntries,
    columns: [
      ["date", "Fecha"],
      ["supplier", "Proveedor"],
      ["reference", "Referencia"],
      ["total_amount", "Importe"],
      ["completion", "Estado", completionLabel],
      ["description", "Descripción"],
    ],
    resource: "supply-entries",
  });
}

function renderTable({ rows, columns, resource }) {
  if (!state.selectedJobId) return `<div class="empty-state">Selecciona primero un trabajo.</div>`;
  if (!rows.length) return `<div class="empty-state">Todavía no hay partes.</div>`;

  const header = columns.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join("");
  const body = rows
    .map(
      (row) => `
        <tr>
          ${columns
            .map(([key, , formatter]) => {
              const value = formatter ? formatter(row[key], row) : row[key];
              return `<td>${escapeHtml(value ?? "—")}</td>`;
            })
            .join("")}
          <td>
            <button class="button button-danger button-small" data-action="delete-entry" data-resource="${resource}" data-id="${row.id}">Eliminar</button>
          </td>
        </tr>
      `,
    )
    .join("");

  return `
    <table>
      <thead><tr>${header}<th>Acciones</th></tr></thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

function handleListClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const id = Number(button.dataset.id);

  if (action === "select-client") selectClient(id);
  if (action === "select-job") selectJob(id);
  if (action === "edit-client") {
    const client = state.clients.find((item) => item.id === id);
    if (client) editClient(client);
  }
  if (action === "edit-job") {
    const job = state.jobs.find((item) => item.id === id);
    if (job) editJob(job);
  }
  if (action === "delete-client") deleteResource("clients", id, loadInitialData);
  if (action === "delete-job") deleteResource("jobs", id, () => selectClient(state.selectedClientId));
  if (action === "delete-entry") deleteResource(button.dataset.resource, id, () => selectJob(state.selectedJobId));
}

el.loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (el.passwordInput.value === APP_PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, "true");
    el.passwordInput.value = "";
    el.loginError.textContent = "";
    showApp();
    return;
  }

  el.loginError.textContent = "Contraseña incorrecta.";
});

el.logoutButton.addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  state.clients = [];
  state.jobs = [];
  state.workEntries = [];
  state.supplyEntries = [];
  state.selectedClientId = null;
  state.selectedJobId = null;
  showLogin();
});

el.refreshButton.addEventListener("click", loadInitialData);
el.clientForm.addEventListener("submit", createClient);
el.jobForm.addEventListener("submit", createJob);
el.workEntryForm.addEventListener("submit", createWorkEntry);
el.supplyEntryForm.addEventListener("submit", createSupplyEntry);
el.clientsList.addEventListener("click", handleListClick);
el.jobsList.addEventListener("click", handleListClick);
el.workEntries.addEventListener("click", handleListClick);
el.supplyEntries.addEventListener("click", handleListClick);

renderJobStatusOptions();
renderCompletionOptions();

setFormEnabled(el.jobForm, false);
setFormEnabled(el.workEntryForm, false);
setFormEnabled(el.supplyEntryForm, false);

if (isUnlocked()) {
  showApp();
} else {
  showLogin();
}
