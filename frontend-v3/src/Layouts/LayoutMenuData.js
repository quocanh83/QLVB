import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { getAuthHeader } from "../helpers/api_helper";
import menuMaster from "./MenuConfig";

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
  const [isAssignment, setIsAssignment] = useState(false);

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

  const CURRENT_SIDEBAR_VERSION = "5.1.0";

    useEffect(() => {
      const fetchSidebarConfig = async () => {
        try {
          // Kiểm tra phiên bản Sidebar để ép buộc làm mới
          const savedVersion = localStorage.getItem('sidebarVersion');
          if (savedVersion !== CURRENT_SIDEBAR_VERSION) {
              console.log("Phiên bản Sidebar mới, đang làm mới lại cấu hình...");
              localStorage.removeItem('sidebarJSONConfig');
              localStorage.setItem('sidebarVersion', CURRENT_SIDEBAR_VERSION);
              setSidebarJSONConfig([]);
          }

          // Tự động dọn dẹp cấu hình cũ nếu phát hiện ID lỗi thời (Fallback thêm)
          const oldConfig = localStorage.getItem('sidebarJSONConfig');
          if (oldConfig && (oldConfig.includes('dashboard') || oldConfig.includes('documents_group') || oldConfig.includes('departments'))) {
              localStorage.removeItem('sidebarJSONConfig');
              setSidebarJSONConfig([]);
          }

          const response = await axios.get("/api/accounts/profile/", getAuthHeader());
        const remoteData = response.data || response;
        const remoteConfig = remoteData.sidebar_config;
        const remoteVersion = remoteData.sidebar_version;

        // Use remote config if available
        if (remoteConfig && Array.isArray(remoteConfig) && remoteConfig.length > 0) {
          setSidebarJSONConfig(remoteConfig);
          localStorage.setItem('sidebarJSONConfig', JSON.stringify(remoteConfig));
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
    if (iscurrentState !== "Assignment") {
      setIsAssignment(false);
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
    isAssignment,
  ]);
  const menuItems = menuMaster.map(item => {
    // Add specific click handlers
    if (item.id === 'documents_group') {
      return {
        ...item,
        stateVariables: isDocs,
        click: function (e) {
          e.preventDefault();
          setIsDocs(!isDocs);
          setIscurrentState("Documents");
          updateIconSidebar(e);
        }
      };
    }
    if (item.id === 'project-assignment-v2') {
      return {
        ...item,
        stateVariables: isAssignment,
        click: function (e) {
          e.preventDefault();
          setIsAssignment(!isAssignment);
          setIscurrentState("Assignment");
          history("/project-assignment-modern");
        }
      };
    }
    if (item.id === 'settings' || item.id === 'organization-management') {
      return {
        ...item,
        stateVariables: iscurrentState === "Settings" || iscurrentState === "Organization",
        click: function (e) {
          e.preventDefault();
          setIscurrentState(item.id === 'settings' ? "Settings" : "Organization");
          if (item.link && item.link !== "/#") {
              history(item.link);
          }
        }
      };
    }
    return item;
  });

  // 1. CHUẨN HÓA DỮ LIỆU CẤU HÌNH (UNFLATTEN LOGIC)
  const buildMenuTree = (flatConfig) => {
    const itemMap = {};
    const tree = [];

    // Tạo bản đồ tham chiếu
    flatConfig.forEach(item => {
      if (item.visible === false) return;
      itemMap[item.id] = { ...item, subItems: [] };
    });

    // Xây dựng cây
    flatConfig.forEach(item => {
      if (item.visible === false) return;
      if (item.parentId && itemMap[item.parentId]) {
        itemMap[item.parentId].subItems.push(itemMap[item.id]);
      } else {
        tree.push(itemMap[item.id]);
      }
    });

    return tree;
  };

  // 2. AUTO-MERGE: Đảm bảo các mục mới trong code không bị mất nếu config cũ chưa có
  const mergeConfigWithMaster = (config, master) => {
    if (!config || config.length === 0) return master;
    
    // 1. Chỉ giữ lại những mục TRONG LOCALSTORAGE mà VẪN CÒN TỒN TẠI trong MASTER (Bản vẽ thiết kế trong code)
    const masterIds = new Set(master.filter(m => m.id).map(m => m.id));
    let filteredConfig = config.filter(c => c.id && masterIds.has(c.id));

    // 2. Thêm các mục TRONG MASTER mà CHƯA CÓ trong LOCALSTORAGE
    const configIds = new Set(filteredConfig.map(it => it.id));
    const missingInConfig = master.filter(m => m.id && !configIds.has(m.id));
    
    let mergedFlat = [...filteredConfig];
    missingInConfig.forEach(m => {
        mergedFlat.push({ ...m, visible: true, depth: 0, parentId: null });
    });
    
    return mergedFlat;
  };

  let finalMenuItems = [];
  
  // Ưu tiên cấu hình từ JSON (do người dùng chỉnh sửa)
  if (sidebarJSONConfig && sidebarJSONConfig.length > 0) {
    const mergedData = mergeConfigWithMaster(sidebarJSONConfig, menuItems);
    finalMenuItems = buildMenuTree(mergedData);
  } else {
    // Nếu chưa có config thì dùng mặc định
    finalMenuItems = menuItems;
  }

  return finalMenuItems;
};
export default useNavData;
