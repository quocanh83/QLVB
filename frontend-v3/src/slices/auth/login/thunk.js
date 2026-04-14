//Include Both Helper File with needed methods
import { getFirebaseBackend } from "../../../helpers/firebase_helper";
import {
  postLogin,
} from "../../../helpers/fakebackend_helper";

import { loginSuccess, logoutUserSuccess, apiError, reset_login_flag } from './reducer';

export const loginUser = (user, history) => async (dispatch) => {
  try {
    let response = postLogin({
      username: user.username,
      password: user.password
    });

    var data = await response;

    if (data && data.access) {
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
      localStorage.setItem("authUser", JSON.stringify(data));
      
      dispatch(loginSuccess(data));
      history('/documents-modern');
    } else {
      dispatch(apiError("Đăng nhập thất bại. Kiểm tra lại thông tin."));
    }
  } catch (error) {
    // Return serializable error for Redux Toolkit
    const errorMsg = error.response ? error.response.data : error.message;
    dispatch(apiError(errorMsg));
  }
};


export const logoutUser = () => async (dispatch) => {
  try {
    localStorage.removeItem("authUser");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    let fireBaseBackend = getFirebaseBackend();
    if (process.env.REACT_APP_DEFAULTAUTH === "firebase") {
      const response = fireBaseBackend.logout;
      dispatch(logoutUserSuccess(response));
    } else {
      dispatch(logoutUserSuccess(true));
    }

  } catch (error) {
    dispatch(apiError(error.message));
  }
};

export const socialLogin = (type, history) => async (dispatch) => {
  try {
    let response;

    if (process.env.REACT_APP_DEFAULTAUTH === "firebase") {
      const fireBaseBackend = getFirebaseBackend();
      response = fireBaseBackend.socialLoginUser(type);
    }
    //  else {
      //   response = postSocialLogin(data);
      // }
      
      const socialdata = await response;
    if (socialdata) {
      sessionStorage.setItem("authUser", JSON.stringify(response));
      dispatch(loginSuccess(response));
      history('/documents-modern')
    }

  } catch (error) {
    dispatch(apiError(error.message));
  }
};

export const resetLoginFlag = () => async (dispatch) =>{
  try {
    const response = dispatch(reset_login_flag());
    return response;
  } catch (error) {
    dispatch(apiError(error.message));
  }
};