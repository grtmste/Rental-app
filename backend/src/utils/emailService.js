const nodemailer = require('nodemailer');

function createTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendEmail({ to, subject, html, text }) {
  const transporter = createTransporter();

  if (!transporter) {
    console.log('------- EMAIL (SMTP not configured, logging to console) -------');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${text || html}`);
    console.log('----------------------------------------------------------------');
    return { success: true, simulated: true };
  }

  const mailOptions = {
    from: process.env.FROM_EMAIL || process.env.SMTP_USER,
    to,
    subject,
    html,
    text,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('Email sent:', info.messageId);
  return { success: true, messageId: info.messageId };
}

async function sendQuoteEmail(quote, client) {
  const subject = `Quote #${quote.quote_number} from Stereo Sound`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Quote #${quote.quote_number}</h2>
      <p>Dear ${client.name},</p>
      <p>Please find attached your quote for the requested rental services.</p>
      <table style="width:100%; border-collapse: collapse; margin-top: 16px;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Quote Number</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${quote.quote_number}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Date</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${new Date(quote.date).toLocaleDateString()}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Due Date</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${new Date(quote.due_date).toLocaleDateString()}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Subtotal</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">€${Number(quote.subtotal).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>VAT (${quote.vat_rate}%)</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">€${Number(quote.vat_amount).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Total</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>€${Number(quote.total).toFixed(2)}</strong></td>
        </tr>
      </table>
      ${quote.notes ? `<p style="margin-top: 16px;"><strong>Notes:</strong> ${quote.notes}</p>` : ''}
      <p style="margin-top: 24px;">Please reply to this email to accept or request changes to this quote.</p>
      <p>Best regards,<br/>Stereo Sound Team</p>
    </div>
  `;
  const text = `Quote #${quote.quote_number}\n\nDear ${client.name},\n\nPlease review your quote.\n\nSubtotal: €${Number(quote.subtotal).toFixed(2)}\nVAT: €${Number(quote.vat_amount).toFixed(2)}\nTotal: €${Number(quote.total).toFixed(2)}\n\nBest regards,\nStereo Sound Team`;

  return sendEmail({ to: client.email, subject, html, text });
}

async function sendInvoiceEmail(invoice, client) {
  const subject = `Invoice #${invoice.invoice_number} from Stereo Sound`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Invoice #${invoice.invoice_number}</h2>
      <p>Dear ${client.name},</p>
      <p>Please find below your invoice for the completed rental services.</p>
      <table style="width:100%; border-collapse: collapse; margin-top: 16px;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Invoice Number</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${invoice.invoice_number}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Date</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${new Date(invoice.date).toLocaleDateString()}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Due Date</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${new Date(invoice.due_date).toLocaleDateString()}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Subtotal</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">€${Number(invoice.subtotal).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>VAT (${invoice.vat_rate}%)</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">€${Number(invoice.vat_amount).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Total</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>€${Number(invoice.total).toFixed(2)}</strong></td>
        </tr>
      </table>
      ${invoice.notes ? `<p style="margin-top: 16px;"><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
      <p style="margin-top: 24px;">Please arrange payment by the due date. Thank you for your business.</p>
      <p>Best regards,<br/>Stereo Sound Team</p>
    </div>
  `;
  const text = `Invoice #${invoice.invoice_number}\n\nDear ${client.name},\n\nPlease review your invoice.\n\nSubtotal: €${Number(invoice.subtotal).toFixed(2)}\nVAT: €${Number(invoice.vat_amount).toFixed(2)}\nTotal: €${Number(invoice.total).toFixed(2)}\nDue Date: ${new Date(invoice.due_date).toLocaleDateString()}\n\nBest regards,\nStereo Sound Team`;

  return sendEmail({ to: client.email, subject, html, text });
}

module.exports = { sendEmail, sendQuoteEmail, sendInvoiceEmail };
