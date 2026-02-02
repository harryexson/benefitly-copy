import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Event, Volunteer } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Calendar, MapPin, PartyPopper } from 'lucide-react';
import { format } from 'date-fns';
import { createPageUrl } from '@/utils';

export default function VolunteerRegistration() {
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const navigate = useNavigate();
  const location = useLocation();
  const eventId = new URLSearchParams(location.search).get('event_id');

  useEffect(() => {
    if (!eventId) {
      toast.error("No event specified.");
      navigate(createPageUrl('LandingPage'));
      return;
    }

    const fetchEvent = async () => {
      try {
        setIsLoading(true);
        const eventData = await Event.get(eventId);
        if (!eventData) {
          toast.error("Event not found.");
          navigate(createPageUrl('LandingPage'));
        } else {
          setEvent(eventData);
        }
      } catch (error) {
        toast.error("Failed to load event details.");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvent();
  }, [eventId, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await Volunteer.create({
        event_id: eventId,
        ...formData,
        status: 'Confirmed'
      });
      toast.success(`Thank you for volunteering for ${event.title}!`);
      // Reset form or show a success message component
      setFormData({ name: '', email: '', phone: '' });
      // Potentially navigate to a thank you page
    } catch (error) {
      toast.error("Registration failed. Please try again.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Skeleton className="h-96 w-full max-w-lg" />
      </div>
    );
  }

  if (!event) {
    return (
       <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <p>Event not found.</p>
       </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-2xl">
            <CardHeader className="text-center">
                <PartyPopper className="mx-auto h-12 w-12 text-blue-500 mb-4" />
                <CardTitle className="text-2xl">Volunteer for an Event!</CardTitle>
                <CardDescription>Your help makes our community stronger. Sign up below.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 space-y-2">
                    <h3 className="font-bold text-lg text-blue-800">{event.title}</h3>
                    <div className="flex items-center text-sm text-gray-600 gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(event.event_date), 'EEEE, MMMM d, yyyy')}</span>
                    </div>
                     <div className="flex items-center text-sm text-gray-600 gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{event.venue || 'Venue to be announced'}</span>
                    </div>
                    <p className="text-sm text-gray-700 pt-2">{event.publicity_blurb}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                    </div>
                    <Button type="submit" disabled={isSubmitting} className="w-full">
                        {isSubmitting ? 'Submitting...' : 'Sign Up to Volunteer'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    </div>
  );
}