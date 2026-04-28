const API_BASE_URL = "http://localhost:8000";
const APP_PASSWORD = "change-me";

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
    const message = payload?.detail || payload?.message || `Request failed: ${response.status}`;
    throw new Error(Array.isArray(message) ? message.map((item) => item.msg).join(", ") : message);
  }

  return payload;
}

async function loadInitialData() {
  setGlobalError("");
  setStatus(el.clientsStatus, "Loading clients...");
  state.selectedClientId = null;
  state.selectedJobId = null;
  state.jobs = [];
  state.workEntries = [];
  state.supplyEntries = [];
  render();

  try {
    state.clients = await api("/clients");
    setStatus(el.clientsStatus, state.clients.length ? "" : "No clients yet. Create the first one above.");
    render();
  } catch (error) {
    setGlobalError(`Could not load clients. ${error.message}`);
    setStatus(el.clientsStatus, "Unable to load clients.");
  }
}

async function selectClient(clientId) {
  state.selectedClientId = clientId;
  state.selectedJobId = null;
  state.workEntries = [];
  state.supplyEntries = [];
  state.jobs = [];
  setGlobalError("");
  setStatus(el.jobsStatus, "Loading jobs...");
  render();

  try {
    const allJobs = await api("/jobs");
    state.jobs = allJobs.filter((job) => Number(job.client_id) === Number(clientId));
    setStatus(el.jobsStatus, state.jobs.length ? "" : "No jobs for this client yet.");
    render();
  } catch (error) {
    setGlobalError(`Could not load jobs. ${error.message}`);
    setStatus(el.jobsStatus, "Unable to load jobs.");
  }
}

async function selectJob(jobId) {
  state.selectedJobId = jobId;
  state.workEntries = [];
  state.supplyEntries = [];
  setGlobalError("");
  setStatus(el.workStatus, "Loading work entries...");
  setStatus(el.supplyStatus, "Loading supply entries...");
  render();

  try {
    const [workEntries, supplyEntries] = await Promise.all([
      loadEntries("work-entries", jobId),
      loadEntries("supply-entries", jobId),
    ]);
    state.workEntries = workEntries;
    state.supplyEntries = supplyEntries;
    setStatus(el.workStatus, workEntries.length ? "" : "No work entries yet.");
    setStatus(el.supplyStatus, supplyEntries.length ? "" : "No supply entries yet.");
    render();
  } catch (error) {
    setGlobalError(
      `Could not load entries. ${error.message} If your backend has not been patched yet, add GET /work-entries and GET /supply-entries with an optional job_id query parameter.`,
    );
    setStatus(el.workStatus, "Unable to load work entries.");
    setStatus(el.supplyStatus, "Unable to load supply entries.");
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

  if (!name) return setGlobalError("Client name is required.");

  try {
    await api("/clients", {
      method: "POST",
      body: JSON.stringify({ name, address }),
    });
    el.clientForm.reset();
    await loadInitialData();
  } catch (error) {
    setGlobalError(`Could not create client. ${error.message}`);
  }
}

async function createJob(event) {
  event.preventDefault();
  const client = selectedClient();
  if (!client) return setGlobalError("Select a client before creating a job.");

  const formData = new FormData(el.jobForm);
  const title = formData.get("title")?.trim();
  const description = formData.get("description")?.trim() || null;
  const status = formData.get("status")?.trim();

  if (!title || !status) return setGlobalError("Job title and status are required.");

  try {
    await api("/jobs", {
      method: "POST",
      body: JSON.stringify({ client_id: client.id, title, description, status }),
    });
    el.jobForm.reset();
    await selectClient(client.id);
  } catch (error) {
    setGlobalError(`Could not create job. ${error.message}`);
  }
}

async function createWorkEntry(event) {
  event.preventDefault();
  const job = selectedJob();
  if (!job) return setGlobalError("Select a job before creating a work entry.");

  const formData = new FormData(el.workEntryForm);
  const date = formData.get("date");
  const title = formData.get("title")?.trim();

  if (!date || !title) return setGlobalError("Work entry date and title are required.");

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
    setGlobalError(`Could not create work entry. ${error.message}`);
  }
}

