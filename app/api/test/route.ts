import { NextResponse } from "next/server"

export async function GET() {
  try {
    return NextResponse.json(
      {
        success: true,
        message: "DiagNexus API is working correctly",
        timestamp: new Date().toISOString(),
        endpoints: {
          login: "/api/auth/login",
          health: "/api/health",
          database: "/api/health/database",
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Test endpoint failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  }
}

export async function POST() {
  return NextResponse.json(
    {
      success: true,
      message: "POST method working",
      received: "Test POST request",
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  )
}
