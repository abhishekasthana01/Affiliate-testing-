const ReferralLink = require('../models/ReferralLink');
const Coupon = require('../models/Coupon');

function randomCode(length = 8) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

async function generateUniqueCode(model, length = 8) {
  for (let i = 0; i < 10; i++) {
    const code = randomCode(length);
    const exists = await model.exists({ code });
    if (!exists) return code;
  }
  // fallback: longer code
  for (let i = 0; i < 10; i++) {
    const code = randomCode(12);
    const exists = await model.exists({ code });
    if (!exists) return code;
  }
  throw new Error('Failed to generate unique code');
}

const requireReseller = (req, res) => {
  if (!req.user?.resellerId) {
    res.status(400).json({ message: 'User is not a reseller' });
    return false;
  }
  return true;
};

// Referral links
const listReferralLinks = async (req, res) => {
  if (!requireReseller(req, res)) return;
  const links = await ReferralLink.find({ resellerId: req.user.resellerId }).sort({ createdAt: -1 });
  res.json({ data: links });
};

const createReferralLink = async (req, res) => {
  if (!requireReseller(req, res)) return;
  const { name, productId, campaignId, code } = req.body;
  const finalCode = (code || (await generateUniqueCode(ReferralLink))).trim();

  const link = await ReferralLink.create({
    code: finalCode,
    resellerId: req.user.resellerId,
    name: name || '',
    productId: productId || null,
    campaignId: campaignId || null,
    createdBy: req.user.id,
  });
  res.status(201).json({ data: link });
};

const updateReferralLink = async (req, res) => {
  if (!requireReseller(req, res)) return;
  const { id } = req.params;
  const link = await ReferralLink.findOne({ _id: id, resellerId: req.user.resellerId });
  if (!link) return res.status(404).json({ message: 'Referral link not found' });

  const { name, status, productId, campaignId, metadata } = req.body;
  if (name !== undefined) link.name = name;
  if (status !== undefined) link.status = status;
  if (productId !== undefined) link.productId = productId;
  if (campaignId !== undefined) link.campaignId = campaignId;
  if (metadata !== undefined) link.metadata = metadata;
  await link.save();

  res.json({ data: link });
};

const deleteReferralLink = async (req, res) => {
  if (!requireReseller(req, res)) return;
  const { id } = req.params;
  const link = await ReferralLink.findOneAndDelete({ _id: id, resellerId: req.user.resellerId });
  if (!link) return res.status(404).json({ message: 'Referral link not found' });
  res.json({ message: 'Deleted' });
};

// Coupons
const listCoupons = async (req, res) => {
  if (!requireReseller(req, res)) return;
  const coupons = await Coupon.find({ resellerId: req.user.resellerId }).sort({ createdAt: -1 });
  res.json({ data: coupons });
};

const createCoupon = async (req, res) => {
  if (!requireReseller(req, res)) return;
  const { name, code, discountType, discountValue, validFrom, validTo, maxRedemptions, productId, campaignId } = req.body;
  const finalCode = String(code || (await generateUniqueCode(Coupon))).trim().toUpperCase();

  const coupon = await Coupon.create({
    code: finalCode,
    resellerId: req.user.resellerId,
    name: name || '',
    discountType: discountType || 'percent',
    discountValue: discountValue ?? 0,
    validFrom: validFrom ? new Date(validFrom) : undefined,
    validTo: validTo ? new Date(validTo) : undefined,
    maxRedemptions: maxRedemptions ?? null,
    productId: productId || null,
    campaignId: campaignId || null,
    createdBy: req.user.id,
  });
  res.status(201).json({ data: coupon });
};

const updateCoupon = async (req, res) => {
  if (!requireReseller(req, res)) return;
  const { id } = req.params;
  const coupon = await Coupon.findOne({ _id: id, resellerId: req.user.resellerId });
  if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

  const { name, status, discountType, discountValue, validFrom, validTo, maxRedemptions, productId, campaignId } = req.body;
  if (name !== undefined) coupon.name = name;
  if (status !== undefined) coupon.status = status;
  if (discountType !== undefined) coupon.discountType = discountType;
  if (discountValue !== undefined) coupon.discountValue = discountValue;
  if (validFrom !== undefined) coupon.validFrom = validFrom ? new Date(validFrom) : undefined;
  if (validTo !== undefined) coupon.validTo = validTo ? new Date(validTo) : undefined;
  if (maxRedemptions !== undefined) coupon.maxRedemptions = maxRedemptions;
  if (productId !== undefined) coupon.productId = productId;
  if (campaignId !== undefined) coupon.campaignId = campaignId;
  await coupon.save();

  res.json({ data: coupon });
};

const deleteCoupon = async (req, res) => {
  if (!requireReseller(req, res)) return;
  const { id } = req.params;
  const coupon = await Coupon.findOneAndDelete({ _id: id, resellerId: req.user.resellerId });
  if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
  res.json({ message: 'Deleted' });
};

module.exports = {
  listReferralLinks,
  createReferralLink,
  updateReferralLink,
  deleteReferralLink,
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
};

