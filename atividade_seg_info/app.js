"use strict";

const USERS = [
  { id: 1, name: "Ana Souza", email: "aluno@faculdade.local", password: "123456", role: "ALUNO", studentId: "202400001" },
  { id: 2, name: "Prof. Carlos Lima", email: "professor@faculdade.local", password: "123456", role: "PROFESSOR", classes: ["5A", "5B"] },
  { id: 3, name: "Administrador Geral", email: "admin@faculdade.local", password: "admin2026", role: "ADMIN" }
];

const STORAGE_KEYS = { session: "ocorrencias_sessao", occurrences: "ocorrencias_registros", audit: "ocorrencias_logs" };
const SESSION_TIMEOUT_MINUTES = 20;

const PERMISSIONS = {
  ALUNO: { create: false, updateStatus: false, delete: false, export: false, clearLogs: false, viewLogs: false, changeRole: false, viewInternalNote: false, viewFullContact: false },
  PROFESSOR: { create: true, updateStatus: true, delete: false, export: false, clearLogs: false, viewLogs: false, changeRole: false, viewInternalNote: true, viewFullContact: false },
  ADMIN: { create: true, updateStatus: true, delete: true, export: true, clearLogs: true, viewLogs: true, changeRole: true, viewInternalNote: true, viewFullContact: true }
};

const INITIAL_OCCURRENCES = [
  { id: "OC-1001", studentName: "Marina Alves", studentId: "202300145", studentCpf: "123.456.789-10", studentEmail: "marina.alves@email.local", studentPhone: "(47) 99999-1010", category: "Nota", priority: "Média", description: "Solicitação de revisão de nota da avaliação bimestral.", internalNote: "Verificar com a coordenação antes de responder.", status: "Aberta", createdBy: "professor@faculdade.local", createdAt: "2026-05-05T18:40:00.000Z" },
  { id: "OC-1002", studentName: "Rafael Martins", studentId: "202200771", studentCpf: "987.654.321-00", studentEmail: "rafael.martins@email.local", studentPhone: "(47) 98888-2020", category: "Frequência", priority: "Alta", description: "Aluno contesta lançamento de falta em aula prática.", internalNote: "Conferir chamada manual.", status: "Em análise", createdBy: "professor@faculdade.local", createdAt: "2026-05-05T18:50:00.000Z" },
  { id: "OC-1003", studentName: "Beatriz Costa", studentId: "202100441", studentCpf: "111.222.333-44", studentEmail: "beatriz.costa@email.local", studentPhone: "(47) 97777-3030", category: "Solicitação administrativa", priority: "Crítica", description: "Solicitação envolvendo documentação acadêmica e prazo de matrícula.", internalNote: "Priorizar atendimento.", status: "Aberta", createdBy: "admin@faculdade.local", createdAt: "2026-05-05T19:00:00.000Z" }
];

const $ = (selector) => document.querySelector(selector);
const elements = {
  loginView: $("#loginView"), appView: $("#appView"), loginForm: $("#loginForm"), occurrenceForm: $("#occurrenceForm"), logoutBtn: $("#logoutBtn"), exportBtn: $("#exportBtn"), clearLogsBtn: $("#clearLogsBtn"), resetBtn: $("#resetBtn"), searchInput: $("#search"), roleSelect: $("#roleSelect"), roleControl: $("#roleControl"), sessionBadge: $("#sessionBadge"), currentUserName: $("#currentUserName"), currentUserDetails: $("#currentUserDetails"), occurrencesTable: $("#occurrencesTable"), auditLog: $("#auditLog"), totalOccurrences: $("#totalOccurrences"), criticalOccurrences: $("#criticalOccurrences"), lastUpdate: $("#lastUpdate"), formCard: $("#formCard"), logsCard: $("#logsCard"), securityNotice: $("#securityNotice")
};

