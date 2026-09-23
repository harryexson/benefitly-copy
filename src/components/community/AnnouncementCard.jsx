import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pin, AlertTriangle, Clock, Eye, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const priorityStyles = {
  normal: 'bg-blue-50 border-blue-200',
  important: 'bg-yellow-50 border-yellow-300',
  urgent: 'bg-red-50 border-red-300'
};

const priorityBadge = {
  normal: 'bg-blue-100 text-blue-800',
  important: 'bg-yellow-100 text-yellow-800',
  urgent: 'bg-red-100 text-red-800'
};

export default function AnnouncementCard({ 
  announcement, 
  onView, 
  onEdit, 
  onDelete,
  isAdmin = false,
  compact = false
}) {
  const isExpired = announcement.expires_at && new Date(announcement.expires_at) < new Date();

  if (compact) {
    return (
      <div 
        className={`p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-shadow ${priorityStyles[announcement.priority]}`}
        onClick={() => onView?.(announcement)}
      >
        <div className="flex items-start gap-2">
          {announcement.priority === 'urgent' && (
            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
          )}
          {announcement.is_pinned && (
            <Pin className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm line-clamp-1">{announcement.title}</h4>
            <p className="text-xs text-gray-600 line-clamp-1 mt-0.5">{announcement.content}</p>
            <span className="text-xs text-gray-400 mt-1 block">
              {format(new Date(announcement.publish_date || announcement.created_date), 'MMM d')}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={`${priorityStyles[announcement.priority]} ${isExpired ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {announcement.is_pinned && <Pin className="h-4 w-4 text-blue-500" />}
            {announcement.priority === 'urgent' && <AlertTriangle className="h-4 w-4 text-red-500" />}
            <CardTitle className="text-lg">{announcement.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={priorityBadge[announcement.priority]}>
              {announcement.priority}
            </Badge>
            {isExpired && <Badge variant="outline" className="text-gray-500">Expired</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700 whitespace-pre-wrap mb-4">{announcement.content}</p>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(announcement.publish_date || announcement.created_date), 'MMM d, yyyy h:mm a')}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {announcement.view_count || 0} views
            </span>
            {announcement.expires_at && (
              <span>Expires: {format(new Date(announcement.expires_at), 'MMM d, yyyy')}</span>
            )}
          </div>
          
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => onEdit?.(announcement)}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDelete?.(announcement)} className="text-red-600 hover:text-red-700">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}