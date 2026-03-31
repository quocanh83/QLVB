import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, CardBody, CardHeader, Input, Button, Table, Spinner, Badge, Modal, ModalHeader, ModalBody, ModalFooter, Label, UncontrolledCollapse } from 'reactstrap';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import { toast } from 'react-toastify';
import FeatherIcon from 'feather-icons-react';

// dnd-kit imports
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';

const SortableSidebarItem = ({ id, children }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.7 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            {React.cloneElement(children, { dragHandleProps: listeners })}
        </div>
    );
};

const SortableSubItem = ({ id, children }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.7 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            {React.cloneElement(children, { dragHandleProps: listeners })}
        </div>
    );
};

const SidebarItemBody = ({ 
    item, detail, currentLabel, toggleSidebarVisible, deleteSidebarItem, openEditModal, 
    toggleSubItemVisible, promoteToParent, sensors, dragHandleProps 
}) => {
    return (
        <SidebarItemBodyBase 
            item={item}
            detail={detail}
            currentLabel={currentLabel}
            toggleSidebarVisible={toggleSidebarVisible}
            deleteSidebarItem={deleteSidebarItem}
            openEditModal={openEditModal}
            toggleSubItemVisible={toggleSubItemVisible}
            promoteToParent={promoteToParent}
            sensors={sensors}
            dragHandleProps={dragHandleProps}
        />
    );
};

const SidebarItemBodyBase = ({ 
    item, detail, currentLabel, toggleSidebarVisible, deleteSidebarItem, openEditModal, 
    toggleSubItemVisible, promoteToParent, dragHandleProps 
}) => {
    return (
        <div className="sidebar-item-row mb-3">
            <div className={`d-flex align-items-center p-3 border rounded bg-light ${!item.visible ? 'opacity-50' : ''} ${item.isHeader ? 'border-primary border-2' : ''}`}>
                <div className="drag-handle me-3 cursor-move" {...dragHandleProps}>
                    <i className="ri-drag-move-2-fill fs-20 text-muted"></i>
                </div>
                <div className="flex-grow-1">
                    <div className="d-flex align-items-center mb-1">
                        <div className="me-2 cursor-pointer" onClick={() => openEditModal(item.id)}>
                            <i className={`${item.icon || detail.icon} fs-18 text-primary shadow-sm p-1 bg-white rounded`}></i>
                        </div>
                        <h5 className="fs-14 mb-0 font-weight-bold d-flex align-items-center">
                            {currentLabel}
                            {item.isHeader && <Badge color="primary" className="ms-2 fs-10">HEADER</Badge>}
                            <Button type="button" color="link" size="sm" className="ms-2 p-0 text-muted" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditModal(item.id); }}>
                                <i className="ri-pencil-line"></i>
                            </Button>
                        </h5>
                    </div>
                    <div className="d-flex align-items-center">
                        <Badge color="soft-light" className="text-dark me-2">{item.id}</Badge>
                        {item.link && <small className="text-muted text-truncate" style={{maxWidth: '200px'}}>{item.link}</small>}
                    </div>
                </div>
                <div className="flex-shrink-0 d-flex align-items-center">
                    <div className="form-check form-switch me-3">
                        <Input 
                            className="form-check-input" 
                            type="checkbox" 
                            checked={item.visible}
                            onChange={(e) => { e.preventDefault(); e.stopPropagation(); toggleSidebarVisible(item.id); }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <Button type="button" color="soft-danger" size="sm" title="Xóa" onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteSidebarItem(item.id); }}>
                        <i className="ri-delete-bin-line"></i>
                    </Button>
                </div>
            </div>

            {item.visible && item.subItems && item.subItems.length > 0 && (
                <div className="ms-5 mt-2 border-start border-primary border-opacity-50 ps-3">
                    <SortableContext 
                        items={(item.subItems || []).map(s => s.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="sub-item-list">
                            {(item.subItems || []).map(subItem => {
                                const subDetail = (detail.subItems || []).find(d => d.id === subItem.id) || { label: subItem.label, icon: subItem.icon };
                                const subLabel = subItem.label || subDetail.label;
                                const subIcon = subItem.icon || "ri-arrow-right-s-line";
                                return (
                                    <SortableSubItem key={subItem.id} id={subItem.id}>
                                        <SubItemBody 
                                            parentId={item.id}
                                            subItem={subItem}
                                            subLabel={subLabel}
                                            subIcon={subIcon}
                                            openEditModal={openEditModal}
                                            promoteToParent={promoteToParent}
                                        />
                                    </SortableSubItem>
                                );
                            })}
                        </div>
                    </SortableContext>
                </div>
            )}
        </div>
    );
};

const SubItemBody = ({ parentId, subItem, subLabel, subIcon, openEditModal, promoteToParent, dragHandleProps }) => {
    return (
        <div className={`d-flex align-items-center p-2 mb-2 border rounded bg-white ${!subItem.visible ? 'opacity-50' : ''}`}>
            <div className="drag-handle me-2 cursor-move" {...dragHandleProps}>
                <i className="ri-drag-move-fill fs-14 text-muted"></i>
            </div>
            <div className="me-2">
                <i className={`${subIcon} text-info fs-16`}></i>
            </div>
            <div className="flex-grow-1">
                <span className="fs-13 fw-medium">{subLabel}</span>
                <Button type="button" color="link" size="sm" className="ms-1 p-0 text-muted" onClick={() => openEditModal(subItem.id, parentId)}>
                    <i className="ri-pencil-line"></i>
                </Button>
            </div>
            <div className="flex-shrink-0 d-flex align-items-center">
                <Button type="button" color="link" size="sm" className="text-primary p-0 me-2" title="Chuyển ra ngoài" onClick={() => promoteToParent(subItem.id, parentId)}>
                    <i className="ri-arrow-left-line"></i>
                </Button>
            </div>
        </div>
    );
};

