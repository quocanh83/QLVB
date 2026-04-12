import React, { useEffect, useState } from 'react';
import PropTypes from "prop-types";
import withRouter from '../Components/Common/withRouter';


//import Components
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import MobileBottomNav from '../Components/Common/MobileBottomNav';
import axios from 'axios';
import { getAuthHeader } from '../helpers/api_helper';

//import actions
import {
    changeLayout,
    changeSidebarTheme,
    changeLayoutMode,
    changeLayoutWidth,
    changeLayoutPosition,
    changeTopbarTheme,
    changeLeftsidebarSizeType,
    changeLeftsidebarViewType,
    changeSidebarImageType,
    changeSidebarVisibility
} from "../slices/thunks";

//redux
import { useSelector, useDispatch } from "react-redux";
import { createSelector } from 'reselect';


const Layout = (props) => {

    const dispatch = useDispatch();
    const selectLayoutState = (state) => state.Layout;
    const selectLayoutProperties = createSelector(
        selectLayoutState,
        (layout) => ({
            layoutType: layout.layoutType,
            leftSidebarType: layout.leftSidebarType,
            layoutModeType: layout.layoutModeType,
            layoutWidthType: layout.layoutWidthType,
            layoutPositionType: layout.layoutPositionType,
            topbarThemeType: layout.topbarThemeType,
            leftsidbarSizeType: layout.leftsidbarSizeType,
            leftSidebarViewType: layout.leftSidebarViewType,
            leftSidebarImageType: layout.leftSidebarImageType,
            preloader: layout.preloader,
            sidebarVisibilitytype: layout.sidebarVisibilitytype,
        })
    );
    // Inside your component
    const {
        layoutType,
        leftSidebarType,
        layoutModeType,
        layoutWidthType,
        layoutPositionType,
        topbarThemeType,
        leftsidbarSizeType,
        leftSidebarViewType,
        leftSidebarImageType,
        preloader,
        sidebarVisibilitytype
    } = useSelector(selectLayoutProperties);

    const [mobileNavConfig, setMobileNavConfig] = useState([]);

    /*
    layout settings
    */
    useEffect(() => {
        const fetchSidebarConfig = async () => {
            try {
                const res = await axios.get('/api/settings/', getAuthHeader());
                const data = res.data || res;
                const config = {};
                data.forEach(s => {
                    if (s.key.startsWith('SIDEBAR_HIDE_')) {
                        config[s.key] = s.value === 'true';
                    }
                });
                localStorage.setItem('sidebarConfig', JSON.stringify(config));
            } catch (e) {
                console.error("Failed to sync sidebar config", e);
            }
        };

        const fetchProfileConfig = async () => {
            try {
                const res = await axios.get('/api/accounts/profile/', getAuthHeader());
                const data = res.data || res;
                if (data.mobile_nav_config) {
                    setMobileNavConfig(data.mobile_nav_config);
                }
            } catch (e) {
                console.error("Failed to fetch profile config", e);
            }
        };

        fetchSidebarConfig();
        fetchProfileConfig();

        const handleUpdate = (e) => {
            if (e.detail) setMobileNavConfig(e.detail);
        };
        window.addEventListener('mobile-nav-config-update', handleUpdate);
        return () => window.removeEventListener('mobile-nav-config-update', handleUpdate);
    }, []);

    useEffect(() => {
        if (
            layoutType ||
            leftSidebarType ||
            layoutModeType ||
            layoutWidthType ||
            layoutPositionType ||
            topbarThemeType ||
            leftsidbarSizeType ||
            leftSidebarViewType ||
            leftSidebarImageType ||
            sidebarVisibilitytype
        ) {
            window.dispatchEvent(new Event('resize'));
            dispatch(changeLeftsidebarViewType(leftSidebarViewType));
            dispatch(changeLeftsidebarSizeType(leftsidbarSizeType));
            dispatch(changeSidebarTheme(leftSidebarType));
            dispatch(changeLayoutMode(layoutModeType));
            dispatch(changeLayoutWidth(layoutWidthType));
            dispatch(changeLayoutPosition(layoutPositionType));
            dispatch(changeTopbarTheme(topbarThemeType));
            dispatch(changeLayout(layoutType));
            dispatch(changeSidebarImageType(leftSidebarImageType));
            dispatch(changeSidebarVisibility(sidebarVisibilitytype));
        }
    }, [layoutType,
        leftSidebarType,
        layoutModeType,
        layoutWidthType,
        layoutPositionType,
        topbarThemeType,
        leftsidbarSizeType,
        leftSidebarViewType,
        leftSidebarImageType,
        sidebarVisibilitytype,
        dispatch]);
    /*
    call dark/light mode
    */
    const onChangeLayoutMode = (value) => {
        if (changeLayoutMode) {
            dispatch(changeLayoutMode(value));
        }
    };

    const [headerClass, setHeaderClass] = useState("");
    // class add remove in header
    useEffect(() => {
        window.addEventListener("scroll", scrollNavigation, true);
    });
    function scrollNavigation() {
        var scrollup = document.documentElement.scrollTop;
        if (scrollup > 50) {
            setHeaderClass("topbar-shadow");
        } else {
            setHeaderClass("");
        }
    }

    useEffect(() => {
        if (sidebarVisibilitytype === 'show' || layoutType === "vertical" || layoutType === "twocolumn") {
            document.querySelector(".hamburger-icon").classList.remove('open');
        } else {
            document.querySelector(".hamburger-icon").classList.add('open');
        }
    }, [sidebarVisibilitytype, layoutType]);

    return (
        <React.Fragment>
            <div id="layout-wrapper">
                <Header
                    headerClass={headerClass}
                    layoutModeType={layoutModeType}
                    onChangeLayoutMode={onChangeLayoutMode} />
                <Sidebar layoutType={layoutType} />
                <div className="main-content">{props.children}
                    <Footer />
                </div>
                <MobileBottomNav items={mobileNavConfig} />
            </div>
        </React.Fragment>

    );
};

Layout.propTypes = {
    children: PropTypes.object,
};

export default withRouter(Layout);