const STORAGE_KEY = "task-manager-tasks";
const form = document.querySelector("#task-form");
const taskList = document.querySelector("#task-list");
const titleInput = document.querySelector("#title");
const categoryInput = document.querySelector("#category");
const statusInput = document.querySelector("#status");
const dueAtInput = document.querySelector("#due-at");
const searchInput = document.querySelector("#search");
const categoryFilter = document.querySelector("#category-filter");
const statusFilter = document.querySelector("#status-filter");

let tasks = loadTasks();
let editingId = null;

function loadTasks() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
}

function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function renderTasks() {
    const query = searchInput.value.trim().toLowerCase();
    const category = categoryFilter.value;
    const status = statusFilter.value;

    const visibleTasks = tasks
        .filter(task => task.title.toLowerCase().includes(query))
        .filter(task => category === "All" || task.category === category)
        .filter(task => status === "All" || task.status === status)
        .sort((a, b) => {
            if (!a.dueAt) return 1;
            if (!b.dueAt) return -1;
            return new Date(a.dueAt) - new Date(b.dueAt);
        });

    const completed = tasks.filter(task => task.status === "Completed").length;
    const percent = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
    document.querySelector("#summary").textContent =
        `${completed} of ${tasks.length} tasks completed(${percent} %).`;

    taskList.replaceChildren();

    if (visibleTasks.length === 0) {
        taskList.append(makeElement("p", "empty", "No tasks found."));
        return;
    }

    for (const task of visibleTasks) {
        const card = makeElement("article", "task");
        const heading = makeElement("h3", "", task.title);
        const labels = makeElement("div");
        labels.append(
            makeElement("span", "badge", task.category),
            makeElement("span", "badge", task.status)
        );
        card.append(heading, labels);

        if (task.dueAt) {
            const due = new Date(task.dueAt);
            card.append(makeElement(
                "p",
                "meta",
                `Due: ${Number.isNaN(due.getTime()) ? "Invalid date" : due.toLocaleString()}`
            ));
        }

        const progress = makeElement("div", "progress-track");
        const bar = makeElement("div", "progress-bar");
        bar.style.width = task.status === "Completed"
            ? "100%"
            : task.status === "In progress" ? "50%" : "0%";
        progress.append(bar);
        card.append(progress);

        const actions = makeElement("div", "task-actions");
        const editButton = makeElement("button", "secondary", "Edit");
        editButton.type = "button";
        editButton.addEventListener("click", () => editTask(task.id));

        const deleteButton = makeElement("button", "danger", "Delete");
        deleteButton.type = "button";
        deleteButton.addEventListener("click", () => deleteTask(task.id));

        actions.append(editButton, deleteButton);
        card.append(actions);
        taskList.append(card);
    }
}

form.addEventListener("submit", event => {
    event.preventDefault();

    const title = titleInput.value.trim();
    if (!title) return;

    if (editingId) {
        const task = tasks.find(item => item.id === editingId);
        if (task) {
            task.title = title;
            task.category = categoryInput.value;
            task.status = statusInput.value;
            task.dueAt = dueAtInput.value;
            task.reminded = false;
        }
    } else {
        tasks.push({
            id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
            title,
            category: categoryInput.value,
            status: statusInput.value,
            dueAt: dueAtInput.value,
            reminded: false
        });
    }

    saveTasks();
    resetForm();
    renderTasks();
});

function editTask(id) {
    const task = tasks.find(item => item.id === id);
    if (!task) return;

    editingId = id;
    titleInput.value = task.title;
    categoryInput.value = task.category;
    statusInput.value = task.status;
    dueAtInput.value = task.dueAt || "";
    document.querySelector("#form-heading").textContent = "Edit task";
    document.querySelector("#save-button").textContent = "Save changes";
    document.querySelector("#cancel-edit").hidden = false;
    titleInput.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteTask(id) {
    tasks = tasks.filter(task => task.id !== id);
    if (editingId === id) resetForm();
    saveTasks();
    renderTasks();
}

function resetForm() {
    form.reset();
    editingId = null;
    document.querySelector("#form-heading").textContent = "Add a task";
    document.querySelector("#save-button").textContent = "Add task";
    document.querySelector("#cancel-edit").hidden = true;
}

document.querySelector("#cancel-edit").addEventListener("click", resetForm);
searchInput.addEventListener("input", renderTasks);
categoryFilter.addEventListener("change", renderTasks);
statusFilter.addEventListener("change", renderTasks);

document.querySelector("#enable-reminders").addEventListener("click", async () => {
    if (!("Notification" in window)) {
        alert("Browser notifications are not supported in this browser.");
        return;
    }

    const permission = await Notification.requestPermission();
    alert(permission === "granted"
        ? "Browser reminders enabled."
        : "Notification permission was not granted.");
    checkReminders();
});

function checkReminders() {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const now = Date.now();
    for (const task of tasks) {
        if (
            task.dueAt &&
            task.status !== "Completed" &&
            !task.reminded &&
            new Date(task.dueAt).getTime() <= now
        ) {
            new Notification("Task reminder", { body: task.title });
            task.reminded = true;
            saveTasks();
        }
    }
}

renderTasks();
checkReminders();
setInterval(checkReminders, 30000);
