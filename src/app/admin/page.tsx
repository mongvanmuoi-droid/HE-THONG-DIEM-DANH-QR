import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import StatsCards from '@/components/admin/stats-cards'
import ConfigPanel from '@/components/admin/config-panel'
import DelegateTable from '@/components/admin/delegate-table'
import SeatTable from '@/components/admin/seat-table'

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-gray-100/80 p-1.5 rounded-2xl w-full flex h-[60px] shadow-inner mb-8 mt-2 mx-auto">
          <TabsTrigger value="overview" className="flex-1 text-[15px] font-bold text-gray-600 data-[state=active]:bg-white data-[state=active]:text-red-700 data-[state=active]:shadow-md rounded-xl transition-all h-full">Tổng quan</TabsTrigger>
          <TabsTrigger value="config" className="flex-1 text-[15px] font-bold text-gray-600 data-[state=active]:bg-white data-[state=active]:text-red-700 data-[state=active]:shadow-md rounded-xl transition-all h-full">Cấu hình</TabsTrigger>
          <TabsTrigger value="delegates" className="flex-1 text-[15px] font-bold text-gray-600 data-[state=active]:bg-white data-[state=active]:text-red-700 data-[state=active]:shadow-md rounded-xl transition-all h-full">Đại biểu & QR</TabsTrigger>
          <TabsTrigger value="seats" className="flex-1 text-[15px] font-bold text-gray-600 data-[state=active]:bg-white data-[state=active]:text-red-700 data-[state=active]:shadow-md rounded-xl transition-all h-full">Chỗ ngồi</TabsTrigger>
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
