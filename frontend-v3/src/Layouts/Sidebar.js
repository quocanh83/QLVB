import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import SimpleBar from "simplebar-react";
//import logo
import logoSm from "../assets/images/logo-sm.png";
import logoDark from "../assets/images/logo-dark.png";
import logoLight from "../assets/images/logo-light.png";

//Import Components
import VerticalLayout from "./VerticalLayouts";
import TwoColumnLayout from "./TwoColumnLayout";
import { Container } from "reactstrap";
import HorizontalLayout from "./HorizontalLayout";
import { useSelector, useDispatch } from "react-redux";
import { changeLayout } from "../slices/thunks";
import { createSelector } from 'reselect';

import SearchOption from '../Components/Common/SearchOption';
import { useProfile } from "../Components/Hooks/UserHooks";
import { logoutUser } from "../slices/auth/login/thunk";
import avatarDefault from "../assets/images/users/user-dummy-img.jpg";

const Sidebar = ({ layoutType }) => {
  const { userProfile } = useProfile();

  useEffect(() => {
    var verticalOverlay = document.getElementsByClassName("vertical-overlay");
    if (verticalOverlay) {
      verticalOverlay[0].addEventListener("click", function () {
        document.body.classList.remove("vertical-sidebar-enable");
      });
    }
  });

  const dispatch = useDispatch();

  const selectLayoutState = (state) => state.Layout;
  const selectLayoutProperties = createSelector(
    selectLayoutState,
    (layout) => ({
      layoutTypeProp: layout.layoutType,
    })
  );
  const { layoutTypeProp } = useSelector(selectLayoutProperties);

  const handleLayoutChange = (type) => {
    dispatch(changeLayout(type));
  };

  const addEventListenerOnSmHoverMenu = () => {
    // add listener Sidebar Hover icon on change layout from setting
    if (document.documentElement.getAttribute('data-sidebar-size') === 'sm-hover') {
      document.documentElement.setAttribute('data-sidebar-size', 'sm-hover-active');
    } else if (document.documentElement.getAttribute('data-sidebar-size') === 'sm-hover-active') {
      document.documentElement.setAttribute('data-sidebar-size', 'sm-hover');
    } else {
      document.documentElement.setAttribute('data-sidebar-size', 'sm-hover');
    }
  };
  return (
    <React.Fragment>
      <div className="app-menu navbar-menu">
        <div className="navbar-brand-box">
          <div className="sidebar-user-section-top">
            <div className="user-card-content">
                <div className="user-info">
                    <span className="user-name">{userProfile?.first_name || "Quốc Anh"}</span>
                </div>
                <button 
                    className="logout-btn" 
                    title="Đăng xuất"
                    onClick={() => dispatch(logoutUser())}
                >
                    <i className="ri-logout-box-r-line"></i>
                </button>
            </div>
          </div>

          <button
            onClick={addEventListenerOnSmHoverMenu}
            type="button"
            className="btn btn-sm p-0 fs-20 header-item float-end btn-vertical-sm-hover"
            id="vertical-hover"
          >
          </button>
        </div>

        <div className="sidebar-search-container">
            <SearchOption />
        </div>
        {layoutType === "horizontal" ? (
          <div id="scrollbar">
            <Container fluid>
              <div id="two-column-menu"></div>
              <ul className="navbar-nav" id="navbar-nav">
                <HorizontalLayout />
              </ul>
            </Container>
          </div>
        ) : layoutType === 'twocolumn' ? (
          <React.Fragment>
            <TwoColumnLayout layoutType={layoutType} />
            <div className="sidebar-background"></div>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <SimpleBar id="scrollbar" className="h-100">
              <Container fluid>
                <div id="two-column-menu"></div>
                <ul className="navbar-nav" id="navbar-nav">
                  <VerticalLayout layoutType={layoutType} />
                </ul>
              </Container>
            </SimpleBar>
            <div className="sidebar-background"></div>
            
            {/* Quick Switcher at bottom */}
            <div className="sidebar-quick-switcher d-none d-lg-flex">
               <button 
                className={`btn btn-sm ${layoutTypeProp === 'vertical' ? 'btn-primary' : 'btn-soft-primary'} me-2`}
                onClick={() => handleLayoutChange('vertical')}
                title="Sidebar Dọc"
               >
                <i className="ri-layout-view-2"></i>
               </button>
               <button 
                className={`btn btn-sm ${layoutTypeProp === 'horizontal' ? 'btn-soft-primary' : 'btn-primary'}`}
                onClick={() => handleLayoutChange('horizontal')}
                title="Menu Ngang"
               >
                <i className="ri-layout-top-line"></i>
               </button>
            </div>
          </React.Fragment>
        )}
      </div>
      <div className="vertical-overlay"></div>
    </React.Fragment>
  );
};

export default Sidebar;
