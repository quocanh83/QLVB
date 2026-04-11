import React, { useState, useEffect, useMemo } from "react";
import {
    Card,
    CardBody,
    CardHeader,
    Col,
    Container,
    Row,
    Button,
    Input,
    Label,
    FormGroup,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    InputGroup,
    Nav,
    NavItem,
    NavLink,
    TabContent,
    TabPane
} from "reactstrap";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import axios from "axios";
import { getAuthHeader } from "../../helpers/api_helper";
import menuMaster from "../../Layouts/MenuConfig";
import { toast, ToastContainer } from "react-toastify";
import SimpleBar from "simplebar-react";
import classnames from "classnames";

// Icon Data Source (Simplified from RemixIcons.js)
const ICONS_RAW = {"Buildings":["home","home-2","home-3","home-4","home-5","home-6","home-7","home-8","home-gear","home-wifi","home-smile","home-smile-2","home-heart","building","building-2","building-3","building-4","hotel","community","government","bank","store","store-2","store-3","hospital","ancient-gate","ancient-pavilion"],"Business":["mail","mail-open","mail-send","mail-unread","mail-add","mail-check","mail-close","mail-download","mail-forbid","mail-lock","mail-settings","mail-star","mail-volume","inbox","inbox-archive","inbox-unarchive","cloud","cloud-off","attachment","profile","archive","archive-drawer","at","award","medal","medal-2","bar-chart","bar-chart-horizontal","bar-chart-2","bar-chart-box","bar-chart-grouped","bubble-chart","pie-chart","pie-chart-2","pie-chart-box","donut-chart","line-chart","bookmark","bookmark-2","bookmark-3","briefcase","briefcase-2","briefcase-3","briefcase-4","briefcase-5","calculator","calendar","calendar-2","calendar-event","calendar-todo","calendar-check","customer-service","customer-service-2","flag","flag-2","global","honour","links","printer","printer-cloud","record-mail","reply","send-plane","send-plane-2","projector","projector-2","slideshow","slideshow-2","slideshow-3","slideshow-4","window","window-2","stack","service","registered","trademark","advertisement","copyright","creative-commons","creative-commons-by","creative-commons-nc","creative-commons-nd","creative-commons-sa","creative-commons-zero"],"Communication":["chat-1","chat-2","chat-3","chat-4","message","message-2","message-3","chat-check","chat-delete","chat-forward","chat-upload","chat-download","chat-new","chat-settings","chat-smile","chat-smile-2","chat-smile-3","chat-heart","chat-off","feedback","discuss","question-answer","questionnaire","video-chat","chat-voice","chat-quote","chat-follow-up","chat-poll","chat-history","chat-private"],"Design":["pencil","edit","edit-2","ball-pen","quill-pen","mark-pen","markup","pen-nib","edit-box","edit-circle","sip","brush","brush-2","brush-3","brush-4","paint-brush","contrast","contrast-2","drop","blur-off","contrast-drop","contrast-drop-2","compasses","compasses-2","scissors","scissors-cut","scissors-2","slice","eraser","ruler","ruler-2","pencil-ruler","pencil-ruler-2","t-box","input-method","artboard","artboard-2","crop","crop-2","screenshot","screenshot-2","drag-move","drag-move-2","focus","focus-2","focus-3","paint","palette","pantone","shape","shape-2","magic","anticlockwise","anticlockwise-2","clockwise","clockwise-2","hammer","tools","drag-drop","table","table-alt","layout","layout-2","layout-3","layout-4","layout-5","layout-6","layout-column","layout-row","layout-top","layout-right","layout-bottom","layout-left","layout-top-2","layout-right-2","layout-bottom-2","layout-left-2","layout-grid","layout-masonry","grid"],"Development":["bug","bug-2","code","code-s","code-s-slash","code-box","terminal-box","terminal","terminal-window","parentheses","brackets","braces","command","cursor","git-commit","git-pull-request","git-merge","git-branch","git-repository","git-repository-commits","git-repository-private","html5","css3"],"Device":["tv","tv-2","computer","mac","macbook","cellphone","smartphone","tablet","device","phone","database","database-2","server","hard-drive","hard-drive-2","install","uninstall","save","save-2","save-3","sd-card","sd-card-mini","sim-card","sim-card-2","dual-sim-1","dual-sim-2","u-disk","battery","battery-charge","battery-low","battery-2","battery-2-charge","battery-saver","battery-share","cast","airplay","cpu","gradienter","keyboard","keyboard-box","mouse","sensor","router","radar","gamepad","remote-control","remote-control-2","device-recover","hotspot","phone-find","phone-lock","rotate-lock","restart","shut-down","fingerprint","fingerprint-2","barcode","barcode-box","qr-code","qr-scan","qr-scan-2","scan","scan-2","rss","gps","base-station","bluetooth","bluetooth-connect","wifi","wifi-off","signal-wifi","signal-wifi-1","signal-wifi-2","signal-wifi-3","signal-wifi-error","signal-wifi-off","wireless-charging"],"Document":["file","file-2","file-3","file-4","sticky-note","sticky-note-2","file-edit","file-paper","file-paper-2","file-text","file-list","file-list-2","file-list-3","bill","file-copy","file-copy-2","clipboard","survey","article","newspaper","file-zip","file-mark","task","todo","book","book-mark","book-2","book-3","book-open","book-read","contacts-book","contacts-book-2","contacts-book-upload","booklet","file-code","file-pdf","file-word","file-ppt","file-excel","file-word-2","file-ppt-2","file-excel-2","file-hwp","keynote","numbers","pages","file-search","file-add","file-reduce","file-settings","file-upload","file-transfer","file-download","file-lock","file-chart","file-chart-2","file-music","file-gif","file-forbid","file-info","file-warning","file-unknow","file-user","file-shield","file-shield-2","file-damage","file-history","file-shred","file-cloud","folder","folder-2","folder-3","folder-4","folder-5","folders","folder-add","folder-reduce","folder-settings","folder-upload","folder-transfer","folder-download","folder-lock","folder-chart","folder-chart-2","folder-music","folder-forbid","folder-info","folder-warning","folder-unknow","folder-user","folder-shield","folder-shield-2","folder-shared","folder-received","folder-open","folder-keyhole","folder-zip","folder-history","markdown"],"Editor":["bold","italic","heading","text","font-color","font-size","font-size-2","underline","emphasis","emphasis-cn","strikethrough","strikethrough-2","format-clear","align-left","align-center","align-right","align-justify","align-top","align-vertically","align-bottom","list-check","list-check-2","list-ordered","list-unordered","indent-decrease","indent-increase","line-height","text-spacing","text-wrap","attachment-2","link","link-unlink","link-m","link-unlink-m","separator","space","page-separator","code-view","double-quotes-l","double-quotes-r","single-quotes-l","single-quotes-r","table-2","subscript","subscript-2","superscript","superscript-2","paragraph","text-direction-l","text-direction-r","functions","omega","hashtag","asterisk","translate","translate-2","a-b","english-input","pinyin-input","wubi-input","input-cursor-move","number-1","number-2","number-3","number-4","number-5","number-6","number-7","number-8","number-9","number-0","sort-asc","sort-desc","bring-forward","send-backward","bring-to-front","send-to-back"],"Finance":["wallet","wallet-2","wallet-3","bank-card","bank-card-2","secure-payment","refund","refund-2","safe","safe-2","price-tag","price-tag-2","price-tag-3","ticket","ticket-2","coupon","coupon-2","coupon-3","coupon-4","coupon-5","shopping-bag","shopping-bag-2","shopping-bag-3","shopping-basket","shopping-basket-2","shopping-cart","shopping-cart-2","vip","vip-crown","vip-crown-2","vip-diamond","trophy","exchange","exchange-box","swap","swap-box","exchange-dollar","exchange-cny","exchange-funds","increase-decrease","percent","copper-coin","copper-diamond","money-cny-box","money-cny-circle","money-dollar-box","money-dollar-circle","money-euro-box","money-euro-circle","money-pound-box","money-pound-circle","bit-coin","coin","coins","currency","funds","funds-box","red-packet","water-flash","stock","auction","gift","gift-2","hand-coin","hand-heart"],"Others":["basketball","bell","billiards","boxing","cake","cake-2","cake-3","door-lock","door-lock-box","flask","football","game","handbag","hearts","key","key-2","knife","knife-blood","lightbulb","lightbulb-flash","outlet","outlet-2","ping-pong","plug","plug-2","reserved","shirt","sword","t-shirt","t-shirt-2","t-shirt-air","umbrella","character-recognition","voice-recognition","leaf","plant","recycle","scales","scales-2","fridge","wheelchair"],"System":["apps","apps-2","function","dashboard","menu","menu-2","menu-3","menu-4","menu-5","menu-add","more","more-2","heart","heart-2","heart-add","star","star-s","star-half","star-half-s","settings","settings-2","settings-3","settings-4","settings-5","settings-6","list-settings","forbid","forbid-2","information","error-warning","question","alert","spam","spam-2","spam-3","checkbox-blank","checkbox","checkbox-indeterminate","add-box","checkbox-blank-circle","checkbox-circle","indeterminate-circle","add-circle","close-circle","radio-button","checkbox-multiple-blank","checkbox-multiple","check","check-double","close","add","subtract","divide","arrow-left-up","arrow-up","arrow-right-up","arrow-right","arrow-right-down","arrow-down","arrow-left-down","arrow-left","arrow-up-circle","arrow-right-circle","arrow-down-circle","arrow-left-circle","arrow-up-s","arrow-down-s","arrow-right-s","arrow-left-s","arrow-drop-up","arrow-drop-right","arrow-drop-down","arrow-drop-left","arrow-left-right","arrow-up-down","arrow-go-back","arrow-go-forward","download","upload","download-2","upload-2","download-cloud","download-cloud-2","upload-cloud","upload-cloud-2","login-box","logout-box","logout-box-r","login-circle","logout-circle","logout-circle-r","refresh","shield","shield-cross","shield-flash","shield-star","shield-user","shield-keyhole","delete-back","delete-back-2","delete-bin","delete-bin-2","delete-bin-3","delete-bin-4","delete-bin-5","delete-bin-6","delete-bin-7","lock","lock-2","lock-password","lock-unlock","eye","eye-off","eye-2","eye-close","search","search-2","search-eye","zoom-in","zoom-out","find-replace","share","share-box","share-circle","share-forward","share-forward-2","share-forward-box","side-bar","time","timer","timer-2","timer-flash","alarm","history","thumb-down","thumb-up","alarm-warning","notification-badge","toggle","filter","filter-2","filter-3","loader","loader-2","loader-3","loader-4","loader-5","external-link"]};

