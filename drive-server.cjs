'use strict';
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const HOST = '127.0.0.1:18764';
const assets = new Map([['/','index.html'],['/index.html','index.html'],['/drive-import.js','drive-import.js']]);
async function downloadPublicImage(id, resourceKey, signal, fetchImpl) {
  let url = new URL('https://drive.usercontent.google.com/download');
  url.searchParams.set('id',id);url.searchParams.set('export','download');
  if(resourceKey) url.searchParams.set('resourcekey',resourceKey);
  const allowed = host => host === 'drive.google.com' || host === 'drive.usercontent.google.com' || host.endsWith('.googleusercontent.com');
  for(let redirects=0;redirects<=5;redirects++) {
    const response = await fetchImpl(url,{signal,redirect:'manual'});
    if([301,302,303,307,308].includes(response.status)) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      if(!location) throw new Error('Google trả về đường tải không hợp lệ.');
      url = new URL(location,url);
      if(url.protocol !== 'https:' || !allowed(url.hostname)) throw new Error('Google trả về đường tải ngoài miền được phép.');
      continue;
    }
    if(!response.ok) {
      await response.body?.cancel();
      throw new Error('Google từ chối tải ảnh (HTTP ' + response.status + '). Kiểm tra quyền tải xuống của ảnh hoặc thử lại sau.');
    }
    const type = response.headers.get('content-type') || '';
    if(!type.startsWith('image/')) {
      await response.body?.cancel();
      throw new Error('Google chưa cho tải ảnh gốc. Kiểm tra quyền xem/tải công khai và giới hạn tải của Drive.');
    }
    const limit = 30 * 1024 * 1024;
    if(Number(response.headers.get('content-length'))>limit) {await response.body.cancel();throw new Error('Ảnh vượt quá giới hạn 30 MB.');}
    let bytes=0;const chunks=[];
    for await(const chunk of response.body) {
      bytes+=chunk.length;if(bytes>limit) throw new Error('Ảnh vượt quá giới hạn 30 MB.');
      chunks.push(chunk);
    }
    if(!bytes) throw new Error('Google trả về ảnh rỗng.');
    return {type,body:Buffer.concat(chunks)};
  }
  throw new Error('Google chuyển hướng tải ảnh quá nhiều lần. Hãy thử lại sau.');
}
function createServer({fetchImpl = fetch} = {}) {
  return http.createServer(async (req,res) => {
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    if(req.headers.host !== HOST || (req.headers.origin && req.headers.origin !== 'http://' + HOST)) {
      res.writeHead(403);res.end('Forbidden');return;
    }
    if(req.method !== 'GET') {res.writeHead(405);res.end();return;}
    const url = new URL(req.url,'http://' + HOST);
    if(url.pathname === '/api/drive/image') {
      const id = url.searchParams.get('id') || '';
      const resourceKey = url.searchParams.get('resourcekey') || '';
      const jsonError = (status,error) => {if(!res.destroyed){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({error}));}};
      if(!/^[\w-]{10,200}$/.test(id) || (resourceKey && !/^[\w-]{1,200}$/.test(resourceKey))) {
        jsonError(400,'Mã ảnh Google Drive không hợp lệ.');return;
      }
      const controller = new AbortController();
      res.on('close',()=>{if(!res.writableEnded)controller.abort();});
      try {
        const image = await downloadPublicImage(id,resourceKey,AbortSignal.any([controller.signal,AbortSignal.timeout(45000)]),fetchImpl);
        if(!res.destroyed){res.writeHead(200,{'Content-Type':image.type,'Content-Length':image.body.length});res.end(image.body);}
      } catch(error) {
        const message = error.name === 'TimeoutError' ? 'Google tải ảnh quá lâu. Hãy thử lại.'
          : error.message === 'fetch failed' ? 'Máy không kết nối được đường tải ảnh của Google. Kiểm tra mạng rồi thử lại.' : error.message;
        jsonError(502,message);
      }
      return;
    }
    try {
      if(url.pathname === '/api/health') {
        res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({app:'HD CODE LOGO',drive:true}));return;
      }
      if(url.pathname === '/api/drive-config') {
        let apiKey = '';
        try {
          const settings = JSON.parse((await fs.readFile(path.join(__dirname,'drive-settings.json'),'utf8')).replace(/^\uFEFF/,''));
          apiKey = typeof settings.apiKey === 'string' ? settings.apiKey : '';
        } catch {}
        res.writeHead(200,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({apiKey}));return;
      }
      const asset = assets.get(url.pathname);
      if(!asset) {res.writeHead(404);res.end('Not found');return;}
      const body = await fs.readFile(path.join(__dirname,asset));
      res.writeHead(200,{'Content-Type':asset.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8'});
      res.end(body);
    } catch {
      res.writeHead(500,{'Content-Type':'text/plain; charset=utf-8'});res.end('Không mở được tệp công cụ. Hãy kiểm tra các tệp cùng thư mục.');
    }
  });
}
if(require.main === module) {
  const server = createServer();
  server.on('error',error=>{if(error.code!=='EADDRINUSE')console.error(error.message);process.exit(error.code==='EADDRINUSE'?0:1);});
  server.listen(18764,'127.0.0.1',()=>console.log('HD CODE LOGO: http://' + HOST));
}
module.exports = {createServer};
