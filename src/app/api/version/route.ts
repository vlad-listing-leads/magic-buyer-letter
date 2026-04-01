import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET() {
  let buildId = 'unknown'
  try {
    buildId = readFileSync(join(process.cwd(), '.next', 'BUILD_ID'), 'utf-8').trim()
  } catch {
    // BUILD_ID not available in dev
  }

  return NextResponse.json(
    { deployId: buildId },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