const IconPickerModal = ({ isOpen, toggle, onSelect }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState("System");
    const [style, setStyle] = useState("line"); // line or fill

    const categories = Object.keys(ICONS_RAW);
    
    const filteredIcons = useMemo(() => {
        const result = {};
        categories.forEach(cat => {
            const icons = ICONS_RAW[cat].filter(icon => 
                icon.toLowerCase().includes(searchTerm.toLowerCase())
            );
            if (icons.length > 0) result[cat] = icons;
        });
        return result;
    }, [searchTerm, categories]);

    const handleSelect = (iconName) => {
        const iconClass = `ri-${iconName}${style === 'fill' ? '-fill' : (activeTab === 'Editor' ? '' : '-line')}`;
        onSelect(iconClass);
        toggle();
    };

    return (
        <Modal isOpen={isOpen} toggle={toggle} size="xl" centered scrollable>
            <ModalHeader toggle={toggle} className="bg-light p-3">
                Chọn Biểu tượng (Remix Icon)
            </ModalHeader>
            <ModalBody className="p-0">
                <div className="p-3 bg-white border-bottom sticky-top" style={{ zIndex: 1 }}>
                    <Row className="g-3">
                        <Col md={8}>
                            <InputGroup>
                                <span className="input-group-text"><i className="ri-search-line"></i></span>
                                <Input 
                                    placeholder="Tìm kiếm icon (ví dụ: home, user, settings...)" 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </InputGroup>
                        </Col>
                        <Col md={4}>
                            <div className="d-flex btn-group w-100">
                                <Button 
                                    color={style === 'line' ? 'primary' : 'soft-primary'} 
                                    onClick={() => setStyle('line')}
                                    size="sm"
                                    className="flex-grow-1"
                                >Line</Button>
                                <Button 
                                    color={style === 'fill' ? 'primary' : 'soft-primary'} 
                                    onClick={() => setStyle('fill')}
                                    size="sm"
                                    className="flex-grow-1"
                                >Fill</Button>
                            </div>
                        </Col>
                    </Row>
                </div>

                <div className="d-flex" style={{ height: "500px" }}>
                    <div className="bg-light border-right p-2" style={{ width: "200px" }}>
                        <SimpleBar style={{ maxHeight: "100%" }}>
                            <Nav vertical pill className="nav-custom-secondary mt-2">
                                {categories.map(cat => (
                                    <NavItem key={cat}>
                                        <NavLink
                                            className={classnames({ active: activeTab === cat, "p-2 mb-1 cursor-pointer": true })}
                                            onClick={() => setActiveTab(cat)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <span className="fs-13">{cat}</span>
                                            {filteredIcons[cat] && <span className="badge bg-soft-primary text-primary float-end">{filteredIcons[cat].length}</span>}
                                        </NavLink>
                                    </NavItem>
                                ))}
                            </Nav>
                        </SimpleBar>
                    </div>
                    <div className="flex-grow-1 p-3 bg-white">
                        <SimpleBar style={{ maxHeight: "100%" }}>
                            <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-6 g-2">
                                {(searchTerm ? Object.values(filteredIcons).flat() : ICONS_RAW[activeTab]).map(icon => {
                                    const iconName = activeTab === 'Editor' ? `ri-${icon}` : `ri-${icon}-${style}`;
                                    return (
                                        <div key={icon} className="col">
                                            <div 
                                                className="border rounded p-3 text-center h-100 cursor-pointer icon-hover-box"
                                                onClick={() => handleSelect(icon)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <i className={`${iconName} fs-24 mb-2 d-block`}></i>
                                                <div className="text-muted text-truncate fs-11">{icon}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {searchTerm && Object.keys(filteredIcons).length === 0 && (
                                <div className="text-center p-5">
                                    <i className="ri-error-warning-line fs-48 text-muted"></i>
                                    <p className="mt-2">Không tìm thấy biểu tượng nào khớp với "{searchTerm}"</p>
                                </div>
                            )}
                        </SimpleBar>
                    </div>
                </div>
            </ModalBody>
            <ModalFooter className="bg-light">
                <Button color="light" onClick={toggle}>Hủy bỏ</Button>
            </ModalFooter>
            <style>
                {`
                .icon-hover-box:hover {
                    background-color: var(--vz-primary-bg-subtle);
                    border-color: var(--vz-primary) !important;
                    color: var(--vz-primary);
                }
                .icon-hover-box:hover i {
                    transform: scale(1.2);
                    transition: transform 0.2s ease;
                }
                `}
            </style>
        </Modal>
    );
};

const SidebarManager = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Modal state for editing/adding
    const [isEditModal, setIsEditModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isAdding, setIsAdding] = useState(false);

    // Icon Picker state
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);

    const flattenItems = (menuArray, parentId = null, depth = 0) => {
        let result = [];
        menuArray.forEach(item => {
            const id = item.id || (item.isHeader ? `header-${item.label}` : `item-${item.label}`);
            result.push({
                ...item,
                id: id,
                parentId: parentId,
                depth: depth,
                visible: item.visible !== undefined ? item.visible : true
            });
            if (item.subItems && item.subItems.length > 0) {
                result = [...result, ...flattenItems(item.subItems, id, depth + 1)];
            }
        });
        return result;
    };

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const response = await axios.get("/api/accounts/profile/", getAuthHeader());
                const remoteData = response.data || response;
                const remoteConfig = remoteData.sidebar_config || [];
                
                if (!remoteConfig || remoteConfig.length === 0) {
                    setItems(flattenItems(menuMaster));
                } else {
                    setItems(remoteConfig);
                }
            } catch (error) {
                console.error("Failed to fetch sidebar config", error);
                toast.error("Không thể tải cấu hình Sidebar");
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    const onDragEnd = (result) => {
        if (!result.destination) return;
        const newItems = Array.from(items);
        const [reorderedItem] = newItems.splice(result.source.index, 1);
        newItems.splice(result.destination.index, 0, reorderedItem);
        setItems(newItems);
    };

    const toggleVisibility = (id) => {
        setItems(items.map(item => item.id === id ? { ...item, visible: !item.visible } : item));
    };

    const deleteItem = (id) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa mục này?")) {
            setItems(items.filter(item => item.id !== id));
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.patch("/api/accounts/profile/", { sidebar_config: items }, getAuthHeader());
            window.dispatchEvent(new CustomEvent('sidebar-config-update', { detail: items }));
            toast.success("Đã lưu cấu hình Sidebar thành công!");
        } catch (error) {
            console.error("Failed to save config", error);
            toast.error("Lỗi khi lưu cấu hình");
        } finally {
            setSaving(false);
        }
    };

    const openEditModal = (item) => {
        setEditingItem({ ...item });
        setIsAdding(false);
        setIsEditModal(true);
    };

    const openAddModal = () => {
        setEditingItem({
            id: `custom-${Date.now()}`,
            label: "",
            icon: "ri-external-link-line",
            link: "/",
            visible: true,
            parentId: null,
            depth: 0,
            isHeader: false
        });
        setIsAdding(true);
        setIsEditModal(true);
    };

    const saveItemChanges = () => {
        if (!editingItem.label) {
            toast.error("Vui lòng nhập tên hiển thị");
            return;
        }
        if (isAdding) {
            setItems([...items, editingItem]);
        } else {
            setItems(items.map(it => it.id === editingItem.id ? editingItem : it));
        }
        setIsEditModal(false);
    };

    const resetToDefault = () => {
        if (window.confirm("Bạn có chắc chắn muốn khôi phục về mặc định?")) {
            setItems(flattenItems(menuMaster));
        }
    };

    if (loading) return <div className="p-5 text-center">Đang tải...</div>;

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Quản lý Sidebar" pageTitle="Cài đặt" />
                    
                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardHeader className="d-flex align-items-center justify-content-between">
                                    <h5 className="card-title mb-0">Thiết kế Cấu trúc Sidebar</h5>
                                    <div className="flex-shrink-0">
                                        <Button color="success" size="sm" onClick={openAddModal} className="me-2">
                                            <i className="ri-add-line align-bottom"></i> Thêm mục mới
                                        </Button>
                                        <Button color="soft-secondary" size="sm" onClick={resetToDefault} className="me-2">
                                            <i className="ri-refresh-line align-bottom"></i> Mặc định
                                        </Button>
                                        <Button color="primary" size="sm" onClick={handleSave} disabled={saving}>
                                            <i className="ri-save-line align-bottom"></i> {saving ? "Đang lưu..." : "Lưu hệ thống"}
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardBody>
                                    <DragDropContext onDragEnd={onDragEnd}>
                                        <Droppable droppableId="sidebar-items">
                                            {(provided) => (
                                                <div {...provided.droppableProps} ref={provided.innerRef} className="list-group list-group-flush border rounded shadow-sm">
                                                    {items.map((item, index) => (
                                                        <Draggable key={item.id} draggableId={item.id.toString()} index={index}>
                                                            {(provided, snapshot) => (
                                                                <div
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                    style={{
                                                                        ...provided.draggableProps.style,
                                                                        marginLeft: `${item.depth * 30}px`,
                                                                    }}
                                                                    className={`list-group-item d-flex align-items-center justify-content-between ${item.visible ? '' : 'bg-light opacity-50'} ${snapshot.isDragging ? 'bg-soft-primary shadow' : ''}`}
                                                                >
                                                                    <div className="d-flex align-items-center flex-grow-1">
                                                                        <i className="ri-drag-move-2-line me-3 text-muted fs-16"></i>
                                                                        {item.isHeader ? (
                                                                            <span className="badge bg-soft-info text-info text-uppercase fw-bold me-2" style={{fontSize: '10px'}}>Nhóm</span>
                                                                        ) : (
                                                                            <i className={`${item.icon || 'ri-record-circle-line'} me-3 fs-18 text-primary`}></i>
                                                                        )}
                                                                        <span className={`fs-14 ${item.isHeader ? 'fw-bold text-muted' : 'fw-medium'}`}>{item.label}</span>
                                                                    </div>
                                                                    <div className="d-flex align-items-center">
                                                                        <div className="form-check form-switch me-3" title="Ẩn/Hiện">
                                                                            <Input type="switch" className="form-check-input" checked={item.visible} onChange={() => toggleVisibility(item.id)}/>
                                                                        </div>
                                                                        <Button color="soft-primary" size="sm" className="btn-icon me-1" onClick={() => openEditModal(item)}><i className="ri-edit-line"></i></Button>
                                                                        <Button color="soft-danger" size="sm" className="btn-icon" onClick={() => deleteItem(item.id)}><i className="ri-delete-bin-line"></i></Button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                </div>
                                            )}
                                        </Droppable>
                                    </DragDropContext>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Container>

                {/* Edit Modal */}
                <Modal isOpen={isEditModal} toggle={() => setIsEditModal(false)} centered size="lg">
                    <ModalHeader toggle={() => setIsEditModal(false)} className="bg-light p-3">
                        {isAdding ? "Thêm mục mới" : `Chỉnh sửa: ${editingItem?.label}`}
                    </ModalHeader>
                    <ModalBody>
                        {editingItem && (
                            <Row className="g-3">
                                <Col lg={6}>
                                    <FormGroup>
                                        <Label className="form-label">Tên hiển thị</Label>
                                        <Input type="text" value={editingItem.label} onChange={(e) => setEditingItem({ ...editingItem, label: e.target.value })} />
                                    </FormGroup>
                                </Col>
                                <Col lg={6}>
                                    <FormGroup>
                                        <Label className="form-label">Biểu tượng (Icon)</Label>
                                        <InputGroup>
                                            <span className="input-group-text"><i className={editingItem.icon}></i></span>
                                            <Input type="text" value={editingItem.icon || ""} readOnly />
                                            <Button color="soft-primary" onClick={() => setIsIconPickerOpen(true)}>Chọn Icon</Button>
                                        </InputGroup>
                                    </FormGroup>
                                </Col>
                                <Col lg={6}>
                                    <FormGroup>
                                        <Label className="form-label">Đường dẫn (Link)</Label>
                                        <Input type="text" value={editingItem.link || ""} disabled={editingItem.isHeader} onChange={(e) => setEditingItem({ ...editingItem, link: e.target.value })} />
                                    </FormGroup>
                                </Col>
                                <Col lg={6}>
                                    <FormGroup>
                                        <Label className="form-label">Mục cha</Label>
                                        <Input type="select" value={editingItem.parentId || ""} onChange={(e) => {
                                            const pId = e.target.value || null;
                                            const parent = items.find(it => it.id === pId);
                                            setEditingItem({ ...editingItem, parentId: pId, depth: parent ? parent.depth + 1 : 0 });
                                        }}>
                                            <option value="">-- Mục chính --</option>
                                            {items.filter(it => it.id !== editingItem.id && !it.parentId).map(it => (<option key={it.id} value={it.id}>{it.label}</option>))}
                                        </Input>
                                    </FormGroup>
                                </Col>
                                <Col lg={12}>
                                    <div className="d-flex gap-4">
                                        <FormGroup check>
                                            <Label check><Input type="checkbox" checked={editingItem.isHeader} onChange={(e) => setEditingItem({ ...editingItem, isHeader: e.target.checked, link: e.target.checked ? "" : editingItem.link })}/>{' '}Tiêu đề nhóm</Label>
                                        </FormGroup>
                                        <FormGroup check>
                                            <Label check><Input type="checkbox" checked={editingItem.visible} onChange={(e) => setEditingItem({ ...editingItem, visible: e.target.checked })}/>{' '}Hiển thị</Label>
                                        </FormGroup>
                                    </div>
                                </Col>
                            </Row>
                        )}
                    </ModalBody>
                    <ModalFooter className="bg-light">
                        <Button color="light" onClick={() => setIsEditModal(false)}>Hủy</Button>
                        <Button color="primary" onClick={saveItemChanges}>{isAdding ? "Thêm" : "Lưu"}</Button>
                    </ModalFooter>
                </Modal>

                {/* Icon Picker Modal */}
                <IconPickerModal 
                    isOpen={isIconPickerOpen} 
                    toggle={() => setIsIconPickerOpen(!isIconPickerOpen)} 
                    onSelect={(icon) => setEditingItem({ ...editingItem, icon: icon })}
                />
            </div>
            <ToastContainer />
        </React.Fragment>
    );
};

export default SidebarManager;
