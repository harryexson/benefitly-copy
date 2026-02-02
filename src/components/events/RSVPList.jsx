import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, HelpCircle, X, Users } from 'lucide-react';

export default function RSVPList({ rsvps = [], members = [], users = [] }) {
  const getAttendeeInfo = (rsvp) => {
    if (rsvp.member_id) {
      const member = members.find(m => m.id === rsvp.member_id);
      return member ? {
        name: `${member.first_name} ${member.last_name}`,
        email: member.email,
        type: 'member'
      } : { name: 'Unknown Member', email: '', type: 'member' };
    }
    if (rsvp.user_id) {
      const user = users.find(u => u.id === rsvp.user_id);
      return user ? {
        name: user.full_name,
        email: user.email,
        type: 'user'
      } : { name: 'Unknown User', email: '', type: 'user' };
    }
    return { name: 'Unknown', email: '', type: 'unknown' };
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const goingRsvps = rsvps.filter(r => r.status === 'going');
  const maybeRsvps = rsvps.filter(r => r.status === 'maybe');
  const notGoingRsvps = rsvps.filter(r => r.status === 'not_going');

  const totalGuests = rsvps.reduce((sum, r) => sum + (r.guest_count || 0), 0);
  const totalAttending = goingRsvps.length + goingRsvps.reduce((sum, r) => sum + (r.guest_count || 0), 0);

  const renderRsvpItem = (rsvp) => {
    const info = getAttendeeInfo(rsvp);
    return (
      <div key={rsvp.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{getInitials(info.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{info.name}</p>
            {rsvp.guest_count > 0 && (
              <p className="text-xs text-gray-500">+{rsvp.guest_count} guest{rsvp.guest_count > 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
        {info.type === 'member' && (
          <Badge variant="outline" className="text-xs">Member</Badge>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            RSVPs
          </CardTitle>
          <div className="text-sm text-gray-500">
            {totalAttending} total attending
            {totalGuests > 0 && ` (incl. ${totalGuests} guests)`}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="going" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="going" className="flex items-center gap-1">
              <Check className="h-3 w-3 text-green-600" />
              Going ({goingRsvps.length})
            </TabsTrigger>
            <TabsTrigger value="maybe" className="flex items-center gap-1">
              <HelpCircle className="h-3 w-3 text-yellow-600" />
              Maybe ({maybeRsvps.length})
            </TabsTrigger>
            <TabsTrigger value="not_going" className="flex items-center gap-1">
              <X className="h-3 w-3 text-red-600" />
              No ({notGoingRsvps.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="going" className="mt-4 space-y-1 max-h-64 overflow-y-auto">
            {goingRsvps.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No RSVPs yet</p>
            ) : (
              goingRsvps.map(renderRsvpItem)
            )}
          </TabsContent>

          <TabsContent value="maybe" className="mt-4 space-y-1 max-h-64 overflow-y-auto">
            {maybeRsvps.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No maybe responses</p>
            ) : (
              maybeRsvps.map(renderRsvpItem)
            )}
          </TabsContent>

          <TabsContent value="not_going" className="mt-4 space-y-1 max-h-64 overflow-y-auto">
            {notGoingRsvps.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No declines</p>
            ) : (
              notGoingRsvps.map(renderRsvpItem)
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}