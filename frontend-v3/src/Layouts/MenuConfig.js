const menuMaster = [
    {
        label: "Danh mục Công việc",
        isHeader: true,
    },
    { id: "doc-list-modern", label: "Danh sách Dự thảo", icon: "ri-file-list-3-line", link: "/documents-modern", badgeName: "Mới", badgeColor: "success", visible: true },
    {
        id: "project-assignment-v2",
        label: "Phân công Dự thảo",
        icon: "ri-user-shared-2-line",
        link: "/project-assignment-modern",
        stateVariables: 'isAssignment',
    },

    {
        id: "consultation-hub",
        label: "Tham vấn & Góp ý",
        icon: "ri-chat-voice-line",
        link: "/consultation-hub",
        badgeName: "Tổng hợp",
        badgeColor: "info",
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
        id: "document-types",
        label: "Quản lý Loại dự thảo",
        icon: "ri-list-settings-line",
        link: "/document-types",
    },
    {
        id: "agency-management",
        label: "Quản lý Đơn vị",
        icon: "ri-building-line",
        link: "/agencies",
    },
    {
        id: "organization-management",
        label: "Tổ chức & Cán bộ",
        icon: "ri-team-line",
        link: "/organization",
    },
    {
        id: "sys-settings",
        label: "Cấu hình chung",
        icon: "ri-settings-line",
        link: "/settings",
    },
    {
        id: "sidebar-manager",
        label: "Quản lý Sidebar",
        icon: "ri-side-bar-line",
        link: "/settings/sidebar-manager",
    },
];

export default menuMaster;
