const cron = require('node-cron');
const Campaign = require('../models/Campaign');
const Segment = require('../models/Segment');
const User = require('../models/User');
const config = require('../config');

// Mock Email Sender
const sendEmail = async (campaign, recipient) => {
  // Integrate with SES / SendGrid here
  console.log(`[Email Mock] Sending '${campaign.subject}' to ${recipient.email}`);
  return true;
};

function buildSegmentQuery(segment) {
  const f = segment?.filters || {};
  const q = {};
  if (Array.isArray(f.roles) && f.roles.length) q.role = { $in: f.roles };
  if (typeof f.isActive === 'boolean') q.isActive = f.isActive;
  if (f.createdAfter || f.createdBefore) {
    q.createdAt = {};
    if (f.createdAfter) q.createdAt.$gte = new Date(f.createdAfter);
    if (f.createdBefore) q.createdAt.$lte = new Date(f.createdBefore);
  }
  if (Array.isArray(f.resellerIds) && f.resellerIds.length) q.resellerId = { $in: f.resellerIds };
  if (Array.isArray(f.emails) && f.emails.length) q.email = { $in: f.emails };
  return q;
}

async function resolveRecipients(campaign) {
  if (Array.isArray(campaign.recipients) && campaign.recipients.length) {
    return campaign.recipients.map((email) => ({ email }));
  }
  if (campaign.segmentId) {
    const segment = await Segment.findById(campaign.segmentId).lean();
    if (!segment || segment.status !== 'active') return [];
    const q = buildSegmentQuery(segment);
    const users = await User.find(q).select('email').limit(50000).lean();
    return users.map((u) => ({ email: u.email }));
  }
  return [];
}

const initScheduler = () => {
  console.log('Scheduler initialized...');

  // Check for scheduled campaigns every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      // Find campaigns scheduled for now or past that are still 'Scheduled'
      const campaigns = await Campaign.find({
        status: 'Scheduled',
        scheduledAt: { $lte: now }
      });

      for (const campaign of campaigns) {
        console.log(`Processing campaign: ${campaign.name}`);
        campaign.status = 'Sending';
        await campaign.save();

        const recipients = await resolveRecipients(campaign);
        campaign.recipientsCount = recipients.length;
        await campaign.save();
        
        for (const recipient of recipients) {
          try {
            await sendEmail(campaign, recipient);
            campaign.stats.sent += 1;
            campaign.stats.delivered += 1;
          } catch {
            campaign.stats.bounced += 1;
          }
        }

        campaign.status = 'Sent';
        campaign.sentAt = new Date();
        await campaign.save();
        console.log(`Campaign ${campaign.name} sent.`);
      }

    } catch (error) {
      console.error('Scheduler Error:', error);
    }
  });
};

module.exports = { initScheduler };
