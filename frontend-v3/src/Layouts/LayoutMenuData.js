import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { getAuthHeader } from "../helpers/api_helper";

const useNavData = () => {
  const history = useNavigate();
  //state data
  const [isDashboard, setIsDashboard] = useState(false);
  const [isApps, setIsApps] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const [isPages, setIsPages] = useState(false);
  const [isBaseUi, setIsBaseUi] = useState(false);
  const [isAdvanceUi, setIsAdvanceUi] = useState(false);
  const [isForms, setIsForms] = useState(false);
  const [isTables, setIsTables] = useState(false);
  const [isCharts, setIsCharts] = useState(false);
  const [isIcons, setIsIcons] = useState(false);
  const [isMaps, setIsMaps] = useState(false);
  const [isMultiLevel, setIsMultiLevel] = useState(false);

  //Calender
  const [isCalender, setCalender] = useState(false);

  // Apps
  const [isEmail, setEmail] = useState(false);
  const [isSubEmail, setSubEmail] = useState(false);
  const [isEcommerce, setIsEcommerce] = useState(false);
  const [isProjects, setIsProjects] = useState(false);
  const [isTasks, setIsTasks] = useState(false);
  const [isCRM, setIsCRM] = useState(false);
  const [isCrypto, setIsCrypto] = useState(false);
  const [isInvoices, setIsInvoices] = useState(false);
  const [isSupportTickets, setIsSupportTickets] = useState(false);
  const [isNFTMarketplace, setIsNFTMarketplace] = useState(false);
  const [isJobs, setIsJobs] = useState(false);
  const [isJobList, setIsJobList] = useState(false);
  const [isCandidateList, setIsCandidateList] = useState(false);

  // Authentication
  const [isSignIn, setIsSignIn] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [isPasswordCreate, setIsPasswordCreate] = useState(false);
  const [isLockScreen, setIsLockScreen] = useState(false);
  const [isLogout, setIsLogout] = useState(false);
  const [isSuccessMessage, setIsSuccessMessage] = useState(false);
  const [isVerification, setIsVerification] = useState(false);
  const [isError, setIsError] = useState(false);

  // Pages
  const [isProfile, setIsProfile] = useState(false);
  const [isLanding, setIsLanding] = useState(false);
  const [isBlog, setIsBlog] = useState(false);

  // Charts
  const [isApex, setIsApex] = useState(false);

  // Multi Level
  const [isLevel1, setIsLevel1] = useState(false);
  const [isLevel2, setIsLevel2] = useState(false);

  const [isDocs, setIsDocs] = useState(false); // Thêm state cho QLVB menu

  const [iscurrentState, setIscurrentState] = useState("Dashboard");

  function updateIconSidebar(e) {
    if (e && e.target && e.target.getAttribute("subitems")) {
      const ul = document.getElementById("two-column-menu");
      const iconItems = ul.querySelectorAll(".nav-icon.active");
      let activeIconItems = [...iconItems];
      activeIconItems.forEach((item) => {
        item.classList.remove("active");
        var id = item.getAttribute("subitems");
        if (document.getElementById(id))
          document.getElementById(id).classList.remove("show");
      });
    }
  }

  const [sidebarConfig, setSidebarConfig] = useState(JSON.parse(localStorage.getItem('sidebarConfig') || '{}'));
  const [sidebarJSONConfig, setSidebarJSONConfig] = useState(JSON.parse(localStorage.getItem('sidebarJSONConfig') || '[]'));
  const [isAdmin, setIsAdmin] = useState(false);

  const CURRENT_SIDEBAR_VERSION = "4.3.86";

  useEffect(() => {
    const fetchSidebarConfig = async () => {
      try {
        const response = await axios.get("/api/accounts/profile/", getAuthHeader());
        const remoteData = response.data || response;
        const remoteConfig = remoteData.sidebar_config;
        const remoteVersion = remoteData.sidebar_version;

        // Reset if version mismatch or config is empty
        if (remoteVersion !== CURRENT_SIDEBAR_VERSION) {
          console.log("Sidebar version mismatch, using default.");
          localStorage.removeItem('sidebarJSONConfig');
          setSidebarJSONConfig([]);
          return;
        }

        const isAdminUser = remoteData.is_staff || remoteData.is_superuser || (remoteData.roles || []).some(r => (typeof r === 'string' ? r === 'Admin' : r.role_name === 'Admin'));
        setIsAdmin(isAdminUser);

        if (remoteConfig && Array.isArray(remoteConfig) && remoteConfig.length > 0) {
          setSidebarJSONConfig(remoteConfig);
          localStorage.setItem('sidebarJSONConfig', JSON.stringify(remoteConfig));
        }
      } catch (error) {
        console.error("Failed to fetch sidebar config from profile", error);
      }
    };
    fetchSidebarConfig();

    const handleUpdate = (e) => {
      const config = e.detail || JSON.parse(localStorage.getItem('sidebarJSONConfig') || '[]');
      if (Array.isArray(config)) {
        setSidebarJSONConfig(config);
        localStorage.setItem('sidebarJSONConfig', JSON.stringify(config));
      } else {
        setSidebarConfig(config);
      }
    };
    window.addEventListener('sidebar-config-update', handleUpdate);

    const handleStorage = () => {
      setSidebarJSONConfig(JSON.parse(localStorage.getItem('sidebarJSONConfig') || '[]'));
      setSidebarConfig(JSON.parse(localStorage.getItem('sidebarConfig') || '{}'));
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('sidebar-config-update', handleUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    document.body.classList.remove("twocolumn-panel");
    if (iscurrentState !== "Dashboard") {
      setIsDashboard(false);
    }
    if (iscurrentState !== "Apps") {
      setIsApps(false);
    }
    if (iscurrentState !== "Auth") {
      setIsAuth(false);
    }
    if (iscurrentState !== "Pages") {
      setIsPages(false);
    }
    if (iscurrentState !== "BaseUi") {
      setIsBaseUi(false);
    }
    if (iscurrentState !== "AdvanceUi") {
      setIsAdvanceUi(false);
    }
    if (iscurrentState !== "Forms") {
      setIsForms(false);
    }
    if (iscurrentState !== "Tables") {
      setIsTables(false);
    }
    if (iscurrentState !== "Charts") {
      setIsCharts(false);
    }
    if (iscurrentState !== "Icons") {
      setIsIcons(false);
    }
    if (iscurrentState !== "Maps") {
      setIsMaps(false);
    }
    if (iscurrentState !== "MuliLevel") {
      setIsMultiLevel(false);
    }
    if (iscurrentState === "Widgets") {
      history("/widgets");
      document.body.classList.add("twocolumn-panel");
    }
    if (iscurrentState !== "Landing") {
      setIsLanding(false);
    }
  }, [
    history,
    iscurrentState,
    isDashboard,
    isApps,
    isAuth,
    isPages,
    isBaseUi,
    isAdvanceUi,
    isForms,
    isTables,
    isCharts,
    isIcons,
    isMaps,
    isMultiLevel,
  ]);
  const menuItems = [
    {
      id: "dashboard",
      label: "Tổng quan",
      icon: "las la-tachometer-alt",
      link: "/dashboard-analytics",
      stateVariables: isDashboard,
      click: function (e) {
        e.preventDefault();
        setIsDashboard(!isDashboard);
        setIscurrentState("Dashboard");
        updateIconSidebar(e);
        history("/dashboard-analytics");
      },
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
      label: "Hệ thống",
      isHeader: true,
    },
    {
      id: "settings",
      label: "Cài đặt",
      icon: "ri-settings-4-line",
      link: "/#",
      stateVariables: iscurrentState === "Settings",
      click: function (e) {
        e.preventDefault();
        setIscurrentState("Settings");
      },
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
      ],
    },
  ];
  // Helper function to flatten the menu structure for lookup
  const flattenMenuItems = (items) => {
    let flat = {};
    items.forEach(item => {
      if (item.id) flat[item.id] = item;
      if (item.subItems) {
        flat = { ...flat, ...flattenMenuItems(item.subItems) };
      }
      if (item.childItems) {
        flat = { ...flat, ...flattenMenuItems(item.childItems) };
      }
    });
    return flat;
  };

  const flatMenuMap = flattenMenuItems(menuItems);

  // FORCE DEFAULT LOGIC: If JSON config doesn't have headers or is very short, it's old and messy. Force defaults.
  const hasNewHeaders = sidebarJSONConfig.some(it => it.isHeader && (it.label === "Danh mục Công việc" || it.label === "Hệ thống"));
  const hasSettingsSubItems = sidebarJSONConfig.some(it => it.id === "settings" && it.subItems && it.subItems.length > 0);
  const effectiveConfig = (!(hasNewHeaders && hasSettingsSubItems) && sidebarJSONConfig.length > 0) ? [] : sidebarJSONConfig;

  // 1. Build the ordered menu list based on JSON config
  let finalMenuItems = [];

  if (isAdmin) {
    // Admins always see the master menu list fully
    finalMenuItems = menuItems;
  } else if (effectiveConfig && effectiveConfig.length > 0) {
    effectiveConfig.forEach(configItem => {
      if (!configItem.visible) return;

      // Look up in our flattened map
      const originalItem = flatMenuMap[configItem.id];

      if (originalItem) {
        // Clone the item so we don't mutate the original master list
        const filteredItem = {
          ...originalItem,
          label: configItem.label || originalItem.label, // Override label if provided
          icon: configItem.icon || originalItem.icon,   // Override icon if provided
          isHeader: configItem.isHeader || false,       // Handle separator/header type
        };

        // If there are subItems in the config, filter the originalItem's subItems
        if (configItem.subItems && configItem.subItems.length > 0) {
          // If the original item had sub-items, we filter them
          if (originalItem.subItems) {
            filteredItem.subItems = originalItem.subItems.filter(sub => {
              const subConfig = configItem.subItems.find(s => s.id === sub.id);
              return subConfig ? subConfig.visible : true;
            }).map(sub => {
              // Apply label overrides to sub-items too
              const subConfig = configItem.subItems.find(s => s.id === sub.id);
              return subConfig ? { ...sub, label: subConfig.label || sub.label } : sub;
            });
          }
        } else if (originalItem.subItems && configItem.id !== 'dashboard') {
          // If no subItems config but original has them, keep all (except dashboard which we simplified)
          // Actually, better to just keep them if they are not explicitly hidden
        }

        finalMenuItems.push(filteredItem);
      } else if (configItem.id.toString().startsWith('custom-')) {
        // Construct custom item
        finalMenuItems.push({
          id: configItem.id,
          label: configItem.label,
          icon: configItem.icon || "ri-external-link-line",
          link: configItem.link,
          isHeader: configItem.isHeader || false,
          stateVariables: false,
        });
      }
    });

    // AUTO-MERGE: Ensure new items in code but missing from JSON config are still visible
    // We check which master items were completely ignored during the JSON processing
    const resultsIds = new Set();
    const collectIdsFromConfig = (items) => {
      items.forEach(it => {
        if (it.id) resultsIds.add(it.id);
        if (it.subItems) collectIdsFromConfig(it.subItems);
      });
    };
    // Collect all IDs the user's config officially "knows about", even if hidden.
    collectIdsFromConfig(sidebarJSONConfig);

    menuItems.forEach(masterItem => {
      // Check if it's a top-level item in the user's config
      const isAtTopLevelInConfig = sidebarJSONConfig.some(it => it.id === masterItem.id);

      if (masterItem.id && !isAtTopLevelInConfig) {
        // If it was in the config but as a sub-item, or NOT in the config at all,
        // and it's now a master item in the code, we must include it.
        finalMenuItems.push(masterItem);
      } else if (!masterItem.id && masterItem.isHeader) {
        // Handling for headers which might not have IDs
        const existingHeader = finalMenuItems.some(it => it.isHeader && it.label === masterItem.label);
        if (!existingHeader) {
          finalMenuItems.push(masterItem);
        }
      } else if (masterItem.subItems) {
        // If master item exists but some of its sub-items are missing
        masterItem.subItems.forEach(masterSub => {
          if (masterSub.id && !resultsIds.has(masterSub.id)) {
            // Find parent in results to append
            const parentInFinal = finalMenuItems.find(it => it.id === masterSub.parentId);
            if (parentInFinal) {
              if (!parentInFinal.subItems) parentInFinal.subItems = [];
              if (!parentInFinal.subItems.some(s => s.id === masterSub.id)) {
                parentInFinal.subItems.push(masterSub);
              }
            }
          }
        });
      }
    });
  } else {
    // Fallback: Use the old filtering logic if JSON config is missing
    // Admins are already handled above, but for non-admin without config, we still check old flags
    finalMenuItems = menuItems.filter(item => {
      if (isAdmin) return true; // Safety bypass if logic reaches here
      if (item.id === 'qlvb' && sidebarConfig.SIDEBAR_HIDE_QLVB) return false;
      if (item.id === 'dashboard' && sidebarConfig.SIDEBAR_HIDE_DASHBOARD) return false;
      if (item.id === 'apps' && sidebarConfig.SIDEBAR_HIDE_APPS) return false;
      if (['authentication', 'pages'].includes(item.id) && sidebarConfig.SIDEBAR_HIDE_PAGES) return false;

      const componentIds = ['baseUi', 'advanceUi', 'widgets', 'forms', 'tables', 'charts', 'icons', 'maps', 'multilevel'];
      if (componentIds.includes(item.id) && sidebarConfig.SIDEBAR_HIDE_COMPONENTS) return false;

      return true;
    });
  }

  return finalMenuItems;
};
export default useNavData;
