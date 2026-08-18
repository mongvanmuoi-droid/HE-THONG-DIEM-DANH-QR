import { logout } from '../actions'
import { redirect } from 'next/navigation'

export async function POST() {
  await logout()
  redirect('/admin')
}