function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } }
function writeJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function getOccurrences() { return readJson(STORAGE_KEYS.occurrences, []); }
function saveOccurrences(occurrences) { writeJson(STORAGE_KEYS.occurrences, occurrences); }
function getAuditLogs() { return readJson(STORAGE_KEYS.audit, []); }
function saveAuditLogs(logs) { writeJson(STORAGE_KEYS.audit, logs.slice(0, 100)); }
function getSession() { return readJson(STORAGE_KEYS.session, null); }
function getPerms() { const session = getSession(); return session ? PERMISSIONS[session.role] : null; }
function hasPermission(permission) { const perms = getPerms(); return Boolean(perms && perms[permission]); }
function sanitize(value) { return String(value || "").replace(/[<>]/g, "").trim(); }
function maskCpf(cpf) { return hasPermission("viewFullContact") ? cpf : cpf.replace(/^(\d{3})\.\d{3}\.\d{3}-(\d{2})$/, "$1.***.***-$2"); }
function maskEmail(email) { if (hasPermission("viewFullContact")) return email; const [user, domain] = email.split("@"); return `${user.slice(0, 2)}***@${domain}`; }
function maskPhone(phone) { return hasPermission("viewFullContact") ? phone : phone.replace(/\d(?=\d{4})/g, "*"); }

function saveSession(user) {
  const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role, studentId: user.studentId || null, loginAt: new Date().toISOString(), expiresAt: new Date(Date.now() + SESSION_TIMEOUT_MINUTES * 60000).toISOString() };
  writeJson(STORAGE_KEYS.session, safeUser);
}

function validateSession() {
  const session = getSession();
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    writeLog("SESSAO_EXPIRADA", "Sessão encerrada automaticamente por inatividade.");
    localStorage.removeItem(STORAGE_KEYS.session);
    return null;
  }
  session.expiresAt = new Date(Date.now() + SESSION_TIMEOUT_MINUTES * 60000).toISOString();
  writeJson(STORAGE_KEYS.session, session);
  return session;
}

function writeLog(action, detail) {
  const session = getSession();
  const safeDetail = sanitize(detail).slice(0, 220);
  const logs = getAuditLogs();
  logs.unshift({ when: new Date().toISOString(), user: session ? session.email : "anonimo", role: session ? session.role : "SEM_SESSAO", action: sanitize(action), detail: safeDetail });
  saveAuditLogs(logs);
}

function boot() {
  if (!localStorage.getItem(STORAGE_KEYS.occurrences)) saveOccurrences(INITIAL_OCCURRENCES);
  if (!localStorage.getItem(STORAGE_KEYS.audit)) saveAuditLogs([{ when: new Date().toISOString(), user: "sistema", role: "SISTEMA", action: "BASE_INICIAL_CRIADA", detail: "Dados fictícios carregados no localStorage." }]);
  const session = validateSession();
  session ? showApp(session) : showLogin();
}

function showLogin() {
  elements.loginView.classList.remove("hidden"); elements.appView.classList.add("hidden"); elements.logoutBtn.classList.add("hidden");
  elements.sessionBadge.textContent = "Sessão não iniciada"; elements.sessionBadge.classList.add("muted");
}

function showApp(user) {
  elements.loginView.classList.add("hidden"); elements.appView.classList.remove("hidden"); elements.logoutBtn.classList.remove("hidden");
  elements.sessionBadge.textContent = `${user.name} - ${user.role}`; elements.sessionBadge.classList.remove("muted");
  elements.currentUserName.textContent = user.name; elements.currentUserDetails.textContent = `${user.email} | Perfil: ${user.role} | sessão expira em ${new Date(user.expiresAt).toLocaleTimeString("pt-BR")}`;
  elements.roleSelect.value = user.role;
  elements.roleControl.classList.toggle("hidden", !hasPermission("changeRole"));
  elements.formCard.classList.toggle("hidden", !hasPermission("create"));
  elements.logsCard.classList.toggle("hidden", !hasPermission("viewLogs"));
  elements.exportBtn.disabled = !hasPermission("export"); elements.clearLogsBtn.disabled = !hasPermission("clearLogs");
  elements.securityNotice.textContent = "Controles aplicados no protótipo: permissões por perfil, minimização de exportação, mascaramento de CPF/contato, validação de campos, logs sem dados pessoais completos e expiração simulada de sessão. Como tudo roda no navegador, esses controles são didáticos e não substituem back-end real.";
  render();
}

