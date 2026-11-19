import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';

const directory = dirname(fileURLToPath(import.meta.url));
const sessionCookie = 'semeiaki_session';
const sessionLifetime = 7 * 24 * 60 * 60 * 1000;
const allowedCategories = new Set(['Horta', 'Frutas', 'Grãos', 'Do Sítio', 'Animais']);
const dummyPasswordHash = hashPassword('not-a-real-password', '0'.repeat(32));
const sampleProducts = [
  {
    id: 'alface-crespa',
    name: 'Alface crespa',
    category: 'Horta',
    price: 'R$ 4,50',
    unit: 'unidade',
    producer: 'Dona Maria · Sítio Picos',
    site: 'Sítio Picos',
    image:
      'https://images.unsplash.com/photo-1687199128888-ae7cbdfd6098?auto=format&fit=crop&w=900&q=85',
  },
  {
    id: 'tomate-da-horta',
    name: 'Tomate da horta',
    category: 'Horta',
    price: 'R$ 7,00',
    unit: 'kg',
    producer: 'Seu Antônio · Fazenda Nova',
    site: 'Fazenda Nova',
    image:
      'https://images.unsplash.com/photo-1786975483902-407e43db0a81?auto=format&fit=crop&w=900&q=85',
  },
  {
    id: 'banana-prata',
    name: 'Banana prata',
    category: 'Frutas',
    price: 'R$ 6,50',
    unit: 'dúzia',
    producer: 'Família Oliveira · Sítio Lagoa',
    site: 'Sítio Lagoa',
    image:
      'https://images.unsplash.com/photo-1683511997653-6be0fc990ec9?auto=format&fit=crop&w=900&q=85',
  },
  {
    id: 'ovos-caipiras',
    name: 'Ovos caipiras',
    category: 'Do Sítio',
    price: 'R$ 18,00',
    unit: 'dúzia',
    producer: 'Dona Joana · Sítio São José',
    site: 'Sítio São José',
    image:
      'https://images.unsplash.com/photo-1559738928-5d5dc5c2458d?auto=format&fit=crop&w=900&q=85',
  },
  {
    id: 'feijao-verde',
    name: 'Feijão verde',
    category: 'Grãos',
    price: 'R$ 10,00',
    unit: 'kg',
    producer: 'Seu Pedro · Sítio Riacho',
    site: 'Sítio Riacho',
    image:
      'https://images.unsplash.com/photo-1613728913293-c99bb00ef39c?auto=format&fit=crop&w=900&q=85',
  },
  {
    id: 'milho-em-grao',
    name: 'Milho em grão',
    category: 'Animais',
    price: 'R$ 5,50',
    unit: 'kg',
    producer: 'Agropecuária Sertaneja',
    site: 'Agropecuária Sertaneja',
    image:
      'https://images.unsplash.com/photo-1618317780188-1a7c41721f4a?auto=format&fit=crop&w=900&q=85',
  },
];

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function hashPassword(password, salt) {
  return scryptSync(password, salt, 64).toString('hex');
}

function readCookies(request) {
  return Object.fromEntries(
    (request.headers.cookie ?? '')
      .split(';')
      .map((part) => part.trim().split('='))
      .filter(([name, value]) => name && value)
      .map(([name, ...value]) => [name, value.join('=')]),
  );
}

function publicProducer(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    site: row.site,
    city: row.city,
    location: row.location,
    reference: row.reference,
  };
}

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  if (!request.headers['content-type']?.startsWith('application/json')) {
    throw new HttpError(415, 'Envie os dados no formato JSON.');
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 2 * 1024 * 1024) {
      throw new HttpError(413, 'O envio ultrapassou o tamanho permitido.');
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'Os dados enviados não são válidos.');
  }
}