async function createSupplyEntry(event) {
  event.preventDefault();
  const job = selectedJob();
  if (!job) return setGlobalError("Select a job before creating a supply entry.");

  const formData = new FormData(el.supplyEntryForm);
  const date = formData.get("date");
  const supplier = formData.get("supplier")?.trim();

  if (!date || !supplier) return setGlobalError("Supply entry date and supplier are required.");

  const payload = {
    job_id: job.id,
    date,
    supplier,
    reference: formData.get("reference")?.trim() || null,
    total_amount: normalizeNumber(formData.get("total_amount")),
  };

  try {
    await api("/supply-entries", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    el.supplyEntryForm.reset();
    await selectJob(job.id);
  } catch (error) {
    setGlobalError(`Could not create supply entry. ${error.message}`);
  }
}

async function deleteResource(resource, id, afterDelete) {
  const confirmed = confirm("Delete this item? This cannot be undone.");
  if (!confirmed) return;

  try {
    await api(`/${resource}/${id}`, { method: "DELETE" });
    await afterDelete();
  } catch (error) {
    setGlobalError(`Could not delete item. ${error.message}`);
  }
}

async function editClient(client) {
  const name = prompt("Client name", client.name || "");
  if (name === null) return;
  const address = prompt("Client address", client.address || "");
  if (address === null) return;

  try {
    await api(`/clients/${client.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: name.trim(), address: address.trim() || null }),
    });
    await loadInitialData();
  } catch (error) {
    setGlobalError(`Could not update client. ${error.message}`);
  }
}

async function editJob(job) {
  const title = prompt("Job title", job.title || "");
  if (title === null) return;
  const description = prompt("Job description", job.description || "");
  if (description === null) return;
  const status = prompt("Job status", job.status || "");
  if (status === null) return;

  try {
    await api(`/jobs/${job.id}`, {
      method: "PATCH",
      body: JSON.stringify({ title: title.trim(), description: description.trim() || null, status: status.trim() }),
    });
    await selectClient(state.selectedClientId);
  } catch (error) {
    setGlobalError(`Could not update job. ${error.message}`);
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
          <button class="plain-card-button" data-action="select-client" data-id="${client.id}" aria-label="Select ${escapeHtml(client.name)}">
            <div class="item-title-row">
              <p class="item-title">${escapeHtml(client.name)}</p>
              <span class="pill">${jobsForClient.length}</span>
            </div>
            <p class="item-meta">${escapeHtml(client.address || "No address")}</p>
          </button>
          <div class="card-actions">
            <button class="button button-secondary button-small" data-action="edit-client" data-id="${client.id}">Edit</button>
            <button class="button button-danger button-small" data-action="delete-client" data-id="${client.id}">Delete</button>
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
          <button class="plain-card-button" data-action="select-job" data-id="${job.id}" aria-label="Select ${escapeHtml(job.title)}">
            <div class="item-title-row">
              <p class="item-title">${escapeHtml(job.title)}</p>
              <span class="pill">${escapeHtml(job.status)}</span>
            </div>
            <p class="item-meta">${escapeHtml(job.description || "No description")}</p>
          </button>
          <div class="card-actions">
            <button class="button button-secondary button-small" data-action="edit-job" data-id="${job.id}">Edit</button>
            <button class="button button-danger button-small" data-action="delete-job" data-id="${job.id}">Delete</button>
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
      ? "Select a job to see details, work entries, and supply entries."
      : "Select a client, then select a job to see entries.";
    return;
  }

  el.jobDetails.className = "detail-card";
  el.jobDetails.innerHTML = `
    <dl>
      <dt>Title</dt><dd>${escapeHtml(job.title)}</dd>
      <dt>Client</dt><dd>${escapeHtml(client?.name || `#${job.client_id}`)}</dd>
      <dt>Status</dt><dd>${escapeHtml(job.status)}</dd>
      <dt>Description</dt><dd>${escapeHtml(job.description || "—")}</dd>
    </dl>
  `;
}

function renderEntries() {
  el.workEntries.innerHTML = renderTable({
    rows: state.workEntries,
    columns: [
      ["date", "Date"],
      ["title", "Title"],
      ["location", "Location"],
      ["num_workers", "Workers"],
      ["hours_per_worker", "Hours / worker"],
      ["description", "Description"],
    ],
    resource: "work-entries",
  });

  el.supplyEntries.innerHTML = renderTable({
    rows: state.supplyEntries,
    columns: [
      ["date", "Date"],
      ["supplier", "Supplier"],
      ["reference", "Reference"],
      ["total_amount", "Amount"],
    ],
    resource: "supply-entries",
  });
}

function renderTable({ rows, columns, resource }) {
  if (!state.selectedJobId) return `<div class="empty-state">Select a job first.</div>`;
  if (!rows.length) return `<div class="empty-state">No entries yet.</div>`;

  const header = columns.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join("");
  const body = rows
    .map(
      (row) => `
        <tr>
          ${columns.map(([key]) => `<td>${escapeHtml(row[key] ?? "—")}</td>`).join("")}
          <td>
            <button class="button button-danger button-small" data-action="delete-entry" data-resource="${resource}" data-id="${row.id}">Delete</button>
          </td>
        </tr>
      `,
    )
    .join("");

  return `
    <table>
      <thead><tr>${header}<th>Actions</th></tr></thead>
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

  el.loginError.textContent = "Incorrect password.";
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

setFormEnabled(el.jobForm, false);
setFormEnabled(el.workEntryForm, false);
setFormEnabled(el.supplyEntryForm, false);

if (isUnlocked()) {
  showApp();
} else {
  showLogin();
}
