"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO } from "date-fns"

interface Event {
  id: string
  title: string
  description: string
  location: string
  capacity: number
  event_date: string
  created_at: string
}

interface NotionCalendarProps {
  events: Event[]
  onDateTimeSelect: (date: Date, time: string) => void
  onCreateEvent: () => void
  onEventClick: (eventId: string) => void
}

export function NotionCalendar({ events, onDateTimeSelect, onCreateEvent, onEventClick }: NotionCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const timeSlots = Array.from({ length: 17 }, (_, i) => {
    const hour = i + 7 // Start from 7 AM
    return {
      time: `${hour}:00`,
      display: hour > 12 ? `${hour - 12} PM` : hour === 12 ? `12 PM` : `${hour} AM`,
      hour,
    }
  })

  const goToPreviousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1))
  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1))
  const goToToday = () => setCurrentWeek(new Date())

  const getEventsForDateTime = (date: Date, hour: number) => {
    return events.filter((event) => {
      const eventDate = parseISO(event.event_date)
      return isSameDay(eventDate, date) && eventDate.getHours() === hour
    })
  }

  const handleTimeSlotClick = (date: Date, time: string, e: React.MouseEvent) => {
    // Only create event if clicking on empty space, not on an event
    if ((e.target as HTMLElement).closest(".event-block")) {
      return
    }
    onDateTimeSelect(date, time)
  }

  const MiniCalendar = () => {
    const [miniCurrentDate, setMiniCurrentDate] = useState(new Date())
    const monthStart = new Date(miniCurrentDate.getFullYear(), miniCurrentDate.getMonth(), 1)
    const monthEnd = new Date(miniCurrentDate.getFullYear(), miniCurrentDate.getMonth() + 1, 0)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 41) // 6 weeks

    const days = []
    const day = startDate
    while (day <= endDate) {
      days.push(new Date(day))
      day.setDate(day.getDate() + 1)
    }

    const goToPreviousMonth = () => {
      setMiniCurrentDate(new Date(miniCurrentDate.getFullYear(), miniCurrentDate.getMonth() - 1, 1))
    }

    const goToNextMonth = () => {
      setMiniCurrentDate(new Date(miniCurrentDate.getFullYear(), miniCurrentDate.getMonth() + 1, 1))
    }

    return (
      <div className="w-64 bg-white border-r border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-medium text-sm">{format(miniCurrentDate, "MMMM yyyy")}</h3>
          <Button variant="ghost" size="sm" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
            <div key={day} className="text-xs text-gray-500 text-center py-1 font-medium">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            const isCurrentMonth = day.getMonth() === miniCurrentDate.getMonth()
            const isToday = isSameDay(day, new Date())
            const isSelected = isSameDay(day, selectedDate)
            const hasEvents = events.some((event) => isSameDay(parseISO(event.event_date), day))

            return (
              <button
                key={index}
                onClick={() => {
                  setSelectedDate(day)
                  setCurrentWeek(day)
                }}
                className={`
                  text-xs p-1 rounded hover:bg-gray-100 transition-colors relative
                  ${!isCurrentMonth ? "text-gray-300" : "text-gray-700"}
                  ${isToday ? "bg-blue-100 text-blue-600 font-semibold" : ""}
                  ${isSelected ? "bg-blue-500 text-white" : ""}
                `}
              >
                {day.getDate()}
                {hasEvents && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full"></div>
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-6 space-y-2">
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
            Scheduling
          </div>
          <div className="text-xs text-gray-500 pl-4">Event Management</div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-gray-600">
            <Plus className="h-3 w-3 mr-2" />
            Add calendar account
          </Button>
        </div>
      </div>
    )
  }

  const upcomingEvents = events.filter((event) => new Date(event.event_date) >= new Date()).slice(0, 3)

  return (
    <div className="flex h-screen bg-gray-50">
      <MiniCalendar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" onClick={goToPreviousWeek}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={goToNextWeek}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">{format(weekStart, "MMMM yyyy")}</h1>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button size="sm" onClick={onCreateEvent}>
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-8 min-h-full">
            {/* Time column */}
            <div className="bg-white border-r border-gray-200">
              <div className="h-16 border-b border-gray-200 flex items-center justify-center text-xs text-gray-500 font-medium">
                GMT+3
              </div>
              {timeSlots.map((slot) => (
                <div key={slot.time} className="h-16 border-b border-gray-100 flex items-start justify-end pr-3 pt-1">
                  <span className="text-xs text-gray-500">{slot.display}</span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((day, dayIndex) => (
              <div key={dayIndex} className="bg-white border-r border-gray-200 last:border-r-0">
                {/* Day header */}
                <div className="h-16 border-b border-gray-200 flex flex-col items-center justify-center">
                  <div className="text-xs text-gray-500 font-medium">{format(day, "EEE").toUpperCase()}</div>
                  <div
                    className={`text-lg font-semibold mt-1 ${
                      isSameDay(day, new Date())
                        ? "bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center"
                        : "text-gray-900"
                    }`}
                  >
                    {format(day, "d")}
                  </div>
                </div>

                {/* Time slots */}
                {timeSlots.map((slot) => {
                  const dayEvents = getEventsForDateTime(day, slot.hour)
                  return (
                    <div
                      key={`${dayIndex}-${slot.time}`}
                      className="h-16 border-b border-gray-100 relative group cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={(e) => handleTimeSlotClick(day, slot.time, e)}
                    >
                      {dayEvents.map((event) => (
                        <div
                          key={event.id}
                          className="event-block absolute inset-x-1 top-1 bg-blue-100 border-l-4 border-blue-500 rounded px-2 py-1 text-xs cursor-pointer hover:bg-blue-200 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            onEventClick(event.id)
                          }}
                        >
                          <div className="font-medium text-blue-900 truncate">{event.title}</div>
                          <div className="text-blue-700 truncate">{event.location}</div>
                        </div>
                      ))}
                      {dayEvents.length === 0 && (
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                          <Plus className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="w-80 bg-white border-l border-gray-200 p-6">
        <div className="space-y-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-3">
              {upcomingEvents.length > 0 ? "Upcoming Events" : "No upcoming events"}
            </h3>
            {upcomingEvents.length > 0 ? (
              <div className="space-y-2">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => onEventClick(event.id)}
                  >
                    <div className="font-medium text-sm text-gray-900 truncate">{event.title}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {format(new Date(event.event_date), "MMM d, h:mm a")}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{event.location}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Create your first event to get started!</p>
            )}
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start bg-transparent"
                onClick={onCreateEvent}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-3">Useful shortcuts</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <span>Command menu</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">⌘ K</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Create event</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">C</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Go to today</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">T</span>
              </div>
              <div className="flex items-center justify-between">
                <span>All keyboard shortcuts</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">?</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
