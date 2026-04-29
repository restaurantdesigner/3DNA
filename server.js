const express = require('express');
const nodemailer = require('nodemailer');
const fs = require('fs/promises');
const path = require('path');
require('dotenv').config();

const app = express();
const rootDir = __dirname;
const logDir = path.join(rootDir, 'logs');
const logFile = path.join(logDir, 'submissions.log');
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateLimitStore = new Map();

app.use(express.json({ limit: '1mb' }));
app.use(express.static(rootDir));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function toLine(key, value) {
  if (Array.isArray(value)) {
    return `- ${key}: ${value.length ? value.join(', ') : '-'}`;
  }
  return `- ${key}: ${value ? String(value) : '-'}`;
}

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitStore.get(ip) || [];
  const recent = entry.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX) {
    const retryAfterMs = RATE_LIMIT_WINDOW_MS - (now - recent[0]);
    rateLimitStore.set(ip, recent);
    return {
      limited: true,
      retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000))
    };
  }

  recent.push(now);
  rateLimitStore.set(ip, recent);
  return { limited: false, retryAfterSec: 0 };
}

function buildEmailText(payload, audit) {
  const lines = [
    'Nueva solicitud desde el formulario 3DNA',
    '',
    `Acepto la politica de privacidad: ${payload.acepto_politica_privacidad || 'No'}`,
    `Fecha y hora (Europe/Madrid): ${payload.fecha_envio_local || '-'}`,
    `Fecha y hora (ISO): ${payload.fecha_envio_iso || audit.timestamp}`,
    `IP: ${audit.ip}`,
    `Version del formulario: ${audit.formVersion}`,
    '',
    'Log tecnico:',
    `- ip: ${audit.ip}`,
    `- timestamp: ${audit.timestamp}`,
    `- version_form: ${audit.formVersion}`,
    '',
    'Datos del formulario:'
  ];

  Object.entries(payload).forEach(([key, value]) => {
    lines.push(toLine(key, value));
  });

  return lines.join('\n');
}

async function appendAuditLog(entry) {
  await fs.mkdir(logDir, { recursive: true });
  await fs.appendFile(logFile, `${JSON.stringify(entry)}\n`, 'utf8');
}

function createTransporter() {
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

app.post('/api/lead', async (req, res) => {
  try {
    const payload = req.body?.payload;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Payload invalido.' });
    }

    const ip = getClientIp(req);
    const limitState = checkRateLimit(ip);
    if (limitState.limited) {
      return res.status(429).json({
        error: 'Demasiadas solicitudes. Intentalo de nuevo en unos minutos.',
        retryAfterSec: limitState.retryAfterSec
      });
    }

    const honeypot = String(payload.company_website || '').trim();
    if (honeypot) {
      await appendAuditLog({
        ip,
        timestamp: new Date().toISOString(),
        formVersion: payload.version_formulario || 'unknown',
        spamTrap: true
      });
      return res.json({ ok: true });
    }

    const nowIso = new Date().toISOString();
    const audit = {
      ip,
      timestamp: nowIso,
      formVersion: payload.version_formulario || 'unknown'
    };

    const transporter = createTransporter();
    const to = process.env.MAIL_TO || 'andrei@3dna.es';
    const from = process.env.MAIL_FROM || to;
    const subject = `Nueva solicitud 3DNA - ${payload.nombre || 'Sin nombre'}`;
    const text = buildEmailText(payload, audit);

    await transporter.sendMail({
      from,
      to,
      replyTo: payload.email || undefined,
      subject,
      text
    });

    await appendAuditLog({
      ...audit,
      email: payload.email || null,
      nombre: payload.nombre || null,
      consent: payload.acepto_politica_privacidad || 'No'
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error('POST /api/lead failed:', error);
    return res.status(500).json({ error: 'No se pudo enviar la solicitud.' });
  }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`3DNA server running on http://localhost:${port}`);
});
