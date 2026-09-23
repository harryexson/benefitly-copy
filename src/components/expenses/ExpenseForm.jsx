import React, { useState, useEffect } from 'react';
import { Expense } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, FileText, Repeat } from 'lucide-react';
import ReceiptScanner from './ReceiptScanner';

const CATEGORIES = {
  operational: {
    label: 'Operational',
    subcategories: ['Maintenance', 'Repairs', 'Cleaning', 'Security', 'General Operations']
  },
  administrative: {
    label: 'Administrative',
    subcategories: ['Office Supplies', 'Postage & Shipping', 'Filing Fees', 'Memberships', 'Subscriptions']
  },
  legal: {
    label: 'Legal & Compliance',
    subcategories: ['Attorney Fees', 'Court Costs', 'Licenses & Permits', 'Regulatory Filings', 'Compliance Audits']
  },
  marketing: {
    label: 'Marketing',
    subcategories: ['Advertising', 'Printed Materials', 'Social Media Ads', 'Website', 'Promotional Items']
  },
  technology: {
    label: 'Technology',
    subcategories: ['Software Subscriptions', 'Hardware', 'IT Support', 'Cloud Services', 'Domain & Hosting']
  },
  payroll: {
    label: 'Payroll',
    subcategories: ['Salaries', 'Contractor Payments', 'Bonuses', 'Benefits', 'Payroll Taxes']
  },
  rent_utilities: {
    label: 'Rent & Utilities',
    subcategories: ['Rent', 'Electricity', 'Gas', 'Water', 'Internet', 'Phone']
  },
  insurance: {
    label: 'Insurance',
    subcategories: ['General Liability', 'Property Insurance', 'Workers Comp', 'Directors & Officers', 'Other Insurance']
  },
  professional_services: {
    label: 'Professional Services',
    subcategories: ['Accounting', 'Consulting', 'Bookkeeping', 'Financial Advisors', 'Other Professional']
  },
  travel: {
    label: 'Travel',
    subcategories: ['Airfare', 'Lodging', 'Ground Transportation', 'Meals', 'Mileage Reimbursement']
  },
  supplies: {
    label: 'Supplies',
    subcategories: ['Office Supplies', 'Cleaning Supplies', 'Kitchen Supplies', 'Event Supplies', 'Other Supplies']
  },
  events: {
    label: 'Events',
    subcategories: ['Venue Rental', 'Catering', 'Decorations', 'Entertainment', 'Equipment Rental']
  },
  other: {
    label: 'Other',
    subcategories: ['Miscellaneous', 'Bank Fees', 'Interest', 'Donations', 'Other']
  }
};

const ExpenseForm = ({ expense, onSave, onCancel, initialData }) => {
  const [activeTab, setActiveTab] = useState('manual');
  const [formData, setFormData] = useState({
    category: 'operational',
    subcategory: '',
    description: '',
    amount: 0,
    expense_date: new Date().toISOString().split('T')[0],
    status: 'pending',
    vendor: '',
    payment_method: 'bank_transfer',
    is_recurring: false,
    recurring_frequency: 'monthly',
    tax_deductible: false,
    receipt_url: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (expense) {
      setFormData({
        category: expense.category || 'operational',
        subcategory: expense.subcategory || '',
        description: expense.description || '',
        amount: expense.amount || 0,
        expense_date: expense.expense_date || new Date().toISOString().split('T')[0],
        status: expense.status || 'pending',
        vendor: expense.vendor || '',
        payment_method: expense.payment_method || 'bank_transfer',
        is_recurring: expense.is_recurring || false,
        recurring_frequency: expense.recurring_frequency || 'monthly',
        tax_deductible: expense.tax_deductible || false,
        receipt_url: expense.receipt_url || '',
        notes: expense.notes || ''
      });
    } else if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
      setActiveTab('manual');
    }
  }, [expense, initialData]);

  const handleChange = (e) => {
    const { id, value, type } = e.target;
    setFormData((prev) => ({ ...prev, [id]: type === 'number' ? parseFloat(value) || 0 : value }));
  };

  const handleSelectChange = (id, value) => {
    setFormData((prev) => {
      const updates = { [id]: value };
      // Reset subcategory when category changes
      if (id === 'category') {
        updates.subcategory = '';
      }
      return { ...prev, ...updates };
    });
  };

  const handleSwitchChange = (id, checked) => {
    setFormData((prev) => ({ ...prev, [id]: checked }));
  };

  const handleReceiptExtracted = (extractedData) => {
    setFormData(prev => ({ ...prev, ...extractedData }));
    setActiveTab('manual');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (expense && expense.id) {
        await Expense.update(expense.id, formData);
      } else {
        await Expense.create(formData);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentSubcategories = CATEGORIES[formData.category]?.subcategories || [];

  return (
    <div className="space-y-4">
      {!expense && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="scan" className="gap-2">
              <Camera className="h-4 w-4" />
              Scan Receipt
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2">
              <FileText className="h-4 w-4" />
              Manual Entry
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scan" className="mt-4">
            <ReceiptScanner 
              onExtracted={handleReceiptExtracted}
              onClose={() => setActiveTab('manual')}
            />
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
            <ExpenseFormFields
              formData={formData}
              currentSubcategories={currentSubcategories}
              handleChange={handleChange}
              handleSelectChange={handleSelectChange}
              handleSwitchChange={handleSwitchChange}
              handleSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              onCancel={onCancel}
              isEditing={false}
            />
          </TabsContent>
        </Tabs>
      )}

      {expense && (
        <ExpenseFormFields
          formData={formData}
          currentSubcategories={currentSubcategories}
          handleChange={handleChange}
          handleSelectChange={handleSelectChange}
          handleSwitchChange={handleSwitchChange}
          handleSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          onCancel={onCancel}
          isEditing={true}
        />
      )}
    </div>
  );
};