function login(email, password) {
  const normalizedEmail = sanitize(email).toLowerCase();
  const user = USERS.find((item) => item.email === normalizedEmail && item.password === password);
  if (!user) { alert("Usuário ou senha inválidos."); writeLog("LOGIN_FALHOU", `Tentativa para ${normalizedEmail}`); return; }
  saveSession(user); writeLog("LOGIN_OK", `Usuário ${user.email} entrou no sistema.`); showApp(getSession());
}

function logout() { const session = getSession(); writeLog("LOGOUT", session ? `${session.email} saiu do sistema.` : "Sessão encerrada."); localStorage.removeItem(STORAGE_KEYS.session); showLogin(); }

function changeRole(newRole) {
  if (!hasPermission("changeRole")) { alert("Apenas ADMIN pode alterar perfil ativo neste protótipo."); return; }
  const session = getSession(); session.role = newRole; writeJson(STORAGE_KEYS.session, session); writeLog("PERFIL_ALTERADO", `ADMIN alterou perfil ativo para ${newRole}.`); showApp(session);
}

function assertPermission(permission) { if (!validateSession() || !hasPermission(permission)) { alert("Ação não permitida para o perfil atual."); writeLog("ACAO_BLOQUEADA", `Permissão negada: ${permission}`); return false; } return true; }

function createOccurrence(event) {
  event.preventDefault(); if (!assertPermission("create")) return;
  const session = getSession();
  if (!elements.occurrenceForm.reportValidity()) return;
  const occurrence = { id: `OC-${crypto.getRandomValues(new Uint32Array(1))[0].toString().slice(0, 6)}`, studentName: sanitize($("#studentName").value), studentId: sanitize($("#studentId").value), studentCpf: sanitize($("#studentCpf").value), studentEmail: sanitize($("#studentEmail").value.toLowerCase()), studentPhone: sanitize($("#studentPhone").value), category: sanitize($("#category").value), priority: sanitize($("#priority").value), description: sanitize($("#description").value), internalNote: sanitize($("#internalNote").value), privacyAck: $("#privacyAck").checked, status: "Aberta", createdBy: session.email, createdAt: new Date().toISOString() };
  const occurrences = getOccurrences(); occurrences.unshift(occurrence); saveOccurrences(occurrences);
  writeLog("OCORRENCIA_CRIADA", `Ocorrência ${occurrence.id} criada. Matrícula ${occurrence.studentId}. Categoria ${occurrence.category}.`);
  elements.occurrenceForm.reset(); render();
}

function deleteOccurrence(id) { if (!assertPermission("delete")) return; if (!confirm("Confirmar exclusão desta ocorrência?")) return; const updated = getOccurrences().filter((item) => item.id !== id); saveOccurrences(updated); writeLog("OCORRENCIA_EXCLUIDA", `Ocorrência ${id} excluída.`); render(); }
function changeStatus(id, status) { if (!assertPermission("updateStatus")) return; const occurrences = getOccurrences(); const occurrence = occurrences.find((item) => item.id === id); if (!occurrence) return; occurrence.status = status; occurrence.updatedAt = new Date().toISOString(); saveOccurrences(occurrences); writeLog("STATUS_ALTERADO", `Ocorrência ${id} alterada para ${status}.`); render(); }

