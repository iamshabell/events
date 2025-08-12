"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, QrCode, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { QRCodeDialog } from "@/components/qr-code-dialog"

interface Participant {
  id: string
  email: string
  name: string
  status: "pending" | "accepted" | "declined" | "checked-in"
  invitation_token: string
  qr_code_data: string
  created_at: string
}

interface ParticipantListProps {
  participants: Participant[]
  onParticipantUpdated: () => void
}

export function ParticipantList({ participants, onParticipantUpdated }: ParticipantListProps) {
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)
  const [showQRDialog, setShowQRDialog] = useState(false)
  const supabase = createClient()

  const handleStatusChange = async (participantId: string, newStatus: string) => {
    const { error } = await supabase.from("participants").update({ status: newStatus }).eq("id", participantId)

    if (error) {
      console.error("Error updating participant status:", error)
    } else {
      onParticipantUpdated()
    }
  }

  const handleDeleteParticipant = async (participantId: string) => {
    if (confirm("Are you sure you want to remove this participant?")) {
      const { error } = await supabase.from("participants").delete().eq("id", participantId)

      if (error) {
        console.error("Error deleting participant:", error)
      } else {
        onParticipantUpdated()
      }
    }
  }

  const handleShowQR = (participant: Participant) => {
    setSelectedParticipant(participant)
    setShowQRDialog(true)
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "default",
      accepted: "default",
      declined: "destructive",
      "checked-in": "secondary",
    } as const

    return <Badge variant={variants[status as keyof typeof variants] || "default"}>{status.replace("-", " ")}</Badge>
  }

  if (participants.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No participants added yet.</p>
        <p className="text-sm">Add participants to start managing your event.</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants.map((participant) => (
              <TableRow key={participant.id}>
                <TableCell className="font-medium">{participant.name || "N/A"}</TableCell>
                <TableCell>{participant.email}</TableCell>
                <TableCell>{getStatusBadge(participant.status)}</TableCell>
                <TableCell className="text-sm text-gray-500">
                  {format(new Date(participant.created_at), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleShowQR(participant)}>
                        <QrCode className="mr-2 h-4 w-4" />
                        Show QR Code
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(participant.id, "pending")}>
                        Mark as Pending
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(participant.id, "accepted")}>
                        Mark as Accepted
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(participant.id, "declined")}>
                        Mark as Declined
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(participant.id, "checked-in")}>
                        Mark as Checked In
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteParticipant(participant.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <QRCodeDialog open={showQRDialog} onOpenChange={setShowQRDialog} participant={selectedParticipant} />
    </>
  )
}
