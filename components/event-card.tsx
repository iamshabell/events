"use client"

import { format } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, MapPin, Users } from "lucide-react"
import Link from "next/link"

interface Event {
  id: string
  title: string
  description: string
  location: string
  capacity: number
  event_date: string
}

interface EventCardProps {
  event: Event
  isPast?: boolean
}

export function EventCard({ event, isPast = false }: EventCardProps) {
  return (
    <Link href={`/events/${event.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-medium text-sm line-clamp-1">{event.title}</h3>
            {isPast && (
              <Badge variant="secondary" className="text-xs">
                Past
              </Badge>
            )}
          </div>
          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex items-center">
              <CalendarDays className="h-3 w-3 mr-1" />
              {format(new Date(event.event_date), "MMM d, yyyy h:mm a")}
            </div>
            <div className="flex items-center">
              <MapPin className="h-3 w-3 mr-1" />
              <span className="line-clamp-1">{event.location}</span>
            </div>
            <div className="flex items-center">
              <Users className="h-3 w-3 mr-1" />
              {event.capacity} seats
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
