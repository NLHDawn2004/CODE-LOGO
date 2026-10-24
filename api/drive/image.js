'use strict';
const {downloadPublicImage} = require('../../drive-server.cjs');
module.exports = async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  const fail = (status,error) => {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({error}));};
  if(req.method !== 'GET') {fail(405,'Chỉ hỗ trợ GET.');return;}
  const url = new URL(req.url,'https://codelogolevit.vercel.app');
  const id = url.searchParams.get('id') || '';
  const key = url.searchParams.get('resourcekey') || '';
  if(!/^[\w-]{10,200}$/.test(id) || (key && !/^[\w-]{1,200}$/.test(key))) {fail(400,'Mã ảnh Google Drive không hợp lệ.');return;}
  try {
    const image = await downloadPublicImage(id,key,AbortSignal.timeout(45000),fetch,4*1024*1024);
    res.writeHead(200,{'Content-Type':image.type,'Content-Length':image.body.length});
    res.end(image.body);
  } catch(error) {
    fail(502,error.name==='TimeoutError' ? 'Google tải ảnh quá lâu. Hãy thử lại.'
      : error.message === 'fetch failed' ? 'Không kết nối được đường tải ảnh Google. Hãy thử lại sau.' : error.message);
  }
};
