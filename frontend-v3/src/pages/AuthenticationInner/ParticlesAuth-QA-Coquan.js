import React from 'react';
import withRouter from '../../Components/Common/withRouter';

const ParticlesAuth = ({ children }) => {
    return (
        <React.Fragment>
            <div className="auth-page-wrapper">
                <div className="w-100">
                    {children}
                </div>

                <footer className="footer start-0">
                    <div className="container">
                        <div className="row">
                            <div className="col-lg-12">
                                <div className="text-center">
                                    <p className="mb-0 auth-footer-text" style={{ color: '#cbd5e1' }}>&copy; {new Date().getFullYear()} Hệ thống QLVB. Thiết kế bởi <span className="fw-bold">DuckMan</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </React.Fragment>
    );
};

export default withRouter(ParticlesAuth);