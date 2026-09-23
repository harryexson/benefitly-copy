import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import ReceiptScanner from './ReceiptScanner';
import ExpenseForm from './ExpenseForm';

export default function QuickExpenseCapture({ onExpenseAdded }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [step, setStep] = useState('scan'); // 'scan' | 'review'
  const [extractedData, setExtractedData] = useState(null);

  const handleReceiptExtracted = (data) => {
    setExtractedData(data);
    setStep('review');
  };

  const handleSave = async () => {
    setIsDialogOpen(false);
    setStep('scan');
    setExtractedData(null);
    toast.success('Expense added successfully!');
    if (onExpenseAdded) {
      onExpenseAdded();
    }
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setStep('scan');
    setExtractedData(null);
  };

  return (
    <>
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setIsDialogOpen(true)}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <Camera className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-blue-900">Quick Receipt Scan</h3>
              <p className="text-sm text-blue-700">
                Snap a photo of your receipt to automatically add an expense
              </p>
            </div>
            <Plus className="h-6 w-6 text-blue-400" />
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {step === 'scan' ? 'Scan Receipt' : 'Review & Save Expense'}
            </DialogTitle>
          </DialogHeader>

          {step === 'scan' && (
            <ReceiptScanner 
              onExtracted={handleReceiptExtracted}
              onClose={handleClose}
            />
          )}

          {step === 'review' && extractedData && (
            <ExpenseForm
              initialData={extractedData}
              onSave={handleSave}
              onCancel={() => setStep('scan')}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}