"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, Loader2 } from "lucide-react"

interface ResendConfirmationProps {
  email: string
}

export function ResendConfirmation({ email }: ResendConfirmationProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const supabase = createClient()

  const handleResend = async () => {
    setLoading(true)
    setError("")
    setMessage("")

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setError(error.message)
      } else {
        setMessage("Confirmation email sent! Please check your inbox and spam folder.")
      }
    } catch (err) {
      setError("Failed to resend confirmation email")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {message && (
        <Alert>
          <Mail className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button onClick={handleResend} disabled={loading} variant="outline" size="sm" className="w-full bg-transparent">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Resend Confirmation Email
      </Button>
    </div>
  )
}
