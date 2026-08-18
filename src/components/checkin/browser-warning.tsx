'use client'

import { useEffect, useState } from 'react'

export default function BrowserWarning() {
  const [isInApp, setIsInApp] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    // Basic detection for Facebook, Zalo, Instagram in-app browsers
    const inAppBrowsers = ['FBAN', 'FBAV', 'Zalo', 'Instagram'];
    
    const isRestrictedBrowser = inAppBrowsers.some(browser => ua.includes(browser));
    setIsInApp(isRestrictedBrowser);
  }, []);

  if (!isInApp) return null;

  return (
    <div className="fixed inset-0 z-50 bg-red-600 flex flex-col items-center justify-center p-6 text-white text-center">
      <h1 className="text-3xl font-bold mb-4">Trình duyệt không hỗ trợ!</h1>
      <p className="text-lg mb-8">
        Hệ thống không thể điểm danh khi bạn đang sử dụng trình duyệt nội bộ của Zalo hoặc Facebook.
        <br /><br />
        Vui lòng bấm vào biểu tượng <strong>3 chấm</strong> ở góc màn hình và chọn <strong>"Mở bằng trình duyệt"</strong> (Safari, Chrome...) để tiếp tục.
      </p>
    </div>
  )
}
