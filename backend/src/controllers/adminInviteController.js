const crypto = require('crypto');
const AdminInvite = require('../models/AdminInvite');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { sendEmail } = require('../services/emailService');

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function logAction(req, action, details) {
  try {
    await AuditLog.create({
      userId: req.user?.id,
      action,
      details,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  } catch {
    // ignore
  }
}

// Admin (superadmin) creates invites
const listInvites = async (req, res) => {
  const invites = await AdminInvite.find().sort({ createdAt: -1 }).limit(200);
  res.json({ data: invites });
};

const createInvite = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const note = String(req.body.note || '').trim();
  const isSuperAdmin = Boolean(req.body.isSuperAdmin);
  const permissions = Array.isArray(req.body.permissions) ? req.body.permissions.map(String) : undefined;
  const expiresInMinutes = Math.max(15, Math.min(24 * 60, Number(req.body.expiresInMinutes || 60)));

  if (!email) return res.status(400).json({ message: 'Email is required' });

  const token = randomToken();
  const tokenHash = sha256(token);

  const invite = await AdminInvite.create({
    email,
    tokenHash,
    expiresAt: new Date(Date.now() + expiresInMinutes * 60 * 1000),
    createdBy: req.user.id,
    isSuperAdmin,
    permissions,
    note,
  });

  await logAction(req, 'ADMIN_INVITE_CREATED', { inviteId: invite._id, email, expiresInMinutes, isSuperAdmin });

  const base = process.env.FRONTEND_URL || 'http://localhost:5173';
  const url = `${base}/admin/invite?token=${token}`;

  await sendEmail({
    to: email,
    subject: 'You have been invited as an admin',
    text: `You have been invited to Beam Affiliate Platform Admin.\n\nOpen this link to set your password (expires in ${expiresInMinutes} minutes):\n${url}\n`,
    html: `<p>You have been invited to <strong>Beam Affiliate Platform Admin</strong>.</p>
<p>Open this link to set your password (expires in ${expiresInMinutes} minutes):</p>
<p><a href="${url}">${url}</a></p>`,
  });

  res.status(201).json({
    data: {
      invite,
      inviteUrl: url, // return for dev/testing; remove later if desired
    },
  });
};

const revokeInvite = async (req, res) => {
  const { id } = req.params;
  const invite = await AdminInvite.findByIdAndDelete(id);
  if (!invite) return res.status(404).json({ message: 'Invite not found' });
  await logAction(req, 'ADMIN_INVITE_REVOKED', { inviteId: id, email: invite.email });
  res.json({ message: 'Revoked' });
};

// Public acceptance endpoint (token + password)
const acceptInvite = async (req, res) => {
  const token = String(req.body.token || '').trim();
  const password = String(req.body.password || '');
  const name = String(req.body.name || 'Admin').trim();

  if (!token) return res.status(400).json({ message: 'Token is required' });
  if (!password || password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

  const tokenHash = sha256(token);
  const invite = await AdminInvite.findOne({ tokenHash });
  if (!invite) return res.status(400).json({ message: 'Invalid or expired invite' });
  if (invite.usedAt) return res.status(400).json({ message: 'Invite already used' });
  if (invite.expiresAt.getTime() < Date.now()) return res.status(400).json({ message: 'Invite expired' });

  // Create or update user
  let user = await User.findOne({ email: invite.email }).select('+password');
  if (!user) {
    user = new User({
      name,
      email: invite.email,
      password,
      role: 'admin',
      isVerified: true,
      isActive: true,
      isSuperAdmin: invite.isSuperAdmin,
      permissions: invite.permissions,
    });
  } else {
    user.name = user.name || name;
    user.password = password;
    user.role = 'admin';
    user.isVerified = true;
    user.isActive = true;
    user.isSuperAdmin = Boolean(invite.isSuperAdmin);
    if (invite.permissions?.length) user.permissions = invite.permissions;
    user.resellerId = undefined;
  }

  await user.save();

  invite.usedAt = new Date();
  await invite.save();

  // Create audit log without req.user
  try {
    await AuditLog.create({
      userId: user._id,
      action: 'ADMIN_INVITE_ACCEPTED',
      details: { inviteId: invite._id, email: invite.email },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  } catch {}

  res.json({ message: 'Account created. You can now login.' });
};

module.exports = {
  listInvites,
  createInvite,
  revokeInvite,
  acceptInvite,
};

