// src/services/pdfService.js
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

/**
 * Build a single ticket PDF and return it as a Buffer.
 * @param {object} params
 * @param {object} params.event
 * @param {object} params.order
 * @param {object} params.ticket
 * @param {object} params.category
 * @param {string} [params.timeZone='Africa/Nairobi'] - for date rendering
 * @returns {Promise<Buffer>}
 */
export async function buildTicketPDFBuffer({ event, order, ticket, category, timeZone = 'Africa/Nairobi' }) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  // collect to Buffer
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  // Header
  doc.fontSize(20).text(event?.title || 'Event', { align: 'center' }).moveDown(0.5);
  doc.fontSize(12).text(event?.description || '', { align: 'center' }).moveDown(1);

  // Details
  const when = event?.startTime
    ? new Intl.DateTimeFormat('en-KE', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone
      }).format(new Date(event.startTime))
    : 'TBA';

  doc.fontSize(12);
  doc.text(`Buyer: ${order?.buyerName || '-'}`);
  doc.text(`Email: ${order?.buyerEmail || '-'}`);
  doc.text(`Phone: ${order?.buyerPhone || '-'}`);
  doc.text(`Event Date/Time: ${when}`);
  doc.text(`Category: ${category?.name || '-'}`);
  doc.text(`Ticket Code: ${ticket?.ticketCode || '-'}`).moveDown(1);

  // QR code with the ticket code
  const code = ticket?.ticketCode || 'UNKNOWN';
  const qrDataUrl = await QRCode.toDataURL(code, { margin: 1, width: 200 });
  const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
  doc.image(Buffer.from(qrBase64, 'base64'), { fit: [200, 200], align: 'left' });

  doc.moveDown(2);
  doc.text('Please present this QR/code at entry. Each ticket is valid for one entry only.');

  doc.end();
  return done;
}