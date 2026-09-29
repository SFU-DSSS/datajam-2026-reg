import http from 'node:http';
import { readFile } from 'node:fs/promises';
import config from './api/config.js';
import action from './api/action.js';
import admin from './api/admin.js';
import discord from './api/discord.js';
import discordSync from './api/discord-sync.js';
const files = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
http.createServer(async (req, res) => {
  res.status = code => { res.statusCode = code; return res; };
  res.json = data => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
  const path = new URL(req.url, 'http://localhost').pathname;
  try {
    if (path === '/api/config') return config(req, res);
    if (['/api/action', '/api/admin', '/api/discord', '/api/discord-sync'].includes(path)) {
      let body = '';
      for await (const chunk of req) { body += chunk; if (body.length > 8192) return res.status(413).json({ error: 'Request too large' }); }
      req.body = body;
      return ({ '/api/admin': admin, '/api/action': action, '/api/discord': discord, '/api/discord-sync': discordSync })[path](req, res);
    }
    if (!files[path]) return res.status(404).end('Not found');
    res.setHeader('Content-Type', files[path][1]);
    res.end(await readFile(new URL(`./public/${files[path][0]}`, import.meta.url)));
  } catch { res.status(500).end('Server error'); }
}).listen(Number(process.env.PORT || 3000), '127.0.0.1', () => console.log(`Open http://localhost:${process.env.PORT || 3000}`));
