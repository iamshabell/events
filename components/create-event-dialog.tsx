"use client"

import React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { format } from "date-fns"

interface CreateEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate?: Date
  selectedTime?: string
  onEventCreated: () => void
}

export function CreateEventDialog({
  open,
  onOpenChange,
  selectedDate,
  selectedTime,
  onEventCreated,
}: CreateEventDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [capacity, setCapacity] = useState("")
  const [eventDate, setEventDate] = useState("")
  const [eventTime, setEventTime] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const supabase = createClient()

  // Set default date and time when dialog opens
  React.useEffect(() => {
    if (selectedDate && open) {
      setEventDate(format(selectedDate, "yyyy-MM-dd"))
    }
    if (selectedTime && open) {
      setEventTime(selectedTime)
    }
  }, [selectedDate, selectedTime, open])

  const ensureProfileExists = async (userId: string) => {
    try {
      // First, try to get the user's profile
      const { data: existingProfile } = await supabase.from("profiles").select("id").eq("id", userId).single()

      if (!existingProfile) {
        // Profile doesn't exist, get user data and create it
        const { data: userData } = await supabase.auth.getUser()
        if (userData.user) {
          const { error: profileError } = await supabase.from("profiles").insert([
            {
              id: userData.user.id,
              email: userData.user.email || "",
              full_name: userData.user.user_metadata?.full_name || userData.user.email || "",
            },
          ])

          if (profileError && profileError.code !== "23505") {
            // 23505 is unique constraint violation, which means profile already exists
            console.error("Error creating profile:", profileError)
            throw new Error("Failed to create user profile")
          }
        }
      }
    } catch (err) {
      console.error("Error ensuring profile exists:", err)
      // Don't throw here, let the event creation proceed
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError("You must be logged in to create events")
        return
      }

      // Ensure profile exists before creating event
      await ensureProfileExists(user.id)

      // Combine date and time
      const eventDateTime = new Date(`${eventDate}T${eventTime}`)

      const { error } = await supabase.from("events").insert([
        {
          title,
          description,
          location,
          capacity: Number.parseInt(capacity),
          event_date: eventDateTime.toISOString(),
          created_by: user.id,
        },
      ])

      if (error) {
        console.error("Event creation error:", error)
        if (error.code === "23503") {
          setError("Profile setup incomplete. Please try logging out and back in.")
        } else {
          setError(error.message)
        }
      } else {
        // Reset form
        setTitle("")
        setDescription("")
        setLocation("")
        setCapacity("")
        setEventDate("")
        setEventTime("")
        onEventCreated()
      }
    } catch (err) {
      console.error("Unexpected error:", err)
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            Fill in the details for your new event. You can add participants after creating the event.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2">
              <Label htmlFor="title">Event Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter event title"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter event description"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter event location"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="Maximum number of attendees"
                min="1"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="eventDate">Date</Label>
                <Input
                  id="eventDate"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="eventTime">Time</Label>
                <Input
                  id="eventTime"
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Event
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
