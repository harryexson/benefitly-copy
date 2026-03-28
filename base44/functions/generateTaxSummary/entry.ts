import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { member_id, year } = await req.json();

    if (!member_id || !year) {
      return Response.json({ error: 'Missing member_id or year' }, { status: 400 });
    }

    // Get member details
    const member = await base44.asServiceRole.entities.Member.get(member_id);
    if (!member) {
      return Response.json({ error: 'Member not found' }, { status: 404 });
    }

    // Verify user owns this member profile
    if (member.email !== user.email) {
      return Response.json({ error: 'Unauthorized access to member data' }, { status: 403 });
    }

    // Get contributions for the year
    const allContributions = await base44.asServiceRole.entities.EventContribution.filter({
      member_id: member_id
    });

    const yearContributions = allContributions.filter(c => {
      if (c.status !== 'Paid' || !c.paid_at) return false;
      const paidYear = new Date(c.paid_at).getFullYear();
      return paidYear === year;
    });

    // Get events for contribution details
    const eventIds = [...new Set(yearContributions.map(c => c.event_id))];
    const events = await base44.asServiceRole.entities.Event.list();
    const eventMap = {};
    events.forEach(e => eventMap[e.id] = e);

    // Generate PDF
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Annual Contribution Summary', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Tax Year: ${year}`, 20, 30);
    doc.text(`Member: ${member.first_name} ${member.last_name}`, 20, 37);
    doc.text(`Member #: ${member.member_number}`, 20, 44);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 51);

    // Summary Section
    doc.setFontSize(14);
    doc.text('Summary', 20, 65);
    
    const totalAmount = yearContributions.reduce((sum, c) => sum + (c.amount_paid || 0), 0);
    const deductibleAmount = yearContributions
      .filter(c => c.is_tax_deductible !== false)
      .reduce((sum, c) => sum + (c.amount_paid || 0), 0);
    
    doc.setFontSize(11);
    doc.text(`Total Contributions: $${totalAmount.toFixed(2)}`, 25, 75);
    doc.text(`Tax-Deductible Amount: $${deductibleAmount.toFixed(2)}`, 25, 82);
    doc.text(`Number of Contributions: ${yearContributions.length}`, 25, 89);

    // Detailed List
    doc.setFontSize(14);
    doc.text('Contribution Details', 20, 105);
    
    doc.setFontSize(9);
    let yPos = 115;
    
    yearContributions.forEach((contrib, idx) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      const event = eventMap[contrib.event_id];
      const eventTitle = event ? event.title : 'Unknown Event';
      const paidDate = new Date(contrib.paid_at).toLocaleDateString();
      
      doc.text(`${idx + 1}. ${eventTitle}`, 25, yPos);
      doc.text(`Date: ${paidDate}`, 35, yPos + 5);
      doc.text(`Amount: $${contrib.amount_paid.toFixed(2)}`, 35, yPos + 10);
      
      if (contrib.designated_for) {
        doc.text(`Designated for: ${contrib.designated_for}`, 35, yPos + 15);
        yPos += 20;
      } else {
        yPos += 15;
      }
    });

    // Footer disclaimer
    doc.setFontSize(8);
    const disclaimer = 'This summary is provided for your records. Please consult with a tax professional to determine the deductibility of these contributions based on your specific tax situation.';
    const splitDisclaimer = doc.splitTextToSize(disclaimer, 170);
    doc.text(splitDisclaimer, 20, 280);

    // Convert to base64 and upload
    const pdfBase64 = doc.output('datauristring').split(',')[1];
    const pdfBuffer = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    
    // Upload to storage
    const fileName = `tax_summary_${member_id}_${year}.pdf`;
    const formData = new FormData();
    formData.append('file', blob, fileName);
    
    const uploadResponse = await base44.integrations.Core.UploadFile({
      file: blob
    });

    return Response.json({ 
      success: true,
      pdf_url: uploadResponse.file_url,
      total_amount: totalAmount,
      deductible_amount: deductibleAmount,
      contribution_count: yearContributions.length
    });

  } catch (error) {
    console.error('Error generating tax summary:', error);
    return Response.json({ 
      error: error.message || 'Failed to generate tax summary'
    }, { 
      status: 500 
    });
  }
});