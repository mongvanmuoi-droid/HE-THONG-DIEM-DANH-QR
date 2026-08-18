import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import StatsCards from '@/components/admin/stats-cards'
import ConfigPanel from '@/components/admin/config-panel'
import DelegateTable from '@/components/admin/delegate-table'
import SeatTable from '@/components/admin/seat-table'

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="config">Cấu hình</TabsTrigger>
          <TabsTrigger value="delegates">Đại biểu & QR</TabsTrigger>
          <TabsTrigger value="seats">Chỗ ngồi</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <StatsCards />
        </TabsContent>
        <TabsContent value="config" className="space-y-4">
          <ConfigPanel />
        </TabsContent>
        <TabsContent value="delegates" className="space-y-4">
          <DelegateTable />
        </TabsContent>
        <TabsContent value="seats" className="space-y-4">
          <SeatTable />
        </TabsContent>
      </Tabs>
    </div>
  )
}
