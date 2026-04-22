const nodemailer = require('nodemailer');

function createTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendEmail({ to, subject, html, text }) {
  const transporter = createTransporter();

  if (!transporter) {
    console.log('------- E-KIRI (SMTP seadistamata, logitakse konsooli) -------');
    console.log(`Saaja: ${to}`);
    console.log(`Teema: ${subject}`);
    console.log(`Sisu: ${text || html}`);
    console.log('----------------------------------------------------------------');
    return { success: true, simulated: true };
  }

  const mailOptions = {
    from: `"Stereo Sound OÜ" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject,
    html,
    text,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('E-kiri saadetud:', info.messageId);
  return { success: true, messageId: info.messageId, simulated: false };
}

async function sendQuoteEmail(quote, client, { subject: subjectOverride, message: customMessage } = {}) {
  const emailSubject = subjectOverride || `Pakkumine ${quote.quote_number} — Stereo Sound OÜ`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background: #1A3C6E; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Stereo Sound OÜ</h1>
        <p style="color: #9ab3d4; margin: 4px 0 0;">Pakkumine ${quote.quote_number}</p>
      </div>
      <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p>Lugupeetud ${client.name},</p>
        ${customMessage ? `<p>${customMessage}</p>` : '<p>Saadame teile pakkumise renditavate seadmete kohta.</p>'}
        <table style="width:100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb;"><strong>Pakkumise number</strong></td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${quote.quote_number}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb;"><strong>Kuupäev</strong></td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${quote.date ? new Date(quote.date).toLocaleDateString('et-EE') : '—'}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb;"><strong>Maksetähtaeg</strong></td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${quote.due_date ? new Date(quote.due_date).toLocaleDateString('et-EE') : '—'}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb;"><strong>Vahesumma</strong></td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">€${Number(quote.subtotal).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb;"><strong>KM (${quote.vat_rate}%)</strong></td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">€${Number(quote.vat_amount).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb;"><strong>Kokku</strong></td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-size: 18px;"><strong>€${Number(quote.total).toFixed(2)}</strong></td>
          </tr>
        </table>
        ${quote.notes ? `<p style="margin-top: 20px; padding: 12px; background: #f9fafb; border-radius: 4px; border-left: 4px solid #1A3C6E;"><strong>Märkmed:</strong> ${quote.notes}</p>` : ''}
        <p style="margin-top: 24px;">Pakkumise aktsepteerimiseks või muudatuste tegemiseks palun vastake sellele e-kirjale.</p>
        <p>Lugupidamisega,<br/><strong>Stereo Sound OÜ meeskond</strong></p>
      </div>
    </div>
  `;
  const text = `Pakkumine ${quote.quote_number}\n\nLugupeetud ${client.name},\n\n${customMessage || 'Saadame teile pakkumise renditavate seadmete kohta.'}\n\nVahesumma: €${Number(quote.subtotal).toFixed(2)}\nKM: €${Number(quote.vat_amount).toFixed(2)}\nKokku: €${Number(quote.total).toFixed(2)}\n\nLugupidamisega,\nStereo Sound OÜ`;

  return sendEmail({ to: client.email, subject: emailSubject, html, text });
}

async function sendInvoiceEmail(invoice, client) {
  const subject = `Arve ${invoice.invoice_number} — Stereo Sound OÜ`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background: #1A3C6E; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Stereo Sound OÜ</h1>
        <p style="color: #9ab3d4; margin: 4px 0 0;">Arve ${invoice.invoice_number}</p>
      </div>
      <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p>Lugupeetud ${client.name},</p>
        <p>Saadame teile arve tehtud renditöö eest.</p>
        <table style="width:100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb;"><strong>Arve number</strong></td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${invoice.invoice_number}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb;"><strong>Kuupäev</strong></td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${invoice.date ? new Date(invoice.date).toLocaleDateString('et-EE') : '—'}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb;"><strong>Maksetähtaeg</strong></td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('et-EE') : '—'}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb;"><strong>Vahesumma</strong></td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">€${Number(invoice.subtotal).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb;"><strong>KM (${invoice.vat_rate}%)</strong></td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">€${Number(invoice.vat_amount).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb;"><strong>Kokku</strong></td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-size: 18px;"><strong>€${Number(invoice.total).toFixed(2)}</strong></td>
          </tr>
        </table>
        ${invoice.notes ? `<p style="margin-top: 20px;"><strong>Märkmed:</strong> ${invoice.notes}</p>` : ''}
        <p style="margin-top: 24px;">Palun tasuge arve tähtajaks. Aitäh!</p>
        <p>Lugupidamisega,<br/><strong>Stereo Sound OÜ meeskond</strong></p>
      </div>
    </div>
  `;
  const text = `Arve ${invoice.invoice_number}\n\nLugupeetud ${client.name},\n\nVahesumma: €${Number(invoice.subtotal).toFixed(2)}\nKM: €${Number(invoice.vat_amount).toFixed(2)}\nKokku: €${Number(invoice.total).toFixed(2)}\nMaksetähtaeg: ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('et-EE') : '—'}\n\nLugupidamisega,\nStereo Sound OÜ`;

  return sendEmail({ to: client.email, subject, html, text });
}

module.exports = { sendEmail, sendQuoteEmail, sendInvoiceEmail };
