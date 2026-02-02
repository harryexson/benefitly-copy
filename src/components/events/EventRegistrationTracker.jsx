import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, Clock, Search, Download, 
  UserCheck, Mail, Phone 
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function EventRegistrationTracker({ 
  tickets, 
  rsvps, 
  volunteers,
  contributions,
  members,
  onCheckIn,
  onSendReminder 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('tickets');

  const getMemberName = (memberId) => {
    const member = members?.find(m => m.id === memberId);
    return member ? `${member.first_name} ${member.last_name}` : 'Unknown';
  };

  const getMemberEmail = (memberId) => {
    const member = members?.find(m => m.id === memberId);
    return member?.email || '';
  };

  const handleExport = (type) => {
    let data = [];
    let filename = '';

    switch (type) {
      case 'tickets':
        data = tickets || [];
        filename = 'event-tickets.csv';
        break;
      case 'rsvps':
        data = rsvps || [];
        filename = 'event-rsvps.csv';
        break;
      case 'volunteers':
        data = volunteers || [];
        filename = 'event-volunteers.csv';
        break;
    }

    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }

    // Create CSV
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(item => Object.values(item).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    toast.success('Exported successfully');
  };

  const filterData = (data, searchFields) => {
    if (!searchTerm) return data;
    
    return data.filter(item => {
      return searchFields.some(field => {
        const value = item[field]?.toString().toLowerCase() || '';
        return value.includes(searchTerm.toLowerCase());
      });
    });
  };

  const filteredTickets = filterData(tickets || [], ['purchaser_email', 'purchaser_name']);
  const filteredRsvps = filterData(rsvps || [], ['name', 'email']);
  const filteredVolunteers = filterData(volunteers || [], ['name', 'email']);

  const statusColors = {
    'Confirmed': 'bg-green-100 text-green-800 border-green-200',
    'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Declined': 'bg-red-100 text-red-800 border-red-200',
    'Attended': 'bg-blue-100 text-blue-800 border-blue-200',
    'Cancelled': 'bg-gray-100 text-gray-800 border-gray-200'
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Registration & Attendance Tracking</CardTitle>
          <div className="flex gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleExport(activeTab)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {tickets && tickets.length > 0 && (
              <TabsTrigger value="tickets">
                Tickets ({tickets.length})
              </TabsTrigger>
            )}
            {rsvps && rsvps.length > 0 && (
              <TabsTrigger value="rsvps">
                RSVPs ({rsvps.length})
              </TabsTrigger>
            )}
            {volunteers && volunteers.length > 0 && (
              <TabsTrigger value="volunteers">
                Volunteers ({volunteers.length})
              </TabsTrigger>
            )}
            {contributions && contributions.length > 0 && (
              <TabsTrigger value="contributions">
                Contributions ({contributions.length})
              </TabsTrigger>
            )}
          </TabsList>

          {/* Tickets Tab */}
          <TabsContent value="tickets">
            {filteredTickets.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket #</TableHead>
                      <TableHead>Attendee</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Purchased</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Check-in</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTickets.map(ticket => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-mono text-sm">
                          #{ticket.ticket_number || ticket.id.slice(-6)}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{ticket.purchaser_name}</div>
                          <div className="text-xs text-gray-500">{ticket.quantity} ticket(s)</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-gray-400" />
                            {ticket.purchaser_email}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(ticket.created_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="font-semibold">
                          ${ticket.amount_paid.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {ticket.checked_in ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Checked In
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-600">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {!ticket.checked_in && onCheckIn && (
                            <Button 
                              size="sm" 
                              onClick={() => onCheckIn(ticket.id)}
                            >
                              <UserCheck className="h-3 w-3 mr-1" />
                              Check In
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No tickets found
              </div>
            )}
          </TabsContent>

          {/* RSVPs Tab */}
          <TabsContent value="rsvps">
            {filteredRsvps.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Response Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Guest Count</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRsvps.map(rsvp => (
                      <TableRow key={rsvp.id}>
                        <TableCell className="font-medium">{rsvp.name}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3 text-gray-400" />
                              {rsvp.email}
                            </div>
                            {rsvp.phone && (
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <Phone className="h-3 w-3" />
                                {rsvp.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(rsvp.created_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColors[rsvp.status] || ''}>
                            {rsvp.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{rsvp.guest_count || 1}</TableCell>
                        <TableCell className="text-right">
                          {onSendReminder && rsvp.status === 'Pending' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => onSendReminder(rsvp.email)}
                            >
                              Send Reminder
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No RSVPs found
              </div>
            )}
          </TabsContent>

          {/* Volunteers Tab */}
          <TabsContent value="volunteers">
            {filteredVolunteers.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVolunteers.map(volunteer => (
                      <TableRow key={volunteer.id}>
                        <TableCell className="font-medium">{volunteer.name}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3 text-gray-400" />
                              {volunteer.email}
                            </div>
                            {volunteer.phone && (
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <Phone className="h-3 w-3" />
                                {volunteer.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(volunteer.created_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColors[volunteer.status] || ''}>
                            {volunteer.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {onSendReminder && volunteer.status === 'Pending' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => onSendReminder(volunteer.email)}
                            >
                              Send Reminder
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No volunteers found
              </div>
            )}
          </TabsContent>

          {/* Contributions Tab */}
          <TabsContent value="contributions">
            {contributions && contributions.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Paid Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contributions
                      .filter(c => {
                        if (!searchTerm) return true;
                        const memberName = getMemberName(c.member_id).toLowerCase();
                        const memberEmail = getMemberEmail(c.member_id).toLowerCase();
                        return memberName.includes(searchTerm.toLowerCase()) || 
                               memberEmail.includes(searchTerm.toLowerCase());
                      })
                      .map(contrib => (
                        <TableRow key={contrib.id}>
                          <TableCell className="font-medium">
                            {getMemberName(contrib.member_id)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {getMemberEmail(contrib.member_id)}
                          </TableCell>
                          <TableCell className="font-semibold">
                            ${contrib.amount_due.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(contrib.due_date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={
                                contrib.status === 'Paid' ? 'bg-green-100 text-green-800 border-green-200' :
                                contrib.status === 'Past Due' ? 'bg-red-100 text-red-800 border-red-200' :
                                'bg-yellow-100 text-yellow-800 border-yellow-200'
                              }
                            >
                              {contrib.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {contrib.paid_at ? format(new Date(contrib.paid_at), 'MMM d, yyyy') : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No contributions found
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}