"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CalendarDays, MapPin, Users, CheckCircle, XCircle, Clock, Download } from "lucide-react"
import { format } from "date-fns"
import QRCodeLib from "qrcode"

interface Event {
  id: string
  title: string
  description: string
  location: string
  capacity: number
  event_date: string
}

interface Participant {
  id: string
  email: string
  name: string
  status: "pending" | "accepted" | "declined" | "checked-in"
  event_id: string
}

export default function InvitationPage({ params }: { params: { token: string } }) {
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [updating, setUpdating] = useState(false)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchInvitationDetails()
  }, [params.token])

  useEffect(() => {
    if (participant && event && qrCanvasRef.current) {
      generateQRCode()
    }
  }, [participant, event])

  const fetchInvitationDetails = async () => {
    try {
      // Fetch participant by invitation token
      const { data: participantData, error: participantError } = await supabase
        .from("participants")
        .select("*")
        .eq("invitation_token", params.token)
        .single()

      if (participantError) {
        setError("Invalid invitation link")
        return
      }

      setParticipant(participantData)

      // Fetch event details
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", participantData.event_id)
        .single()

      if (eventError) {
        setError("Event not found")
        return
      }

      setEvent(eventData)
    } catch (err) {
      setError("Failed to load invitation details")
    } finally {
      setLoading(false)
    }
  }

  const generateQRCode = async () => {
    if (!qrCanvasRef.current || !participant) return

    try {
      const checkInUrl = `${window.location.origin}/scan?token=${participant.event_id}`
      await QRCodeLib.toCanvas(qrCanvasRef.current, checkInUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: "#111827",
          light: "#ffffff",
        },
      })
    } catch (error) {
      console.error("QR Code generation error:", error)
    }
  }

  const handleResponse = async (response: "accepted" | "declined") => {
    if (!participant) return

    setUpdating(true)
    try {
      const { error } = await supabase.from("participants").update({ status: response }).eq("id", participant.id)

      if (error) {
        setError("Failed to update response")
      } else {
        setParticipant((prev) => (prev ? { ...prev, status: response } : null))
      }
    } catch (err) {
      setError("Failed to update response")
    } finally {
      setUpdating(false)
    }
  }

  const handleCheckIn = async () => {
    if (!participant) return

    setUpdating(true)
    try {
      const { error } = await supabase.from("participants").update({ status: "checked-in" }).eq("id", participant.id)

      if (error) {
        setError("Failed to check in")
      } else {
        setParticipant((prev) => (prev ? { ...prev, status: "checked-in" } : null))
      }
    } catch (err) {
      setError("Failed to check in")
    } finally {
      setUpdating(false)
    }
  }

  const downloadQRCode = () => {
    if (!qrCanvasRef.current || !participant) return

    const link = document.createElement("a")
    link.download = `${event?.title || "event"}-qr-code.png`
    link.href = qrCanvasRef.current.toDataURL()
    link.click()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error || !participant || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-red-600 mb-2">Invalid Invitation</h2>
              <p className="text-gray-600">{error || "This invitation link is not valid or has expired."}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isEventPast = new Date(event.event_date) < new Date()
  const canCheckIn = participant.status === "accepted" && !isEventPast

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8 lg:py-12 px-3 sm:px-4 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">You're Invited</h1>
          <p className="text-sm sm:text-base text-gray-600 px-2">
            {participant.name ? `Hi ${participant.name}` : `Hi ${participant.email}`}, you've been invited to an event.
          </p>
        </div>

        <div className="space-y-4 sm:space-y-6 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0">
          {/* QR Code Card - Mobile First */}
          <div className="lg:hidden">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Check-in QR Code</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="bg-white p-4 rounded-lg border inline-block mb-4">
                  <canvas ref={qrCanvasRef} className="mx-auto" />
                </div>
                <p className="text-sm text-gray-600 mb-4">Show this QR code at the event entrance for check-in</p>
                <Button onClick={downloadQRCode} variant="outline" size="sm" className="w-full bg-transparent">
                  <Download className="h-4 w-4 mr-2" />
                  Download QR Code
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Event Details */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Event Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl sm:text-2xl">{event.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {event.description && <p className="text-sm sm:text-base text-gray-600">{event.description}</p>}

                <div className="space-y-3">
                  <div className="flex items-start sm:items-center text-gray-600">
                    <CalendarDays className="h-5 w-5 mr-3 mt-0.5 sm:mt-0 flex-shrink-0" />
                    <span className="text-sm sm:text-base break-words">{format(new Date(event.event_date), "EEEE, MMMM d, yyyy h:mm a")}</span>
                  </div>
                  <div className="flex items-start sm:items-center text-gray-600">
                    <MapPin className="h-5 w-5 mr-3 mt-0.5 sm:mt-0 flex-shrink-0" />
                    <span className="text-sm sm:text-base break-words">{event.location}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Users className="h-5 w-5 mr-3 flex-shrink-0" />
                    <span className="text-sm sm:text-base">{event.capacity} total seats</span>
                  </div>
                </div>

                {isEventPast && (
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>This event has already taken place.</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* RSVP Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="text-lg sm:text-xl">Your Status</span>
                  <Badge
                    className="self-start sm:self-auto"
                    variant={
                      participant.status === "accepted"
                        ? "default"
                        : participant.status === "declined"
                          ? "destructive"
                          : participant.status === "checked-in"
                            ? "secondary"
                            : "outline"
                    }
                  >
                    {participant.status === "checked-in"
                      ? "Checked In"
                      : participant.status.charAt(0).toUpperCase() + participant.status.slice(1)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {participant.status === "pending" && !isEventPast && (
                  <div className="space-y-4">
                    <p className="text-sm sm:text-base text-gray-600">Please respond to this invitation:</p>
                    <div className="flex flex-col sm:flex-row gap-3 sm:space-x-3">
                      <Button onClick={() => handleResponse("accepted")} disabled={updating} className="flex-1 h-12 sm:h-auto text-base">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleResponse("declined")}
                        disabled={updating}
                        className="flex-1 bg-transparent h-12 sm:h-auto text-base"
                      >
                        <XCircle className="h-5 w-5 mr-2" />
                        Decline
                      </Button>
                    </div>
                  </div>
                )}

                {participant.status === "accepted" && !isEventPast && (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                        <span className="text-green-800 font-medium">You've accepted this invitation!</span>
                      </div>
                      <p className="text-green-700 text-sm mt-1">We look forward to seeing you at the event.</p>
                    </div>

                    {canCheckIn && (
                      <div className="space-y-3">
                        <p className="text-gray-600 text-sm sm:text-base">Ready to check in? Click the button below:</p>
                        <Button onClick={handleCheckIn} disabled={updating} className="w-full h-12 text-base font-semibold">
                          <CheckCircle className="h-5 w-5 mr-2" />
                          Check In Now
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {participant.status === "declined" && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <XCircle className="h-5 w-5 text-red-600 mr-2" />
                      <span className="text-red-800 font-medium">You've declined this invitation</span>
                    </div>
                    <p className="text-red-700 text-sm mt-1">
                      Thank you for letting us know. We hope to see you at future events!
                    </p>
                  </div>
                )}

                {participant.status === "checked-in" && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="text-blue-800 font-medium">You're checked in!</span>
                    </div>
                    <p className="text-blue-700 text-sm mt-1">Welcome to the event. Enjoy your time!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* QR Code Sidebar - Desktop Only */}
          <div className="hidden lg:block space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Check-in QR Code</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="bg-white p-4 rounded-lg border inline-block">
                  <canvas ref={qrCanvasRef} className="mx-auto" />
                </div>
                <p className="text-sm text-gray-600 mt-3 mb-4">Show this QR code at the event entrance for check-in</p>
                <Button onClick={downloadQRCode} variant="outline" size="sm" className="w-full bg-transparent">
                  <Download className="h-4 w-4 mr-2" />
                  Download QR Code
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900">Email</p>
                  <p className="text-gray-600 break-all">{participant.email}</p>
                </div>
                {participant.name && (
                  <div>
                    <p className="font-medium text-gray-900">Name</p>
                    <p className="text-gray-600">{participant.name}</p>
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">Status</p>
                  <Badge variant="outline" className="mt-1">
                    {participant.status.charAt(0).toUpperCase() + participant.status.slice(1)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Details Card */}
          <div className="lg:hidden">
            <Card>
              <CardHeader>
                <CardTitle>Your Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900">Email</p>
                  <p className="text-gray-600 break-all text-xs sm:text-sm">{participant.email}</p>
                </div>
                {participant.name && (
                  <div>
                    <p className="font-medium text-gray-900">Name</p>
                    <p className="text-gray-600">{participant.name}</p>
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">Status</p>
                  <Badge variant="outline" className="mt-1">
                    {participant.status.charAt(0).toUpperCase() + participant.status.slice(1)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-gray-200">
          <p className="text-gray-500 text-xs sm:text-sm px-4">
            This is your personal invitation. Please do not share this link with others.
          </p>
        </div>
      </div>
    </div>
  )
}
