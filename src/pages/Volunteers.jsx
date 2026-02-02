import React, { useState, useEffect } from 'react';
import { Volunteer, Event } from '@/entities/all';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

export default function Volunteers() {
  const [volunteers, setVolunteers] = useState([]);
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterEventId, setFilterEventId] = useState('all');

  useEffect(() => {
    const loadData = async () => {
      try {
        await User.me(); // Auth check
        setIsLoading(true);
        const [volunteerList, eventList] = await Promise.all([
          Volunteer.list('-created_date'),
          Event.list()
        ]);
        setVolunteers(volunteerList);
        setEvents(eventList);
      } catch (error) {
        console.error("Failed to load volunteer data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const getEventTitle = (eventId) => {
    return events.find(e => e.id === eventId)?.title || 'Unknown Event';
  };

  const filteredVolunteers = volunteers.filter(v => 
    filterEventId === 'all' || v.event_id === filterEventId
  );

  const statusColors = {
    Pending: 'bg-yellow-100 text-yellow-800',
    Confirmed: 'bg-blue-100 text-blue-800',
    Attended: 'bg-green-100 text-green-800',
    Cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Volunteer Management</CardTitle>
          <CardDescription>View and manage all volunteers for your events.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Select onValueChange={setFilterEventId} value={filterEventId}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Filter by event..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {events.map(event => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Volunteer Name</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan="5" className="h-24 text-center">
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                ) : filteredVolunteers.length > 0 ? (
                  filteredVolunteers.map(volunteer => (
                    <TableRow key={volunteer.id}>
                      <TableCell className="font-medium">{volunteer.name}</TableCell>
                      <TableCell>{getEventTitle(volunteer.event_id)}</TableCell>
                      <TableCell>{volunteer.email}</TableCell>
                      <TableCell>{volunteer.phone || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[volunteer.status] || ''}>{volunteer.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan="5" className="h-24 text-center">
                      No volunteers found for the selected filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}