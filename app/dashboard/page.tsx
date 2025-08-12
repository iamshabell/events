"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { NotionCalendar } from "@/components/notion-calendar"
import { CreateEventDialog } from "@/components/create-event-dialog"
import { LogOut, CalendarIcon, QrCode } from "lucide-react"
import Link from "next/link"

interface Event {
  id: string
  title: string
  description: string
  location: string
  capacity: number
  event_date: string
  created_at: string
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  const ensureProfileExists = async (user: any) => {
    try {
      // Check if profile exists
      const { data: existingProfile } = await supabase.from("profiles").select("id").eq("id", user.id).single()

      if (!existingProfile) {
        // Create profile if it doesn't exist
        const { error: profileError } = await supabase.from("profiles").insert([
          {
            id: user.id,
            email: user.email || "",
            full_name: user.user_metadata?.full_name || user.email || "",
          },
        ])

        if (profileError && profileError.code !== "23505") {
          console.error("Error creating profile:", profileError)
        }
      }
    } catch (err) {
      console.error("Error ensuring profile exists:", err)
    }
  }

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      setUser(user)

      // Ensure profile exists
      await ensureProfileExists(user)

      // Fetch events
      await fetchEvents()
      setLoading(false)
    }

    getUser()
  }, [router, supabase])

  const fetchEvents = async () => {
    const { data, error } = await supabase.from("events").select("*").order("event_date", { ascending: true })

    if (error) {
      console.error("Error fetching events:", error)
    } else {
      setEvents(data || [])
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const handleDateTimeSelect = (date: Date, time: string) => {
    setSelectedDate(date)
    setSelectedTime(time)
    setShowCreateDialog(true)
  }

  const handleCreateEvent = () => {
    setSelectedDate(new Date())
    setSelectedTime("")
    setShowCreateDialog(true)
  }

  const handleEventClick = (eventId: string) => {
    router.push(`/events/${eventId}`)
  }

  const handleEventCreated = () => {
    fetchEvents()
    setShowCreateDialog(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <CalendarIcon className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">Event Manager</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/scan">
                <Button variant="outline" size="sm">
                  <QrCode className="h-4 w-4 mr-2" />
                  QR Scanner
                </Button>
              </Link>
              <span className="text-sm text-gray-600">Welcome, {user?.user_metadata?.full_name || user?.email}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Calendar */}
      <NotionCalendar
        events={events}
        onDateTimeSelect={handleDateTimeSelect}
        onCreateEvent={handleCreateEvent}
        onEventClick={handleEventClick}
      />

      <CreateEventDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        onEventCreated={handleEventCreated}
      />
    </div>
  )
}
