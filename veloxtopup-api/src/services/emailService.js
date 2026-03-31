import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

/**
 * Professional Email Service for VeloxTopUp
 * Handles transactional emails with templates
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.init();
  }

  init() {
    // Check if email is configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.warn('Email service not configured - SMTP settings missing');
      return;
    }

    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      pool: true, // Use pooled connections for better performance
      maxConnections: 5,
    });

    this.isConfigured = true;
    logger.info('Email service initialized successfully');
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation({ email, orderRef, phone, network, plan, amount, createdAt }) {
    if (!this.isConfigured) {
      logger.warn('Cannot send email - service not configured');
      return false;
    }

    const html = this.getOrderConfirmationTemplate({
      orderRef, phone, network, plan, amount, createdAt
    });

    try {
      const result = await this.transporter.sendMail({
        from: `"${process.env.APP_NAME || 'VeloxTopUp'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: `Order Confirmation - ${orderRef}`,
        html,
        text: this.getPlainTextOrderConfirmation({ orderRef, phone, network, plan, amount }),
      });

      logger.info('Order confirmation email sent', { orderRef, email: result.messageId });
      return true;
    } catch (error) {
      logger.error('Failed to send order confirmation email', { error: error.message, orderRef });
      return false;
    }
  }

  /**
   * Send delivery success email
   */
  async sendDeliverySuccess({ email, orderRef, phone, network, plan, amount, deliveredAt }) {
    if (!this.isConfigured) return false;

    const html = this.getDeliverySuccessTemplate({
      orderRef, phone, network, plan, amount, deliveredAt
    });

    try {
      const result = await this.transporter.sendMail({
        from: `"${process.env.APP_NAME || 'VeloxTopUp'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: `Data Delivered Successfully - ${orderRef}`,
        html,
        text: `Your data bundle has been delivered! Order: ${orderRef}, Phone: ${phone}`,
      });

      logger.info('Delivery success email sent', { orderRef });
      return true;
    } catch (error) {
      logger.error('Failed to send delivery success email', { error: error.message, orderRef });
      return false;
    }
  }

  /**
   * Send delivery failure email
   */
  async sendDeliveryFailure({ email, orderRef, phone, network, plan, amount, reason, supportEmail, supportPhone }) {
    if (!this.isConfigured) return false;

    const html = this.getDeliveryFailureTemplate({
      orderRef, phone, network, plan, amount, reason, supportEmail, supportPhone
    });

    try {
      const result = await this.transporter.sendMail({
        from: `"${process.env.APP_NAME || 'VeloxTopUp'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: `Order Issue - ${orderRef}`,
        html,
        text: `We encountered an issue with your order ${orderRef}. Contact support for assistance.`,
      });

      logger.info('Delivery failure email sent', { orderRef });
      return true;
    } catch (error) {
      logger.error('Failed to send delivery failure email', { error: error.message, orderRef });
      return false;
    }
  }

  /**
   * Send payment receipt
   */
  async sendPaymentReceipt({ email, orderRef, amount, paymentMethod, paidAt, transactionId }) {
    if (!this.isConfigured) return false;

    const html = this.getPaymentReceiptTemplate({
      orderRef, amount, paymentMethod, paidAt, transactionId
    });

    try {
      const result = await this.transporter.sendMail({
        from: `"${process.env.APP_NAME || 'VeloxTopUp'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: `Payment Receipt - ${orderRef}`,
        html,
        text: `Payment received: GH₵${amount} for order ${orderRef}`,
      });

      logger.info('Payment receipt email sent', { orderRef });
      return true;
    } catch (error) {
      logger.error('Failed to send payment receipt', { error: error.message, orderRef });
      return false;
    }
  }

  // Email Templates
  getOrderConfirmationTemplate({ orderRef, phone, network, plan, amount, createdAt }) {
    const date = new Date(createdAt).toLocaleString('en-GH', { 
      timeZone: 'Africa/Accra',
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 30px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
          .content { padding: 30px; }
          .order-ref { background: #f1f5f9; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
          .order-ref .label { color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
          .order-ref .value { color: #0f172a; font-size: 20px; font-weight: bold; margin-top: 5px; }
          .details { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { color: #64748b; font-size: 14px; }
          .detail-value { color: #0f172a; font-size: 14px; font-weight: 500; }
          .amount { color: #059669; font-size: 18px; font-weight: bold; }
          .footer { background: #f8fafc; padding: 20px 30px; text-align: center; color: #64748b; font-size: 12px; }
          .button { display: inline-block; background: #0ea5e9; color: #ffffff; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 500; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmation</h1>
          </div>
          <div class="content">
            <p style="color: #334155; font-size: 16px; line-height: 1.6;">
              Thank you for your purchase! Your order has been received and is being processed.
            </p>
            
            <div class="order-ref">
              <div class="label">Order Reference</div>
              <div class="value">${orderRef}</div>
            </div>

            <div class="details">
              <div class="detail-row">
                <span class="detail-label">Phone Number</span>
                <span class="detail-value">${phone}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Network</span>
                <span class="detail-value">${network}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Bundle</span>
                <span class="detail-value">${plan}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Amount</span>
                <span class="detail-value amount">GH₵${amount.toFixed(2)}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Order Date</span>
                <span class="detail-value">${date}</span>
              </div>
            </div>

            <center>
              <a href="${process.env.FRONTEND_URL || 'https://veloxtopup.com'}/track-order" class="button">Track Your Order</a>
            </center>

            <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 20px;">
              You will receive another email once your data bundle is delivered.
            </p>
          </div>
          <div class="footer">
            <p>VeloxTopUp - Fast & Reliable Data Bundles</p>
            <p>Need help? Contact us at veloxtopupgh@gmail.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getDeliverySuccessTemplate({ orderRef, phone, network, plan, amount, deliveredAt }) {
    const date = new Date(deliveredAt).toLocaleString('en-GH', { 
      timeZone: 'Africa/Accra',
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Data Delivered</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px 30px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
          .success-icon { width: 60px; height: 60px; background: #ffffff; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; font-size: 30px; }
          .content { padding: 30px; }
          .details { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #bbf7d0; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { color: #166534; font-size: 14px; }
          .detail-value { color: #14532d; font-size: 14px; font-weight: 500; }
          .footer { background: #f8fafc; padding: 20px 30px; text-align: center; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="success-icon">✓</div>
            <h1>Data Delivered!</h1>
          </div>
          <div class="content">
            <p style="color: #334155; font-size: 16px; line-height: 1.6;">
              Great news! Your data bundle has been successfully delivered to <strong>${phone}</strong>.
            </p>

            <div class="details">
              <div class="detail-row">
                <span class="detail-label">Order Reference</span>
                <span class="detail-value">${orderRef}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Phone Number</span>
                <span class="detail-value">${phone}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Network</span>
                <span class="detail-value">${network}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Bundle</span>
                <span class="detail-value">${plan}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Amount</span>
                <span class="detail-value">GH₵${amount.toFixed(2)}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Delivered At</span>
                <span class="detail-value">${date}</span>
              </div>
            </div>

            <p style="color: #64748b; font-size: 14px; text-align: center;">
              You should receive a confirmation SMS from ${network} shortly.<br>
              Thank you for choosing VeloxTopUp!
            </p>
          </div>
          <div class="footer">
            <p>VeloxTopUp - Fast & Reliable Data Bundles</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getDeliveryFailureTemplate({ orderRef, phone, network, plan, amount, reason, supportEmail, supportPhone }) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Issue</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 40px 30px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
          .content { padding: 30px; }
          .alert { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .alert-title { color: #dc2626; font-weight: bold; margin-bottom: 10px; }
          .alert-text { color: #991b1b; font-size: 14px; }
          .details { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { color: #64748b; font-size: 14px; }
          .detail-value { color: #0f172a; font-size: 14px; font-weight: 500; }
          .support { background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .support-title { color: #0f172a; font-weight: bold; margin-bottom: 15px; }
          .support-item { display: flex; align-items: center; margin: 10px 0; }
          .support-icon { width: 40px; height: 40px; background: #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; }
          .footer { background: #f8fafc; padding: 20px 30px; text-align: center; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Issue</h1>
          </div>
          <div class="content">
            <div class="alert">
              <div class="alert-title">⚠️ Delivery Failed</div>
              <div class="alert-text">${reason || 'We encountered an issue processing your order. Our team has been notified and will resolve this shortly.'}</div>
            </div>

            <div class="details">
              <div class="detail-row">
                <span class="detail-label">Order Reference</span>
                <span class="detail-value">${orderRef}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Phone Number</span>
                <span class="detail-value">${phone}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Network</span>
                <span class="detail-value">${network}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Bundle</span>
                <span class="detail-value">${plan}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Amount</span>
                <span class="detail-value">GH₵${amount.toFixed(2)}</span>
              </div>
            </div>

            <div class="support">
              <div class="support-title">Need Help? Contact Support</div>
              <div class="support-item">
                <div class="support-icon">✉️</div>
                <div>
                  <div style="color: #0f172a; font-weight: 500;">Email</div>
                  <div style="color: #64748b; font-size: 14px;">${supportEmail || 'veloxtopupgh@gmail.com'}</div>
                </div>
              </div>
              <div class="support-item">
                <div class="support-icon">📞</div>
                <div>
                  <div style="color: #0f172a; font-weight: 500;">Phone</div>
                  <div style="color: #64748b; font-size: 14px;">${supportPhone || '+233 531649960'}</div>
                </div>
              </div>
            </div>
          </div>
          <div class="footer">
            <p>VeloxTopUp - We're here to help</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getPaymentReceiptTemplate({ orderRef, amount, paymentMethod, paidAt, transactionId }) {
    const date = new Date(paidAt).toLocaleString('en-GH', { 
      timeZone: 'Africa/Accra',
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Receipt</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: #0f172a; padding: 40px 30px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
          .receipt-label { color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px; }
          .content { padding: 30px; }
          .amount-box { background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: #ffffff; padding: 30px; border-radius: 12px; text-align: center; margin: 20px 0; }
          .amount-label { font-size: 14px; opacity: 0.9; }
          .amount-value { font-size: 36px; font-weight: bold; margin-top: 10px; }
          .details { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { color: #64748b; font-size: 14px; }
          .detail-value { color: #0f172a; font-size: 14px; font-weight: 500; }
          .footer { background: #f8fafc; padding: 20px 30px; text-align: center; color: #64748b; font-size: 12px; }
          .stamp { display: inline-block; background: #dcfce7; color: #166534; padding: 8px 20px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-top: 20px; border: 2px solid #bbf7d0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="receipt-label">Payment Receipt</div>
            <h1>${orderRef}</h1>
          </div>
          <div class="content">
            <div class="amount-box">
              <div class="amount-label">Amount Paid</div>
              <div class="amount-value">GH₵${amount.toFixed(2)}</div>
            </div>

            <div class="details">
              <div class="detail-row">
                <span class="detail-label">Payment Method</span>
                <span class="detail-value">${paymentMethod}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Transaction ID</span>
                <span class="detail-value">${transactionId}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Payment Date</span>
                <span class="detail-value">${date}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Status</span>
                <span class="detail-value" style="color: #059669;">PAID</span>
              </div>
            </div>

            <center>
              <span class="stamp">✓ PAYMENT CONFIRMED</span>
            </center>

            <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 30px;">
              Thank you for your payment!<br>
              This receipt confirms your transaction with VeloxTopUp.
            </p>
          </div>
          <div class="footer">
            <p>VeloxTopUp - Fast & Reliable Data Bundles</p>
            <p>For questions about this receipt, contact veloxtopupgh@gmail.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getPlainTextOrderConfirmation({ orderRef, phone, network, plan, amount }) {
    return `
Order Confirmation - ${orderRef}

Thank you for your purchase!

Order Details:
- Phone: ${phone}
- Network: ${network}
- Bundle: ${plan}
- Amount: GH₵${amount.toFixed(2)}

You can track your order at: ${process.env.FRONTEND_URL || 'https://veloxtopup.com'}/track-order

Need help? Contact us at veloxtopupgh@gmail.com
    `;
  }
}

export const emailService = new EmailService();
export default emailService;
