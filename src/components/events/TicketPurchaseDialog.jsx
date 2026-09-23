import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Ticket, CreditCard, Calendar, MapPin, Loader2, AlertCircle } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function TicketPurchaseDialog({ event, isOpen, onClose, currentUser }) {
  const [quantity, setQuantity] = useState(1);
  const [purchaserInfo, setPurchaserInfo] = useState({
    name: currentUser?.full_name || '',
    email: currentUser?.email || '',
    phone: '',
    guest_names: '',
    special_requests: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);

  if (!event) return null;

  const ticketsRemaining = (event.tickets_available || 0) - (event.tickets_sold || 0);
  const isEarlyBird = event.early_bird_price && event.early_bird_deadline && !isPast(new Date(event.early_bird_deadline));
  const unitPrice = isEarlyBird ? event.early_bird_price : (event.ticket_price || 0);
  const totalAmount = unitPrice * quantity;

  const handlePurchase = async () => {
    if (!purchaserInfo.name || !purchaserInfo.email) {
      toast.error('Please fill in your name and email');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await base44.functions.invoke('createEventTicketCheckout', {
        event_id: event.id,
        quantity: quantity,
        ticket_type: isEarlyBird ? 'early_bird' : 'standard',
        purchaser_info: purchaserInfo
      });

      if (response.data.free) {
        toast.success('Free ticket confirmed! Check your email for details.');
        onClose();
      } else if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Failed to process purchase. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-blue-600" />
            Purchase Tickets
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Event Summary */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-lg">{event.title}</h3>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {event.event_date && format(new Date(event.event_date), 'MMM d, yyyy')}
              </span>
              {event.venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {event.venue}
                </span>
              )}
            </div>
          </div>

          {/* Ticket Availability */}
          {ticketsRemaining <= 10 && ticketsRemaining > 0 && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg text-orange-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Only {ticketsRemaining} tickets left!</span>
            </div>
          )}

          {/* Pricing */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Ticket Price</span>
              <div className="text-right">
                {isEarlyBird && (
                  <Badge className="bg-green-100 text-green-800 mb-1">Early Bird</Badge>
                )}
                <p className="text-xl font-bold">${unitPrice.toFixed(2)}</p>
              </div>
            </div>
            {isEarlyBird && (
              <p className="text-xs text-green-600">
                Early bird pricing ends {format(new Date(event.early_bird_deadline), 'MMM d, yyyy')}
              </p>
            )}
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label>Number of Tickets</Label>
            <Select value={String(quantity)} onValueChange={(v) => setQuantity(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(n => n <= ticketsRemaining).map(n => (
                  <SelectItem key={n} value={String(n)}>{n} ticket{n > 1 ? 's' : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Purchaser Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Your Name *</Label>
              <Input
                value={purchaserInfo.name}
                onChange={(e) => setPurchaserInfo({ ...purchaserInfo, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={purchaserInfo.email}
                onChange={(e) => setPurchaserInfo({ ...purchaserInfo, email: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Phone (optional)</Label>
            <Input
              value={purchaserInfo.phone}
              onChange={(e) => setPurchaserInfo({ ...purchaserInfo, phone: e.target.value })}
            />
          </div>

          {quantity > 1 && (
            <div className="space-y-2">
              <Label>Guest Names (optional)</Label>
              <Textarea
                placeholder="Enter names of additional attendees"
                value={purchaserInfo.guest_names}
                onChange={(e) => setPurchaserInfo({ ...purchaserInfo, guest_names: e.target.value })}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Special Requests (optional)</Label>
            <Textarea
              placeholder="Dietary restrictions, accessibility needs, etc."
              value={purchaserInfo.special_requests}
              onChange={(e) => setPurchaserInfo({ ...purchaserInfo, special_requests: e.target.value })}
            />
          </div>

          {/* Total */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Total</span>
              <span className="text-2xl font-bold text-blue-600">${totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handlePurchase} disabled={isProcessing || ticketsRemaining < quantity}>
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                {totalAmount === 0 ? 'Get Free Ticket' : `Pay $${totalAmount.toFixed(2)}`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}