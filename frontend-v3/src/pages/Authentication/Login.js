import React, { useEffect, useState } from 'react';
import { Card, CardBody, Col, Container, Input, Label, Row, Button, Form, FormFeedback, Alert, Spinner } from 'reactstrap';
import ParticlesAuth from "../AuthenticationInner/ParticlesAuth";

//redux
import { useSelector, useDispatch } from "react-redux";

import { Link } from "react-router-dom";
import withRouter from "../../Components/Common/withRouter";
// Formik validation
import * as Yup from "yup";
import { useFormik } from "formik";

// actions
import { loginUser, socialLogin, resetLoginFlag } from "../../slices/thunks";

import logoLight from "../../assets/images/logo-light.png";
import logoCustom from "../../assets/images/logo-qlvb-light.png";
import { createSelector } from 'reselect';
import FeatherIcon from "feather-icons-react";

const Login = (props) => {
    const dispatch = useDispatch();
    const selectLayoutState = (state) => state;
    const loginpageData = createSelector(
        selectLayoutState,
        (state) => ({
            user: state.Account.user,
            error: state.Login.error,
            loading: state.Login.loading,
            errorMsg: state.Login.errorMsg,
        })
    );
    // Inside your component
    const {
        user, error, loading, errorMsg
    } = useSelector(loginpageData);

    const [userLogin, setUserLogin] = useState([]);
    const [passwordShow, setPasswordShow] = useState(false);


    useEffect(() => {
        if (user && user) {
            const updatedUserData = process.env.REACT_APP_DEFAULTAUTH === "firebase" ? user.multiFactor.user.email : user.user.email;
            const updatedUserPassword = process.env.REACT_APP_DEFAULTAUTH === "firebase" ? "" : user.user.confirm_password;
            setUserLogin({
                email: updatedUserData,
                password: updatedUserPassword
            });
        }
    }, [user]);

    const validation = useFormik({
        // enableReinitialize : use this flag when initial values needs to be changed
        enableReinitialize: true,

        initialValues: {
            username: userLogin.username || "admin" || '',
            password: userLogin.password || "123456" || '',
        },
        validationSchema: Yup.object({
            username: Yup.string().required("Vui lòng nhập tên đăng nhập"),
            password: Yup.string().required("Vui lòng nhập mật khẩu"),
        }),
        onSubmit: (values) => {
            dispatch(loginUser(values, props.router.navigate));
        }
    });

    const signIn = type => {
        dispatch(socialLogin(type, props.router.navigate));
    };

    //handleTwitterLoginResponse
    // const twitterResponse = e => {}

    //for facebook and google authentication
    const socialResponse = type => {
        signIn(type);
    };


    useEffect(() => {
        if (errorMsg) {
            setTimeout(() => {
                dispatch(resetLoginFlag());
            }, 3000);
        }
    }, [dispatch, errorMsg]);

    document.title = "Đăng nhập | QLVB V3.0";
    return (
        <React.Fragment>
            <ParticlesAuth>
                <div className="auth-page-content">
                    <Container>
                        <Row className="justify-content-center">
                            <Col xs={12}>
                                <div className="auth-card-minimalist-dark text-center">
                                    <div className="mb-4">
                                        <div className="mb-2 d-inline-block">
                                            <img src={logoCustom} alt="QLVB" className="auth-logo-brand" />
                                        </div>
                                        <h2 className="text-white fw-extrabold ls-tight mb-1">QUẢN LÝ VĂN BẢN</h2>
                                        <p className="text-unified opacity-50 text-uppercase tracking-widest" style={{ fontSize: '0.7rem' }}>Hệ thống xử lý văn bản thông minh</p>
                                    </div>

                                    <div className="mx-auto" style={{ maxWidth: '440px', textAlign: 'left' }}>
                                        <Form
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                validation.handleSubmit();
                                                return false;
                                            }}
                                            action="#">

                                            <div className="mb-3">
                                                <Label htmlFor="username" className="label-unified">Tên đăng nhập</Label>
                                                <Input
                                                    name="username"
                                                    className="form-control input-minimal-dark"
                                                    placeholder="tài khoản"
                                                    type="text"
                                                    onChange={validation.handleChange}
                                                    onBlur={validation.handleBlur}
                                                    value={validation.values.username || ""}
                                                    invalid={
                                                        validation.touched.username && validation.errors.username ? true : false
                                                    }
                                                />
                                            </div>

                                            <div className="mb-3">
                                                <div className="float-end">
                                                    <Link to="/forgot-password" university-link="true" className="text-unified opacity-75 hover-white">Quên mật khẩu?</Link>
                                                </div>
                                                <Label className="label-unified" htmlFor="password-input">Mật khẩu</Label>
                                                <div className="position-relative auth-pass-inputgroup">
                                                    <Input
                                                        name="password"
                                                        value={validation.values.password || ""}
                                                        type={passwordShow ? "text" : "password"}
                                                        className="form-control pe-5 input-minimal-dark"
                                                        placeholder="••••••••"
                                                        onChange={validation.handleChange}
                                                        onBlur={validation.handleBlur}
                                                        invalid={
                                                            validation.touched.password && validation.errors.password ? true : false
                                                        }
                                                    />
                                                    <button className="btn btn-link position-absolute end-0 top-0 text-decoration-none text-white opacity-25" type="button" onClick={() => setPasswordShow(!passwordShow)}><i className="ri-eye-fill align-middle"></i></button>
                                                </div>
                                            </div>

                                            <div className="form-check mb-4 mt-n1">
                                                <Input className="form-check-input border-secondary" style={{ marginTop: '0.35rem' }} type="checkbox" value="" id="auth-remember-check" />
                                                <Label className="form-check-label text-unified" htmlFor="auth-remember-check">Duy trì đăng nhập</Label>
                                            </div>

                                            <div className="mt-4">
                                                <Button disabled={error ? null : loading ? true : false} className="btn-premium-white w-100" type="submit">
                                                    {loading ? <Spinner size="sm" className='me-2' /> : null}
                                                    ĐĂNG NHẬP HỆ THỐNG
                                                </Button>
                                            </div>

                                            <div className="mt-4 text-center">
                                                <div className="d-flex gap-4 justify-content-center">
                                                    <Button variant="link" className="btn-social-minimal">
                                                        <i className="ri-facebook-fill"></i>
                                                    </Button>
                                                    <Button variant="link" className="btn-social-minimal">
                                                        <i className="ri-github-fill"></i>
                                                    </Button>
                                                    <Button variant="link" className="btn-social-minimal">
                                                        <i className="ri-google-fill"></i>
                                                    </Button>
                                                </div>
                                            </div>
                                        </Form>
                                    </div>
                                </div>

                                <div className="mt-4 text-center px-4 pt-4 border-top border-white-10" style={{ maxWidth: '440px', margin: '0 auto' }}>
                                    <p className="mb-0 text-unified">Bạn chưa có tài khoản? <Link to="/register" university-link="true" className="text-white fw-bold">Đăng ký ngay</Link></p>
                                </div>

                            </Col>
                        </Row>
                    </Container>
                </div>
            </ParticlesAuth>
        </React.Fragment>
    );
};

export default withRouter(Login);