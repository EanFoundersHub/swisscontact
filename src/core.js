export function latestRevisions(rows) {
  const latest = new Map();
  for (const row of rows || []) {
    const key = row.bitacoraId;
    const current = latest.get(key);
    if (!current || Number(row.revision) > Number(current.revision)) latest.set(key, row);
  }
  return [...latest.values()];
}

export function currentRevisions(headers = [], versions = []) {
  const byItemId = new Map(versions.map(v => [String(v.versionItemId ?? v.ID ?? v.id), v]));
  return headers.map(h => {
    const pointed = byItemId.get(String(h.versionVigenteId ?? h.VersionVigenteId ?? ''));
    if (pointed) return pointed;
    return latestRevisions(versions.filter(v => v.bitacoraId === h.bitacoraId))[0];
  }).filter(Boolean);
}

export function normalizePayload(value) {
  if (Array.isArray(value)) return value.map(normalizePayload);
  if (!value || typeof value !== 'object') return value;
  const aliases = { EmpresaId:'empresaId', Nombre:'nombre', BitacoraId:'bitacoraId', Revision:'revision', RevisionActual:'revisionActual', VersionVigenteId:'versionVigenteId', ID:'versionItemId', FechaSesion:'fechaSesion', DuracionMinutos:'duracionMinutos', Objetivo:'objetivo', Actividades:'actividades', Avances:'avances', Compromisos:'compromisos', Observaciones:'observaciones', AutorEmail:'autor', Created:'creado', Modified:'modificado', Tipo:'tipo', VersionDocumento:'versionDocumento', UrlDescarga:'urlDescarga', NombreArchivo:'nombreArchivo', MentorEmail:'mentorEmail', MentorNombre:'mentorNombre', Activa:'activa', EntregablesEtapa0:'entregablesEtapa0' };
  const result = { ...value };
  for (const [source, target] of Object.entries(aliases)) if (result[source] !== undefined && result[target] === undefined) result[target] = result[source];
  return result;
}

export function consolidate(empresas, asignaciones, versiones, documentos, cabeceras = []) {
  const current = cabeceras.length ? currentRevisions(cabeceras, versiones) : latestRevisions(versiones);
  return (empresas || []).map(empresa => {
    const sessions = current.filter(x => x.empresaId === empresa.empresaId && x.estado !== "Anulada");
    const docs = (documentos || []).filter(x => x.empresaId === empresa.empresaId);
    const mentors = (asignaciones || []).filter(x => x.empresaId === empresa.empresaId && x.activa !== false);
    const last = sessions.reduce((a, x) => !a || x.fechaSesion > a ? x.fechaSesion : a, null);
    const updated = [...sessions, ...docs].reduce((a, x) => !a || x.modificado > a ? x.modificado : a, empresa.modificado || null);
    return {
      ...empresa,
      mentores: mentors.map(x => x.mentorNombre || x.mentorEmail),
      numeroBitacoras: sessions.length,
      horasEjecutadas: sessions.reduce((n, x) => n + Number(x.duracionMinutos || 0), 0) / 60,
      planEstado: docs.some(x => x.tipo === "PlanAccion") ? "Cargado" : "Pendiente",
      transcripcionesEstado: sessions.length && sessions.every(s => docs.some(d => d.tipo === "Transcripcion" && d.bitacoraId === s.bitacoraId)) ? "Cargadas" : "Pendientes",
      ultimaMentoria: last,
      ultimaActualizacion: updated
    };
  });
}

export function csv(rows) {
  const fields = ["empresaId","nombre","mentores","numeroBitacoras","horasEjecutadas","planEstado","transcripcionesEstado","ultimaMentoria","ultimaActualizacion","entregablesEtapa0"];
  const quote = v => `"${String(Array.isArray(v) ? v.join("; ") : v ?? "").replaceAll('"','""')}"`;
  return [fields.join(","), ...rows.map(r => fields.map(f => quote(r[f])).join(","))].join("\r\n");
}

export function validateBitacora(x) {
  const required = ["empresaId","fechaSesion","objetivo","actividades","avances","compromisos"];
  const missing = required.filter(k => !String(x[k] ?? "").trim());
  const minutes = Number(x.duracionMinutos);
  if (missing.length) throw new Error(`Campos requeridos: ${missing.join(", ")}`);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) throw new Error("La duración debe estar entre 1 y 1440 minutos");
  return true;
}

export function logicalId() { return crypto.randomUUID(); }
export function idempotencyKey() { return crypto.randomUUID(); }
