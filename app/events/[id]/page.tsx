"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ParticipantList } from "@/components/participant-list"
import { AddParticipantDialog } from "@/components/add-participant-dialog"
import { ArrowLeft, CalendarDays, MapPin, Users, Plus, Mail, Edit, Save, X } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { BulkInvitationSender } from "@/components/bulk-invitation-sender"

interface Event {
  id: string
  title: string
  description: string
  location: string
  capacity: number
  event_date: string
  created_by: string
}

interface Participant {
  id: string
  email: string
  name: string
  status: "pending" | "accepted" | "declined" | "checked-in"
  invitation_token: string
  qr_code_data: string
  created_at: string
}

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const [event, setEvent] = useState<Event | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    location: "",
    capacity: 0,
  })
  const router = useRouter()
  const supabase = createClient()
  const [showBulkInviteDialog, setShowBulkInviteDialog] = useState(false)

  useEffect(() => {
    fetchEventDetails()
  }, [params.id])

  // Add this useEffect to handle real-time updates
  useEffect(() => {
    if (!params.id) return

    // Set up real-time subscription for participants
    const channel = supabase
      .channel("participants-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
          filter: `event_id=eq.${params.id}`,
        },
        () => {
          // Refresh participants when changes occur
          fetchEventDetails()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [params.id, supabase])

  const fetchEventDetails = async () => {
    setLoading(true)
    try {
      // Fetch event details
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", params.id)
        .single()

      if (eventError) {
        setError("Event not found")
        setEvent(null)
        return
      }

      if (!eventData) {
        setError("Event not found")
        setEvent(null)
        return
      }

      setEvent(eventData)
      setEditForm({
        title: eventData.title,
        description: eventData.description || "",
        location: eventData.location,
        capacity: eventData.capacity,
      })

      // Fetch participants
      const { data: participantsData, error: participantsError } = await supabase
        .from("participants")
        .select("*")
        .eq("event_id", params.id)
        .order("created_at", { ascending: false })

      if (participantsError) {
        console.error("Error fetching participants:", participantsError)
      } else {
        setParticipants(participantsData || [])
      }
    } catch (err) {
      setError("Failed to load event details")
      setEvent(null)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateEvent = async () => {
    try {
      const { error } = await supabase
        .from("events")
        .update({
          title: editForm.title,
          description: editForm.description,
          location: editForm.location,
          capacity: editForm.capacity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id)

      if (error) {
        setError("Failed to update event")
      } else {
        setEvent((prev) => (prev ? { ...prev, ...editForm } : null))
        setIsEditing(false)
        fetchEventDetails()
      }
    } catch (err) {
      setError("Failed to update event")
    }
  }

  const handleSendInvitations = () => {
    setShowBulkInviteDialog(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading event...</p>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
              <p className="text-gray-600 mb-4">{error || "Event not found"}</p>
              <Link href="/dashboard">
                <Button>Back to Dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const availableSeats = event.capacity - participants.filter((p) => p.status !== "declined").length
  const checkedInCount = participants.filter((p) => p.status === "checked-in").length
  const pendingCount = participants.filter((p) => p.status === "pending").length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Event Details</h1>
          </div>
          <div className="flex items-center space-x-2">
            {pendingCount > 0 && (
              <Button onClick={handleSendInvitations}>
                <Mail className="h-4 w-4 mr-2" />
                Send Invitations ({pendingCount})
              </Button>
            )}
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Participant
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Event Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Event Information</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => (isEditing ? setIsEditing(false) : setIsEditing(true))}
                >
                  {isEditing ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={editForm.title}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={editForm.description}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={editForm.location}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="capacity">Capacity</Label>
                      <Input
                        id="capacity"
                        type="number"
                        value={editForm.capacity}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, capacity: Number.parseInt(e.target.value) }))
                        }
                      />
                    </div>
                    <Button onClick={handleUpdateEvent}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-semibold">{event.title}</h2>
                      {event.description && <p className="text-gray-600 mt-2">{event.description}</p>}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <CalendarDays className="h-4 w-4 mr-2" />
                        {format(new Date(event.event_date), "EEEE, MMMM d, yyyy h:mm a")}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2" />
                        {event.location}
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        {event.capacity} total seats
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Participants */}
            <Card>
              <CardHeader>
                <CardTitle>Participants ({participants.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ParticipantList participants={participants} onParticipantUpdated={fetchEventDetails} />
              </CardContent>
            </Card>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Event Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Capacity</span>
                  <Badge variant="outline">{event.capacity}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Registered</span>
                  <Badge variant="outline">{participants.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Available Seats</span>
                  <Badge variant={availableSeats > 0 ? "default" : "destructive"}>{availableSeats}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Checked In</span>
                  <Badge variant="secondary">{checkedInCount}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {["pending", "accepted", "declined", "checked-in"].map((status) => {
                  const count = participants.filter((p) => p.status === status).length
                  return (
                    <div key={status} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 capitalize">{status}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AddParticipantDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        eventId={params.id}
        onParticipantAdded={fetchEventDetails}
      />
      <BulkInvitationSender
        open={showBulkInviteDialog}
        onOpenChange={setShowBulkInviteDialog}
        participants={participants}
        eventId={params.id}
        eventTitle={event?.title || ""}
      />
    </div>
  )
}
