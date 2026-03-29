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

  useEffect(() => {
    const fetchSidebarConfig = async () => {
      try {
        const response = await axios.get("/api/accounts/profile/", getAuthHeader());
        const remoteConfig = response.sidebar_config || (response.data && response.data.sidebar_config);
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
      id: "documents",
      label: "Danh sách Dự thảo",
      icon: "ri-file-list-3-line",
      link: "/documents",
    },
    {
      id: "reports",
      label: "Trung tâm Báo cáo",
      icon: "ri-bar-chart-2-line",
      link: "/reports",
      badgeName: "Mới",
      badgeColor: "success",
    },
    {
      id: "feedback-intake",
      label: "Nhập góp ý thủ công",
      icon: "ri-chat-new-line",
      link: "/feedback-intake",
    },
    {
      id: "draft-explanation",
      label: "Giải trình dự thảo",
      icon: "ri-question-answer-line",
      link: "/draft-explanation",
    },
    {
      id: "feedbacks",
      label: "Danh sách Góp ý",
      icon: "ri-discuss-line",
      link: "/feedbacks",
    },
    {
      id: "settings",
      label: "Cấu hình Hệ thống",
      icon: "ri-settings-4-line",
      link: "/settings",
    },
    {
      id: "document-types",
      label: "Quản lý Loại dự thảo",
      icon: "ri-stack-line",
      link: "/document-types",
    },
    {
      id: "user-management",
      label: "Quản lý Cán bộ",
      icon: "ri-user-settings-line",
      link: "/user-management",
    },
    {
      id: "dashboard",
      label: "Dashboards",
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
      id: "authentication",
      label: "Authentication",
      icon: "lar la-user-circle",
      link: "/#",
      click: function (e) {
        e.preventDefault();
        setIsAuth(!isAuth);
        setIscurrentState("Auth");
        updateIconSidebar(e);
      },
      stateVariables: isAuth,
      subItems: [
        {
          id: "signIn",
          label: "Sign In",
          link: "/#",
          isChildItem: true,
          click: function (e) {
            e.preventDefault();
            setIsSignIn(!isSignIn);
          },
          parentId: "authentication",
          stateVariables: isSignIn,
          childItems: [
            { id: 1, label: "Basic", link: "/auth-signin-basic" },
            { id: 2, label: "Cover", link: "/auth-signin-cover" },
          ],
        },
        {
          id: "signUp",
          label: "Sign Up",
          link: "/#",
          isChildItem: true,
          click: function (e) {
            e.preventDefault();
            setIsSignUp(!isSignUp);
          },
          parentId: "authentication",
          stateVariables: isSignUp,
          childItems: [
            { id: 1, label: "Basic", link: "/auth-signup-basic" },
            { id: 2, label: "Cover", link: "/auth-signup-cover" },
          ],
        },
        {
          id: "passwordReset",
          label: "Password Reset",
          link: "/#",
          isChildItem: true,
          click: function (e) {
            e.preventDefault();
            setIsPasswordReset(!isPasswordReset);
          },
          parentId: "authentication",
          stateVariables: isPasswordReset,
          childItems: [
            { id: 1, label: "Basic", link: "/auth-pass-reset-basic" },
            { id: 2, label: "Cover", link: "/auth-pass-reset-cover" },
          ],
        },
        {
          id: "passwordCreate",
          label: "Password Create",
          link: "/#",
          isChildItem: true,
          click: function (e) {
            e.preventDefault();
            setIsPasswordCreate(!isPasswordCreate);
          },
          parentId: "authentication",
          stateVariables: isPasswordCreate,
          childItems: [
            { id: 1, label: "Basic", link: "/auth-pass-change-basic" },
            { id: 2, label: "Cover", link: "/auth-pass-change-cover" },
          ],
        },
        {
          id: "lockScreen",
          label: "Lock Screen",
          link: "/#",
          isChildItem: true,
          click: function (e) {
            e.preventDefault();
            setIsLockScreen(!isLockScreen);
          },
          parentId: "authentication",
          stateVariables: isLockScreen,
          childItems: [
            { id: 1, label: "Basic", link: "/auth-lockscreen-basic" },
            { id: 2, label: "Cover", link: "/auth-lockscreen-cover" },
          ],
        },
        {
          id: "logout",
          label: "Logout",
          link: "/#",
          isChildItem: true,
          click: function (e) {
            e.preventDefault();
            setIsLogout(!isLogout);
          },
          parentId: "authentication",
          stateVariables: isLogout,
          childItems: [
            { id: 1, label: "Basic", link: "/auth-logout-basic" },
            { id: 2, label: "Cover", link: "/auth-logout-cover" },
          ],
        },
        {
          id: "successMessage",
          label: "Success Message",
          link: "/#",
          isChildItem: true,
          click: function (e) {
            e.preventDefault();
            setIsSuccessMessage(!isSuccessMessage);
          },
          parentId: "authentication",
          stateVariables: isSuccessMessage,
          childItems: [
            { id: 1, label: "Basic", link: "/auth-success-msg-basic" },
            { id: 2, label: "Cover", link: "/auth-success-msg-cover" },
          ],
        },
        {
          id: "twoStepVerification",
          label: "Two Step Verification",
          link: "/#",
          isChildItem: true,
          click: function (e) {
            e.preventDefault();
            setIsVerification(!isVerification);
          },
          parentId: "authentication",
          stateVariables: isVerification,
          childItems: [
            { id: 1, label: "Basic", link: "/auth-twostep-basic" },
            { id: 2, label: "Cover", link: "/auth-twostep-cover" },
          ],
        },
        {
          id: "errors",
          label: "Errors",
          link: "/#",
          isChildItem: true,
          click: function (e) {
            e.preventDefault();
            setIsError(!isError);
          },
          parentId: "authentication",
          stateVariables: isError,
          childItems: [
            { id: 1, label: "404 Basic", link: "/auth-404-basic" },
            { id: 2, label: "404 Cover", link: "/auth-404-cover" },
            { id: 3, label: "404 Alt", link: "/auth-404-alt" },
            { id: 4, label: "500", link: "/auth-500" },
            { id: 5, label: "Offline Page", link: "/auth-offline" },
          ],
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


  // 1. Build the ordered menu list based on JSON config
  let finalMenuItems = [];

  if (sidebarJSONConfig && sidebarJSONConfig.length > 0) {
    sidebarJSONConfig.forEach(configItem => {
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
    finalMenuItems = menuItems.filter(item => {
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
