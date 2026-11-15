import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {openGraph} from './graph.js';
const graph = openGraph();
const port = Number(process.env.PORT || 4317);
const publicFiles = {'/':'index.html', '/app.js':'app.js', '/style.css':'style.css'};
const types = {'html':'text/html', 'js':'text/javascript', 'css':'text/css'};
function json(res, status, value) {res.writeHead(status, {'Content-Type':'application/json', 'Cache-Control':'no-store'}); res.end(JSON.stringify(value));}
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (req.method === 'GET' && url.pathname === '/api/graph') return json(res, 200, graph.snapshot());
    if (req.method === 'POST' && ['/api/source','/api/review'].includes(url.pathname)) {
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return json(res,403,{error:'Cross-origin writes refused'});
      if (!req.headers['content-type']?.startsWith('application/json')) return json(res,415,{error:'Use application/json'});
      let body = ''; for await (const chunk of req) {body += chunk; if (body.length > 10000) return json(res,413,{error:'Request too large'});}
      const p = JSON.parse(body);
      if (url.pathname === '/api/source') {
        if (typeof p.id !== 'string' || typeof p.note !== 'string' || p.note.length > 1000 || !p.note.trim()) return json(res,400,{error:'Select a source and enter a reason (up to 1000 characters)'});
        return json(res,200,graph.updateSource(p.id,p.status,p.note.trim()));
      }
      if (typeof p.claim !== 'string' || typeof p.source !== 'string') return json(res,400,{error:'Evidence link required'});
      return json(res,200,graph.review(p.claim,p.source));
    }
    if (req.method === 'GET' && publicFiles[url.pathname]) {
      const file = publicFiles[url.pathname];
      res.writeHead(200, {'Content-Type':types[file.split('.').pop()]+'; charset=utf-8', 'X-Content-Type-Options':'nosniff'});
      return res.end(await readFile(new URL('./public/'+file,import.meta.url)));
    }
    json(res,404,{error:'Not found'});
  } catch(e) { json(res,400,{error:e.message}); }
}).listen(port,'127.0.0.1', () => console.log(`SourceTrail running at http://127.0.0.1:${port}`));
