import React from 'react';
import { Button } from '@/components/ui/button';
import { X, GripVertical, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardWidgetGrid({ 
  widgets, 
  onRemoveWidget, 
  onToggleSize,
  isEditing,
  children 
}) {
  return (
    <div className="grid gap-6" style={{
      gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))'
    }}>
      {React.Children.map(children, (child, index) => {
        const widget = widgets[index];
        if (!widget || !widget.visible) return null;
        
        return (
          <div 
            className={cn(
              "relative transition-all",
              widget.size === 'large' && "col-span-2",
              widget.size === 'full' && "col-span-full"
            )}
          >
            {isEditing && (
              <div className="absolute -top-2 -right-2 z-10 flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 bg-white shadow-md"
                  onClick={() => onToggleSize(widget.id)}
                >
                  {widget.size === 'normal' ? (
                    <Maximize2 className="h-3 w-3" />
                  ) : (
                    <Minimize2 className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 bg-white shadow-md hover:bg-red-50 hover:text-red-600"
                  onClick={() => onRemoveWidget(widget.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            {isEditing && (
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 cursor-move">
                <GripVertical className="h-5 w-5 text-gray-400" />
              </div>
            )}
            {child}
          </div>
        );
      })}
    </div>
  );
}