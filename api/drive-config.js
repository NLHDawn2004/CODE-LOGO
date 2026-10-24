'use strict';
const settings = require('../drive-settings.json');
module.exports = async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method !== 'GET') {res.writeHead(405);res.end(JSON.stringify({error:'Chỉ hỗ trợ GET.'}));return;}
  res.writeHead(200);
  res.end(JSON.stringify({apiKey:process.env.GOOGLE_DRIVE_API_KEY || settings.apiKey || '',maxImageBytes:4*1024*1024}));
};
