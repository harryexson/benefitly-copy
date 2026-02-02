import React from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Calendar, Download, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function EventCalendarExport({ event }) {
  if (!event) return null;

  const formatDateForCalendar = (dateStr, timeStr) => {
    const date = new Date(dateStr);
    if (timeStr) {
      const [hours, minutes] = timeStr.split(':');
      date.setHours(parseInt(hours), parseInt(minutes));
    }
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const startDate = formatDateForCalendar(event.event_date, event.event_time);
  const endDate = formatDateForCalendar(
    event.event_date, 
    event.event_end_time || event.event_time
  );

  const eventTitle = encodeURIComponent(event.title);
  const eventDescription = encodeURIComponent(event.description || event.publicity_blurb || '');
  const eventLocation = encodeURIComponent(event.venue || '');

  // Google Calendar URL
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${startDate}/${endDate}&details=${eventDescription}&location=${eventLocation}`;

  // Outlook Calendar URL
  const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${eventTitle}&startdt=${event.event_date}T${event.event_time || '00:00'}&enddt=${event.event_date}T${event.event_end_time || '23:59'}&body=${eventDescription}&location=${eventLocation}`;

  // Generate ICS file for Apple Calendar / Download
  const generateICS = () => {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Benefitly//Event//EN
BEGIN:VEVENT
UID:${event.id}@benefitly.app
DTSTAMP:${formatDateForCalendar(new Date().toISOString().split('T')[0], null)}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${event.title}
DESCRIPTION:${event.description || event.publicity_blurb || ''}
LOCATION:${event.venue || ''}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success('Calendar file downloaded');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Calendar className="h-4 w-4 mr-2" />
          Add to Calendar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => window.open(googleCalendarUrl, '_blank')}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Google Calendar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.open(outlookUrl, '_blank')}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Outlook Calendar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={generateICS}>
          <Download className="h-4 w-4 mr-2" />
          Download .ics (Apple/Other)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}