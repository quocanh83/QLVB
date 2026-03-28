import React, { useEffect, useState } from 'react';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';
import { useSelector } from 'react-redux';

//import images
import { api } from "../../config";
import avatar1 from "../../assets/images/users/avatar-1.jpg";
import { Link } from 'react-router-dom';
import { createSelector } from 'reselect';

const ProfileDropdown = () => {
    const [userName, setUserName] = useState("Admin");
    const [userRole, setUserRole] = useState("Staff");
    const [userAvatar, setUserAvatar] = useState(avatar1);

    useEffect(() => {
        const authUser = localStorage.getItem("authUser");
        if (authUser) {
            const obj = JSON.parse(authUser);
            setUserName(obj.full_name || obj.username || "Admin");
            
            // Set Avatar
            if (obj.avatar) {
                const avatarPath = obj.avatar.startsWith('http') ? obj.avatar : `${api.API_URL}${obj.avatar}`;
                setUserAvatar(avatarPath);
            } else {
                setUserAvatar(avatar1);
            }

            // Set Role
            if (obj.roles && obj.roles.length > 0) {
                setUserRole(obj.roles[0]);
            }
        }
    }, []);

    //Dropdown Toggle
    const [isProfileDropdown, setIsProfileDropdown] = useState(false);
    const toggleProfileDropdown = () => {
        setIsProfileDropdown(!isProfileDropdown);
    };
    return (
        <React.Fragment>
            <Dropdown isOpen={isProfileDropdown} toggle={toggleProfileDropdown} className="ms-sm-3 header-item topbar-user">
                <DropdownToggle tag="button" type="button" className="btn">
                    <span className="flex align-items-center">
                        <img className="rounded-circle header-profile-user" src={userAvatar}
                            alt="Header Avatar" />
                        <span className="text-start ms-xl-2">
                            <span className="d-none d-xl-inline-block ms-1 fw-medium user-name-text">{userName}</span>
                            <span className="d-none d-xl-block ms-1 fs-13 text-muted user-name-sub-text">{userRole}</span>
                        </span>
                    </span>
                </DropdownToggle>
                <DropdownMenu className="dropdown-menu-end">
                    <h6 className="dropdown-header">Welcome {userName}!</h6>
                    <DropdownItem className='p-0'>
                        <Link to= "/profile" className="dropdown-item">
                            <i className="mdi mdi-account-circle text-muted fs-16 align-middle me-1"></i>
                            <span className="align-middle"> Profile</span>
                        </Link>
                    </DropdownItem>
                    <div className="dropdown-divider"></div>
                    <DropdownItem className='p-0'>
                        <Link to= "/pages-profile-settings" className="dropdown-item">
                            <span
                                className="badge bg-success-subtle text-success mt-1 float-end">New</span><i
                                    className="mdi mdi-cog-outline text-muted fs-16 align-middle me-1"></i> <span
                                        className="align-middle">Settings</span>
                        </Link>
                    </DropdownItem>
                    <DropdownItem className='p-0'>
                        <Link to= "/auth-lockscreen-basic" className="dropdown-item">
                            <i
                                className="mdi mdi-lock text-muted fs-16 align-middle me-1"></i> <span className="align-middle">Lock screen</span>
                        </Link>
                    </DropdownItem>
                    <DropdownItem className='p-0'>
                        <Link to= "/logout" className="dropdown-item">
                            <i
                                className="mdi mdi-logout text-muted fs-16 align-middle me-1"></i> <span
                                    className="align-middle" data-key="t-logout">Logout</span>
                        </Link>
                    </DropdownItem>
                </DropdownMenu>
            </Dropdown>
        </React.Fragment>
    );
};

export default ProfileDropdown;