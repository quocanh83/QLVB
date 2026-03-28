export const MENU_SIDEBAR = [
  {
    title: 'Bảng điều khiển',
    icon: 'element-11',
    path: '/',
  },
  { heading: 'Nghiệp vụ' },
  {
    title: 'Xử lý Văn bản (AI)',
    icon: 'zap',
    path: '/vibe-dashboard',
  },
  {
    title: 'Quản lý Văn bản',
    icon: 'document',
    path: '/documents',
  },
  {
    title: 'Báo cáo & Thống kê',
    icon: 'chart-pie-3',
    path: '/reports',
  },
  { heading: 'Hệ thống' },
  {
    title: 'Quản lý Người dùng',
    icon: 'profile-circle',
    path: '/users',
  },
  {
    title: 'Cấu hình Hệ thống',
    icon: 'setting-2',
    path: '/settings',
  },
];

export const MENU_SIDEBAR_CUSTOM = [
  {
    title: 'Cửa hàng - Khách hàng',
    icon: 'users',
    children: [
      { title: 'Trang chủ', path: '/store-client/home' },
      {
        title: 'Kết quả tìm kiếm',
        path: '/store-client/search-results',
      },
    ],
  },
];

export const MENU_MEGA = [
  {
    title: 'Trang chủ',
    path: '/',
  },
  {
    title: 'Hồ sơ Công khai',
    path: '#',
    children: [
      { title: 'Hồ sơ mặc định', path: '/public-profile/profiles/default' },
      { title: 'Người theo dõi', path: '/public-profile/profiles/followers' },
    ],
  },
  {
    title: 'Tài khoản của tôi',
    path: '#',
    children: [
      { title: 'Bắt đầu', path: '/account/home/get-started' },
      { title: 'Cài đặt', path: '/account/home/user-profile' },
    ],
  },
  {
    title: 'Mạng lưới',
    path: '#',
    children: [
      { title: 'Thẻ người dùng', path: '/network/user-cards/mini-cards' },
      { title: 'Thành viên', path: '/network/get-started' },
    ],
  },
  {
    title: 'Xác thực',
    path: '#',
    children: [
      { title: 'Đăng nhập', path: '/auth/login' },
      { title: 'Đăng ký', path: '/auth/signup' },
    ],
  },
  {
    title: 'Cửa hàng',
    path: '#',
    children: [
      { title: 'Danh mục', path: '/store-client/home' },
    ],
  },
];

export const MENU_MEGA_MOBILE = [
  { heading: 'Bảng điều khiển' },
  { title: 'Tổng quan', icon: 'element-11', path: '/' },
  { heading: 'Nghiệp vụ' },
  { title: 'Xử lý Văn bản', icon: 'zap', path: '/vibe-dashboard' },
  { title: 'Quản lý Văn bản', icon: 'document', path: '/documents' },
  { title: 'Báo cáo', icon: 'chart-pie-3', path: '/reports' },
  { heading: 'Hệ thống' },
  { title: 'Người dùng', icon: 'profile-circle', path: '/users' },
  { title: 'Cấu hình', icon: 'setting-2', path: '/settings' },
];
