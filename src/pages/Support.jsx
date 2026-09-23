import React, { useState, useEffect } from 'react';
import { SupportTicket, AssociationAccount } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SupportTicketsTable from '../components/support/SupportTicketsTable';
import SupportTicketForm from '../components/support/SupportTicketForm';

export default function Support() {
  const [tickets, setTickets] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('open');

  const loadData = async () => {
    setIsLoading(true);
    const [ticketList, accountList] = await Promise.all([
      SupportTicket.list('-created_date'),
      AssociationAccount.list()
    ]);
    setTickets(ticketList);
    setAccounts(accountList);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenForm = (ticket = null) => {
    setEditingTicket(ticket);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingTicket(null);
    setIsFormOpen(false);
  };

  const handleSave = async () => {
    await loadData();
    handleCloseForm();
  };
  
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (ticket.ticket_number && ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesTab = activeTab === 'all' || ticket.status.toLowerCase().replace('_', '') === activeTab.replace('_', '');
    return matchesSearch && matchesTab;
  });

  const statusCounts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Support Center</h2>
          <p className="text-gray-500">Manage and resolve customer support tickets.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by subject or ticket #"
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={() => handleOpenForm()} className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5" />
            New Ticket
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
          <TabsTrigger value="open">Open ({statusCounts.open})</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress ({statusCounts.in_progress})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({statusCounts.resolved})</TabsTrigger>
          <TabsTrigger value="closed">Closed ({statusCounts.closed})</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-6">
            <SupportTicketsTable
                tickets={filteredTickets}
                accounts={accounts}
                onEdit={handleOpenForm}
                isLoading={isLoading}
            />
        </TabsContent>
      </Tabs>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingTicket ? `Edit Ticket #${editingTicket.ticket_number}` : 'Create New Support Ticket'}</DialogTitle>
            <DialogDescription>
              {editingTicket ? 'Update the details for this support ticket.' : 'Fill in the details for the new support ticket.'}
            </DialogDescription>
          </DialogHeader>
          <SupportTicketForm
            ticket={editingTicket}
            accounts={accounts}
            onSave={handleSave}
            onCancel={handleCloseForm}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}