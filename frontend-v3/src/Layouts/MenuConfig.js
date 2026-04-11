const menuMaster = [
    {
        id: "dashboard",
        label: "Tổng quan",
        icon: "las la-tachometer-alt",
        link: "/dashboard-analytics",
    },
    {
        label: "Danh mục Công việc",
        isHeader: true,
    },
    {
        id: "documents",
        label: "Danh sách Dự thảo",
        icon: "ri-file-list-3-line",
        link: "/documents",
    },
    {
        id: "project-assignment",
        label: "Phân công Dự thảo",
        icon: "ri-user-shared-2-line",
        link: "/project-assignment",
    },
    {
        id: "draft-consultation",
        label: "Lấy ý kiến dự thảo",
        icon: "ri-send-plane-2-line",
        link: "/draft-consultation",
    },
    {
        id: "consultation-responses",
        label: "Văn bản góp ý",
        icon: "ri-file-copy-2-line",
        link: "/consultation-responses",
    },
    {
        id: "draft-classification",
        label: "Tiến độ góp ý",
        icon: "ri-folders-line",
        link: "/draft-classification",
    },
    {
        id: "feedbacks",
        label: "Danh sách Góp ý",
        icon: "ri-discuss-line",
        link: "/feedbacks",
    },
    {
        id: "draft-explanation",
        label: "Giải trình dự thảo",
        icon: "ri-question-answer-line",
        link: "/draft-explanation",
    },
    {
        id: "feedback-intake",
        label: "Nhập góp ý thủ công",
        icon: "ri-chat-new-line",
        link: "/feedback-intake",
    },
    {
        id: "gsheet-sync",
        label: "Cập nhật lên GG sheet",
        icon: "ri-google-fill",
        link: "/gsheet-sync",
    },
    {
        id: "doc-3-responses",
        label: "Quản lý Góp ý (Dự thảo 3)",
        icon: "ri-star-line",
        link: "/documents/3/responses",
    },
    {
        id: "comparisons",
        label: "So sánh văn bản",
        icon: "ri-arrow-left-right-line",
        link: "/comparisons",
        badgeName: "Mới",
        badgeColor: "info",
    },
    {
        id: "reports",
        label: "Báo cáo tổng hợp",
        icon: "ri-bar-chart-2-line",
        link: "/reports",
        badgeName: "Mới",
        badgeColor: "success",
    },
    {
        label: "Rà soát Pháp lý",
        isHeader: true,
    },
    {
        id: "reference-reviews",
        label: "Rà soát dẫn chiếu chéo",
        icon: "ri-shield-check-line",
        link: "/reference-reviews",
    },
    {
        label: "Hệ thống",
        isHeader: true,
    },
    {
        id: "settings",
        label: "Cài đặt",
        icon: "ri-settings-4-line",
        link: "/#",
        subItems: [
            {
                id: "document-types",
                label: "Quản lý Loại dự thảo",
                link: "/document-types",
                parentId: "settings",
            },
            {
                id: "agency-management",
                label: "Quản lý Đơn vị",
                link: "/agencies",
                parentId: "settings",
            },
            {
                id: "user-management",
                label: "Quản lý Cán bộ",
                link: "/user-management",
                parentId: "settings",
            },
            {
                id: "department-management",
                label: "Quản lý Phòng ban",
                link: "/departments",
                parentId: "settings",
            },
            {
                id: "sys-settings",
                label: "Cấu hình chung",
                link: "/settings",
                parentId: "settings",
            },
            {
                id: "sidebar-manager",
                label: "Quản lý Sidebar",
                link: "/settings/sidebar-manager",
                parentId: "settings",
            },
        ],
    },
];

export default menuMaster;
