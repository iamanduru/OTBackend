import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const handleMpesaCallback = async (req, res) => {
    try {
        //Daraja posts to you with a structure
        const callback = req.body.Body?.stkCallback;
        if(!callback) {
            return res.status(400).json({ error: 'Malformed Callback'});
        }

        const { CheckoutRequestID, ResultCode, ResultDesc } = callback;

        //find the order by checkoutRequestID
        const order = await prisma.order.findUnique({
            where: { checkoutRequestId: CheckoutRequestID },
            include: {
                ticketCategory: true,
                event: true,
                affiliateSales: true,
                affiliateSales: { include: { affiliate: true }}
            }
        });

        if (!order) {
            // Unknown order; log and exit
            console.warn('Callback for unknown order', CheckoutRequestID);
            return res.status(200).json({ result: 'ignored' });
        }

        if (ResultCode !== 0) {
            //Payment failed
            await prisma.order.update({
                where: { id: order.id },
                data: { status: 'FAILED'}
            });

            await prisma.auditLog.create({
                data: {
                    entity: 'Order',
                    entityId: order.id,
                    action: 'PAYMENT_FAILED',
                    description: `Daraja callback failure: ${ResultDesc}`,
                    staffId: null
                }
            });

            return res.status(200).json({ result: 'payment failed recorded' });
        }

        //Payment succeeded: extract metadata
        const items = callback.CallbackMetadata?.Item || [];
        const mpesaReceipt = items.find(i => i.Name === 'MpesaReceiptNumber')?.Value;
        const amount = items.find(i => i.Name === 'Amount')?.Value;
        const phone = items.find(i => i.Name === 'PhoneNumber')?.Value;

        //update order as paid
        await prisma.order.update({
            where: { id: order.id },
                data: {
                status: 'PAID',
                paidAt: new Date(),
                mpesaTransactionId: mpesaReceipt
                }
        });

        await prisma.auditLog.create({
            data: {
                entity: 'Order',
                entityId: order.id,
                action: 'PAYMENT_CONFIRMED',
                description: `Payment confirmed. Receipt: ${mpesaReceipt}, amount: ${amount}`,
                staffId: null
            }
        });

        //create tickets
        const ticketsData = [];
        for (let i = 0; i < order.quantity; i++ ) {
            const code = Math.random().toString(36).substring(2, 9).toUpperCase();
            ticketData.push({
                ticketCode: code,
                orderId: order.id,
                ticketCategoryId: order.ticketCategoryId,
                deliveryMethod: 'EMAIL',
            });
        }

        const createdTickets = await prisma.ticket.createMany({
            data: ticketsData
        });

        await prisma.auditLog.create({
            data: {
                entity: 'Ticket',
                entityId: order.id,
                action: 'ISSUE',
                description: `Issued ${order.quantity} tickets for order ${order.id}`,
                staffId: null
            }
        });

        // Affiliate commission (if applicable)
    // Assuming affiliateCode was captured earlier (could store it on order or handle via separate pending state)
    // Example: find affiliateSales that don't exist yet
    if (order.affiliateSales.length === 0) {
      // If affiliate was determined at order creation time, you'd have stored affiliateId somewhere.
      // Placeholder: suppose you stored affiliateId on order.extraAffiliateId (not in current schema)
      // Otherwise skip until you extend schema to track affiliate on order.
    }

    // TODO: send ticket via email/WhatsApp using your mail/WhatsApp utilities

    // Respond quickly to Daraja
    res.status(200).json({ result: 'success' });
    } catch (error) {
        console.error('Callback processing error:', err);
        res.status(500).json({ error: 'Internal error processing callback' });
    }
}