import React, { useState, useEffect } from 'react';
import { 
    Container, Row, Col, Card, CardBody, CardHeader, Badge, Button,
    Alert, Spinner
} from 'reactstrap';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import SimpleBar from 'simplebar-react';
import AIWorkbench from '../Comparisons/AIWorkbench';
import { toast, ToastContainer } from 'react-toastify';

const ReferenceReviewDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAI, setShowAI] = useState(true);

    useEffect(() => {
        fetchReviewData();
    }, [id]);

    const fetchReviewData = async () => {
        try {
            const res = await axios.get(`/api/comparisons/reference-reviews/${id}/data/`, getAuthHeader());
            setData(res);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching review data", error);
            toast.error("Không thể tải dữ liệu rà soát.");
            setLoading(false);
        }
    };

    const handleExportExcel = () => {
        const token = localStorage.getItem("authUser") ? JSON.parse(localStorage.getItem("authUser")).token : '';
        const apiBase = axios.defaults.baseURL || "";
        const url = `${apiBase}/api/comparisons/reference-reviews/${id}/export_excel/?token=${token}`;
        window.open(url, '_blank');
    };

    const handleExportWord = () => {
        const token = localStorage.getItem("authUser") ? JSON.parse(localStorage.getItem("authUser")).token : '';
        const apiBase = axios.defaults.baseURL || "";
        const url = `${apiBase}/api/comparisons/reference-reviews/${id}/export_word/?token=${token}`;
        window.open(url, '_blank');
    };

    if (loading) {
        return <div className="page-content text-center py-5"><Spinner color="primary" /></div>;
    }

    if (!data) return <div className="page-content text-center py-5">Dữ liệu không tồn tại.</div>;

    return (
        <div className="page-content">
            <Container fluid>
                <div className="d-flex align-items-center mb-3">
                    <Button color="light" className="btn-icon me-3" onClick={() => navigate('/reference-reviews')}>
                        <i className="ri-arrow-left-line"></i>
                    </Button>
                    <div className="flex-grow-1">
                        <h4 className="mb-0">{data.review.name}</h4>
                        <p className="text-muted mb-0">Rà soát dẫn chiếu nội bộ văn bản</p>
                    </div>
                    <div>
                        <Button color="soft-success" className="me-2" onClick={handleExportExcel}>
                            <i className="ri-file-excel-2-line me-1"></i> Xuất danh sách lỗi (Excel)
                        </Button>
                        <Button color="soft-primary" className="me-2" onClick={handleExportWord}>
                            <i className="ri-file-word-line me-1"></i> Xuất báo cáo đánh giá (Word)
                        </Button>
                        <Button color="info" className={showAI ? "active" : ""} onClick={() => setShowAI(!showAI)}>
                            <i className="ri-robot-3-line me-1"></i> Trợ lý AI
                        </Button>
                    </div>
                </div>

                <Row>
                    <Col lg={showAI ? 8 : 12}>
                        <Card className="shadow-none border h-100">
                            <CardHeader className="bg-light-subtle py-2">
                                <h6 className="card-title mb-0">Nội dung văn bản bóc tách</h6>
                            </CardHeader>
                            <CardBody className="p-0">
                                <SimpleBar style={{ maxHeight: "calc(100vh - 250px)" }}>
                                    <div className="p-4">
                                        {data.nodes.map((node, idx) => (
                                            <div key={idx} className={`mb-3 p-2 rounded node-${node.node_type.toLowerCase()}`}>
                                                <div className="d-flex align-items-center mb-1">
                                                    <Badge color={
                                                        node.node_type === 'Chương' ? 'dark' :
                                                        node.node_type === 'Điều' ? 'primary' : 'secondary'
                                                    } className="me-2">
                                                        {node.node_label}
                                                    </Badge>
                                                </div>
                                                <div className="node-content text-justify ps-2 border-start border-2 border-primary-subtle">
                                                    {node.content}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </SimpleBar>
                            </CardBody>
                        </Card>
                    </Col>
                    {showAI && (
                        <Col lg={4}>
                            <AIWorkbench standaloneId={id} />
                        </Col>
                    )}
                </Row>
                <ToastContainer />
            </Container>
        </div>
    );
};

export default ReferenceReviewDetail;
