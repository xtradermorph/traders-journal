import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { token, action, cdata } = await request.json()
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      )
    }

    // Get the client's IP address
    const clientIp = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'

    // Verify the token with Cloudflare
    const formData = new FormData()
    formData.append('secret', process.env.TURNSTILE_SECRET_KEY!)
    formData.append('response', token)
    formData.append('remoteip', clientIp)

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData
    })

    const result = await response.json()

    // Check if verification was successful
    if (!result.success) {
      console.error('Turnstile verification failed:', result['error-codes'])
      return NextResponse.json(
        { 
          success: false, 
          error: 'Verification failed',
          errorCodes: result['error-codes']
        },
        { status: 400 }
      )
    }

    // Optional: Validate action if provided
    if (action && result.action && result.action !== action) {
      return NextResponse.json(
        { success: false, error: 'Action mismatch' },
        { status: 400 }
      )
    }

    // Optional: Validate cdata if provided
    if (cdata && result.cdata && result.cdata !== cdata) {
      return NextResponse.json(
        { success: false, error: 'Data mismatch' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      challengeTs: result.challenge_ts,
      hostname: result.hostname,
      action: result.action,
      cdata: result.cdata
    })

  } catch (error) {
    console.error('Turnstile verification error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 