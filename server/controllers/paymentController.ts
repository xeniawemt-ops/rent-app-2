import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { PaymentManager } from '../services/paymentService';
import { db } from '../db/database';

const verifyPaymentSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  orderId: z.string().min(1, 'Order ID is required'),
  razorpayPaymentId: z.string().min(1, 'Razorpay Payment ID is required'),
  razorpaySignature: z.string().min(1, 'Razorpay Signature is required'),
});

export class PaymentController {
  public static async verifyPayment(req: AuthenticatedRequest, res: Response) {
    try {
      const data = verifyPaymentSchema.parse(req.body);
      const payment = await PaymentManager.verifyAndFinalizePayment(
        {
          orderId: data.orderId,
          paymentId: data.razorpayPaymentId,
          signature: data.razorpaySignature,
        },
        data.paymentId
      );

      return res.json({
        success: true,
        payment,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Payment verification failed' });
    }
  }

  public static async getPayments(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      // If admin, can view all payments or filter; customers/owners view payments where they are payer or payee
      const filterId = user.role === 'ADMIN' ? undefined : user.id;
      const payments = await db.getPayments(filterId);
      return res.json({ success: true, payments });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to retrieve payments' });
    }
  }
}
