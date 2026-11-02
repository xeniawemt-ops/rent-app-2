import { Request, Response } from 'express';
import crypto from 'crypto';
import { ENV } from '../config/env';
import { db } from '../db/database';

export class RazorpayWebhookHandler {
  public static async handleWebhook(req: Request, res: Response) {
    try {
      const signature = req.headers['x-razorpay-signature'] as string;
      const webhookSecret = ENV.RAZORPAY.WEBHOOK_SECRET;

      if (!webhookSecret) {
        return res.status(503).json({ error: 'Webhook secret is not configured on this server.' });
      }

      if (!signature) {
        return res.status(400).json({ error: 'Missing x-razorpay-signature header' });
      }

      const bodyStr = JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(bodyStr)
        .digest('hex');

      if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))) {
        await db.logAudit({
          action: 'WEBHOOK_SIGNATURE_MISMATCH',
          category: 'SECURITY',
          details: 'Rejected webhook request with invalid HMAC signature',
          ipAddress: req.ip,
        });
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }

      const event = req.body;
      await db.logAudit({
        action: 'WEBHOOK_RECEIVED',
        category: 'WEBHOOKS',
        details: `Received Razorpay webhook event: ${event?.event || 'unknown'}`,
        ipAddress: req.ip,
      });

      return res.json({ status: 'ok', received: true });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
}
