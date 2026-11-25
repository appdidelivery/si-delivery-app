import crypto from 'node:crypto';

// Server-only private Blob. No OAuth secret or session is stored in a
// client-accessible Firestore document in production. Immutable object
// creation (allowOverwrite=false) is the concurrency lock.
function config() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const storeId = token?.split('_')[3];
  if (!token || !storeId || !/^[a-zA-Z0-9]+$/.test(storeId)) {
    throw Object.assign(Error('Armazenamento privado Google ainda indisponível.'), { statusCode: 503 });
  }
  return { token, storeId };
}
export function assertPrivateGoogleStorage() { config(); }
function pathFor(path) {
  if (!/^[a-z0-9/_-]+\.json$/.test(path)) throw Error('Invalid private Google path');
  return 'google-connect/v1/' + path;
}
export async function readGooglePrivate(path) {
  const {token,storeId}=config();
  const r=await fetch('https://'+storeId+'.private.blob.vercel-storage.com/'+pathFor(path)+'?cache=0',{
    headers:{Authorization:'Bearer '+token},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)
  });
  if(r.status===404)return null;
  if(!r.ok)throw Object.assign(Error('Não foi possível consultar o armazenamento privado Google.'),{statusCode:503});
  const data=await r.json();
  if(typeof data?.payload!=='string')throw Error('Invalid encrypted Google object');
  return data.payload;
}
export async function createGooglePrivate(path,payload,{temporary=false}={}) {
  const {token,storeId}=config();
  const body=JSON.stringify({payload});
  const headers={Authorization:'Bearer '+token,'x-vercel-blob-store-id':storeId,'x-api-version':'13',
    'x-vercel-blob-access':'private','x-content-type':'application/json','x-add-random-suffix':'0',
    'x-allow-overwrite':'0','x-cache-control-max-age':'60','Content-Type':'application/json',
    'x-api-blob-request-id':crypto.randomUUID(),'x-api-blob-request-attempt':'0','x-content-length':String(Buffer.byteLength(body))};
  if(temporary)headers['x-ttl-days']='1';
  const r=await fetch('https://vercel.com/api/blob/?'+new URLSearchParams({pathname:pathFor(path)}),{
    method:'PUT',headers,body,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000)
  });
  if(!r.ok){
    if(await readGooglePrivate(path))throw Object.assign(Error('Esta etapa da autorização já foi utilizada.'),{statusCode:409});
    console.warn('[google-connect-private] write rejected', {status:r.status, temporary});
    throw Object.assign(Error('Não foi possível gravar a autorização no armazenamento privado.'),{statusCode:503});
  }
  if(await readGooglePrivate(path)!==payload)throw Object.assign(Error('Gravação da autorização ainda não confirmada.'),{statusCode:503});
}
