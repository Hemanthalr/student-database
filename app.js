"use strict";

const STORAGE_KEY = "campus-record-students-v1";
const studentForm = document.querySelector("#student-form");
const studentDialog = document.querySelector("#student-dialog");
const detailsDialog = document.querySelector("#details-dialog");
const tableBody = document.querySelector("#student-table-body");
const emptyState = document.querySelector("#empty-state");
const toast = document.querySelector("#toast");

let students = loadStudents();
let toastTimeout;
let detailsStudentId = null;

function loadStudents() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || !parsed.every(isStudent)) {
      throw new Error("Stored student records have an invalid format.");
    }
    return parsed;
  } catch (error) {
    console.error("Unable to load student records:", error);
    window.setTimeout(() => showToast("Student records could not be loaded. Check browser storage.", true), 0);
    return [];
  }
}

function isStudent(value) {
  return value !== null &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    typeof value.fullName === "string" &&
    typeof value.studentId === "string" &&
    ["Male", "Female", "Other"].includes(value.gender) &&
    typeof value.department === "string" &&
    typeof value.section === "string";
}

function saveStudents() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
    return true;
  } catch (error) {
    console.error("Unable to save student records:", error);
    showToast("Could not save records. Browser storage may be unavailable or full.", true);
    return false;
  }
}

function showToast(message, isError = false) {
  window.clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("visible");
  toastTimeout = window.setTimeout(() => toast.classList.remove("visible"), 3200);
}

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function render() {
  const query = document.querySelector("#search-input").value.trim().toLowerCase();
  const selectedDepartment = document.querySelector("#department-filter").value;
  const selectedGender = document.querySelector("#gender-filter").value;
  const filtered = students.filter((student) => {
    const searchable = [student.fullName, student.studentId, student.department, student.section, student.email]
      .join(" ")
      .toLowerCase();
    return searchable.includes(query) &&
      (!selectedDepartment || student.department === selectedDepartment) &&
      (!selectedGender || student.gender === selectedGender);
  });

  renderTable(filtered);
  renderDashboard();
  renderDepartmentFilter();
  document.querySelector("#result-count").textContent =
    `Showing ${filtered.length} of ${students.length} ${students.length === 1 ? "student" : "students"}`;
}

function renderTable(records) {
  tableBody.replaceChildren();
  const hasRecords = records.length > 0;
  document.querySelector(".table-wrap table").hidden = !hasRecords;
  emptyState.classList.toggle("visible", !hasRecords);

  if (!hasRecords) {
    const hasFilters = Boolean(
      document.querySelector("#search-input").value.trim() ||
      document.querySelector("#department-filter").value ||
      document.querySelector("#gender-filter").value
    );
    document.querySelector("#empty-title").textContent = hasFilters ? "No matching students" : "No student records yet";
    document.querySelector("#empty-message").textContent = hasFilters
      ? "Try changing your search or filters."
      : "Add your first student to start building the college directory.";
    document.querySelector("#empty-add-button").hidden = hasFilters;
    return;
  }

  document.querySelector("#empty-add-button").hidden = false;
  records.forEach((student) => {
    const row = document.createElement("tr");
    const genderClass = student.gender.toLowerCase();
    row.innerHTML = `
      <td>
        <div class="student-cell">
          <div class="person-avatar">${escapeHtml(initials(student.fullName))}</div>
          <div>
            <div class="student-name">${escapeHtml(student.fullName)}</div>
            <div class="student-email">${escapeHtml(student.email || "No email added")}</div>
          </div>
        </div>
      </td>
      <td class="id-cell">${escapeHtml(student.studentId)}</td>
      <td class="department-name">${escapeHtml(student.department)}</td>
      <td><span class="section-pill">${escapeHtml(student.section)}</span></td>
      <td><span class="gender-pill gender-${genderClass}">${escapeHtml(student.gender)}</span></td>
      <td>
        <div class="row-actions">
          <button class="row-action" type="button" data-action="view" data-id="${escapeHtml(student.id)}" aria-label="View ${escapeHtml(student.fullName)} details" title="View details">⌕</button>
          <button class="row-action" type="button" data-action="edit" data-id="${escapeHtml(student.id)}" aria-label="Edit ${escapeHtml(student.fullName)}" title="Edit">✎</button>
          <button class="row-action delete" type="button" data-action="delete" data-id="${escapeHtml(student.id)}" aria-label="Delete ${escapeHtml(student.fullName)}" title="Delete">×</button>
        </div>
      </td>`;
    tableBody.append(row);
  });
}

