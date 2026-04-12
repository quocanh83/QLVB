import React from 'react';
import { NavLink } from 'react-router-dom';
import classnames from 'classnames';

const MobileBottomNav = ({ items = [] }) => {
    // Default items if none provided
    const defaultItems = [
        { label: "Dự thảo", icon: "ri-file-list-3-line", link: "/documents-modern" },
        { label: "Góp ý", icon: "ri-discuss-line", link: "/feedbacks" },
        { label: "Thêm dự thảo", isPlus: true, link: "/feedback-intake" },
        { label: "Báo cáo", icon: "ri-bar-chart-2-line", link: "/reports" },
        { label: "Phân công", icon: "ri-user-shared-2-line", link: "/project-assignment-modern" }
    ];

    const displayItems = items.length > 0 ? items : defaultItems;

    return (
        <div className="designkit-wrapper">
            <div className="mobile-bottom-nav d-lg-none">
                {displayItems.map((item, idx) => (
                    <div key={idx} className={classnames("nav-item", { "center-item": item.isPlus })}>
                        {item.isPlus ? (
                            <NavLink to={item.link || "/feedback-intake"} className="nav-link plus-btn">
                                <div className="plus-icon">
                                    <i className="ri-add-line"></i>
                                </div>
                            </NavLink>
                        ) : (
                            <NavLink 
                                to={item.link} 
                                className={({isActive}) => classnames("nav-link", { active: isActive })}
                            >
                                <i className={item.icon || "ri-record-circle-line"}></i>
                                <span>{item.label}</span>
                            </NavLink>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MobileBottomNav;
