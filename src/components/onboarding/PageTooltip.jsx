import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, Lightbulb } from 'lucide-react';

export default function PageTooltip({ 
  isVisible, 
  onDismiss, 
  title, 
  description, 
  actions 
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Delay showing to allow page to render
      const timer = setTimeout(() => setShow(true), 500);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [isVisible]);

  if (!show) return null;

  return (
    <Alert className="mb-6 border-blue-200 bg-blue-50 relative">
      <Lightbulb className="h-4 w-4 text-blue-600" />
      <AlertDescription>
        <div className="flex items-start justify-between">
          <div className="flex-1 pr-4">
            <p className="font-semibold text-blue-900 mb-1">{title}</p>
            <p className="text-sm text-blue-700 mb-3">{description}</p>
            {actions && (
              <div className="flex gap-2">
                {actions.map((action, idx) => (
                  <Button
                    key={idx}
                    size="sm"
                    variant={action.variant || 'default'}
                    onClick={action.onClick}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            className="h-6 w-6 -mt-1"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}