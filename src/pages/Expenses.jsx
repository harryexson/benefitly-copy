import React, { useState, useEffect, useMemo } from 'react';
import { Expense } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, Repeat, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import ExpensesTable from '../components/expenses/ExpensesTable';
import ExpenseForm from '../components/expenses/ExpenseForm';
import QuickExpenseCapture from '../components/expenses/QuickExpenseCapture';
import { Skeleton } from '@/components/ui/skeleton';

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [recurringFilter, setRecurringFilter] = useState('all');

  const loadExpenses = async () => {
    setIsLoading(true);
    const expenseList = await Expense.list('-expense_date');
    setExpenses(expenseList);
    setIsLoading(false);
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const handleOpenForm = (expense = null) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingExpense(null);
    setIsFormOpen(false);
  };

  const handleSave = async () => {
    await loadExpenses();
    handleCloseForm();
  };

  const handleDelete = async (expenseId) => {
    await Expense.delete(expenseId);
    await loadExpenses();
  };

  const filteredExpenses = useMemo(() => {
    let result = expenses;
    
    if (searchTerm) {
      result = result.filter(expense =>
        expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.vendor?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (categoryFilter !== 'all') {
      result = result.filter(expense => expense.category === categoryFilter);
    }
    
    if (recurringFilter === 'recurring') {
      result = result.filter(expense => expense.is_recurring);
    } else if (recurringFilter === 'one-time') {
      result = result.filter(expense => !expense.is_recurring);
    }
    
    return result;
  }, [expenses, searchTerm, categoryFilter, recurringFilter]);

  const recurringExpenses = expenses.filter(e => e.is_recurring);
  const totalRecurringMonthly = recurringExpenses.reduce((sum, e) => {
    if (e.recurring_frequency === 'monthly') return sum + e.amount;
    if (e.recurring_frequency === 'quarterly') return sum + (e.amount / 3);
    if (e.recurring_frequency === 'yearly') return sum + (e.amount / 12);
    return sum;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold tracking-tight">Expense Management</h2>
           <p className="text-gray-500">Track and manage all operational expenses.</p>
        </div>
        <div className="flex w-full md:w-auto items-center gap-2">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search expenses..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={() => handleOpenForm()} className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5" />
            New Expense
          </Button>
        </div>
      </div>

      {/* Quick Receipt Scan Card */}
      <QuickExpenseCapture onExpenseAdded={loadExpenses} />

      {/* Summary Cards */}
      {recurringExpenses.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Repeat className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-900">Recurring Expenses</p>
                  <p className="text-sm text-orange-700">
                    {recurringExpenses.length} recurring expense(s) • ~${totalRecurringMonthly.toFixed(2)}/month
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="border-orange-300 text-orange-700">
                {recurringExpenses.length} Active
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">Filters:</span>
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="operational">Operational</SelectItem>
            <SelectItem value="administrative">Administrative</SelectItem>
            <SelectItem value="legal">Legal</SelectItem>
            <SelectItem value="marketing">Marketing</SelectItem>
            <SelectItem value="technology">Technology</SelectItem>
            <SelectItem value="payroll">Payroll</SelectItem>
            <SelectItem value="rent_utilities">Rent & Utilities</SelectItem>
            <SelectItem value="insurance">Insurance</SelectItem>
            <SelectItem value="professional_services">Professional Services</SelectItem>
            <SelectItem value="travel">Travel</SelectItem>
            <SelectItem value="supplies">Supplies</SelectItem>
            <SelectItem value="events">Events</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select value={recurringFilter} onValueChange={setRecurringFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="recurring">Recurring Only</SelectItem>
            <SelectItem value="one-time">One-time Only</SelectItem>
          </SelectContent>
        </Select>
        {(categoryFilter !== 'all' || recurringFilter !== 'all') && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => { setCategoryFilter('all'); setRecurringFilter('all'); }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="border rounded-lg p-4">
            <Skeleton className="h-8 w-1/4 mb-4" />
            <Skeleton className="h-10 w-full mb-2" />
            <Skeleton className="h-10 w-full mb-2" />
            <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <ExpensesTable
          expenses={filteredExpenses}
          onEdit={handleOpenForm}
          onDelete={handleDelete}
        />
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
            <DialogDescription>
              {editingExpense ? 'Update the details for this expense.' : 'Scan a receipt or enter details manually.'}
            </DialogDescription>
          </DialogHeader>
          <ExpenseForm
            expense={editingExpense}
            onSave={handleSave}
            onCancel={handleCloseForm}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}