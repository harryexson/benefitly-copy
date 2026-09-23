import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { reportData, period } = body;

        const doc = new jsPDF();
        
        // Title and header
        doc.setFontSize(20);
        doc.text('Association Report', 20, 20);
        
        doc.setFontSize(12);
        doc.text(`Report Period: ${period}`, 20, 35);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 45);
        
        // Summary section
        doc.setFontSize(16);
        doc.text('Executive Summary', 20, 65);
        
        doc.setFontSize(10);
        let yPos = 80;
        
        if (reportData.summary) {
            doc.text(`Total Members: ${reportData.summary.totalMembers}`, 20, yPos);
            yPos += 10;
            doc.text(`New Members: ${reportData.summary.newMembers}`, 20, yPos);
            yPos += 10;
            doc.text(`Total Revenue: $${(reportData.summary.totalRevenue || 0).toFixed(2)}`, 20, yPos);
            yPos += 10;
            doc.text(`Total Payouts: $${(reportData.summary.totalPayouts || 0).toFixed(2)}`, 20, yPos);
            yPos += 10;
            doc.text(`Total Expenses: $${(reportData.summary.totalExpenses || 0).toFixed(2)}`, 20, yPos);
            yPos += 10;
            doc.text(`Net Income: $${(reportData.summary.netIncome || 0).toFixed(2)}`, 20, yPos);
            yPos += 20;
        }

        // Placeholder for more sections like charts and tables
        // In future phases, we will add more detailed tables here for revenue, expenses, etc.

        const pdfBytes = doc.output('arraybuffer');

        return new Response(pdfBytes, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename=association-report.pdf'
            }
        });
    } catch (error) {
        console.error('Error generating PDF:', error.message, error.stack);
        return Response.json({ error: `Failed to generate PDF: ${error.message}` }, { status: 500 });
    }
});