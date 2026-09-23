import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function TaxSummaryGenerator({ member, contributions }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);

  // Get available years from contributions
  const availableYears = [...new Set(contributions
    .filter(c => c.paid_at)
    .map(c => new Date(c.paid_at).getFullYear())
  )].sort((a, b) => b - a);

  const yearContributions = contributions.filter(c => {
    if (c.status !== 'Paid' || !c.paid_at) return false;
    return new Date(c.paid_at).getFullYear() === selectedYear;
  });

  const totalAmount = yearContributions.reduce((sum, c) => sum + (c.amount_paid || 0), 0);
  const deductibleAmount = yearContributions
    .filter(c => c.is_tax_deductible !== false)
    .reduce((sum, c) => sum + (c.amount_paid || 0), 0);

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      const response = await base44.functions.invoke('generateTaxSummary', {
        member_id: member.id,
        year: selectedYear
      });

      if (response.data.pdf_url) {
        // Download the PDF
        window.open(response.data.pdf_url, '_blank');
        toast.success('Tax summary generated successfully!');
      } else {
        toast.error('Failed to generate tax summary');
      }
    } catch (error) {
      console.error('Failed to generate tax summary:', error);
      toast.error('Failed to generate tax summary');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-green-600" />
          <CardTitle>Annual Tax Summary</CardTitle>
        </div>
        <CardDescription>
          Generate a summary of your contributions for tax purposes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Year</label>
          <Select value={String(selectedYear)} onValueChange={(val) => setSelectedYear(parseInt(val))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg space-y-3">
          <h4 className="font-semibold text-gray-900">Summary for {selectedYear}</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Contributions:</span>
              <span className="font-semibold">${totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax-Deductible Amount:</span>
              <span className="font-semibold text-green-600">${deductibleAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Number of Contributions:</span>
              <span className="font-semibold">{yearContributions.length}</span>
            </div>
          </div>
        </div>

        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-900">
            <strong>Note:</strong> This summary includes all contributions made during {selectedYear}.
            Please consult with a tax professional to determine the deductibility of these contributions
            based on your specific tax situation and the organization's 501(c)(3) status.
          </p>
        </div>

        <Button
          onClick={handleGeneratePDF}
          disabled={isGenerating || yearContributions.length === 0}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating PDF...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download Tax Summary PDF
            </>
          )}
        </Button>

        {yearContributions.length === 0 && (
          <p className="text-sm text-center text-gray-500">
            No contributions found for {selectedYear}
          </p>
        )}
      </CardContent>
    </Card>
  );
}