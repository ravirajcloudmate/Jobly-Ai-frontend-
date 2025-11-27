'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  Briefcase,
  CalendarDays,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRealtimeUpdates, globalEvents } from '../hooks/useRealtimeUpdates';

interface CalendarProps {
  user: any;
  globalRefreshKey?: number;
}

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: 'interview' | 'meeting' | 'reminder' | 'other';
  description?: string;
  candidate_name?: string;
  job_title?: string;
}

export function Calendar({ user, globalRefreshKey }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  // Get current month/year
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  // Get company ID
  useEffect(() => {
    (async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();
      setCompanyId(data?.company_id || null);
    })();
  }, [user?.id]);

  // Load events function
  const loadEvents = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      // Load interview invitations with dates
      const { data: invitations, error: invError } = await supabase
        .from('interview_invitations')
        .select(`
          id,
          candidate_name,
          candidate_email,
          interview_date,
          interview_time,
          job_postings (
            job_title
          )
        `)
        .eq('company_id', companyId)
        .not('interview_date', 'is', null);

      if (invError) throw invError;

      const calendarEvents: CalendarEvent[] = (invitations || []).map((inv: any) => {
        // Normalize date to YYYY-MM-DD format
        let normalizedDate = inv.interview_date;
        if (normalizedDate) {
          // If date is a Date object, convert to string
          if (normalizedDate instanceof Date) {
            normalizedDate = normalizedDate.toISOString().split('T')[0];
          } else if (typeof normalizedDate === 'string') {
            // If it's already a string, ensure it's in YYYY-MM-DD format
            // Remove time part if present
            normalizedDate = normalizedDate.split('T')[0];
            // Ensure proper format (YYYY-MM-DD)
            const dateParts = normalizedDate.split('-');
            if (dateParts.length === 3) {
              normalizedDate = `${dateParts[0]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`;
            }
          }
        }
        
        console.log('📅 Calendar Event:', {
          id: inv.id,
          candidate: inv.candidate_name || inv.candidate_email,
          originalDate: inv.interview_date,
          normalizedDate: normalizedDate,
          time: inv.interview_time
        });
        
        return {
          id: inv.id,
          title: `Interview: ${inv.candidate_name || inv.candidate_email}`,
          date: normalizedDate,
          time: inv.interview_time || undefined,
          type: 'interview' as const,
          candidate_name: inv.candidate_name,
          job_title: inv.job_postings?.job_title,
          description: `Interview with ${inv.candidate_name || inv.candidate_email}`
        };
      });

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error loading calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load events on mount and when dependencies change
  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    loadEvents();
  }, [companyId, currentDate, globalRefreshKey]);

  // Listen to global refresh events
  useEffect(() => {
    if (!companyId) return;
    
    const handleCalendarRefresh = () => {
      console.log('📅 Calendar refresh triggered');
      loadEvents();
    };

    globalEvents.on('calendar:refresh', handleCalendarRefresh);
    globalEvents.on('refresh', handleCalendarRefresh);

    return () => {
      globalEvents.off('calendar:refresh', handleCalendarRefresh);
      globalEvents.off('refresh', handleCalendarRefresh);
    };
  }, [companyId]);

  // Close pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.month-picker') && !target.closest('.year-picker')) {
        setShowMonthPicker(false);
        setShowYearPicker(false);
      }
    };

    if (showMonthPicker || showYearPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMonthPicker, showYearPicker]);

  // Real-time subscription to interview_invitations table
  useRealtimeUpdates({
    companyId: companyId || '',
    tables: ['interview_invitations'],
    onUpdate: (table, eventType) => {
      console.log(`📅 Real-time update: ${table} ${eventType}`);
      loadEvents();
    },
    debounceMs: 500
  });

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
    setShowMonthPicker(false);
    setShowYearPicker(false);
  };

  const goToPreviousYear = () => {
    setCurrentDate(new Date(currentYear - 1, currentMonth, 1));
  };

  const goToNextYear = () => {
    setCurrentDate(new Date(currentYear + 1, currentMonth, 1));
  };

  const selectMonth = (month: number) => {
    setCurrentDate(new Date(currentYear, month, 1));
    setShowMonthPicker(false);
  };

  const selectYear = (year: number) => {
    setCurrentDate(new Date(year, currentMonth, 1));
    setShowYearPicker(false);
  };

  // Get date range for current view
  const getDateRange = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    return {
      start: firstDay,
      end: lastDay,
      startFormatted: firstDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      endFormatted: lastDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
  };

  const dateRange = getDateRange();

  // Normalize date to YYYY-MM-DD format (without timezone issues)
  const normalizeDate = (date: Date | string): string => {
    if (typeof date === 'string') {
      return date.split('T')[0];
    }
    // Use local date components to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateStr = normalizeDate(date);
    return events.filter(event => {
      // Normalize event date for comparison
      const eventDateStr = normalizeDate(event.date);
      return eventDateStr === dateStr;
    });
  };

  // Check if date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Check if date is selected
  const isSelected = (date: Date): boolean => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  // Render calendar grid
  const renderCalendarGrid = () => {
    const days = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Day headers with full day names
    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={`header-${i}`} className="text-center py-3 border-b">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {dayNamesShort[i]}
          </div>
          <div className="text-[10px] text-muted-foreground mt-1 hidden md:block">
            {dayNames[i]}
          </div>
        </div>
      );
    }

    // Previous month days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - 1, daysInPrevMonth - i);
      const dayEvents = getEventsForDate(date);
      days.push(
        <div
          key={`prev-${i}`}
          className="min-h-[80px] p-1 border border-border rounded-md bg-muted/30"
        >
          <div className="text-xs text-muted-foreground mb-1 font-medium">{daysInPrevMonth - i}</div>
          {dayEvents.length > 0 && (
            <div className="space-y-1">
              {dayEvents.slice(0, 2).map((event) => (
                <div
                  key={event.id}
                  className="text-[10px] px-1 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded truncate"
                >
                  {event.time ? `${event.time.substring(0, 5)} ` : ''}
                  {event.candidate_name || 'Interview'}
                </div>
              ))}
              {dayEvents.length > 2 && (
                <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 2}</div>
              )}
            </div>
          )}
        </div>
      );
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dayEvents = getEventsForDate(date);
      const today = isToday(date);
      const selected = isSelected(date);

      days.push(
        <div
          key={`day-${day}`}
          onClick={() => setSelectedDate(date)}
          className={`min-h-[80px] p-1 border rounded-md cursor-pointer transition-colors ${
            today
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
              : selected
              ? 'border-primary bg-primary/10'
              : 'border-border hover:bg-muted/50'
          }`}
        >
          <div
            className={`text-sm font-semibold ${
              today 
                ? 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded-full w-6 h-6 flex items-center justify-center' 
                : selected 
                ? 'text-primary font-bold' 
                : 'text-foreground'
            }`}
          >
            {day}
          </div>
          {dayEvents.length > 0 && (
            <div className="space-y-1">
              {dayEvents.slice(0, 2).map((event) => (
                <div
                  key={event.id}
                  className={`text-[10px] px-1 py-0.5 rounded truncate ${
                    event.type === 'interview'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                  title={event.title}
                >
                  {event.time ? `${event.time.substring(0, 5)} ` : ''}
                  {event.candidate_name || 'Interview'}
                </div>
              ))}
              {dayEvents.length > 2 && (
                <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 2}</div>
              )}
            </div>
          )}
        </div>
      );
    }

    // Next month days to fill the grid
    const totalCells = days.length;
    const remainingCells = 42 - totalCells; // 6 rows * 7 days
    for (let i = 1; i <= remainingCells; i++) {
      const date = new Date(currentYear, currentMonth + 1, i);
      const dayEvents = getEventsForDate(date);
      days.push(
        <div
          key={`next-${i}`}
          className="min-h-[80px] p-1 border border-border rounded-md bg-muted/30"
        >
          <div className="text-xs text-muted-foreground mb-1 font-medium">{i}</div>
          {dayEvents.length > 0 && (
            <div className="space-y-1">
              {dayEvents.slice(0, 2).map((event) => (
                <div
                  key={event.id}
                  className="text-[10px] px-1 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded truncate"
                >
                  {event.time ? `${event.time.substring(0, 5)} ` : ''}
                  {event.candidate_name || 'Interview'}
                </div>
              ))}
              {dayEvents.length > 2 && (
                <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 2}</div>
              )}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  // Get selected date events
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground mt-1">
            Manage your interviews and schedule
          </p>
        </div>
      </div>

      {/* Calendar Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              {/* Year Navigation */}
              <Button variant="ghost" size="icon" onClick={goToPreviousYear} title="Previous Year">
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={goToPreviousMonth} title="Previous Month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              {/* Month/Year Selector */}
              <div className="relative month-picker">
                <Button
                  variant="ghost"
                  className="text-xl font-semibold min-w-[200px] justify-center"
                  onClick={() => {
                    setShowMonthPicker(!showMonthPicker);
                    setShowYearPicker(false);
                  }}
                >
                  {monthNames[currentMonth]} {currentYear}
                </Button>
                
                {/* Month Picker Dropdown */}
                {showMonthPicker && (
                  <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-900 border rounded-lg shadow-lg z-50 p-2 grid grid-cols-3 gap-1 min-w-[200px] month-picker">
                    {monthNames.map((month, index) => (
                      <button
                        key={index}
                        onClick={() => selectMonth(index)}
                        className={`px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors ${
                          index === currentMonth
                            ? 'bg-primary text-primary-foreground font-semibold'
                            : ''
                        }`}
                      >
                        {month.substring(0, 3)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Year Picker */}
              <div className="relative year-picker">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowYearPicker(!showYearPicker);
                    setShowMonthPicker(false);
                  }}
                >
                  {currentYear}
                </Button>
                
                {/* Year Picker Dropdown */}
                {showYearPicker && (
                  <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-900 border rounded-lg shadow-lg z-50 p-2 max-h-[200px] overflow-y-auto min-w-[100px] year-picker">
                    {Array.from({ length: 11 }, (_, i) => currentYear - 5 + i).map((year) => (
                      <button
                        key={year}
                        onClick={() => selectYear(year)}
                        className={`w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-left ${
                          year === currentYear
                            ? 'bg-primary text-primary-foreground font-semibold'
                            : ''
                        }`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button variant="ghost" size="icon" onClick={goToNextMonth} title="Next Month">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={goToNextYear} title="Next Year">
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4 inline mr-1" />
                {dateRange.startFormatted} - {dateRange.endFormatted}
              </div>
              <Button variant="outline" onClick={goToToday} size="sm">
                Today
              </Button>
            </div>
          </div>
          
          {/* Date Range Info */}
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <div>
                <span className="font-medium">Current View:</span> {monthNames[currentMonth]} {currentYear}
              </div>
              <div>
                <span className="font-medium">Total Events:</span> {events.length}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={viewMode === 'month' ? 'default' : 'outline'}>
                Month View
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {renderCalendarGrid()}
              </div>
              
              {/* Calendar Footer Info */}
              <div className="pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-100 dark:bg-blue-900/30"></div>
                    <span>Interview Scheduled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span>Today</span>
                  </div>
                </div>
                <div>
                  Showing {events.length} {events.length === 1 ? 'event' : 'events'} in {monthNames[currentMonth]} {currentYear}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Date Events */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </CardTitle>
            <CardDescription>
              {selectedDateEvents.length} {selectedDateEvents.length === 1 ? 'event' : 'events'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDateEvents.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No events scheduled for this date
              </p>
            ) : (
              <div className="space-y-3">
                {selectedDateEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg">{event.title}</h3>
                        {event.job_title && (
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Briefcase className="h-4 w-4" />
                            <span>{event.job_title}</span>
                          </div>
                        )}
                        {event.time && (
                          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>{event.time}</span>
                          </div>
                        )}
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
                        )}
                      </div>
                      <Badge
                        variant={
                          event.type === 'interview'
                            ? 'default'
                            : event.type === 'meeting'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {event.type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upcoming Events Summary */}
      {!selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
            <CardDescription>Next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No upcoming events
              </p>
            ) : (
              <div className="space-y-3">
                {events
                  .filter((event) => {
                    const eventDate = new Date(event.date);
                    const today = new Date();
                    const nextWeek = new Date(today);
                    nextWeek.setDate(today.getDate() + 7);
                    return eventDate >= today && eventDate <= nextWeek;
                  })
                  .sort((a, b) => {
                    const dateA = new Date(`${a.date} ${a.time || '00:00'}`);
                    const dateB = new Date(`${b.date} ${b.time || '00:00'}`);
                    return dateA.getTime() - dateB.getTime();
                  })
                  .slice(0, 5)
                  .map((event) => (
                    <div
                      key={event.id}
                      className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedDate(new Date(event.date));
                        setCurrentDate(new Date(event.date));
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <CalendarIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{event.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(event.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                            {event.time && ` at ${event.time}`}
                          </p>
                        </div>
                        <Badge variant="outline">{event.type}</Badge>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