function validateProducer(data) {
  const required = ['name', 'phone', 'city', 'location', 'email', 'password'];
  if (
    !data ||
    typeof data !== 'object' ||
    required.some((field) => typeof data[field] !== 'string' || !data[field].trim())
  ) {
    throw new HttpError(400, 'Preencha todos os campos obrigatórios.');
  }

  const producer = {
    name: data.name.trim(),
    phone: data.phone.trim(),
    site: typeof data.site === 'string' ? data.site.trim() : '',
    city: data.city.trim(),
    location: data.location.trim(),
    reference: typeof data.reference === 'string' ? data.reference.trim() : '',
    email: data.email.trim().toLowerCase(),
    password: data.password,
  };
  if (
    producer.name.length > 80 ||
    producer.phone.length > 20 ||
    producer.site.length > 80 ||
    producer.city.length > 80 ||
    producer.location.length > 160 ||
    producer.reference.length > 120 ||
    producer.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(producer.email) ||
    producer.password.length < 8 ||
    producer.password.length > 128 ||
    producer.phone.replace(/\D/g, '').length < 10
  ) {
    throw new HttpError(400, 'Confira os dados informados e tente novamente.');
  }
  return producer;
}

function createDatabase(dbPath) {
  mkdirSync(dirname(dbPath), { recursive: true });
  const database = new DatabaseSync(dbPath);
  database.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS producers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      phone TEXT NOT NULL,
      site TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL,
      location TEXT NOT NULL,
      reference TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      producer_id TEXT NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      producer_id TEXT NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  return database;
}

