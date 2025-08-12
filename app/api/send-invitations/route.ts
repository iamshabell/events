import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase/server"
import { sendInvitationEmail } from "@/lib/resend"
import { format } from "date-fns"

export async function POST(request: NextRequest) {
  try {
    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        {
          error: "Email service not configured. Please add RESEND_API_KEY to your environment variables.",
          code: "MISSING_API_KEY",
        },
        { status: 500 },
      )
    }

    const { eventId, participantIds } = await request.json()

    if (!eventId || !participantIds || !Array.isArray(participantIds)) {
      return NextResponse.json({ error: "Event ID and participant IDs are required" }, { status: 400 })
    }

    const supabase = await getSupabaseClient()

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .eq("created_by", user.id)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found or unauthorized" }, { status: 404 })
    }

    // Get organizer profile
    const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).single()

    const organizerName = profile?.full_name || profile?.email || user.email || "Event Organizer"

    // Get participants
    const { data: participants, error: participantsError } = await supabase
      .from("participants")
      .select("*")
      .eq("event_id", eventId)
      .in("id", participantIds)

    if (participantsError || !participants) {
      return NextResponse.json({ error: "Participants not found" }, { status: 404 })
    }

    const results = []
    const errors = []

    // Send emails to each participant
    for (const participant of participants) {
      try {
        const invitationUrl = `${request.nextUrl.origin}/invitation/${participant.invitation_token}`
        const eventDate = format(new Date(event.event_date), "EEEE, MMMM d, yyyy h:mm a")

        await sendInvitationEmail({
          to: participant.email,
          participantName: participant.name,
          eventTitle: event.title,
          eventDescription: event.description,
          eventLocation: event.location,
          eventDate,
          invitationUrl,
          organizerName,
        })

        // Update participant record to mark invitation as sent
        await supabase
          .from("participants")
          .update({
            updated_at: new Date().toISOString(),
            qr_code_data: invitationUrl,
          })
          .eq("id", participant.id)

        results.push({
          participantId: participant.id,
          email: participant.email,
          success: true,
        })
      } catch (error) {
        console.error(`Failed to send email to ${participant.email}:`, error)

        let errorMessage = "Unknown error"
        if (error instanceof Error) {
          errorMessage = error.message
        }

        errors.push({
          participantId: participant.id,
          email: participant.email,
          error: errorMessage,
        })
      }
    }

    // If all emails failed due to domain verification, provide helpful guidance
    if (errors.length === participants.length && errors.some((e) => e.error.includes("domain"))) {
      return NextResponse.json(
        {
          success: false,
          error: "Email domain verification required",
          message: "To send emails, please verify your domain in Resend or use 'onboarding@resend.dev' for testing.",
          results: [],
          errors,
          totalSent: 0,
          totalFailed: errors.length,
          helpUrl: "https://resend.com/domains",
        },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: results.length > 0,
      results,
      errors,
      totalSent: results.length,
      totalFailed: errors.length,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    )
  }
}
