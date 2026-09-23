import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const CATEGORY_KEYWORDS = {
  rent_utilities: ['rent', 'utility', 'electric', 'gas', 'water', 'power', 'electricity'],
  technology: ['software', 'computer', 'tech', 'hosting', 'domain', 'subscription', 'saas', 'cloud'],
  supplies: ['office', 'supplies', 'paper', 'ink', 'toner', 'staples', 'pens'],
  travel: ['travel', 'flight', 'hotel', 'uber', 'lyft', 'taxi', 'airfare', 'lodging', 'mileage'],
  professional_services: ['consulting', 'attorney', 'lawyer', 'accountant', 'cpa', 'legal', 'audit'],
  marketing: ['advertising', 'marketing', 'ads', 'promotion', 'facebook', 'google ads'],
  insurance: ['insurance', 'liability', 'coverage', 'premium'],
  events: ['event', 'catering', 'venue', 'decoration', 'party', 'celebration'],
  payroll: ['salary', 'wage', 'payroll', 'bonus', 'compensation'],
  administrative: ['admin', 'filing', 'license', 'permit', 'registration'],
  legal: ['legal', 'court', 'attorney', 'compliance', 'regulatory'],
  operational: ['maintenance', 'repair', 'cleaning', 'service']
};

export default function ReceiptScanner({ onExtracted, onClose }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const inferCategory = (description, vendor) => {
    const text = `${description} ${vendor}`.toLowerCase();
    
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }
    return 'other';
  };

  const processReceipt = async (file) => {
    setIsProcessing(true);
    
    try {
      // Upload the file first
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = uploadResult.file_url;
      setPreviewUrl(fileUrl);

      // Extract data using AI
      const extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: {
          type: 'object',
          properties: {
            vendor_name: { type: 'string', description: 'Name of the store or vendor' },
            total_amount: { type: 'number', description: 'Total amount on the receipt' },
            date: { type: 'string', description: 'Date of purchase in YYYY-MM-DD format' },
            items: { 
              type: 'array', 
              items: { 
                type: 'object',
                properties: {
                  description: { type: 'string' },
                  amount: { type: 'number' }
                }
              },
              description: 'List of items purchased' 
            },
            payment_method: { type: 'string', description: 'Payment method used (cash, credit card, etc.)' },
            tax_amount: { type: 'number', description: 'Tax amount if shown' }
          }
        }
      });

      if (extractionResult.status === 'error') {
        toast.error('Could not extract receipt data. Please enter manually.');
        setIsProcessing(false);
        return;
      }

      const data = extractionResult.output;
      
      // Generate description from items or vendor
      let description = data.vendor_name || 'Receipt expense';
      if (data.items && data.items.length > 0) {
        const itemDescriptions = data.items.slice(0, 3).map(i => i.description).join(', ');
        description = `${data.vendor_name || 'Purchase'}: ${itemDescriptions}`;
      }

      // Infer category
      const category = inferCategory(description, data.vendor_name || '');

      // Map payment method
      let paymentMethod = 'other';
      if (data.payment_method) {
        const pm = data.payment_method.toLowerCase();
        if (pm.includes('cash')) paymentMethod = 'cash';
        else if (pm.includes('check')) paymentMethod = 'check';
        else if (pm.includes('credit') || pm.includes('card') || pm.includes('visa') || pm.includes('mastercard')) paymentMethod = 'credit_card';
        else if (pm.includes('bank') || pm.includes('transfer') || pm.includes('ach')) paymentMethod = 'bank_transfer';
      }

      const extracted = {
        description: description.substring(0, 200),
        amount: data.total_amount || 0,
        expense_date: data.date || new Date().toISOString().split('T')[0],
        category,
        vendor: data.vendor_name || '',
        payment_method: paymentMethod,
        receipt_url: fileUrl,
        tax_deductible: false
      };

      setExtractedData(extracted);
      toast.success('Receipt scanned successfully!');

    } catch (error) {
      console.error('Receipt processing error:', error);
      toast.error('Failed to process receipt. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      processReceipt(file);
    }
  };

  const handleConfirm = () => {
    if (extractedData) {
      onExtracted(extractedData);
    }
  };

  const handleRetry = () => {
    setExtractedData(null);
    setPreviewUrl(null);
  };

  return (
    <div className="space-y-4">
      {!extractedData && !isProcessing && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 text-center">
            Take a photo or upload an image of your receipt. Our AI will automatically extract the details.
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="h-8 w-8 text-blue-600" />
              <span>Take Photo</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-green-600" />
              <span>Upload Image</span>
            </Button>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={handleFileSelect}
          />

          <p className="text-xs text-gray-400 text-center">
            Supports JPG, PNG, and PDF files
          </p>
        </div>
      )}

      {isProcessing && (
        <div className="py-12 text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <div>
            <p className="font-medium">Processing Receipt...</p>
            <p className="text-sm text-gray-500">Extracting details using AI</p>
          </div>
        </div>
      )}

      {extractedData && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Receipt Scanned Successfully</span>
          </div>

          {previewUrl && (
            <div className="relative">
              <img 
                src={previewUrl} 
                alt="Receipt" 
                className="w-full max-h-48 object-contain rounded-lg border"
              />
            </div>
          )}

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Vendor:</span>
                  <p className="font-medium">{extractedData.vendor || 'Unknown'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Amount:</span>
                  <p className="font-medium text-lg">${extractedData.amount.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Date:</span>
                  <p className="font-medium">{extractedData.expense_date}</p>
                </div>
                <div>
                  <span className="text-gray-500">Category:</span>
                  <p className="font-medium capitalize">{extractedData.category.replace(/_/g, ' ')}</p>
                </div>
              </div>
              <div>
                <span className="text-gray-500 text-sm">Description:</span>
                <p className="text-sm">{extractedData.description}</p>
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-gray-500 text-center">
            You can edit these details in the next step
          </p>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRetry} className="flex-1">
              Scan Another
            </Button>
            <Button onClick={handleConfirm} className="flex-1">
              Use This Data
            </Button>
          </div>
        </div>
      )}

      {onClose && !isProcessing && (
        <Button variant="ghost" onClick={onClose} className="w-full">
          Cancel
        </Button>
      )}
    </div>
  );
}