const ExpenseFormFields = ({
  formData,
  currentSubcategories,
  handleChange,
  handleSelectChange,
  handleSwitchChange,
  handleSubmit,
  isSubmitting,
  onCancel,
  isEditing
}) => (
  <form onSubmit={handleSubmit} className="space-y-4">
    <div className="space-y-2">
      <Label htmlFor="description">Description *</Label>
      <Input 
        id="description" 
        value={formData.description} 
        onChange={handleChange} 
        placeholder="Brief description of expense"
        required 
      />
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="amount">Amount *</Label>
        <Input 
          id="amount" 
          type="number" 
          step="0.01"
          min="0"
          value={formData.amount} 
          onChange={handleChange} 
          required 
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="expense_date">Date *</Label>
        <Input 
          id="expense_date" 
          type="date" 
          value={formData.expense_date} 
          onChange={handleChange} 
          required 
        />
      </div>
    </div>

    <div className="space-y-2">
      <Label htmlFor="vendor">Vendor / Payee</Label>
      <Input 
        id="vendor" 
        value={formData.vendor} 
        onChange={handleChange}
        placeholder="Name of vendor or payee"
      />
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="category">Category *</Label>
        <Select value={formData.category} onValueChange={(value) => handleSelectChange('category', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CATEGORIES).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="subcategory">Subcategory</Label>
        <Select 
          value={formData.subcategory} 
          onValueChange={(value) => handleSelectChange('subcategory', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select subcategory" />
          </SelectTrigger>
          <SelectContent>
            {currentSubcategories.map((sub) => (
              <SelectItem key={sub} value={sub}>{sub}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="payment_method">Payment Method</Label>
        <Select 
          value={formData.payment_method} 
          onValueChange={(value) => handleSelectChange('payment_method', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="check">Check</SelectItem>
            <SelectItem value="credit_card">Credit Card</SelectItem>
            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    {/* Recurring expense settings */}
    <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="is_recurring" className="flex items-center gap-2">
            <Repeat className="h-4 w-4" />
            Recurring Expense
          </Label>
          <p className="text-xs text-gray-500">Automatically create this expense on schedule</p>
        </div>
        <Switch
          id="is_recurring"
          checked={formData.is_recurring}
          onCheckedChange={(checked) => handleSwitchChange('is_recurring', checked)}
        />
      </div>

      {formData.is_recurring && (
        <div className="space-y-2">
          <Label htmlFor="recurring_frequency">Frequency</Label>
          <Select 
            value={formData.recurring_frequency} 
            onValueChange={(value) => handleSelectChange('recurring_frequency', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>

    {/* Additional options */}
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label htmlFor="tax_deductible">Tax Deductible</Label>
        <p className="text-xs text-gray-500">Mark if this expense is tax deductible</p>
      </div>
      <Switch
        id="tax_deductible"
        checked={formData.tax_deductible}
        onCheckedChange={(checked) => handleSwitchChange('tax_deductible', checked)}
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor="notes">Notes</Label>
      <Textarea
        id="notes"
        value={formData.notes}
        onChange={handleChange}
        placeholder="Additional notes or details"
        rows={2}
      />
    </div>

    {formData.receipt_url && (
      <div className="text-sm text-green-600 flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Receipt attached
      </div>
    )}

    <div className="flex justify-end gap-2 pt-4 border-t">
      <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : isEditing ? 'Update Expense' : 'Add Expense'}
      </Button>
    </div>
  </form>
);

export default ExpenseForm;