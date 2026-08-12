import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  const hashedPassword = await bcrypt.hash('AdminTest123!', 12);
  const resellerPassword = await bcrypt.hash('Reseller123!', 12);
  const customerPassword = await bcrypt.hash('Customer123!', 12);

  // 1. Admin Account
  console.log('Seeding admin...');
  await prisma.user.upsert({
    where: { email: 'admin@beamwallet.com' },
    update: {
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: 'admin@beamwallet.com',
      name: 'Admin User',
      password: hashedPassword,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  // 2. Partner Groups for different commission rates
  console.log('Seeding partner groups...');
  const standardGroup = await prisma.partnerGroup.upsert({
    where: { id: 'group-standard' },
    update: { commissionRate: 15 },
    create: {
      id: 'group-standard',
      name: 'Standard Resellers',
      commissionRate: 15,
      isDefault: true,
    },
  });

  const highGroup = await prisma.partnerGroup.upsert({
    where: { id: 'group-high' },
    update: { commissionRate: 25 },
    create: {
      id: 'group-high',
      name: 'High Commission Resellers',
      commissionRate: 25,
      isDefault: false,
    },
  });

  // 3. Reseller Accounts
  console.log('Seeding resellers...');
  const resellers = [
    { email: 'reseller1@test.com', reseller_id: 'RES001', groupId: standardGroup.id },
    { email: 'reseller2@test.com', reseller_id: 'RES002', groupId: highGroup.id },
  ];

  for (const r of resellers) {
    const user = await prisma.user.upsert({
      where: { email: r.email },
      update: {
        role: Role.AFFILIATE,
        status: UserStatus.ACTIVE,
      },
      create: {
        email: r.email,
        name: `Reseller ${r.reseller_id}`,
        password: resellerPassword,
        role: Role.AFFILIATE,
        status: UserStatus.ACTIVE,
      },
    });

    await prisma.affiliate.upsert({
      where: { userId: user.id },
      update: {
        resellerId: r.reseller_id,
        partnerGroupId: r.groupId,
      },
      create: {
        userId: user.id,
        resellerId: r.reseller_id,
        referralCode: `REF-${r.reseller_id}`,
        balanceCents: 0,
        partnerGroupId: r.groupId,
      },
    });
  }

  // 4. Customer Accounts
  console.log('Seeding customers...');
  const customers = [
    { email: 'customer1@test.com', beam_number: '+1234567890' },
    { email: 'customer2@test.com', beam_number: '+0987654321' },
  ];

  for (const c of customers) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: {
        name: `Customer ${c.email.split('@')[0]}`,
        beamNumber: c.beam_number,
        status: UserStatus.ACTIVE,
        role: Role.AFFILIATE,
      },
      create: {
        email: c.email,
        name: `Customer ${c.email.split('@')[0]}`,
        password: customerPassword,
        role: Role.AFFILIATE,
        status: UserStatus.ACTIVE,
        beamNumber: c.beam_number,
      },
    });

    // Also create affiliate profile for customers so they can log in to test
    const { generateResellerId } = await import('@/lib/reseller-id');
    const resellerId = await generateResellerId();

    await prisma.affiliate.upsert({
      where: { userId: user.id },
      update: {
        resellerId: resellerId,
      },
      create: {
        userId: user.id,
        resellerId: resellerId,
        referralCode: `CUST-${user.id.slice(-4)}`,
        balanceCents: 0,
        partnerGroupId: standardGroup.id,
      },
    });
  }

  // 5. Products
  console.log('Seeding products...');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const businessCategory = 'Beam Wallet For Business';

  const products = [
    {
      id: 'PROD001',
      name: 'Beam Wallet NFC',
      slug: 'beam-wallet-nfc',
      description:
        'The Beam Wallet NFC Sticker is a compact and innovative payment solution that allows businesses to accept approach payments with ease. This discreet adhesive adheres to surfaces such as counters, accessories or displays, enabling fast and secure transactions with a simple touch from the customer\'s mobile device. Ideal for modern and dynamic environments, it offers a practical, low-cost option to enhance payment experiences quickly and conveniently.',
      priceCents: 7500,
      currency: 'EUR',
      category: businessCategory,
      sortOrder: 1,
      imageUrl: '/images/Beam_Wallet_NFC_1.jpg',
      metadata: {
        namePt: 'Beam Wallet NFC - Carteira Beam',
        images: ['/images/Beam_Wallet_NFC_1.jpg', '/images/Beam_Wallet_NFC_2.jpg'],
      },
    },
    {
      id: 'PROD002',
      name: 'Bluetooth Terminal for Physical Stores',
      slug: 'bluetooth-terminal-physical-stores',
      description:
        'The Beam Bluetooth Terminal is an advanced and portable payment device that allows businesses to accept wireless and distance BEAM payments. This lightweight and stylish terminal easily connects to your smartphone or tablet via Bluetooth, enabling secure, contactless transactions on the go. Ideal for dynamic retail environments, restaurants or service providers, the Bluetooth Beam Terminal offers unparalleled convenience, empowering businesses to process payments anytime, anywhere, quickly and easily.',
      priceCents: 17500,
      currency: 'EUR',
      category: businessCategory,
      sortOrder: 2,
      imageUrl: '/images/Bluetooth_terminal_for_physical_stores_1.jpg',
      metadata: {
        namePt: 'Terminal Bluetooth para lojas físicas - Carteira Beam',
        images: [
          '/images/Bluetooth_terminal_for_physical_stores_1.jpg',
          '/images/Bluetooth_terminal_for_physical_stores_2.jpg',
          '/images/Bluetooth_terminal_for_physical_stores_3.jpg',
        ],
      },
    },
    {
      id: 'PROD003',
      name: 'Beam Wallet for Online Stores',
      slug: 'beam-wallet-for-online-stores',
      description:
        'Beam Wallet for Online Stores is an advanced payment solution that empowers e-commerce businesses to accept BEAM cryptocurrency with speed, security, and global reach. Fully compatible with leading platforms such as WooCommerce, PrestaShop, and others, this integration enables online stores to offer customers a modern, frictionless checkout experience powered by blockchain technology. Customers can complete purchases using BEAM in just a few clicks — with no delays, no borders, and no complexity. But Beam Wallet goes beyond payments: it includes instant cashback rewards with every transaction, turning each purchase into a loyalty opportunity. This feature not only increases customer satisfaction but also drives repeat purchases and helps attract new clients to your store. Whether you\'re looking to reduce payment fees, modernize your store, or offer a unique incentive to your customers, Beam Wallet is the future-ready solution your online business needs.',
      priceCents: 7500,
      currency: 'EUR',
      category: businessCategory,
      sortOrder: 3,
      imageUrl: '/images/Beam_Wallet_for_Online_Stores_1.jpg',
      metadata: {
        namePt: 'Beam Wallet for Online Stores - Carteira Beam',
        images: [
          '/images/Beam_Wallet_for_Online_Stores_1.jpg',
          '/images/Beam_Wallet_for_Online_Stores_2.png',
          '/images/Beam_Wallet_for_Online_Stores_3.png',
        ],
      },
    },
    {
      id: 'PROD004',
      name: 'Quality and Confidence Certificate',
      slug: 'quality-and-confidence-certificate',
      description:
        'Issued by Beam Wallet. This certificate recognizes the bearer\'s excellence and commitment to the highest standards of ethics, transparency and quality in the marketplace. Awarded exclusively to businesses and merchants who fully utilize the Beam Wallet platform, this seal of trust highlights those who have achieved: Flawless Transaction History (over 1,000 successfully completed transactions with no claims), Legal Compliance, Positive Feedback, and Complete Use of the Platform (CRM, campaigns, and data analytics). By displaying this certificate, the bearer demonstrates that it is a reliable reference, promoting safe, efficient and satisfactory shopping experiences. Beam Wallet recognizes this milestone as a symbol of credibility, increasing consumer confidence and strengthening the relationship between merchants and customers.',
      priceCents: 2500,
      currency: 'USD',
      category: businessCategory,
      sortOrder: 4,
      imageUrl: '/images/Quality_and_Confidence_Certificate_1.jpg',
      metadata: {
        namePt: 'Certificado de Qualidade e Confiança - Carteira Beam',
        images: [
          '/images/Quality_and_Confidence_Certificate_1.jpg',
          '/images/Quality_and_Confidence_Certificate_2.jpg',
        ],
      },
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        url: `${appUrl}/checkout?product=${p.slug}`,
        priceCents: p.priceCents,
        currency: p.currency,
        category: p.category,
        imageUrl: p.imageUrl,
        metadata: p.metadata,
        sortOrder: p.sortOrder,
        isActive: true,
      },
      create: {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        url: `${appUrl}/checkout?product=${p.slug}`,
        priceCents: p.priceCents,
        currency: p.currency,
        category: p.category,
        imageUrl: p.imageUrl,
        metadata: p.metadata,
        sortOrder: p.sortOrder,
        isActive: true,
      },
    });
  }

  // 6. Commission Rules (Scenarios)
  console.log('Seeding commission rules...');
  await prisma.commissionRule.upsert({
    where: { id: 'rule-standard' },
    update: { value: 15 },
    create: {
      id: 'rule-standard',
      name: 'Standard Commission',
      type: 'PERCENTAGE',
      value: 15,
      isDefault: true,
      isActive: true,
    },
  });

  await prisma.commissionRule.upsert({
    where: { id: 'rule-high' },
    update: { value: 25 },
    create: {
      id: 'rule-high',
      name: 'High Commission',
      type: 'PERCENTAGE',
      value: 25,
      isDefault: false,
      isActive: true,
    },
  });

  // 7. Default Program Settings
  console.log('Seeding program settings...');
  await prisma.programSettings.upsert({
    where: { programId: 'beam-default' },
    update: {
      productName: 'Beam Wallet',
      programName: 'Beam Affiliate Program',
      currency: 'EUR',
    },
    create: {
      programId: 'beam-default',
      productName: 'Beam Wallet',
      programName: 'Beam Affiliate Program',
      websiteUrl: 'https://beamwallet.com',
      currency: 'EUR',
      portalSubdomain: 'affiliates',
      minimumPayoutThreshold: 100000, // 1000 EUR in cents
      payoutTerm: 'NET-30',
      commissionHoldDays: 30,
    },
  });

  // 8. Historical Analytics Data (for Charts)
  console.log('Seeding historical analytics data...');
  const firstReseller = await prisma.affiliate.findFirst({ where: { resellerId: 'RES001' } });
  
  if (firstReseller) {
    // Generate data for the last 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Create a few referrals for each day
      const referral = await prisma.referral.create({
        data: {
          affiliateId: firstReseller.id,
          leadName: `Past Lead ${i}`,
          leadEmail: `past${i}@example.com`,
          status: 'APPROVED',
          createdAt: date,
          metadata: { clicks: Math.floor(Math.random() * 50) + 10 }
        }
      });

      // Create a conversion
      const conversion = await prisma.conversion.create({
        data: {
          affiliateId: firstReseller.id,
          referralId: referral.id,
          eventType: 'PURCHASE',
          amountCents: Math.floor(Math.random() * 10000) + 5000,
          status: 'APPROVED',
          createdAt: date,
        }
      });

      // Create a commission
      await prisma.commission.create({
        data: {
          affiliateId: firstReseller.id,
          conversionId: conversion.id,
          userId: firstReseller.userId,
          amountCents: Math.floor(Math.random() * 5000) + 1000, // €10 - €60
          status: 'APPROVED',
          rate: 15.0,
          createdAt: date
        }
      });
    }
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
