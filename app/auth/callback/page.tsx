"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import Link from "next/link"

export default function AuthCallbackPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const code = searchParams.get("code")

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)

          if (error) {
            setError(error.message)
          } else if (data.user) {
            setSuccess(true)
            // Redirect to dashboard after a short delay
            setTimeout(() => {
              router.push("/dashboard")
            }, 2000)
          }
        } else {
          setError("No confirmation code found")
        }
      } catch (err) {
        setError("Failed to confirm email")
      } finally {
        setLoading(false)
      }
    }

    handleAuthCallback()
  }, [searchParams, router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Confirming your email...</h2>
              <p className="text-gray-600">Please wait while we verify your account.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-red-600 mb-2">Confirmation Failed</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Link href="/auth/signup">
                <Button>Try Again</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-green-600 mb-2">Email Confirmed!</h2>
              <p className="text-gray-600 mb-4">Your account has been successfully verified.</p>
              <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
