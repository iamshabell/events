"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Plus, X } from "lucide-react"

interface AddParticipantDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  onParticipantAdded: () => void
}

export function AddParticipantDialog({ open, onOpenChange, eventId, onParticipantAdded }: AddParticipantDialogProps) {
  const [participants, setParticipants] = useState([{ email: "", name: "" }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const supabase = createClient()

  const addParticipantField = () => {
    setParticipants([...participants, { email: "", name: "" }])
  }

  const removeParticipantField = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index))
  }

  const updateParticipant = (index: number, field: "email" | "name", value: string) => {
    const updated = [...participants]
    updated[index][field] = value
    setParticipants(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Filter out empty participants
      const validParticipants = participants.filter((p) => p.email.trim())

      if (validParticipants.length === 0) {
        setError("Please add at least one participant with an email address")
        return
      }

      // Generate invitation tokens and QR codes
      const participantsToInsert = validParticipants.map((participant) => {
        const invitationToken = crypto.randomUUID()
        const qrCodeData = `${window.location.origin}/invitation/${invitationToken}`

        return {
          event_id: eventId,
          email: participant.email.trim(),
          name: participant.name.trim() || null,
          invitation_token: invitationToken,
          qr_code_data: qrCodeData,
          status: "pending",
        }
      })

      const { error } = await supabase.from("participants").insert(participantsToInsert)

      if (error) {
        if (error.code === "23505") {
          // Unique constraint violation
          setError("One or more participants are already registered for this event")
        } else {
          setError(error.message)
        }
      } else {
        // Reset form
        setParticipants([{ email: "", name: "" }])
        onParticipantAdded()
        onOpenChange(false)
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Participants</DialogTitle>
          <DialogDescription>
            Add one or more participants to your event. They will receive invitation emails with QR codes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {participants.map((participant, index) => (
              <div key={index} className="grid gap-3 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Participant {index + 1}</h4>
                  {participants.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeParticipantField(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`email-${index}`}>Email *</Label>
                  <Input
                    id={`email-${index}`}
                    type="email"
                    value={participant.email}
                    onChange={(e) => updateParticipant(index, "email", e.target.value)}
                    placeholder="participant@example.com"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`name-${index}`}>Name (Optional)</Label>
                  <Input
                    id={`name-${index}`}
                    value={participant.name}
                    onChange={(e) => updateParticipant(index, "name", e.target.value)}
                    placeholder="Participant name"
                  />
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addParticipantField} className="w-full bg-transparent">
              <Plus className="h-4 w-4 mr-2" />
              Add Another Participant
            </Button>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Participants
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
