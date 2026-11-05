import test from 'node:test';
import assert from 'node:assert/strict';
import { consolidate, currentRevisions, normalizePayload } from '../src/core.js';

const expediente = {
  empresa: { empresaId: 'e1', nombre: 'Empresa TEST' },
  radiografia: { respuestas: [{ id: 1, valor: 'sí' }] },
  bitacoraCabeceras: [{ bitacoraId: 'b1', empresaId: 'e1', revisionActual: 2, versionVigenteId: '102' }],
  bitacoraVersiones: [
    { versionItemId: '101', bitacoraId: 'b1', empresaId: 'e1', revision: 1, duracionMinutos: 30 },
    { versionItemId: '102', bitacoraId: 'b1', empresaId: 'e1', revision: 2, duracionMinutos: 75 },
    { versionItemId: '103', bitacoraId: 'b1', empresaId: 'e1', revision: 3, duracionMinutos: 999, estadoRevision: 'Candidata' }
  ],
  documentos: [{ documentoId: 'd1', empresaId: 'e1', bitacoraId: 'b1', tipo: 'Transcripcion', versionDocumento: 1, urlDescarga: 'https://test/doc' }]
};

test('contrato de expediente contiene diagnóstico, cabeceras, historial y documentos', () => {
  const x = normalizePayload(expediente);
  assert.equal(x.empresa.empresaId, 'e1');
  assert.equal(x.radiografia.respuestas.length, 1);
  assert.equal(x.bitacoraVersiones.length, 3);
  assert.equal(x.documentos[0].tipo, 'Transcripcion');
  assert.equal(currentRevisions(x.bitacoraCabeceras, x.bitacoraVersiones)[0].revision, 2);
});

test('contrato administrativo consolida únicamente el puntero vigente', () => {
  const data = { empresas: [expediente.empresa], asignaciones: [{ empresaId:'e1', mentorNombre:'Mentor TEST', activa:true }], bitacoraCabeceras: expediente.bitacoraCabeceras, bitacoraVersiones: expediente.bitacoraVersiones, documentos: expediente.documentos };
  const filas = consolidate(data.empresas, data.asignaciones, data.bitacoraVersiones, data.documentos, data.bitacoraCabeceras);
  assert.equal(filas.length, 1);
  assert.equal(filas[0].numeroBitacoras, 1);
  assert.equal(filas[0].horasEjecutadas, 1.25);
  assert.equal(filas[0].transcripcionesEstado, 'Cargadas');
});

test('contrato SharePoint se normaliza antes de llegar al frontend', () => {
  const raw = { EmpresaId:'e1', Nombre:'Empresa TEST', BitacoraId:'b1', VersionVigenteId:102 };
  const x = normalizePayload(raw);
  assert.equal(x.empresaId, 'e1'); assert.equal(x.nombre, 'Empresa TEST'); assert.equal(x.bitacoraId, 'b1'); assert.equal(x.versionVigenteId, 102);
});
