"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Mail, Loader2, CheckCircle, AlertCircle, ExternalLink, Info } from "lucide-react"

interface Participant {
  id: string
  email: string
  name: string
  status: string
  invitation_token: string
}

interface BulkInvitationSenderProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  participants: Participant[]
  eventId: string
  eventTitle: string
}

export function BulkInvitationSender({
  open,
  onOpenChange,
  participants,
  eventId,
  eventTitle,
}: BulkInvitationSenderProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    code?: string
    helpUrl?: string
    details?: {
      totalSent: number
      totalFailed: number
      errors?: Array<{ email: string; error: string }>
    }
  } | null>(null)

  const pendingParticipants = participants.filter((p) => p.status === "pending")

  const handleSendInvitations = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/send-invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId,
          participantIds: pendingParticipants.map((p) => p.id),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle specific error cases
        if (data.code === "MISSING_API_KEY") {
          setResult({
            success: false,
            message: "Email service not configured",
            code: data.code,
            details: {
              totalSent: 0,
              totalFailed: pendingParticipants.length,
            },
          })
        } else if (data.error === "Email domain verification required") {
          setResult({
            success: false,
            message: data.message,
            code: "DOMAIN_NOT_VERIFIED",
            helpUrl: data.helpUrl,
            details: data.details || {
              totalSent: data.totalSent || 0,
              totalFailed: data.totalFailed || pendingParticipants.length,
              errors: data.errors,
            },
          })
        } else {
          throw new Error(data.error || "Failed to send invitations")
        }
      } else {
        if (data.totalFailed > 0) {
          setResult({
            success: false,
            message: `Sent ${data.totalSent} invitations, but ${data.totalFailed} failed`,
            details: {
              totalSent: data.totalSent,
              totalFailed: data.totalFailed,
              errors: data.errors,
            },
          })
        } else {
          setResult({
            success: true,
            message: `Successfully sent ${data.totalSent} invitation emails for "${eventTitle}"`,
            details: {
              totalSent: data.totalSent,
              totalFailed: data.totalFailed,
            },
          })

          // Auto-close after success
          setTimeout(() => {
            onOpenChange(false)
            setResult(null)
          }, 3000)
        }
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Failed to send invitations. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  const renderDomainVerificationHelp = () => (
    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-start space-x-3">
        <Info className="h-5 w-5 text-blue-600 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-blue-900 mb-2">How to fix this:</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-800">
            <li>
              Go to{" "}
              <a
                href="https://resend.com/domains"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
              >
                Resend Domains
              </a>
            </li>
            <li>Add and verify your domain</li>
            <li>Update the RESEND_FROM_EMAIL environment variable</li>
            <li>Or use "onboarding@resend.dev" for testing</li>
          </ol>
          {result?.helpUrl && (
            <a
              href={result.helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center mt-2 text-blue-600 hover:text-blue-800"
            >
              Open Resend Domains <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Mail className="h-5 w-5 mr-2" />
            Send Email Invitations
          </DialogTitle>
          <DialogDescription>
            Send personalized invitation emails to all pending participants for "{eventTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {result && (
            <Alert variant={result.success ? "default" : "destructive"} className="mb-4">
              {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertDescription>
                <div>{result.message}</div>
                {result.details && result.details.errors && result.details.errors.length > 0 && (
                  <div className="mt-2">
                    <details className="text-xs">
                      <summary className="cursor-pointer font-medium">View failed emails</summary>
                      <div className="mt-1 space-y-1">
                        {result.details.errors.map((error, index) => (
                          <div key={index} className="text-red-600">
                            {error.email}: {error.error}
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {result?.code === "DOMAIN_NOT_VERIFIED" && renderDomainVerificationHelp()}

          {result?.code === "MISSING_API_KEY" && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-900 mb-2">Email service not configured</p>
                  <p className="text-yellow-800">
                    Please add your RESEND_API_KEY environment variable to enable email sending.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Pending participants:</span>
              <span className="font-medium">{pendingParticipants.length}</span>
            </div>

            {pendingParticipants.length > 0 && (
              <div className="max-h-32 overflow-y-auto border rounded p-3 bg-gray-50">
                {pendingParticipants.map((participant) => (
                  <div key={participant.id} className="flex items-center justify-between text-sm py-1">
                    <span className="text-gray-700">{participant.name || participant.email}</span>
                    <span className="text-xs text-gray-500">{participant.email}</span>
                  </div>
                ))}
              </div>
            )}

            {pendingParticipants.length === 0 && (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No pending participants to send invitations to.</p>
                <p className="text-xs text-gray-400 mt-1">
                  All participants have already been invited or have responded.
                </p>
              </div>
            )}
          </div>

          {pendingParticipants.length > 0 && !result && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-start space-x-2">
                <Mail className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-xs text-blue-800">
                  <p className="font-medium">Email will include:</p>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Event details and description</li>
                    <li>Personalized invitation link</li>
                    <li>RSVP functionality</li>
                    <li>QR code for check-in</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSendInvitations} disabled={loading || pendingParticipants.length === 0}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send {pendingParticipants.length} Email{pendingParticipants.length !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