function renderDashboard() {
  const male = students.filter((student) => student.gender === "Male").length;
  const female = students.filter((student) => student.gender === "Female").length;
  const other = students.filter((student) => student.gender === "Other").length;
  const departments = new Set(students.map((student) => student.department));
  const sections = new Set(students.map((student) => `${student.department.toLowerCase()}|${student.section.toLowerCase()}`));
  const total = students.length;

  document.querySelector("#total-count").textContent = total;
  document.querySelector("#male-count").textContent = male;
  document.querySelector("#female-count").textContent = female;
  document.querySelector("#department-count").textContent = departments.size;
  document.querySelector("#section-count").textContent = sections.size;
  document.querySelector("#gender-total-label").textContent = `${total} ${total === 1 ? "student" : "students"}`;
  document.querySelector("#male-legend-count").textContent = male;
  document.querySelector("#female-legend-count").textContent = female;
  document.querySelector("#other-legend-count").textContent = other;
  setBarWidth("#male-bar", male, total);
  setBarWidth("#female-bar", female, total);
  setBarWidth("#other-bar", other, total);

  renderDepartments(departments);
}

function setBarWidth(selector, value, total) {
  document.querySelector(selector).style.width = total ? `${(value / total) * 100}%` : "0%";
}

function renderDepartments(departments) {
  const list = document.querySelector("#department-list");
  list.replaceChildren();
  if (!departments.size) {
    const message = document.createElement("p");
    message.className = "department-empty";
    message.textContent = "Department totals will appear when you add students.";
    list.append(message);
    return;
  }

  const counts = [...departments].map((department) => ({
    department,
    count: students.filter((student) => student.department === department).length
  })).sort((a, b) => b.count - a.count || a.department.localeCompare(b.department));
  const maxCount = counts[0].count;
  counts.slice(0, 6).forEach(({ department, count }) => {
    const row = document.createElement("div");
    row.className = "department-row";
    row.innerHTML = `
      <div class="department-row-top">
        <span title="${escapeHtml(department)}">${escapeHtml(department)}</span>
        <span>${count} ${count === 1 ? "student" : "students"}</span>
      </div>
      <div class="progress-track" aria-label="${escapeHtml(department)}: ${count} students">
        <div class="progress-value" style="width:${(count / maxCount) * 100}%"></div>
      </div>`;
    list.append(row);
  });
}

function renderDepartmentFilter() {
  const filter = document.querySelector("#department-filter");
  const selected = filter.value;
  const names = [...new Set(students.map((student) => student.department))]
    .sort((a, b) => a.localeCompare(b));
  filter.replaceChildren(new Option("All departments", ""));
  names.forEach((name) => filter.add(new Option(name, name)));
  if (names.includes(selected)) filter.value = selected;
}

function openForm(student = null) {
  studentForm.reset();
  document.querySelector("#form-error").textContent = "";
  document.querySelector("#editing-id").value = student?.id || "";
  document.querySelector("#dialog-title").textContent = student ? "Edit student" : "Add student";
  document.querySelector("#save-student-button").textContent = student ? "Save changes" : "Save student";
  if (student) {
    Object.entries(student).forEach(([key, value]) => {
      const field = studentForm.elements.namedItem(key);
      if (field) field.value = value;
    });
  }
  studentDialog.showModal();
  studentForm.elements.namedItem("fullName").focus();
}

