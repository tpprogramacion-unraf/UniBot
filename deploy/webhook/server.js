/**
 * UniBot — Webhook Server
 * Escucha push events de GitHub y ejecuta el deploy
 * 
 * Verifica la firma HMAC-SHA256 del webhook para seguridad
 */

const http = require('http');
const crypto = require('crypto');
const { execSync, exec } = require('child_process');

const PORT = 9000;
const SECRET = process.env.WEBHOOK_SECRET || '';
const APP_DIR = process.env.APP_DIR || '/opt/unibot';
const DEPLOY_SCRIPT = `${APP_DIR}/deploy/deploy.sh`;

let isDeploying = false;

function verifySignature(payload, signature) {
  if (!SECRET) return true; // Sin secret = sin verificación
  if (!signature) return false;

  const sig = `sha256=${crypto
    .createHmac('sha256', SECRET)
    .update(payload)
    .digest('hex')}`;

  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(signature));
}

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

const server = http.createServer((req, res) => {
  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', deploying: isDeploying }));
    return;
  }

  // Webhook endpoint
  if (req.method === 'POST' && req.url === '/hooks/deploy') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const signature = req.headers['x-hub-signature-256'];
      
      if (!verifySignature(body, signature)) {
        log('⚠️  Firma inválida — request rechazado');
        res.writeHead(401);
        res.end('Unauthorized');
        return;
      }

      // Verificar que es un push a main
      try {
        const payload = JSON.parse(body);
        if (payload.ref !== 'refs/heads/main') {
          log(`ℹ️  Push a ${payload.ref} ignorado (solo main)`);
          res.writeHead(200);
          res.end('Ignored: not main branch');
          return;
        }
      } catch (e) {
        log('⚠️  Payload JSON inválido');
        res.writeHead(400);
        res.end('Bad Request');
        return;
      }

      // Responder inmediatamente (GitHub espera respuesta rápida)
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'deploying' }));

      // Ejecutar deploy en background
      if (isDeploying) {
        log('⏳ Deploy ya en progreso, ignorando...');
        return;
      }

      isDeploying = true;
      log('🚀 Deploy iniciado...');

      exec(`bash ${DEPLOY_SCRIPT}`, { 
        cwd: APP_DIR,
        timeout: 300000 // 5 min max
      }, (error, stdout, stderr) => {
        isDeploying = false;
        if (error) {
          log(`❌ Deploy falló: ${error.message}`);
          if (stderr) log(`STDERR: ${stderr}`);
        } else {
          log('✅ Deploy completado exitosamente');
        }
        if (stdout) log(`STDOUT: ${stdout}`);
      });
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  log(`🔗 Webhook server escuchando en puerto ${PORT}`);
  log(`   Endpoint: POST /hooks/deploy`);
  log(`   Health:   GET /health`);
  log(`   Secret:   ${SECRET ? 'configurado ✓' : 'NO configurado ⚠️'}`);
});
