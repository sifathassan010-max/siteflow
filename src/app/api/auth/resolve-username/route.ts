import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { username } = await req.json()
  if (!username) return NextResponse.json({ error: 'Missing username' }, { status: 400 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // set this in Vercel env vars — NOT NEXT_PUBLIC_
  )

  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle()

  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: userData, error } = await admin.auth.admin.getUserById(profile.id)
  if (error || !userData?.user?.email) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ email: userData.user.email })
}
