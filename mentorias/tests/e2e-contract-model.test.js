import test from 'node:test';
import assert from 'node:assert/strict';

const now = new Date('2026-11-05T12:00:00Z');
const fixture = {
  credentials: [
    { token:'mentor-a-token', mentorId:'M-A', active:true, expires:'2026-12-01T00:00:00Z' },
    { token:'expired-token', mentorId:'M-A', active:true, expires:'2026-11-01T00:00:00Z' },
    { token:'revoked-token', mentorId:'M-B', active:false, expires:'2026-12-01T00:00:00Z' }
  ],
  assignments: [{mentorId:'M-A',empresaId:'E-1'},{mentorId:'M-B',empresaId:'E-2'}],
  operations: new Map(), bitacoras:new Map(), documents:new Map()
};
function error(status,code){const e=new Error(code);e.status=status;e.code=code;throw e}
function authorize(token,empresaId){const c=fixture.credentials.find(x=>x.token===token);if(!c||!c.active||new Date(c.expires)<=now)error(401,'CREDENCIAL_INVALIDA');if(!fixture.assignments.some(x=>x.mentorId===c.mentorId&&x.empresaId===empresaId))error(403,'EMPRESA_NO_ASIGNADA');return c.mentorId}
function idempotent(key,work){if(fixture.operations.has(key))return fixture.operations.get(key);const value=work();fixture.operations.set(key,value);return value}
function createBitacora(token,input){const mentorId=authorize(token,input.empresaId);return idempotent(input.key,()=>{const value={bitacoraId:'B-1',empresaId:input.empresaId,mentorId,revision:1,minutes:60,etag:1,history:[{revision:1,minutes:60}]};fixture.bitacoras.set(value.bitacoraId,value);return value})}
function reviseBitacora(token,input){authorize(token,input.empresaId);return idempotent(input.key,()=>{const b=fixture.bitacoras.get(input.bitacoraId);if(!b||b.empresaId!==input.empresaId)error(403,'EMPRESA_NO_ASIGNADA');if(b.etag!==input.etag)error(409,'REVISION_DESACTUALIZADA');b.history.push({revision:b.revision+1,minutes:input.minutes});b.revision++;b.minutes=input.minutes;b.etag++;return {bitacoraId:b.bitacoraId,revision:b.revision}})}
function upload(token,input){const mentorId=authorize(token,input.empresaId);return idempotent(input.key,()=>{const previous=input.documentoId&&fixture.documents.get(input.documentoId);if(previous&&previous.empresaId!==input.empresaId)error(403,'EMPRESA_NO_ASIGNADA');if(previous&&previous.etag!==input.etag)error(409,'CONFLICTO_DOCUMENTAL');const id=previous?.documentoId||'D-1',version=(previous?.current||0)+1,record=previous||{documentoId:id,empresaId:input.empresaId,mentorId,current:0,etag:0,history:[]};record.history.push({version,physicalFile:`${id}-v${version}-${input.name}`});record.current=version;record.etag++;fixture.documents.set(id,record);return {documentoId:id,versionDocumento:version}})}
function download(token,empresaId,documentoId){authorize(token,empresaId);const d=fixture.documents.get(documentoId);if(!d||d.empresaId!==empresaId)error(404,'DOCUMENTO_NO_ENCONTRADO');return d.history.find(x=>x.version===d.current)}

test('contrato ficticio crea una sesión y repite idempotencia sin duplicar horas',()=>{const a=createBitacora('mentor-a-token',{empresaId:'E-1',key:'op-b1'}),b=createBitacora('mentor-a-token',{empresaId:'E-1',key:'op-b1'});assert.strictEqual(a,b);assert.equal(fixture.bitacoras.size,1);assert.equal(a.minutes,60)});
test('corrección append-only conserva historial y contabiliza solo revisión vigente',()=>{const r=reviseBitacora('mentor-a-token',{empresaId:'E-1',bitacoraId:'B-1',key:'op-b2',etag:1,minutes:90}),b=fixture.bitacoras.get('B-1');assert.equal(r.revision,2);assert.equal(b.history.length,2);assert.equal(b.minutes,90);assert.equal(b.history.reduce((n,x)=>n+x.minutes,0),150)});
test('ETag obsoleto produce conflicto 409',()=>{assert.throws(()=>reviseBitacora('mentor-a-token',{empresaId:'E-1',bitacoraId:'B-1',key:'op-conflict',etag:1,minutes:10}),e=>e.status===409&&e.code==='REVISION_DESACTUALIZADA')});
test('documento conserva DocumentoID y crea archivos físicos por versión',()=>{const v1=upload('mentor-a-token',{empresaId:'E-1',key:'doc-1',name:'plan.pdf'}),v2=upload('mentor-a-token',{empresaId:'E-1',documentoId:v1.documentoId,key:'doc-2',etag:1,name:'plan.pdf'}),d=fixture.documents.get(v1.documentoId);assert.equal(v1.documentoId,v2.documentoId);assert.equal(v2.versionDocumento,2);assert.deepEqual(d.history.map(x=>x.physicalFile),['D-1-v1-plan.pdf','D-1-v2-plan.pdf']);assert.equal(download('mentor-a-token','E-1','D-1').version,2)});
test('repetición documental recupera resultado original',()=>{const repeated=upload('mentor-a-token',{empresaId:'E-1',documentoId:'D-1',key:'doc-2',etag:2,name:'otro.pdf'});assert.equal(repeated.versionDocumento,2);assert.equal(fixture.documents.get('D-1').history.length,2)});
test('empresa y documento ajenos son rechazados sin exposición',()=>{assert.throws(()=>authorize('mentor-a-token','E-2'),e=>e.status===403);assert.throws(()=>download('mentor-a-token','E-2','D-1'),e=>e.status===403)});
test('credencial vencida o revocada produce 401',()=>{for(const token of ['expired-token','revoked-token'])assert.throws(()=>authorize(token,'E-1'),e=>e.status===401)});
test('consolidado ficticio usa una sesión, última duración y dos versiones físicas',()=>{const b=fixture.bitacoras.get('B-1'),d=fixture.documents.get('D-1'),row={empresaId:'E-1',sesiones:1,horas:b.minutes/60,documentos:1,versionesDocumento:d.history.length};assert.deepEqual(row,{empresaId:'E-1',sesiones:1,horas:1.5,documentos:1,versionesDocumento:2})});
