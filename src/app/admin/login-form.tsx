'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { login } from './actions'

export default function LoginForm() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    const result = await login(password)
    if (result.success) {
      router.refresh()
    } else {
      setError(result.error || 'Login failed')
      setLoading(false)
    }
  }

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Đăng nhập Admin</CardTitle>
        <CardDescription>Nhập mật khẩu để truy cập hệ thống quản lý.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Input 
                id="password" 
                type="password" 
                placeholder="Mật khẩu" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Đang xử lý...' : 'Đăng nhập'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
