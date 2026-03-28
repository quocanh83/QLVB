import React, { useEffect, useState } from 'react';
import { Col, Dropdown, DropdownMenu, DropdownToggle, Nav, NavItem, NavLink, Row, TabContent, TabPane } from 'reactstrap';
import { Link } from 'react-router-dom';
import classnames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { getNotifications, markRead, markAllRead } from '../../slices/notifications/thunk';
import { api } from "../../config";

//import images
import avatar1 from "../../assets/images/users/avatar-1.jpg";
import bell from "../../assets/images/svg/bell.svg";

//SimpleBar
import SimpleBar from "simplebar-react";

const NotificationDropdown = () => {
    const dispatch = useDispatch();
    const { notifications } = useSelector(state => state.Notifications || { notifications: [] });

    //Dropdown Toggle
    const [isNotificationDropdown, setIsNotificationDropdown] = useState(false);
    const toggleNotificationDropdown = () => {
        setIsNotificationDropdown(!isNotificationDropdown);
    };

    //Tab 
    const [activeTab, setActiveTab] = useState('1');
    const toggleTab = (tab) => {
        if (activeTab !== tab) {
            setActiveTab(tab);
        }
    };

    useEffect(() => {
        dispatch(getNotifications());
        // Polling every 30 seconds
        const interval = setInterval(() => {
            dispatch(getNotifications());
        }, 30000);
        return () => clearInterval(interval);
    }, [dispatch]);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <React.Fragment>
            <Dropdown isOpen={isNotificationDropdown} toggle={toggleNotificationDropdown} className="topbar-head-dropdown ms-1 header-item">
                <DropdownToggle type="button" tag="button" className="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle">
                    <i className='bx bx-bell fs-22'></i>
                    {unreadCount > 0 && (
                        <span className="position-absolute topbar-badge fs-10 translate-middle badge rounded-pill bg-danger">
                            {unreadCount}
                            <span className="visually-hidden">unread messages</span>
                        </span>
                    )}
                </DropdownToggle>
                <DropdownMenu className="dropdown-menu-lg dropdown-menu-end p-0">
                    <div className="dropdown-head bg-primary bg-pattern rounded-top">
                        <div className="p-3">
                            <Row className="align-items-center">
                                <Col>
                                    <h6 className="m-0 fs-16 fw-semibold text-white"> Thông báo </h6>
                                </Col>
                                <div className="col-auto dropdown-tabs">
                                    <span className="badge bg-light-subtle text-body fs-13"> {unreadCount} Mới </span>
                                </div>
                            </Row>
                        </div>

                        <div className="px-2 pt-2">
                            <Nav className="nav-tabs dropdown-tabs nav-tabs-custom">
                                <NavItem>
                                    <NavLink
                                        href="#"
                                        className={classnames({ active: activeTab === '1' })}
                                        onClick={() => { toggleTab('1'); }}
                                    >
                                        Tất cả ({notifications.length})
                                    </NavLink>
                                </NavItem>
                            </Nav>
                        </div>
                    </div>

                    <TabContent activeTab={activeTab}>
                        <TabPane tabId="1" className="py-2 ps-2">
                            <SimpleBar style={{ maxHeight: "300px" }} className="pe-2">
                                {notifications.length > 0 ? (
                                    notifications.map((item, key) => (
                                        <div key={key} className={classnames("text-reset notification-item d-block dropdown-item position-relative", { "active": !item.is_read })}>
                                            <div className="d-flex">
                                                {item.sender_avatar ? (
                                                    <img src={`${api.API_URL}${item.sender_avatar}`} className="me-3 rounded-circle avatar-xs" alt="user-pic" />
                                                ) : (
                                                    <div className="avatar-xs me-3">
                                                        <span className="avatar-title bg-info-subtle text-info rounded-circle fs-16">
                                                            <i className="bx bx-badge-check"></i>
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex-grow-1">
                                                    <Link 
                                                        to={item.link || "#"} 
                                                        className="stretched-link"
                                                        onClick={() => {
                                                            if (!item.is_read) {
                                                                dispatch(markRead(item.id));
                                                            }
                                                            setIsNotificationDropdown(false);
                                                        }}
                                                    >
                                                        <h6 className="mt-0 mb-1 fs-13 fw-semibold">{item.sender_name || "Hệ thống"}</h6>
                                                    </Link>
                                                    <div className="fs-13 text-muted">
                                                        <p className="mb-1">{item.message}</p>
                                                    </div>
                                                    <p className="mb-0 fs-11 fw-medium text-uppercase text-muted">
                                                        <span><i className="mdi mdi-clock-outline"></i> {item.created_at_formatted}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center pb-5 mt-2">
                                        <h6 className="fs-18 fw-semibold lh-base">Bạn không có thông báo nào </h6>
                                    </div>
                                )}

                                {notifications.length > 0 && (
                                    <div className="my-3 text-center">
                                        <button 
                                            type="button" 
                                            className="btn btn-soft-success waves-effect waves-light"
                                            onClick={() => dispatch(markAllRead())}
                                        >
                                            Đánh dấu tất cả là đã đọc <i className="ri-arrow-right-line align-middle"></i>
                                        </button>
                                    </div>
                                )}
                            </SimpleBar>
                        </TabPane>
                    </TabContent>
                </DropdownMenu>
            </Dropdown>
        </React.Fragment>
    );
};

export default NotificationDropdown;