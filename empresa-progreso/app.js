(() => {
  const API = String(window.SWC_COMPANY_API_BASE_URL || '').replace(/\/$/, '');
  const grantKey = 'swc_company_grant';
  let grant = new URLSearchParams(location.hash.slice(1)).get('swc_company_grant') || sessionStorage.getItem(grantKey) || '';
  const $ = id => document.getElementById(id);
  const showError = message => { $('loading').classList.add('hidden'); $('error').textContent = message; $('error').classList.remove('hidden'); };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  async function api(path, options = {}) {
    const response = await fetch(API + path, {
      ...options,
      cache: 'no-store',
      headers: { Authorization: 'Bearer ' + grant, ...(options.headers || {}) }
    });
    if (!response.ok) throw new Error(response.status === 401 ? 'Tu sesión venció. Ingresa nuevamente desde la Biblioteca de inversión.' : 'No fue posible consultar tu proceso. Intenta más tarde.');
    return response;
  }

  function render(data) {
    $('loading').classList.add('hidden');
    $('content').classList.remove('hidden');
    $('companyName').textContent = data.companyName || 'Mi proceso de fortalecimiento';
    $('milestoneCount').textContent = String(data.milestones.length);
    $('documentCount').textContent = String(data.documents.length);
    $('logCount').textContent = String(data.bitacoras.length);
    $('updatedAt').textContent = data.updatedAt ? 'Actualizado ' + new Date(data.updatedAt).toLocaleDateString('es-CO') : '';

    $('milestones').innerHTML = data.milestones.map(item => `<li class="milestone"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description || '')}</p><div class="meta"><span class="pill">${escapeHtml(item.status || 'Registrado')}</span>${item.date ? `<time>${escapeHtml(item.date)}</time>` : ''}${item.mentor ? `<span>${escapeHtml(item.mentor)}</span>` : ''}</div></li>`).join('');
    $('noMilestones').classList.toggle('hidden', data.milestones.length > 0);

    const labels = { diagnostico: 'Diagnóstico', plan: 'Plan de trabajo' };
    $('documents').innerHTML = data.documents.map(item => `<article class="document"><div><h3>${escapeHtml(labels[item.type] || item.name || 'Documento')}</h3><p>${escapeHtml(item.updatedAt ? 'Disponible · ' + new Date(item.updatedAt).toLocaleDateString('es-CO') : 'Disponible para consulta')}</p></div><button class="download" data-type="${escapeHtml(item.type)}">Descargar ↓</button></article>`).join('');
    $('noDocuments').classList.toggle('hidden', data.documents.length > 0);
    $('documents').querySelectorAll('.download').forEach(button => button.addEventListener('click', () => download(button.dataset.type, button)));

    $('logs').innerHTML = data.bitacoras.map(item => `<article class="log"><h3>${escapeHtml(item.title || 'Bitácora de mentoría')}</h3><p>${escapeHtml(item.summary || '')}</p><div class="meta">${item.date ? `<time>${escapeHtml(item.date)}</time>` : ''}${item.mentor ? `<span>${escapeHtml(item.mentor)}</span>` : ''}${item.fileId ? `<button class="download" data-file="${escapeHtml(item.fileId)}">Descargar bitácora ↓</button>` : ''}</div></article>`).join('');
    $('noLogs').classList.toggle('hidden', data.bitacoras.length > 0);
    $('logs').querySelectorAll('[data-file]').forEach(button => button.addEventListener('click', () => downloadBitacora(button.dataset.file, button)));
  }

  async function saveResponse(response, button, fallbackName) {
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fallbackName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    if (button) { button.disabled = false; button.textContent = 'Descargar ↓'; }
  }

  async function download(type, button) {
    if (!['diagnostico', 'plan'].includes(type)) return;
    button.disabled = true; button.textContent = 'Preparando…';
    try { await saveResponse(await api('/api/document?type=' + encodeURIComponent(type)), button, type + '.pdf'); }
    catch (error) { button.disabled = false; button.textContent = 'Descargar ↓'; showError(error.message); }
  }

  async function downloadBitacora(fileId, button) {
    button.disabled = true; button.textContent = 'Preparando…';
    try { await saveResponse(await api('/api/bitacora?file=' + encodeURIComponent(fileId)), button, 'bitacora'); }
    catch (error) { button.disabled = false; button.textContent = 'Descargar bitácora ↓'; showError(error.message); }
  }

  async function start() {
    if (!API || !grant) { showError('Ingresa desde la Biblioteca de inversión con el NIT de tu empresa para abrir tu sección personalizada.'); return; }
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    sessionStorage.setItem(grantKey, grant);
    try { render(await (await api('/api/progress')).json()); }
    catch (error) { sessionStorage.removeItem(grantKey); showError(error.message); }
  }
  start();
})();