export function createAppServer({
  dbPath = join(directory, 'data', 'semeiaki.sqlite'),
  frontendOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:4200',
  port = Number(process.env.API_PORT ?? 3000),
} = {}) {
  const database = createDatabase(dbPath);

  const findProducer = database.prepare('SELECT * FROM producers WHERE id = ?');
  const findProducerByEmail = database.prepare('SELECT * FROM producers WHERE email = ?');
  const createSession = database.prepare(
    'INSERT INTO sessions (token_hash, producer_id, expires_at) VALUES (?, ?, ?)',
  );

  function startSession(response, producerId, remember = true) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = Date.now() + sessionLifetime;
    database.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
    createSession.run(hashToken(token), producerId, expiresAt);
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    const maxAge = remember ? `; Max-Age=${sessionLifetime / 1000}` : '';
    response.setHeader(
      'Set-Cookie',
      `${sessionCookie}=${token}; HttpOnly; Path=/; SameSite=Lax${maxAge}${secure}`,
    );
  }

  function getProducerFromRequest(request) {
    const token = readCookies(request)[sessionCookie];
    if (!token) {
      return null;
    }
    const session = database
      .prepare('SELECT producer_id FROM sessions WHERE token_hash = ? AND expires_at > ?')
      .get(hashToken(token), Date.now());
    if (!session) {
      return null;
    }
    const producer = findProducer.get(session.producer_id);
    return producer ? publicProducer(producer) : null;
  }

  function listProducts() {
    const savedProducts = database
      .prepare(`
        SELECT products.*, producers.name AS producer_name, producers.phone,
          producers.site, producers.city, producers.location, producers.reference
        FROM products
        JOIN producers ON producers.id = products.producer_id
        ORDER BY products.created_at DESC
      `)
      .all()
      .map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        price: (product.price_cents / 100).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }),
        producer: `${product.producer_name} · ${product.site || product.city}`,
        site: product.site || product.city,
        phone: product.phone,
        city: product.city,
        location: product.reference
          ? `${product.location} · Referência: ${product.reference}`
          : product.location,
        description: product.description,
        image: product.image,
      }));
    return [...sampleProducts, ...savedProducts];
  }

  async function handle(request, response) {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'no-store');
    const origin = request.headers.origin;
    if (origin && origin !== frontendOrigin) {
      sendJson(response, 403, { message: 'Origem da solicitação não autorizada.' });
      return;
    }
    if (origin) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Access-Control-Allow-Credentials', 'true');
      response.setHeader('Vary', 'Origin');
    }
    if (request.method === 'OPTIONS') {
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      response.writeHead(204);
      response.end();
      return;
    }

    const { pathname } = new URL(request.url, `http://localhost:${port}`);
    if (request.method === 'GET' && pathname === '/api/products') {
      sendJson(response, 200, listProducts());
      return;
    }
    if (request.method === 'GET' && pathname === '/api/auth/session') {
      const producer = getProducerFromRequest(request);
      sendJson(response, 200, { user: producer });
      return;
    }
    if (request.method === 'POST' && pathname === '/api/auth/register') {
      const producer = validateProducer(await readJson(request));
      const salt = randomBytes(16).toString('hex');
      const id = randomBytes(16).toString('hex');
      try {
        database
          .prepare(`
            INSERT INTO producers
              (id, name, email, password_salt, password_hash, phone, site, city, location, reference)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .run(
            id,
            producer.name,
            producer.email,
            salt,
            hashPassword(producer.password, salt),
            producer.phone,
            producer.site,
            producer.city,
            producer.location,
            producer.reference,
          );
      } catch (error) {
        if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
          throw new HttpError(409, 'Este e-mail já tem uma conta. Entre ou use outro e-mail.');
        }
        throw error;
      }
      startSession(response, id);
      sendJson(response, 201, { user: publicProducer(findProducer.get(id)) });
      return;
    }
    if (request.method === 'POST' && pathname === '/api/auth/login') {
      const data = await readJson(request);
      if (
        !data ||
        typeof data.email !== 'string' ||
        typeof data.password !== 'string' ||
        data.email.length > 254 ||
        data.password.length > 128
      ) {
        throw new HttpError(400, 'Informe e-mail e senha.');
      }
      const producer = findProducerByEmail.get(data.email.trim().toLowerCase());
      const suppliedHash = hashPassword(data.password, producer?.password_salt ?? '0'.repeat(32));
      const expectedHash = producer?.password_hash ?? dummyPasswordHash;
      const matches =
        timingSafeEqual(Buffer.from(expectedHash, 'hex'), Buffer.from(suppliedHash, 'hex')) &&
        Boolean(producer);
      if (!matches) {
        throw new HttpError(401, 'E-mail ou senha incorretos.');
      }
      startSession(response, producer.id, data.remember === true);
      sendJson(response, 200, { user: publicProducer(producer) });
      return;
    }
    if (request.method === 'POST' && pathname === '/api/auth/logout') {
      const token = readCookies(request)[sessionCookie];
      if (token) {
        database.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
      }
      const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
      response.setHeader(
        'Set-Cookie',
        `${sessionCookie}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`,
      );
      response.writeHead(204);
      response.end();
      return;
    }
    if (request.method === 'POST' && pathname === '/api/products') {
      const producer = getProducerFromRequest(request);
      if (!producer) {
        throw new HttpError(401, 'Entre na sua conta para anunciar um produto.');
      }
      const data = await readJson(request);
      if (
        !data ||
        typeof data.name !== 'string' ||
        !data.name.trim() ||
        data.name.length > 100 ||
        !allowedCategories.has(data.category) ||
        typeof data.price !== 'number' ||
        !Number.isFinite(data.price) ||
        data.price <= 0 ||
        data.price > 1_000_000 ||
        (typeof data.description !== 'string' || data.description.length > 300) ||
        typeof data.image !== 'string' ||
        data.image.length > 1_500_000 ||
        (data.image !== '' && !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(data.image))
      ) {
        throw new HttpError(400, 'Confira os dados do produto e tente novamente.');
      }
      const id = randomBytes(16).toString('hex');
      database
        .prepare(`
          INSERT INTO products (id, producer_id, name, category, price_cents, description, image)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          id,
          producer.id,
          data.name.trim(),
          data.category,
          Math.round(data.price * 100),
          data.description.trim(),
          data.image,
        );
      const product = listProducts().find((item) => item.id === id);
      sendJson(response, 201, { product });
      return;
    }

    sendJson(response, 404, { message: 'Rota não encontrada.' });
  }

  const server = createServer((request, response) => {
    void handle(request, response).catch((error) => {
      if (error instanceof HttpError) {
        sendJson(response, error.status, { message: error.message });
        return;
      }
      console.error('Erro ao processar solicitação da API:', error);
      if (!response.headersSent) {
        sendJson(response, 500, { message: 'Não foi possível concluir a solicitação.' });
      } else {
        response.destroy();
      }
    });
  });
  server.on('close', () => database.close());
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.API_PORT ?? 3000);
  createAppServer({ port }).listen(port, () => {
    console.log(`API do SemeiAki disponível em http://localhost:${port}`);
  });
}
