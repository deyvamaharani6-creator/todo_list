const form = document.querySelector("#todoForm");
const titleInput = document.querySelector("#title");
const descriptionInput = document.querySelector("#description");
const todoList = document.querySelector("#todoList");
const emptyState = document.querySelector("#emptyState");
const notice = document.querySelector("#notice");
const filterSelect = document.querySelector("#filter");
const submitButton = document.querySelector("#submitButton");
const cancelEditButton = document.querySelector("#cancelEdit");
const formHeading = document.querySelector("#formHeading");

let todos = [];
let editingId = null;

function showNotice(message, isError = false) {
  notice.textContent = message;
  notice.classList.toggle("error", isError);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Terjadi kesalahan.");
  return data;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}

function updateSummary() {
  document.querySelector("#totalCount").textContent = todos.length;
  document.querySelector("#pendingCount").textContent = todos.filter(todo => !todo.is_completed).length;
  document.querySelector("#doneCount").textContent = todos.filter(todo => Boolean(todo.is_completed)).length;
}

function renderTodos() {
  const filter = filterSelect.value;
  const shown = todos.filter(todo => {
    if (filter === "pending") return !todo.is_completed;
    if (filter === "done") return Boolean(todo.is_completed);
    return true;
  });

  todoList.innerHTML = shown.map(todo => `
    <article class="todo-card ${todo.is_completed ? "completed" : ""}">
      <input class="check" type="checkbox" aria-label="Tandai selesai"
        data-action="toggle" data-id="${todo.id}" ${todo.is_completed ? "checked" : ""}>
      <div class="task-content">
        <div class="task-title">${escapeHtml(todo.title)}</div>
        ${todo.description ? `<div class="task-description">${escapeHtml(todo.description)}</div>` : ""}
        <div class="task-date">Dibuat: ${new Date(todo.created_at).toLocaleString("id-ID")}</div>
      </div>
      <div class="task-actions">
        <button class="icon-button" data-action="edit" data-id="${todo.id}">Edit</button>
        <button class="icon-button delete" data-action="delete" data-id="${todo.id}">Hapus</button>
      </div>
    </article>
  `).join("");

  emptyState.classList.toggle("hidden", shown.length > 0);
  updateSummary();
}

async function loadTodos() {
  try {
    todos = await api("/api/todos");
    renderTodos();
    showNotice("");
  } catch (error) {
    showNotice(`${error.message} Pastikan file .env dan koneksi Aiven sudah benar.`, true);
  }
}

function resetForm() {
  editingId = null;
  form.reset();
  formHeading.textContent = "Tambah tugas baru";
  submitButton.textContent = "+ Tambah tugas";
  cancelEditButton.classList.add("hidden");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = { title: titleInput.value, description: descriptionInput.value };

  try {
    if (editingId !== null) {
      const current = todos.find(todo => todo.id === editingId);
      await api(`/api/todos/${editingId}`, {
        method: "PUT",
        body: JSON.stringify({ ...payload, is_completed: Boolean(current?.is_completed) })
      });
      showNotice("Tugas berhasil diperbarui.");
    } else {
      await api("/api/todos", { method: "POST", body: JSON.stringify(payload) });
      showNotice("Tugas berhasil ditambahkan.");
    }
    resetForm();
    await loadTodos();
  } catch (error) {
    showNotice(error.message, true);
  }
});

cancelEditButton.addEventListener("click", resetForm);
filterSelect.addEventListener("change", renderTodos);

todoList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const id = Number(button.dataset.id);
  const todo = todos.find(item => item.id === id);
  if (!todo) return;

  if (button.dataset.action === "edit") {
    editingId = id;
    titleInput.value = todo.title;
    descriptionInput.value = todo.description || "";
    formHeading.textContent = "Edit tugas";
    submitButton.textContent = "Simpan perubahan";
    cancelEditButton.classList.remove("hidden");
    titleInput.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  if (button.dataset.action === "delete") {
    if (!window.confirm(`Yakin ingin menghapus tugas "${todo.title}"?`)) return;
    try {
      await api(`/api/todos/${id}`, { method: "DELETE" });
      if (editingId === id) resetForm();
      showNotice("Tugas berhasil dihapus.");
      await loadTodos();
    } catch (error) {
      showNotice(error.message, true);
    }
  }
});

todoList.addEventListener("change", async (event) => {
  const checkbox = event.target.closest('input[data-action="toggle"]');
  if (!checkbox) return;
  const id = Number(checkbox.dataset.id);
  try {
    await api(`/api/todos/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ is_completed: checkbox.checked })
    });
    showNotice("Status tugas berhasil diubah.");
    await loadTodos();
  } catch (error) {
    showNotice(error.message, true);
    await loadTodos();
  }
});

loadTodos();