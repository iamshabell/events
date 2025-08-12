"use client"

import { useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, Copy } from "lucide-react"
import QRCode from "qrcode"

interface Participant {
  id: string
  email: string
  name: string
  invitation_token: string
  qr_code_data: string
}

interface QRCodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  participant: Participant | null
}

export function QRCodeDialog({ open, onOpenChange, participant }: QRCodeDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (open && participant && canvasRef.current) {
      const invitationUrl = `${window.location.origin}/invitation/${participant.invitation_token}`

      QRCode.toCanvas(
        canvasRef.current,
        invitationUrl,
        {
          width: 256,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        },
        (error) => {
          if (error) {
            console.error("QR Code generation error:", error)
            // Fallback: show the URL as text
            if (canvasRef.current) {
              const ctx = canvasRef.current.getContext("2d")
              if (ctx) {
                ctx.fillStyle = "#000000"
                ctx.font = "12px Arial"
                ctx.fillText("QR Code generation failed", 10, 50)
                ctx.fillText(invitationUrl, 10, 70)
              }
            }
          }
        },
      )
    }
  }, [open, participant])

  const handleDownload = () => {
    if (canvasRef.current && participant) {
      const link = document.createElement("a")
      link.download = `qr-code-${participant.email}.png`
      link.href = canvasRef.current.toDataURL()
      link.click()
    }
  }

  const handleCopyLink = async () => {
    if (participant) {
      const invitationUrl = `${window.location.origin}/invitation/${participant.invitation_token}`
      try {
        await navigator.clipboard.writeText(invitationUrl)
        alert("Invitation link copied to clipboard!")
      } catch (err) {
        console.error("Failed to copy link:", err)
      }
    }
  }

  if (!participant) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>QR Code for {participant.name || participant.email}</DialogTitle>
          <DialogDescription>This QR code can be scanned for event check-in</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4 py-4">
          <canvas ref={canvasRef} className="border rounded-lg" />
          <div className="flex space-x-2">
            <Button onClick={handleDownload} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button onClick={handleCopyLink} variant="outline">
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
          </div>
          <p className="text-xs text-gray-500 text-center">
            Participants can scan this QR code or use the invitation link to check in
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