function openDetails(student) {
  detailsStudentId = student.id;
  document.querySelector("#details-avatar").textContent = initials(student.fullName);
  document.querySelector("#details-name").textContent = student.fullName;
  document.querySelector("#details-id").textContent = `Student ID: ${student.studentId}`;
  const items = [
    ["Gender", student.gender],
    ["Department", student.department],
    ["Section", student.section],
    ["Year / semester", student.year],
    ["Date of birth", formatDate(student.dateOfBirth)],
    ["Email address", student.email],
    ["Phone number", student.phone],
    ["Address", student.address]
  ];
  const grid = document.querySelector("#details-grid");
  grid.replaceChildren();
  items.forEach(([label, value]) => {
    const item = document.createElement("div");
    item.className = "detail-item";
    const title = document.createElement("div");
    title.className = "detail-label";
    title.textContent = label;
    const detail = document.createElement("div");
    detail.className = "detail-value";
    detail.textContent = value || "Not provided";
    item.append(title, detail);
    grid.append(item);
  });
  detailsDialog.showModal();
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function exportCsv() {
  if (!students.length) {
    showToast("There are no student records to export.", true);
    return;
  }
  const fields = [
    ["Student ID", "studentId"], ["Full name", "fullName"], ["Gender", "gender"],
    ["Department", "department"], ["Section", "section"], ["Year / semester", "year"],
    ["Date of birth", "dateOfBirth"], ["Email", "email"], ["Phone", "phone"], ["Address", "address"]
  ];
  const lines = [
    fields.map(([label]) => csvCell(label)).join(","),
    ...students.map((student) => fields.map(([, key]) => csvCell(student[key])).join(","))
  ];
  const file = new Blob(["\uFEFF", lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(file);
  link.href = url;
  link.download = "college-student-records.csv";
  link.click();
  URL.revokeObjectURL(url);
  showToast("Student records exported as CSV.");
}

document.querySelector("#add-student-button").addEventListener("click", () => openForm());
document.querySelector("#empty-add-button").addEventListener("click", () => openForm());
document.querySelector("#export-button").addEventListener("click", exportCsv);
document.querySelector("#search-input").addEventListener("input", render);
document.querySelector("#department-filter").addEventListener("change", render);
document.querySelector("#gender-filter").addEventListener("change", render);

document.querySelectorAll(".close-dialog").forEach((button) => {
  button.addEventListener("click", () => button.closest("dialog").close());
});

studentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!studentForm.reportValidity()) return;
  const formData = new FormData(studentForm);
  const editingId = document.querySelector("#editing-id").value;
  const student = {
    id: editingId || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`),
    fullName: String(formData.get("fullName")).trim(),
    studentId: String(formData.get("studentId")).trim(),
    gender: String(formData.get("gender")),
    department: String(formData.get("department")).trim(),
    section: String(formData.get("section")).trim(),
    year: String(formData.get("year")).trim(),
    dateOfBirth: String(formData.get("dateOfBirth")),
    email: String(formData.get("email")).trim(),
    phone: String(formData.get("phone")).trim(),
    address: String(formData.get("address")).trim()
  };
  const duplicateId = students.some((record) =>
    record.studentId.toLowerCase() === student.studentId.toLowerCase() && record.id !== editingId
  );
  if (duplicateId) {
    document.querySelector("#form-error").textContent = "That student ID is already in use. Enter a unique student ID.";
    return;
  }

  const previous = students;
  students = editingId
    ? students.map((record) => record.id === editingId ? student : record)
    : [...students, student];
  if (!saveStudents()) {
    students = previous;
    return;
  }
  studentDialog.close();
  render();
  showToast(editingId ? "Student details updated." : "Student added to the database.");
});

tableBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const student = students.find((record) => record.id === button.dataset.id);
  if (!student) return;

  if (button.dataset.action === "view") openDetails(student);
  if (button.dataset.action === "edit") openForm(student);
  if (button.dataset.action === "delete") {
    const confirmed = window.confirm(`Delete ${student.fullName} (${student.studentId})? This cannot be undone.`);
    if (!confirmed) return;
    const previous = students;
    students = students.filter((record) => record.id !== student.id);
    if (!saveStudents()) {
      students = previous;
      return;
    }
    render();
    showToast("Student record deleted.");
  }
});

document.querySelector("#details-edit-button").addEventListener("click", () => {
  const student = students.find((record) => record.id === detailsStudentId);
  if (!student) return;
  detailsDialog.close();
  openForm(student);
});

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    document.querySelector("#search-input").focus();
  }
});

render();
