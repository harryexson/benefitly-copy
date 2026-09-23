import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Search, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export default function DrillDownModal({ 
  isOpen, 
  onClose, 
  title, 
  description,
  data = [],
  columns = [],
  filters = [],
  onExport
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [activeFilters, setActiveFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredData = useMemo(() => {
    let result = [...data];
    
    // Apply search
    if (searchTerm) {
      result = result.filter(item => 
        Object.values(item).some(val => 
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    // Apply filters
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        result = result.filter(item => String(item[key]) === value);
      }
    });
    
    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        return sortConfig.direction === 'asc' 
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
    }
    
    return result;
  }, [data, searchTerm, activeFilters, sortConfig]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const handleExport = () => {
    if (onExport) {
      onExport(filteredData);
    } else {
      // Default CSV export
      const headers = columns.map(c => c.label).join(',');
      const rows = filteredData.map(item => 
        columns.map(c => {
          const val = item[c.key];
          return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
        }).join(',')
      );
      const csv = [headers, ...rows].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_export.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const renderCellValue = (item, column) => {
    const value = item[column.key];
    
    if (column.render) {
      return column.render(value, item);
    }
    
    if (column.type === 'currency') {
      return `$${Number(value).toFixed(2)}`;
    }
    
    if (column.type === 'date') {
      return value ? format(new Date(value), 'MMM d, yyyy') : '-';
    }
    
    if (column.type === 'badge') {
      const colorMap = {
        'Active': 'bg-green-100 text-green-800',
        'Paid': 'bg-green-100 text-green-800',
        'Pending': 'bg-yellow-100 text-yellow-800',
        'Due': 'bg-yellow-100 text-yellow-800',
        'Past Due': 'bg-red-100 text-red-800',
        'Suspended': 'bg-red-100 text-red-800',
      };
      return (
        <Badge className={colorMap[value] || 'bg-gray-100 text-gray-800'}>
          {value}
        </Badge>
      );
    }
    
    return value ?? '-';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        
        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {filters.map(filter => (
              <Select 
                key={filter.key}
                value={activeFilters[filter.key] || 'all'}
                onValueChange={(value) => setActiveFilters(prev => ({ ...prev, [filter.key]: value }))}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={filter.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All {filter.label}</SelectItem>
                  {filter.options.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
            
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
          
          {/* Results count */}
          <div className="text-sm text-gray-500">
            Showing {paginatedData.length} of {filteredData.length} results
          </div>
          
          {/* Table */}
          <div className="flex-1 overflow-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map(column => (
                    <TableHead 
                      key={column.key}
                      className={column.sortable ? 'cursor-pointer hover:bg-gray-50' : ''}
                      onClick={() => column.sortable && handleSort(column.key)}
                    >
                      <div className="flex items-center gap-1">
                        {column.label}
                        {column.sortable && (
                          <ArrowUpDown className="h-3 w-3 text-gray-400" />
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((item, index) => (
                    <TableRow key={item.id || index}>
                      {columns.map(column => (
                        <TableCell key={column.key}>
                          {renderCellValue(item, column)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center py-8 text-gray-500">
                      No data found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}