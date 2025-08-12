"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Camera, CheckCircle, XCircle, Loader2, Type } from "lucide-react"
import Link from "next/link"

export default function QRScanPage() {
  const [scanning, setScanning] = useState(false)
  const [manualToken, setManualToken] = useState("")
  const [result, setResult] = useState<{ success: boolean; message: string; participant?: any } | null>(null)
  const [loading, setLoading] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const supabase = createClient()

  const processToken = async (token: string) => {
    setLoading(true)
    setResult(null)

    try {
      // Extract token from URL if it's a full URL
      const tokenMatch = token.match(/invitation\/([a-f0-9-]+)/) || [null, token]
      const cleanToken = tokenMatch[1]

      if (!cleanToken) {
        setResult({ success: false, message: "Invalid QR code format" })
        return
      }

      // Find participant by token
      const { data: participant, error: participantError } = await supabase
        .from("participants")
        .select(`
          *,
          events (
            id,
            title,
            location,
            event_date
          )
        `)
        .eq("invitation_token", cleanToken)
        .single()

      if (participantError || !participant) {
        setResult({ success: false, message: "Invalid invitation token" })
        return
      }

      // Check if already checked in
      if (participant.status === "checked-in") {
        setResult({
          success: false,
          message: `${participant.name || participant.email} is already checked in!`,
          participant,
        })
        return
      }

      // Check if participant has accepted
      if (participant.status !== "accepted") {
        setResult({
          success: false,
          message: `Participant must accept invitation before checking in. Current status: ${participant.status}`,
          participant,
        })
        return
      }

      // Update status to checked-in
      const { error: updateError } = await supabase
        .from("participants")
        .update({ status: "checked-in" })
        .eq("id", participant.id)

      if (updateError) {
        setResult({ success: false, message: "Failed to check in participant" })
        return
      }

      setResult({
        success: true,
        message: `Successfully checked in ${participant.name || participant.email}!`,
        participant: { ...participant, status: "checked-in" },
      })
    } catch (error) {
      setResult({ success: false, message: "An error occurred while processing the QR code" })
    } finally {
      setLoading(false)
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualToken.trim()) {
      processToken(manualToken.trim())
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setScanning(true)
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
      alert("Unable to access camera. Please use manual token entry.")
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
    setScanning(false)
  }

  // Simple QR code detection (in a real app, you'd use a proper QR code library)
  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const video = videoRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    // In a real implementation, you would use a QR code scanning library here
    // For demo purposes, we'll just show the manual input
  }

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (scanning) {
      interval = setInterval(scanQRCode, 500)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [scanning])

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Event Check-In</h1>
          <p className="text-gray-600">Scan QR codes or enter invitation tokens to check in participants</p>
        </div>

        <div className="grid gap-6">
          {/* Camera Scanner */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Camera className="h-5 w-5 mr-2" />
                QR Code Scanner
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!scanning ? (
                  <Button onClick={startCamera} className="w-full">
                    <Camera className="h-4 w-4 mr-2" />
                    Start Camera
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full rounded-lg border"
                        style={{ maxHeight: "300px" }}
                      />
                      <canvas ref={canvasRef} className="hidden" />
                    </div>
                    <Button onClick={stopCamera} variant="outline" className="w-full bg-transparent">
                      Stop Camera
                    </Button>
                  </div>
                )}
                <p className="text-sm text-gray-500 text-center">
                  Point your camera at a participant's QR code to check them in
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Manual Token Entry */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Type className="h-5 w-5 mr-2" />
                Manual Token Entry
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="token">Invitation Token or URL</Label>
                  <Input
                    id="token"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="Enter invitation token or paste invitation URL"
                    className="mt-1"
                  />
                </div>
                <Button type="submit" disabled={loading || !manualToken.trim()} className="w-full">
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Check In Participant
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Result Display */}
          {result && (
            <Card>
              <CardContent className="pt-6">
                <Alert variant={result.success ? "default" : "destructive"}>
                  {result.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  <AlertDescription>{result.message}</AlertDescription>
                </Alert>

                {result.participant && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Participant Details</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>
                        <strong>Name:</strong> {result.participant.name || "N/A"}
                      </p>
                      <p>
                        <strong>Email:</strong> {result.participant.email}
                      </p>
                      <p>
                        <strong>Status:</strong>{" "}
                        <span
                          className={`font-medium ${
                            result.participant.status === "checked-in" ? "text-green-600" : "text-yellow-600"
                          }`}
                        >
                          {result.participant.status.replace("-", " ").toUpperCase()}
                        </span>
                      </p>
                      {result.participant.events && (
                        <>
                          <p>
                            <strong>Event:</strong> {result.participant.events.title}
                          </p>
                          <p>
                            <strong>Location:</strong> {result.participant.events.location}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="text-center mt-8">
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
