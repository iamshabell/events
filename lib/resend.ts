import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendInvitationEmailProps {
  to: string
  participantName?: string
  eventTitle: string
  eventDescription?: string
  eventLocation: string
  eventDate: string
  invitationUrl: string
  organizerName: string
}

export async function sendInvitationEmail({
  to,
  participantName,
  eventTitle,
  eventDescription,
  eventLocation,
  eventDate,
  invitationUrl,
  organizerName,
}: SendInvitationEmailProps) {
  try {
    // Use onboarding@resend.dev for development/testing
    // Replace with your verified domain in production
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"

    const { data, error } = await resend.emails.send({
      from: `Event Manager <${fromEmail}>`,
      to: [to],
      subject: `Invitation: ${eventTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Event Invitation</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              line-height: 1.6; 
              color: #374151; 
              margin: 0; 
              padding: 0; 
              background-color: #f9fafb; 
            }
            .container { 
              max-width: 600px; 
              margin: 40px auto; 
              background-color: white; 
              border-radius: 8px;
              box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
            }
            .header { 
              padding: 32px 32px 24px 32px; 
              border-bottom: 1px solid #e5e7eb;
            }
            .content { 
              padding: 32px; 
            }
            .event-details { 
              background-color: #f9fafb; 
              border-radius: 6px; 
              padding: 20px; 
              margin: 24px 0; 
              border: 1px solid #e5e7eb;
            }
            .detail-row { 
              margin-bottom: 8px; 
              font-size: 14px;
            }
            .detail-label { 
              font-weight: 500; 
              color: #6b7280; 
              display: inline-block;
              min-width: 70px;
            }
            .detail-value { 
              color: #111827; 
            }
            .cta-button { 
              display: inline-block; 
              background-color: #111827; 
              color: white; 
              text-decoration: none; 
              padding: 12px 24px; 
              border-radius: 6px; 
              font-weight: 500; 
              margin: 24px 0;
              font-size: 14px;
            }
            .footer { 
              padding: 24px 32px; 
              border-top: 1px solid #e5e7eb; 
              color: #6b7280; 
              font-size: 13px; 
            }
            @media (max-width: 600px) { 
              .container { margin: 20px; }
              .header, .content, .footer { padding: 24px 20px; } 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #111827;">
                You're invited
              </h1>
              <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">
                ${participantName ? `Hi ${participantName}` : "Hello"}, you have been invited to an event.
              </p>
            </div>
            
            <div class="content">
              <h2 style="color: #111827; margin: 0 0 8px 0; font-size: 20px; font-weight: 600;">${eventTitle}</h2>
              
              ${eventDescription ? `<p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">${eventDescription}</p>` : ""}
              
              <div class="event-details">
                <div class="detail-row">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">${eventDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Location:</span>
                  <span class="detail-value">${eventLocation}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">From:</span>
                  <span class="detail-value">${organizerName}</span>
                </div>
              </div>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${invitationUrl}" class="cta-button">
                  View Invitation
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 13px; margin: 24px 0 0 0;">
                Click the button above to view your invitation and RSVP.
              </p>
              
              <p style="color: #9ca3af; font-size: 12px; margin: 16px 0 0 0;">
                If the button doesn't work, copy this link: ${invitationUrl}
              </p>
            </div>
            
            <div class="footer">
              <p style="margin: 0;">Event Manager</p>
            </div>
          </div>
        </body>
        </html>
      `,
    })

    if (error) {
      console.error("Resend error:", error)

      // Provide more specific error messages
      if (error.message?.includes("domain is not verified")) {
        throw new Error(
          "Email domain not verified. Please verify your domain in Resend or use onboarding@resend.dev for testing.",
        )
      } else if (error.message?.includes("API key")) {
        throw new Error("Invalid Resend API key. Please check your RESEND_API_KEY environment variable.")
      } else {
        throw new Error(`Failed to send email: ${error.message}`)
      }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Email sending error:", error)
    throw error
  }
}
