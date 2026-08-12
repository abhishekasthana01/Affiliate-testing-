/**
 * Beam Wallet Payment Service
 * Integrates with the Beam Wallet API for instant affiliate payouts.
 * 
 * Environment variables required:
 * - BEAM_WALLET_API_URL: Base URL for the Beam Wallet API
 * - BEAM_WALLET_API_KEY: API key for authentication
 * - BEAM_WALLET_MERCHANT_ID: Merchant account ID for payouts
 */

export interface BeamPayoutRequest {
  recipientEmail?: string;
  recipientPhone?: string;
  recipientBeamId?: string;
  amountCents: number;
  currency: string;
  reference: string;
  description: string;
  metadata?: Record<string, string>;
}

export interface BeamPayoutResponse {
  success: boolean;
  transactionId: string;
  status: 'completed' | 'pending' | 'failed';
  amountCents: number;
  currency: string;
  recipientId: string;
  processedAt: string;
  error?: string;
}

export interface BeamBalanceResponse {
  success: boolean;
  balanceCents: number;
  currency: string;
  merchantId: string;
}

class BeamWalletService {
  private baseUrl: string;
  private apiKey: string;
  private merchantId: string;

  constructor() {
    this.baseUrl = process.env.BEAM_WALLET_API_URL || 'https://api.beamwallet.com/v1';
    this.apiKey = process.env.BEAM_WALLET_API_KEY || '';
    this.merchantId = process.env.BEAM_WALLET_MERCHANT_ID || '';
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Merchant-ID': this.merchantId,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new BeamWalletError(
        data.error || `Beam API error: ${response.status}`,
        response.status,
        data
      );
    }

    return data as T;
  }

  /**
   * Check if the Beam Wallet service is configured and ready
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.merchantId);
  }

  /**
   * Get the merchant's current wallet balance
   */
  async getBalance(): Promise<BeamBalanceResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        balanceCents: 0,
        currency: 'EUR',
        merchantId: '',
      };
    }

    return this.request<BeamBalanceResponse>('/merchants/balance');
  }

  /**
   * Send an instant payout to an affiliate via Beam Wallet
   */
  async sendPayout(request: BeamPayoutRequest): Promise<BeamPayoutResponse> {
    if (!this.isConfigured()) {
      throw new BeamWalletError('Beam Wallet is not configured', 500);
    }

    // Validate at least one recipient identifier
    if (!request.recipientEmail && !request.recipientPhone && !request.recipientBeamId) {
      throw new BeamWalletError('At least one recipient identifier is required', 400);
    }

    if (request.amountCents <= 0) {
      throw new BeamWalletError('Amount must be greater than zero', 400);
    }

    const payload = {
      merchant_id: this.merchantId,
      recipient: {
        email: request.recipientEmail || undefined,
        phone: request.recipientPhone || undefined,
        beam_id: request.recipientBeamId || undefined,
      },
      amount: {
        cents: request.amountCents,
        currency: request.currency || 'EUR',
      },
      reference: request.reference,
      description: request.description,
      metadata: request.metadata || {},
      idempotency_key: `payout-${request.reference}-${Date.now()}`,
    };

    return this.request<BeamPayoutResponse>('/payouts/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Check the status of a previously initiated payout
   */
  async getPayoutStatus(transactionId: string): Promise<BeamPayoutResponse> {
    return this.request<BeamPayoutResponse>(`/payouts/${transactionId}`);
  }

  /**
   * Verify a customer payment received via Beam Wallet
   */
  async verifyPayment(paymentReference: string): Promise<{
    success: boolean;
    verified: boolean;
    amountCents: number;
    currency: string;
    paidAt: string | null;
    payerEmail: string | null;
  }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        verified: false,
        amountCents: 0,
        currency: 'EUR',
        paidAt: null,
        payerEmail: null,
      };
    }

    return this.request(`/payments/verify/${paymentReference}`);
  }
}

/**
 * Custom error class for Beam Wallet errors
 */
export class BeamWalletError extends Error {
  status: number;
  data?: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'BeamWalletError';
    this.status = status;
    this.data = data;
  }
}

// Singleton instance
export const beamWallet = new BeamWalletService();
