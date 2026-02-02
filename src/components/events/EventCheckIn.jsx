import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { QrCode, CheckCircle2, Users, Loader2, AlertCircle } from 'lucide-react';
import { EventTicket } from '@/entities/all';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function EventCheckIn({ event }) {
  const [tickets, setTickets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(null);

  useEffect(() => {
    loadTickets();
  }, [event?.id]);

  const loadTickets = async () => {
    if (!event?.id) return;
    try {
      setIsLoading(true);
      const ticketList = await EventTicket.filter({ event_id: event.id });
      setTickets(ticketList);
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckIn = async (ticket) => {
    setCheckingIn(ticket.id);
    try {
      const response = await base44.functions.invoke('checkInEventTicket', {
        ticket_number: ticket.ticket_number,
        event_id: event.id
      });

      if (response.data.success) {
        toast.success(`${ticket.purchaser_name} checked in successfully!`);
        loadTickets();
      } else {
        toast.error(response.data.error || 'Check-in failed');
      }
    } catch (error) {
      toast.error(error.message || 'Check-in failed');
    } finally {
      setCheckingIn(null);
    }
  };

  const handleManualSearch = async () => {
    if (!searchTerm.trim()) return;
    
    try {
      const response = await base44.functions.invoke('checkInEventTicket', {
        ticket_number: searchTerm.trim().toUpperCase(),
        event_id: event.id
      });

      if (response.data.success) {
        toast.success(`${response.data.attendee.name} checked in successfully!`);
        setSearchTerm('');
        loadTickets();
      } else {
        toast.error(response.data.error || 'Invalid ticket');
      }
    } catch (error) {
      toast.error(error.message || 'Invalid ticket');
    }
  };

  const confirmedTickets = tickets.filter(t => t.status === 'confirmed' || t.status === 'checked_in');
  const checkedInCount = tickets.filter(t => t.status === 'checked_in').reduce((sum, t) => sum + t.quantity, 0);
  const totalAttendees = confirmedTickets.reduce((sum, t) => sum + t.quantity, 0);

  const filteredTickets = confirmedTickets.filter(t => 
    t.purchaser_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.purchaser_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.ticket_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusBadge = (status) => {
    const styles = {
      'checked_in': 'bg-green-100 text-green-800',
      'confirmed': 'bg-blue-100 text-blue-800',
      'pending': 'bg-yellow-100 text-yellow-800'
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold">{totalAttendees}</p>
            <p className="text-xs text-gray-500">Total Expected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold">{checkedInCount}</p>
            <p className="text-xs text-gray-500">Checked In</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertCircle className="h-8 w-8 mx-auto text-orange-500 mb-2" />
            <p className="text-2xl font-bold">{totalAttendees - checkedInCount}</p>
            <p className="text-xs text-gray-500">Not Yet Arrived</p>
          </CardContent>
        </Card>
      </div>

      {/* Manual Check-In */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Quick Check-In
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter ticket number (e.g., TKT-ABC123-XYZ)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
            />
            <Button onClick={handleManualSearch}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Check In
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Attendee List */}
      <Card>
        <CardHeader>
          <CardTitle>Attendee List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket #</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map(ticket => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-mono text-sm">{ticket.ticket_number}</TableCell>
                    <TableCell>{ticket.purchaser_name}</TableCell>
                    <TableCell>{ticket.purchaser_email}</TableCell>
                    <TableCell>{ticket.quantity}</TableCell>
                    <TableCell>{statusBadge(ticket.status)}</TableCell>
                    <TableCell>
                      {ticket.status === 'confirmed' ? (
                        <Button
                          size="sm"
                          onClick={() => handleCheckIn(ticket)}
                          disabled={checkingIn === ticket.id}
                        >
                          {checkingIn === ticket.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Check In
                            </>
                          )}
                        </Button>
                      ) : (
                        <span className="text-sm text-gray-500">
                          {ticket.checked_in_at && format(new Date(ticket.checked_in_at), 'h:mm a')}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTickets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No tickets found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}