const REMIX_ICONS = [
    "ri-dashboard-2-line", "ri-file-text-line", "ri-calendar-line", "ri-chat-3-line", 
    "ri-mail-line", "ri-team-line", "ri-briefcase-line", "ri-hand-coin-line",
    "ri-pie-chart-line", "ri-settings-3-line", "ri-apps-2-line", "ri-links-line",
    "ri-global-line", "ri-shield-user-line", "ri-database-2-line", "ri-image-line",
    "ri-map-pin-line", "ri-book-open-line", "ri-separator"
];

const defaultLocalSidebarConfig = [];
const Settings = () => {
    // State API Keys & Settings
    // State API Keys & Settings
    const [settings, setSettings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingValues, setEditingValues] = useState({});
    const [savingId, setSavingId] = useState(null);
    const [showKeys, setShowKeys] = useState({});

    // State Report Templates
    const [reportTemplates, setReportTemplates] = useState([]);
    const [uploadingTpl, setUploadingTpl] = useState(null);
    const [updating, setUpdating] = useState(false);

    // Sidebar Management State
    const [sidebarConfig, setSidebarConfig] = useState([]);
    const [localSidebarConfig, setLocalSidebarConfig] = useState(defaultLocalSidebarConfig);
    const [isSidebarChanged, setIsSidebarChanged] = useState(false);

    const [isEditModal, setIsEditModal] = useState(false);
    const [editItem, setEditItem] = useState(null); // {id, parentId, newParentId}
    const [tempEditLabel, setTempEditLabel] = useState('');
    const [tempEditIcon, setTempEditIcon] = useState('');
    const [tempEditIsHeader, setTempEditIsHeader] = useState(false);

    const [isIconPickerModal, setIsIconPickerModal] = useState(false);
    const [iconSearch, setIconSearch] = useState("");
    
    const [isCustomLinkModal, setIsCustomLinkModal] = useState(false);
    const [newCustomLink, setNewCustomLink] = useState({ label: '', link: '', icon: 'ri-links-line' });

    const [isResetConfirmModal, setIsResetConfirmModal] = useState(false);

    const defaultSidebarItems = [
        { id: 'dashboard', label: 'Tổng quan', icon: 'las la-tachometer-alt', visible: true, subItems: [] },
        { id: 'header-work', label: 'Danh mục Công việc', isHeader: true, visible: true, subItems: [] },
        { id: 'documents', label: 'Danh sách Dự thảo', icon: 'ri-file-list-3-line', visible: true, subItems: [] },
        { id: 'draft-consultation', label: 'Lấy ý kiến dự thảo', icon: 'ri-send-plane-2-line', visible: true, subItems: [] },
        { id: 'consultation-responses', label: 'Văn bản góp ý', icon: 'ri-file-copy-2-line', visible: true, subItems: [] },
        { id: 'draft-classification', label: 'Tiến độ góp ý', icon: 'ri-folders-line', visible: true, subItems: [] },
        { id: 'feedbacks', label: 'Danh sách Góp ý', icon: 'ri-discuss-line', visible: true, subItems: [] },
        { id: 'draft-explanation', label: 'Giải trình dự thảo', icon: 'ri-question-answer-line', visible: true, subItems: [] },
        { id: 'feedback-intake', label: 'Nhập góp ý thủ công', icon: 'ri-chat-new-line', visible: true, subItems: [] },
        { id: 'reports', label: 'Báo cáo tổng hợp', icon: 'ri-bar-chart-2-line', visible: true, subItems: [] },
        { id: 'header-sys', label: 'Hệ thống', isHeader: true, visible: true, subItems: [] },
        { 
            id: 'settings', 
            label: 'Cài đặt', 
            icon: 'ri-settings-4-line', 
            visible: true, 
            subItems: [
                { id: 'document-types', label: 'Quản lý Loại dự thảo', visible: true },
                { id: 'user-management', label: 'Quản lý Cán bộ', visible: true },
                { id: 'sys-settings', label: 'Cấu hình chung', visible: true }
            ] 
        },
    ];

    const SYSTEM_ROUTES = [
        { label: "Tổng quan (QLVB)", link: "/qlvb_dasboard" },
        { label: "Danh sách Văn bản", link: "/documents" },
        { label: "Lấy ý kiến dự thảo", link: "/draft-consultation" },
        { label: "Văn bản góp ý", link: "/consultation-responses" },
        { label: "Tiến độ góp ý", link: "/draft-classification" },
        { label: "Nhập góp ý thủ công", link: "/feedback-intake" },
        { label: "Giải trình Dự thảo", link: "/draft-explanation" },
        { label: "Danh sách Góp ý", link: "/feedbacks" },
        { label: "Trung tâm Báo cáo", link: "/reports" },
        { label: "Cấu hình Hệ thống", link: "/settings" },
        { label: "Quản lý Cán bộ", link: "/user-management" },
        { label: "Calendar", link: "/apps-calendar" },
        { label: "Chat", link: "/apps-chat" },
        { label: "Mailbox", link: "/apps-mailbox" }
    ];

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        fetchSettings();
        fetchReportTemplates();
    }, []);

    const forceInitializeSidebar = () => {
        const initial = defaultSidebarItems.map(defItem => ({
            id: defItem.id,
            label: defItem.label,
            icon: defItem.icon,
            isHeader: defItem.isHeader || false,
            visible: true,
            subItems: (defItem.subItems || []).map(s => ({
                id: s.id,
                label: s.label,
                visible: true
            }))
        }));
        setSidebarConfig(initial);
        setLocalSidebarConfig(initial);
        localStorage.setItem('sidebarJSONConfig', JSON.stringify(initial));
        setIsSidebarChanged(true); // Ensure user is prompted to save to DB
        toast.info("Đã nạp danh sách mặc định. Hãy nhấn 'Lưu thay đổi' để xác nhận.");
    };

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/settings/', getAuthHeader());
            const data = res.data || res;
            setSettings(data);
            const initValues = {};
            const localConfig = {};
            let sidebarLoaded = false;
            let finalSidebarJSON = [];

            data.forEach(s => {
                initValues[s.id] = s.value;
                if (s.key.startsWith('SIDEBAR_HIDE_')) {
                    localConfig[s.key] = s.value === 'true';
                }
                if (s.key === 'SIDEBAR_JSON_CONFIG') {
                    if (s.value && s.value.trim() !== "") {
                        try {
                            let parsed = JSON.parse(s.value);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                // Deduplicate
                                const seen = new Set();
                                finalSidebarJSON = parsed.filter(item => {
                                    if (!item.id || seen.has(item.id)) return false;
                                    seen.add(item.id);
                                    return true;
                                });
                                sidebarLoaded = true;
                            }
                        } catch (e) { 
                            console.error("Invalid sidebar JSON from DB", e); 
                        }
                    }
                }
            });

            // 2. FETCH USER PROFILE SIDEBAR CONFIG
            let userSidebarJSON = [];
            try {
                const profileRes = await axios.get('/api/accounts/profile/', getAuthHeader());
                const profileConfig = profileRes.sidebar_config || (profileRes.data && profileRes.data.sidebar_config);
                if (profileConfig) {
                    userSidebarJSON = profileConfig;
                }
            } catch (err) {
                console.error("Failed to fetch user profile", err);
            }

            // 3. PRIORITY LOGIC: Profile > Global System Setting > Default
            if (userSidebarJSON && userSidebarJSON.length > 0) {
                finalSidebarJSON = userSidebarJSON;
            } else if (!sidebarLoaded || finalSidebarJSON.length === 0) {
                // FALLBACK TO DEFAULT
                finalSidebarJSON = defaultSidebarItems.map(defItem => ({
                    id: defItem.id,
                    label: defItem.label,
                    visible: true,
                    subItems: (defItem.subItems || []).map(s => ({
                        id: s.id,
                        label: s.label,
                        visible: true
                    }))
                }));
            } else {
                // Keep the global finalSidebarJSON already loaded from SIDEBAR_JSON_CONFIG
                // But ensure all default items are at least present (Soft Merge)
                defaultSidebarItems.forEach(defItem => {
                    if (!finalSidebarJSON.find(p => p.id === defItem.id)) {
                        finalSidebarJSON.push({
                            id: defItem.id,
                            label: defItem.label,
                            visible: true,
                            subItems: (defItem.subItems || []).map(s => ({
                                id: s.id,
                                label: s.label,
                                visible: true
                            }))
                        });
                    }
                });
            }

            setSidebarConfig(finalSidebarJSON);
            setLocalSidebarConfig(finalSidebarJSON);
            localStorage.setItem('sidebarJSONConfig', JSON.stringify(finalSidebarJSON));

            setEditingValues(initValues);
            localStorage.setItem('sidebarConfig', JSON.stringify(localConfig));
        } catch (e) {
            toast.error('Lỗi tải cấu hình');
        } finally {
            setLoading(false);
        }
    };

    const saveSetting = async (id) => {
        setSavingId(id);
        try {
            await axios.patch(`/api/settings/${id}/`, { value: editingValues[id] }, getAuthHeader());
            toast.success("Đã lưu cấu hình.");
            fetchSettings();
        } catch (e) { toast.error('Lỗi khi lưu.'); }
        finally { setSavingId(null); }
    };

    const saveAllSidebarChanges = async () => {
        setLoading(true);
        try {
            const configStr = JSON.stringify(localSidebarConfig);
            // Lưu vào profile của user hiện tại
            await axios.patch('/api/accounts/profile/', { 
                sidebar_config: localSidebarConfig 
            }, getAuthHeader());

            setSidebarConfig(localSidebarConfig);
            setIsSidebarChanged(false);
            localStorage.setItem('sidebarJSONConfig', configStr);
            window.dispatchEvent(new CustomEvent('sidebar-config-update', { detail: localSidebarConfig }));
            toast.success("Đã lưu thay đổi thứ tự và hiển thị menu cá nhân.");
        } catch (e) {
            console.error("Failed to sync sidebar config:", e);
            const msg = (e.response && e.response.status === 401) 
                ? "Lỗi: Phiên đăng nhập hết hạn hoặc không có quyền." 
                : "Lỗi khi lưu cấu hình menu cá nhân.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const resetSidebar = () => {
        setLocalSidebarConfig(JSON.parse(JSON.stringify(sidebarConfig)));
        setIsSidebarChanged(false);
        localStorage.setItem('sidebarJSONConfig', JSON.stringify(sidebarConfig));
        toast.info("Đã khôi phục về bản lưu gần nhất.");
    };

    const onDragEnd = (event) => {
        const { active, over } = event;
        if (!over) return;

        if (active.id !== over.id) {
            setLocalSidebarConfig((prev) => {
                const activeIndex = prev.findIndex((item) => item.id === active.id);
                const overIndex = prev.findIndex((item) => item.id === over.id);

                if (activeIndex !== -1 && overIndex !== -1) {
                    setIsSidebarChanged(true);
                    return arrayMove(prev, activeIndex, overIndex);
                }

                return prev.map(item => {
                    if (item.subItems) {
                        const sActiveIdx = item.subItems.findIndex(s => s.id === active.id);
                        const sOverIdx = item.subItems.findIndex(s => s.id === over.id);
                        if (sActiveIdx !== -1 && sOverIdx !== -1) {
                            setIsSidebarChanged(true);
                            return { ...item, subItems: arrayMove(item.subItems, sActiveIdx, sOverIdx) };
                        }
                    }
                    return item;
                });
            });
        }
    };

    const toggleSidebarVisible = (id) => {
        setLocalSidebarConfig(prev => prev.map(item => {
            if (item.id === id) return { ...item, visible: !item.visible };
            if (item.subItems) {
                const updatedSubs = (item.subItems || []).map(s => s.id === id ? { ...s, visible: !s.visible } : s);
                return { ...item, subItems: updatedSubs };
            }
            return item;
        }));
        setIsSidebarChanged(true);
    };

    const deleteSidebarItem = (id) => {
        if (!window.confirm("Bạn có chắc muốn xóa mục này khỏi sidebar?")) return;
        setLocalSidebarConfig(prev => {
            const topLevel = prev.filter(it => it.id !== id);
            return topLevel.map(item => ({
                ...item,
                subItems: (item.subItems || []).filter(s => s.id !== id)
            }));
        });
        setIsSidebarChanged(true);
    };

    const promoteToParent = (subId, parentId) => {
        setLocalSidebarConfig(prev => {
            let parentIndex = -1;
            let itemToMoveInside = null;
            const updatedItems = prev.map((item, idx) => {
                if (item.id === parentId && item.subItems) {
                    parentIndex = idx;
                    itemToMoveInside = item.subItems.find(s => s.id === subId);
                    return { ...item, subItems: item.subItems.filter(s => s.id !== subId) };
                }
                return item;
            });
            if (itemToMoveInside) {
                const newItem = { ...itemToMoveInside, visible: true };
                // Chèn vào ngay sau vị trí của cha cũ
                if (parentIndex !== -1) {
                    updatedItems.splice(parentIndex + 1, 0, newItem);
                } else {
                    updatedItems.push(newItem);
                }
            }
            return updatedItems;
        });
        setIsSidebarChanged(true);
        toast.info(`Đã chuyển mục ra menu chính. Nhấn Lưu để xác nhận.`);
    };

    const openEditModal = (id, parentId = null) => {
        const item = localSidebarConfig.find(it => it.id === id) || (parentId ? (localSidebarConfig.find(p => p.id === parentId)?.subItems || []).find(s => s.id === id) : null);
        const detail = defaultSidebarItems.find(d => d.id === (parentId || id)) || {};
        const subDetail = parentId ? (detail.subItems || []).find(s => s.id === id) : null;
        
        setEditItem({ id, parentId, newParentId: parentId || "" });
        setTempEditLabel(item?.label || (parentId ? subDetail?.label : detail.label) || id);
        setTempEditIcon(item?.icon || (parentId ? "ri-arrow-right-s-line" : detail.icon) || 'ri-record-circle-line');
        setTempEditIsHeader(item?.isHeader || false);
        setIsEditModal(true);
    };

    const saveEditModal = () => {
        const { id, parentId, newParentId } = editItem;
        
        setLocalSidebarConfig(prev => {
            let workingConfig = [...prev];
            let itemToMoveInside = null;

            // 1. Find and Extract item
            if (parentId) {
                const parentIdx = workingConfig.findIndex(p => p.id === parentId);
                const parent = parentIdx !== -1 ? { ...workingConfig[parentIdx] } : null;
                if (parent && parent.subItems) {
                    const idx = parent.subItems.findIndex(s => s.id === id);
                    if (idx !== -1) {
                        const updatedItem = { ...parent.subItems[idx], label: tempEditLabel, icon: tempEditIcon, isHeader: tempEditIsHeader };
                        
                        if (parentId === newParentId) {
                            // Cập nhật tại chỗ nếu không đổi cha
                            parent.subItems[idx] = updatedItem;
                            workingConfig[parentIdx] = parent;
                            return workingConfig;
                        } else {
                            // Rút ra để chuyển đi
                            itemToMoveInside = updatedItem;
                            parent.subItems = parent.subItems.filter(s => s.id !== id);
                            workingConfig[parentIdx] = parent;
                        }
                    }
                }
            } else {
                const idx = workingConfig.findIndex(it => it.id === id);
                if (idx !== -1) {
                    const updatedItem = { ...workingConfig[idx], label: tempEditLabel, icon: tempEditIcon, isHeader: tempEditIsHeader };
                    
                    if (!newParentId || newParentId === "") {
                        // Cập nhật tại chỗ ở menu chính
                        workingConfig[idx] = updatedItem;
                        return workingConfig;
                    } else {
                        // Rút ra để chuyển vào submenu
                        itemToMoveInside = updatedItem;
                        workingConfig = workingConfig.filter(it => it.id !== id);
                    }
                }
            }

            if (!itemToMoveInside) return prev; // Should not happen

            // 2. Insert into NEW parent (if moved)
            if (newParentId && newParentId !== "") {
                const targetParentIdx = workingConfig.findIndex(p => p.id === newParentId);
                if (targetParentIdx !== -1) {
                    const targetParent = { ...workingConfig[targetParentIdx] };
                    if (!targetParent.subItems) targetParent.subItems = [];
                    targetParent.subItems.push(itemToMoveInside);
                    workingConfig[targetParentIdx] = targetParent;
                } else {
                    workingConfig.push(itemToMoveInside); // Fallback
                }
            } else {
                workingConfig.push(itemToMoveInside);
            }

            return workingConfig;
        });

        setIsSidebarChanged(true);
        setIsEditModal(false);
    };

    const addCustomLink = () => {
        if (!newCustomLink.label || !newCustomLink.link) {
            toast.warning("Vui lòng điền tên và đường dẫn.");
            return;
        }
        const id = 'custom-' + Date.now();
        const newItem = {
            id,
            label: newCustomLink.label,
            link: newCustomLink.link,
            icon: newCustomLink.icon,
            visible: true
        };
        setLocalSidebarConfig([...localSidebarConfig, newItem]);
        setIsSidebarChanged(true);
        setIsCustomLinkModal(false);
        setNewCustomLink({ label: '', link: '', icon: 'ri-links-line' });
        toast.success("Đã thêm liên kết tùy chỉnh.");
    };

    const fetchReportTemplates = async () => {
        try {
            const res = await axios.get('/api/reports/templates/', getAuthHeader());
            setReportTemplates(res.data);
        } catch (e) { console.error(e); }
    };

    const uploadTemplate = async (templateId, file) => {
        if (!file) return;
        setUploadingTpl(templateId);
        try {
            const formData = new FormData();
            formData.append('file', file);
            await axios.post(`/api/reports/templates/${templateId}/upload_template/`, formData, {
                ...getAuthHeader(),
                headers: { ...getAuthHeader().headers, 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Mẫu Word đã được cập nhật thành công!');
            fetchReportTemplates();
        } catch (e) { toast.error('Lỗi khi tải lên file định dạng.'); }
        finally { setUploadingTpl(null); }
    };

    const removeTemplate = async (templateId) => {
        if (!window.confirm('Xóa file template này? Hệ thống sẽ dùng lại mẫu mặc định.')) return;
        try {
            await axios.post(`/api/reports/templates/${templateId}/remove_template/`, {}, getAuthHeader());
            toast.success('Đã gỡ file tuỳ chỉnh.');
            fetchReportTemplates();
        } catch (e) { toast.error('Lỗi khi xóa.'); }
    };

    const handleDownloadSchema = async (tplId, tplName) => {
        try {
            const res = await axios.get(`/api/reports/templates/${tplId}/download_schema/`, {
                ...getAuthHeader(),
                responseType: 'blob'
            });
            const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', tplName.toLowerCase().replace(/\s+/g, '_') + '_original.docx');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(blobUrl);
        } catch (e) { toast.error('Lỗi khi tải mẫu gốc.'); }
    };

    const handleSystemUpdate = async () => {
        if (!window.confirm('Cập nhật mã nguồn có thể làm gián đoạn máy chủ. Bạn có tiếp tục?')) return;
        setUpdating(true);
        try {
            await axios.post('/api/settings/update-system/', {}, getAuthHeader());
            toast.success('Cập nhật bắt đầu! Đợi 1-2 phút...');
        } catch (e) {
            toast.error('Lỗi khi gọi lệnh cập nhật.');
        } finally {
            setUpdating(false);
        }
    };

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Cấu hình Hệ thống" pageTitle="Quản trị" />

                    <Card className="bg-primary text-white border-0 ribbon-box">
                        <CardBody className="p-4">
                            <Row className="align-items-center">
                                <Col sm={8}>
                                    <div className="d-flex align-items-center">
                                        <div className="avatar-sm flex-shrink-0 me-3">
                                            <span className="avatar-title bg-white bg-opacity-25 rounded-circle fs-3">
                                                <i className="ri-cpu-line"></i>
                                            </span>
                                        </div>
                                        <div>
                                            <h4 className="text-white mb-2 font-weight-bold">AI & Copilot Settings</h4>
                                            <p className="text-white-50 mb-0">Quản lý khoá API Token LLMs và thiết lập cấu hình môi trường vận hành.</p>
                                        </div>
                                    </div>
                                </Col>
                                <Col sm={4} className="text-sm-end mt-3 mt-sm-0">
                                    <Button color="light" onClick={fetchSettings} disabled={loading} className="btn-label waves-effect waves-light">
                                        <i className="ri-refresh-line label-icon align-middle fs-16 me-2"></i> Đồng bộ Cấu hình
                                    </Button>
                                </Col>
                            </Row>
                        </CardBody>
                    </Card>

                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardHeader>
                                    <h4 className="card-title mb-0 d-flex align-items-center">
                                        <i className="ri-database-2-line me-2 text-primary fs-20"></i> Tham số Vận hành (Env Override)
                                    </h4>
                                </CardHeader>
                                <CardBody>
                                    <Table className="table-borderless align-middle mb-0">
                                        <tbody>
                                            {settings?.map(s => (
                                                <tr key={s.id} className="border-bottom border-dashed border-bottom-1">
                                                    <td style={{ width: "30%" }}>
                                                        <h6 className="mb-1">{s.key}</h6>
                                                        <p className="text-muted mb-0 fs-12">{s.description}</p>
                                                    </td>
                                                    <td style={{ width: "50%" }}>
                                                        <div className="form-icon">
                                                            <Input 
                                                                type={showKeys[s.id] || !s.key.includes('KEY') ? "text" : "password"} 
                                                                className="form-control form-control-icon bg-light border-0" 
                                                                value={editingValues[s.id] || ''} 
                                                                onChange={(e) => setEditingValues(prev => ({...prev, [s.id]: e.target.value}))} 
                                                            />
                                                            {s.key.includes('KEY') && <i className="ri-lock-2-line"></i>}
                                                        </div>
                                                    </td>
                                                    <td className="text-end" style={{ width: "20%" }}>
                                                        {s.key.includes('KEY') && (
                                                            <Button color="light" className="me-2 text-muted btn-icon" onClick={() => setShowKeys(prev => ({...prev, [s.id]: !prev[s.id]}))}>
                                                                 <i className={showKeys[s.id] ? "ri-eye-off-line" : "ri-eye-line"}></i>
                                                            </Button>
                                                        )}
                                                        <Button color="primary" disabled={savingId === s.id} onClick={() => saveSetting(s.id)}>
                                                            {savingId === s.id ? <Spinner size="sm" /> : <i className="ri-save-3-line align-bottom"></i>} Lưu
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </CardBody>
                            </Card>
                        </Col>

                        <Col lg={12}>
                            <Card className="shadow-lg border-0">
                                <CardHeader className="bg-soft-primary d-flex align-items-center justify-content-between py-3">
                                    <h4 className="card-title mb-0 d-flex align-items-center text-primary">
                                        <i className="ri-menu-2-line me-2 fs-22"></i> Quản lý Menu Sidebar (Nâng cao)
                                    </h4>
                                    <div className="d-flex gap-2">
                                        <Button color="success" size="sm" className="btn-label waves-effect waves-light" onClick={() => setIsCustomLinkModal(true)}>
                                            <i className="ri-add-line label-icon align-middle fs-16 me-2"></i> Thêm Liên kết
                                        </Button>
                                        <Button color="soft-danger" size="sm" onClick={() => setIsResetConfirmModal(true)}>
                                            <i className="ri-refresh-line align-middle me-1"></i> Khôi phục
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardBody>
                                    <div className="alert alert-info border-0 rounded-pill bg-soft-info text-info mb-4 d-flex align-items-center">
                                        <i className="ri-information-line fs-20 me-2"></i>
                                        <span>Kéo thả để sắp xếp thứ tự. Sử dụng công tắc để ẩn/hiện các mục trên thanh điều hướng chính.</span>
                                    </div>

                                    {localSidebarConfig.length === 0 ? (
                                        <div className="text-center py-5 bg-light rounded border border-dashed">
                                            <div className="avatar-md mx-auto mb-3">
                                                <div className="avatar-title bg-soft-primary text-primary rounded-circle fs-24">
                                                    <i className="ri-menu-search-line"></i>
                                                </div>
                                            </div>
                                            <h5>Chưa có cấu hình Sidebar</h5>
                                            <p className="text-muted">Nhấn nút bên dưới để khởi tạo danh sách mặc định từ hệ thống.</p>
                                            <Button color="primary" onClick={forceInitializeSidebar}>
                                                Khởi tạo cấu hình mặc định
                                            </Button>
                                        </div>
                                    ) : (
                                        <DndContext 
                                            sensors={sensors}
                                            collisionDetection={closestCenter}
                                            onDragEnd={onDragEnd}
                                            modifiers={[restrictToVerticalAxis]}
                                        >
                                            <SortableContext 
                                                items={localSidebarConfig?.map(it => it.id) || []}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                <div className="sidebar-management-list">
                                                    {localSidebarConfig?.map((item) => {
                                                        const detail = defaultSidebarItems.find(d => d.id === item.id) || { label: item.label, icon: item.icon || 'ri-links-line' };
                                                        const currentLabel = item.label || detail.label;
                                                        
                                                        return (
                                                            <SortableSidebarItem key={item.id} id={item.id}>
                                                                <SidebarItemBody 
                                                                    item={item}
                                                                    detail={detail}
                                                                    currentLabel={currentLabel}
                                                                    toggleSidebarVisible={toggleSidebarVisible}
                                                                    deleteSidebarItem={deleteSidebarItem}
                                                                    openEditModal={openEditModal}
                                                                    toggleSubItemVisible={() => {}} 
                                                                    promoteToParent={promoteToParent}
                                                                    sensors={sensors}
                                                                />
                                                            </SortableSidebarItem>
                                                        );
                                                    })}
                                                </div>
                                            </SortableContext>
                                        </DndContext>
                                    )}

                                    {isSidebarChanged && (
                                        <div className="mt-4 p-3 bg-soft-warning rounded border border-warning border-opacity-25 d-flex align-items-center justify-content-between animate__animated animate__fadeIn">
                                            <div className="d-flex align-items-center">
                                                <i className="ri-error-warning-line fs-20 text-warning me-2"></i>
                                                <span className="fw-medium text-warning">Bạn có thay đổi chưa lưu!</span>
                                            </div>
                                            <div className="d-flex gap-2">
                                                <Button color="link" className="text-muted fw-medium p-0" onClick={resetSidebar}>Hủy bỏ</Button>
                                                <Button color="warning" size="sm" onClick={saveAllSidebarChanges} disabled={loading}>
                                                    {loading ? <Spinner size="sm" /> : "Lưu thay đổi"}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        </Col>

                        <Col lg={12}>
                            <Card>
                                <CardHeader className="bg-light bg-opacity-50">
                                    <h4 className="card-title mb-0 d-flex align-items-center">
                                        <i className="ri-file-word-2-fill text-info me-2 fs-20"></i> Quản lý Mẫu Báo cáo (.docx)
                                    </h4>
                                </CardHeader>
                                <CardBody>
                                    <Table className="align-middle table-nowrap mb-0">
                                        <tbody>
                                            {reportTemplates?.map(tpl => (
                                                <tr key={tpl.id}>
                                                    <td>
                                                        <div className="d-flex align-items-center">
                                                            <div className="avatar-xs flex-shrink-0 me-3">
                                                                <div className={`avatar-title rounded ${tpl.has_custom_file ? 'bg-success-subtle text-success' : 'bg-light text-muted'}`}>
                                                                    <i className={tpl.has_custom_file ? "ri-checkbox-circle-fill fs-16" : "ri-file-text-line fs-16"}></i>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <h5 className="fs-14 mb-1">{tpl.name}</h5>
                                                                {tpl.has_custom_file ? (
                                                                    <p className="text-success fw-medium fs-12 mb-0">Tệp tuỳ chỉnh đính kèm: {tpl.file_name}</p>
                                                                ) : (
                                                                    <p className="text-muted fs-12 mb-0">Sử dụng tệp báo cáo gốc của hệ thống</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-end">
                                                        <div className="d-flex justify-content-end gap-2">
                                                            {tpl.has_custom_file && (
                                                                <Button color="danger" outline size="sm" onClick={() => removeTemplate(tpl.id)}>
                                                                    <i className="ri-delete-bin-line align-bottom"></i> Xoá
                                                                </Button>
                                                            )}
                                                            <Button color="info" outline size="sm" onClick={() => handleDownloadSchema(tpl.id, tpl.name)} title="Tải mẫu Document với JSON Data Tags">
                                                                <i className="ri-download-2-line align-bottom me-1"></i> Tải lõi gốc
                                                            </Button>
                                                            <div>
                                                                <input type="file" id={`upload-${tpl.id}`} accept=".docx" className="d-none" onChange={e => { if(e.target.files[0]) uploadTemplate(tpl.id, e.target.files[0]); }} />
                                                                <label htmlFor={`upload-${tpl.id}`} className="btn btn-primary btn-sm mb-0 cursor-pointer">
                                                                    {uploadingTpl === tpl.id ? <Spinner size="sm"/> : <i className="ri-upload-cloud-2-line align-bottom me-1"></i>} 
                                                                    Thay thế File
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </CardBody>
                            </Card>
                        </Col>

                        <Col lg={12}>
                            <Card className="bg-dark text-white border-0">
                                <CardBody className="p-4 d-flex align-items-center">
                                    <div className="flex-grow-1">
                                        <h4 className="text-white mb-2"><i className="ri-github-fill me-2 fs-24 align-middle text-info"></i> Đồng bộ Máy Chủ (System Updater)</h4>
                                        <p className="text-white-50 mb-0">Hệ thống sẽ chạy lệnh <code>git pull</code> và tự khởi động lại Web server. Chỉ dành cho SysAdmin.</p>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <Button color="info" className="btn-label" onClick={handleSystemUpdate} disabled={updating}>
                                            {updating ? <Spinner size="sm" className="me-2"/> : <i className="ri-settings-5-line label-icon align-middle fs-16 me-2"></i>} 
                                            {updating ? 'Đang triển khai...' : 'Khởi chạy Cập nhật'}
                                        </Button>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>

            {/* Modal: Add Custom Link */}
            <Modal isOpen={isCustomLinkModal} toggle={() => setIsCustomLinkModal(false)} centered className="border-0">
                <ModalHeader toggle={() => setIsCustomLinkModal(false)} className="bg-soft-success text-success p-3">
                    <i className="ri-add-circle-line me-2 fs-20"></i> Thêm Liên kết Sidebar
                </ModalHeader>
                <ModalBody className="p-4">
                    <div className="mb-3">
                        <Label className="form-label fw-bold">Chọn trang hệ thống</Label>
                        <Input type="select" className="mb-2 bg-light border-success border-opacity-25" onChange={(e) => {
                            const route = SYSTEM_ROUTES.find(r => r.link === e.target.value);
                            if (route) setNewCustomLink({ ...newCustomLink, label: route.label, link: route.link });
                        }}>
                            <option value="">-- Chọn nhanh từ hệ thống --</option>
                            {SYSTEM_ROUTES?.map(r => <option key={r.link} value={r.link}>{r.label}</option>)}
                        </Input>
                    </div>
                    <div className="mb-3">
                        <Label className="form-label fw-bold">Tên hiển thị</Label>
                        <Input 
                            type="text" 
                            className="form-control-lg border-2"
                            placeholder="Nhập tên mục menu..."
                            value={newCustomLink.label} 
                            onChange={(e) => setNewCustomLink({...newCustomLink, label: e.target.value})} 
                        />
                    </div>
                    <div className="mb-3">
                        <Label className="form-label fw-bold">Đường dẫn (URL)</Label>
                        <Input 
                            type="text" 
                            className="bg-light"
                            placeholder="/example-path"
                            value={newCustomLink.link} 
                            onChange={(e) => setNewCustomLink({...newCustomLink, link: e.target.value})} 
                        />
                    </div>
                    <div className="mb-0">
                        <Label className="form-label fw-bold">Icon hiển thị</Label>
                        <div className="d-flex align-items-center gap-3 p-2 bg-light rounded border border-dashed text-center justify-content-center">
                            <i className={`${newCustomLink.icon} fs-24 text-primary`}></i>
                            <Button color="light" size="sm" onClick={() => setIsIconPickerModal(true)}>
                                <i className="ri-image-search-line me-1"></i> Thay đổi Icon
                            </Button>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter className="bg-light bg-opacity-50 p-3">
                    <Button color="link" className="text-muted fw-medium" onClick={() => setIsCustomLinkModal(false)}>Đóng</Button>
                    <Button color="success" className="px-4" onClick={addCustomLink}>Thêm mục mới</Button>
                </ModalFooter>
            </Modal>

            {/* Modal: Edit Sidebar Item */}
            <Modal isOpen={isEditModal} toggle={() => setIsEditModal(false)} centered>
                <ModalHeader toggle={() => setIsEditModal(false)} className="bg-soft-primary p-3">
                    <i className="ri-edit-2-line me-2"></i> Chỉnh sửa: {tempEditLabel}
                </ModalHeader>
                <ModalBody className="p-4">
                    <div className="mb-4">
                        <Label className="form-label fw-bold text-muted">Tên hiển thị trên menu</Label>
                        <Input 
                            type="text" 
                            className="form-control-lg border-primary border-opacity-25"
                            value={tempEditLabel} 
                            onChange={(e) => setTempEditLabel(e.target.value)} 
                        />
                    </div>
                    <div className="mb-4">
                        <Label className="form-label fw-bold text-muted">Mục cha (Nesting)</Label>
                        <Input 
                            type="select" 
                            className="form-select border-primary border-opacity-25"
                            value={editItem?.newParentId || ""}
                            onChange={(e) => setEditItem({ ...editItem, newParentId: e.target.value })}
                        >
                            <option value="">-- Không có (Mục chính) --</option>
                            {(localSidebarConfig || []).filter(it => it.id !== editItem?.id).map(it => (
                                <option key={it.id} value={it.id}>{it.label || it.id}</option>
                            ))}
                        </Input>
                        <p className="text-muted fs-11 mt-1 mb-0">Chọn mục này nếu bạn muốn biến mục hiện tại thành mục con.</p>
                    </div>
                    <div className="mb-4">
                        <Label className="form-label fw-bold text-muted">Biểu tượng (Icon)</Label>
                        <div className="d-flex align-items-center gap-3 p-3 bg-light rounded border">
                            <div className="avatar-sm flex-shrink-0">
                                <div className="avatar-title bg-white text-primary rounded fs-20 shadow-sm">
                                    <i className={`${tempEditIcon} form-icon-item fs-16`}></i>
                                </div>
                            </div>
                            <Button color="light" className="flex-grow-1" onClick={() => setIsIconPickerModal(true)}>
                                <i className="ri-image-search-line me-1"></i> Chọn icon từ thư viện
                            </Button>
                        </div>
                    </div>
                    
                    <div className="mb-0">
                        <div className="form-check form-switch form-switch-lg shadow-sm p-3 bg-light rounded border">
                            <Input 
                                className="form-check-input ms-0" 
                                type="checkbox" 
                                checked={tempEditIsHeader}
                                onChange={(e) => setTempEditIsHeader(e.target.checked)}
                                id="isHeaderSwitch"
                            />
                            <Label className="form-check-label ms-2 fw-semibold" htmlFor="isHeaderSwitch">
                                Dùng làm tiêu đề ngăn cách (Sidebar Header)
                            </Label>
                            <p className="text-muted fs-11 mb-0 mt-1 ms-2">Khi bật, mục này sẽ hiển thị như một tiêu đề nhóm và không có liên kết nhấn.</p>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter className="bg-light p-3">
                    <Button color="link" className="text-muted" onClick={() => setIsEditModal(false)}>Hủy</Button>
                    <Button color="primary" className="px-4" onClick={saveEditModal}>Cập nhật thông tin</Button>
                </ModalFooter>
            </Modal>

            {/* Modal: Icon Picker */}
            <Modal isOpen={isIconPickerModal} toggle={() => setIsIconPickerModal(false)} size="lg" scrollable centered>
                <ModalHeader toggle={() => setIsIconPickerModal(false)} className="bg-light">
                    Chọn Icon Hiển thị
                </ModalHeader>
                <ModalBody>
                    <div className="mb-3">
                        <Input 
                            type="text" 
                            placeholder="Tìm kiếm icon (ví dụ: user, file, home...)" 
                            value={iconSearch} 
                            onChange={(e) => setIconSearch(e.target.value)}
                        />
                    </div>
                    <Row className="text-center">
                        {REMIX_ICONS.filter(icon => icon.includes(iconSearch)).map(icon => (
                            <Col key={icon} xs={3} sm={2} className="mb-3">
                                <Button 
                                    color="light" 
                                    className={`w-100 p-3 fs-24 ${tempEditIcon === icon || newCustomLink.icon === icon ? 'border-primary border-2 text-primary bg-soft-primary' : ''}`}
                                    onClick={() => {
                                        if (isEditModal) setTempEditIcon(icon);
                                        else setNewCustomLink({ ...newCustomLink, icon });
                                        setIsIconPickerModal(false);
                                    }}
                                >
                                    <i className={icon}></i>
                                </Button>
                                <div className="text-truncate fs-10 text-muted mt-1">{icon.replace('ri-', '')}</div>
                            </Col>
                        ))}
                    </Row>
                </ModalBody>
            </Modal>

            {/* Modal: Confirm Reset */}
            <Modal isOpen={isResetConfirmModal} toggle={() => setIsResetConfirmModal(false)} centered className="border-0">
                <ModalBody className="text-center p-5">
                    <div className="avatar-lg mx-auto mb-4">
                        <div className="avatar-title bg-soft-danger text-danger rounded-circle fs-36">
                            <i className="ri-error-warning-line"></i>
                        </div>
                    </div>
                    <h4 className="mb-3">Xác nhận Khôi phục?</h4>
                    <p className="text-muted mb-4 fs-15">Hành động này sẽ tải lại danh sách menu mặc định từ hệ thống. Các liên kết tùy chỉnh của bạn sẽ tạm thời bị ẩn. Bạn cần nhấn <b>Lưu thay đổi</b> để áp dụng chính thức.</p>
                    <div className="hstack gap-2 justify-content-center">
                        <Button color="link" className="text-muted fw-medium" onClick={() => setIsResetConfirmModal(false)}>Hủy bỏ</Button>
                        <Button color="danger" className="px-4" onClick={() => { forceInitializeSidebar(); setIsResetConfirmModal(false); }}>Đồng ý Khôi phục</Button>
                    </div>
                </ModalBody>
            </Modal>
        </React.Fragment>
    );  
};

export default Settings;