function exportAllowedData() {
  if (!assertPermission("export")) return;
  const payload = { exportedAt: new Date().toISOString(), exportedBy: getSession().email, note: "Exportação minimizada: não inclui senhas, token, cópia integral do localStorage ou dados completos de usuários.", occurrences: getOccurrences(), audit: getAuditLogs() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
  anchor.href = url; anchor.download = "exportacao-minimizada-ocorrencias.json"; anchor.click(); URL.revokeObjectURL(url); writeLog("EXPORTACAO_MINIMIZADA", "ADMIN exportou dados permitidos.");
}

function clearLogs() { if (!assertPermission("clearLogs")) return; if (!confirm("Limpar logs locais? Em produção, logs não poderiam ser apagados pelo usuário.")) return; saveAuditLogs([]); render(); }
function resetData() { if (!confirm("Restaurar a base fictícia e encerrar a sessão?")) return; saveOccurrences(INITIAL_OCCURRENCES); saveAuditLogs([]); localStorage.removeItem(STORAGE_KEYS.session); boot(); }

function visibleOccurrences() {
  const session = getSession(); const all = getOccurrences(); if (!session) return [];
  if (session.role === "ALUNO") return all.filter((item) => item.studentId === session.studentId);
  return all;
}

function appendCell(row, content) { const cell = document.createElement("td"); if (content instanceof Node) cell.appendChild(content); else cell.textContent = content; row.appendChild(cell); return cell; }
function actionButton(text, className, handler) { const button = document.createElement("button"); button.type = "button"; button.className = `btn ${className}`; button.textContent = text; button.addEventListener("click", handler); return button; }

function render() {
  const session = validateSession(); if (!session) { showLogin(); return; }
  const term = elements.searchInput.value.toLowerCase();
  const filtered = visibleOccurrences().filter((item) => [item.studentName, item.studentId, item.category, item.priority, item.status].join(" ").toLowerCase().includes(term));
  elements.totalOccurrences.textContent = filtered.length; elements.criticalOccurrences.textContent = filtered.filter((item) => item.priority === "Crítica").length; elements.lastUpdate.textContent = new Date().toLocaleTimeString("pt-BR");
  elements.occurrencesTable.innerHTML = "";
  if (filtered.length === 0) { const row = document.createElement("tr"); const cell = appendCell(row, "Nenhuma ocorrência visível para este perfil."); cell.colSpan = 8; elements.occurrencesTable.appendChild(row); }
  filtered.forEach((item) => {
    const row = document.createElement("tr");
    appendCell(row, `${item.studentName}\n${item.studentId}`); appendCell(row, maskCpf(item.studentCpf)); appendCell(row, `${maskEmail(item.studentEmail)}\n${maskPhone(item.studentPhone)}`); appendCell(row, item.category); appendCell(row, item.priority); appendCell(row, item.status);
    appendCell(row, hasPermission("viewInternalNote") ? `Descrição: ${item.description}\nObs. interna: ${item.internalNote || "-"}` : `Descrição: ${item.description}`);
    const actions = document.createElement("div"); actions.className = "row-actions";
    if (hasPermission("updateStatus")) { actions.appendChild(actionButton("Em análise", "secondary", () => changeStatus(item.id, "Em análise"))); actions.appendChild(actionButton("Resolver", "secondary", () => changeStatus(item.id, "Resolvida"))); }
    if (hasPermission("delete")) actions.appendChild(actionButton("Excluir", "danger", () => deleteOccurrence(item.id)));
    if (!actions.children.length) actions.textContent = "Sem ações"; appendCell(row, actions); elements.occurrencesTable.appendChild(row);
  });
  if (hasPermission("viewLogs")) renderLogs();
}

function renderLogs() {
  const logs = getAuditLogs(); elements.auditLog.innerHTML = "";
  if (logs.length === 0) { const notice = document.createElement("div"); notice.className = "notice"; notice.textContent = "Nenhum log registrado."; elements.auditLog.appendChild(notice); return; }
  logs.forEach((log) => { const item = document.createElement("div"); item.className = "log-item"; item.textContent = `${log.when}\nusuario=${log.user || "-"} | perfil=${log.role || "-"} | acao=${log.action}\ndetalhe=${log.detail}`; elements.auditLog.appendChild(item); });
}

elements.loginForm.addEventListener("submit", (event) => { event.preventDefault(); login($("#email").value, $("#password").value); });
elements.occurrenceForm.addEventListener("submit", createOccurrence); elements.logoutBtn.addEventListener("click", logout); elements.exportBtn.addEventListener("click", exportAllowedData); elements.clearLogsBtn.addEventListener("click", clearLogs); elements.resetBtn.addEventListener("click", resetData); elements.searchInput.addEventListener("input", render); elements.roleSelect.addEventListener("change", (event) => changeRole(event.target.value));
setInterval(() => { if (getSession()) render(); }, 60000);
boot();
