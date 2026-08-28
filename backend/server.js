const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const VaultItem = require('./models/VaultItem');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

app.use(cors());
app.use(express.json({ limit: '1mb' }));

function signSession(user) {
  return jwt.sign({ sub: user._id.toString(), email: user.email }, JWT_SECRET, {
    expiresIn: '30d',
  });
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Missing bearer token.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.auth = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

function publicProfile(user) {
  return {
    userId: user._id.toString(),
    email: user.email,
    vaultSalt: user.vaultSalt,
    vaultCheck: user.vaultCheck,
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, vaultSalt, vaultCheck } = req.body || {};

    if (!email || !password || !vaultSalt || !vaultCheck) {
      return res.status(400).json({ message: 'Missing registration fields.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'An account already exists for this email.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      vaultSalt,
      vaultCheck,
    });

    const session = {
      token: signSession(user),
      userId: user._id.toString(),
      email: user.email,
    };

    return res.json({
      session,
      profile: publicProfile(user),
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('register failed', error);
    return res.status(500).json({ message: 'Unable to register user.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    console.log(email,password,"from the server.js");
    if (!email || !password) {
      return res.status(400).json({ message: 'Missing login fields.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    console.log(user,"checking user");
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    console.log(ok,"cehcking hash");
    if (!ok) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    return res.json({
      session: {
        token: signSession(user),
        userId: user._id.toString(),
        email: user.email,
      },
      profile: publicProfile(user),
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('login failed', error);
    return res.status(500).json({ message: 'Unable to log in.' });
  }
});

app.get('/api/vault', authRequired, async (req, res) => {
  try {
    const items = await VaultItem.find({ userId: req.auth.sub }).sort({ createdAt: -1 });
    return res.json({
      items: items.map((item) => ({
        id: item._id.toString(),
        localId: item.localId,
        encryptedPayload: item.encryptedPayload,
        syncedAt: item.syncedAt,
        updatedAt: item.updatedAt?.toISOString?.() || item.updatedAt,
      })),
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('fetch vault failed', error);
    return res.status(500).json({ message: 'Unable to fetch vault items.' });
  }
});

app.post('/api/vault', authRequired, async (req, res) => {
  try {
    const { localId, encryptedPayload, syncedAt } = req.body || {};

    if (!localId || !encryptedPayload) {
      return res.status(400).json({ message: 'Missing vault item fields.' });
    }

    const item = await VaultItem.findOneAndUpdate(
      { userId: req.auth.sub, localId },
      {
        userId: req.auth.sub,
        localId,
        encryptedPayload,
        syncedAt,
      },
      { upsert: true, new: true },
    );

    return res.json({
      item: {
        id: item._id.toString(),
        encryptedPayload: item.encryptedPayload,
        syncedAt: item.syncedAt,
        updatedAt: item.updatedAt?.toISOString?.() || item.updatedAt,
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('sync item failed', error);
    return res.status(500).json({ message: 'Unable to sync vault item.' });
  }
});

app.delete('/api/vault/:remoteId', authRequired, async (req, res) => {
  try {
    const { remoteId } = req.params || {};

    if (!remoteId) {
      return res.status(400).json({ message: 'Missing remoteId.' });
    }

    const result = await VaultItem.deleteOne({
      userId: req.auth.sub,
      _id: remoteId,
    });

    return res.json({
      ok: true,
      deletedCount: result.deletedCount || 0,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('delete item failed', error);
    return res.status(500).json({ message: 'Unable to delete vault item.' });
  }
});

app.post('/api/vault/bulk-sync', authRequired, async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];

    const savedItems = [];

    for (const payload of items) {
      if (!payload?.localId || !payload?.encryptedPayload) {
        continue;
      }

      const item = await VaultItem.findOneAndUpdate(
        { userId: req.auth.sub, localId: payload.localId },
        {
          userId: req.auth.sub,
          localId: payload.localId,
          encryptedPayload: payload.encryptedPayload,
          syncedAt: payload.syncedAt,
        },
        { upsert: true, new: true },
      );

      savedItems.push({
        id: item._id.toString(),
        encryptedPayload: item.encryptedPayload,
        syncedAt: item.syncedAt,
        updatedAt: item.updatedAt?.toISOString?.() || item.updatedAt,
      });
    }

    return res.json({ items: savedItems });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('bulk sync failed', error);
    return res.status(500).json({ message: 'Unable to sync vault items.' });
  }
});



mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log(' Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(` Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error(' MongoDB connection failed:', err.message);
  });
