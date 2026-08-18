'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Database } from '@/types/database'

type Config = Database['public']['Tables']['config']['Row']

export default function ConfigPanel() {
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('config').select('*').limit(1).single()
    if (data) {
      setConfig(data)
    } else {
      // Auto create a row
      const { data: newData } = await supabase.from('config').insert({ is_active: false, meeting_name: 'Hội nghị', location: '' }).select().single()
      if (newData) setConfig(newData)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    const { error } = await supabase
      .from('config')
      .update({
        meeting_name: config.meeting_name,
        meeting_date: config.meeting_date,
        location: config.location,
        is_active: config.is_active
      })
      .eq('id', config.id)

    if (error) {
      toast.error('Lỗi khi lưu cấu hình')
    } else {
      toast.success('Đã lưu cấu hình thành công!')
    }
    setSaving(false)
  }

  if (loading) return <div>Đang tải...</div>
  if (!config) return <div>Chưa có cấu hình nào trong database. Vui lòng chạy SQL setup.</div>

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cấu hình cuộc họp</CardTitle>
        <CardDescription>Thiết lập thông tin hiển thị trên trang điểm danh.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2 pb-4 border-b">
          <Switch 
            id="active-mode" 
            checked={config.is_active}
            onCheckedChange={(checked) => setConfig({ ...config, is_active: checked })}
          />
          <Label htmlFor="active-mode" className="font-bold">
            Trạng thái điểm danh (Bật/Tắt)
          </Label>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="meeting_name">Tên cuộc họp</Label>
          <Input 
            id="meeting_name" 
            value={config.meeting_name || ''} 
            onChange={(e) => setConfig({ ...config, meeting_name: e.target.value })}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="meeting_date">Ngày họp</Label>
          <Input 
            id="meeting_date" 
            type="date"
            value={config.meeting_date || ''} 
            onChange={(e) => setConfig({ ...config, meeting_date: e.target.value })}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="location">Địa điểm</Label>
          <Input 
            id="location" 
            value={config.location || ''} 
            onChange={(e) => setConfig({ ...config, location: e.target.value })}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
        </Button>
      </CardFooter>
    </Card>
  )
}
