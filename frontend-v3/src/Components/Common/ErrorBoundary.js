import React from 'react';
import { ModernCard, ModernButton } from './ModernUI';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service here
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="designkit-wrapper d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', padding: '2rem', background: '#0F172A' }}>
                    <ModernCard className="text-center p-5" style={{ maxWidth: '600px' }}>
                        <div className="mb-4">
                            <i className="ri-error-warning-line text-danger" style={{ fontSize: '4rem' }}></i>
                        </div>
                        <h2 className="text-white mb-3">Hệ thống gặp sự cố</h2>
                        <p className="text-muted mb-4">
                            Đã xảy ra lỗi không mong muốn trong quá trình xử lý giao diện. 
                            Vui lòng thử tải lại trang hoặc quay lại sau.
                        </p>
                        
                        {this.state.error && (
                            <div className="p-3 bg-dark-opacity rounded mb-4 text-start overflow-auto border border-light-opacity" style={{ maxHeight: '150px' }}>
                                <code className="text-danger small" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                    {this.state.error.toString()}
                                </code>
                            </div>
                        )}

                        <div className="d-flex gap-3 justify-content-center">
                            <ModernButton variant="ghost" onClick={() => window.location.reload()}>
                                <i className="ri-refresh-line"></i> Tải lại trang
                            </ModernButton>
                            <ModernButton variant="primary" onClick={() => this.setState({ hasError: false })}>
                                <i className="ri-home-4-line"></i> Thử lại
                            </ModernButton>
                        </div>
                    </ModernCard>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
