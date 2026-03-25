import React, { useEffect, useState } from 'react';
import { Col, Container, Row } from 'reactstrap';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';

//import Components
import Widget from './Widget';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import LatestDocuments from './LatestDocuments';

const DashboardAnalytics = () => {
    document.title = "Tổng quan | QLVB V3.0";

    const [docs, setDocs] = useState([]);
    const [reports, setReports] = useState({
        totalDocs: 0,
        totalFeedbacks: 0,
        resolvedFeedbacks: 0,
        resolveRate: 0
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await axios.get('/api/documents/', getAuthHeader());
                const data = response.data;
                setDocs(data);
                
                const totalDocs = data.length;
                let totalFeedbacks = 0;
                let resolvedFeedbacks = 0;

                data.forEach(doc => {
                    totalFeedbacks += (doc.total_feedbacks || 0);
                    resolvedFeedbacks += (doc.resolved_feedbacks || 0);
                });

                const resolveRate = totalFeedbacks > 0 ? (resolvedFeedbacks / totalFeedbacks * 100) : 0;

                setReports({
                    totalDocs,
                    totalFeedbacks,
                    resolvedFeedbacks,
                    resolveRate
                });
            } catch (error) {
                console.error("Error fetching dashboard stats:", error);
            }
        };

        fetchStats();
    }, []);

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Tổng quan" pageTitle="Dashboards" />
                    <Row>
                        <Col xxl={12}>
                            <Widget reports={reports} />
                        </Col>
                    </Row>
                    <Row>
                        <LatestDocuments docs={docs} />
                    </Row>
                </Container>
            </div>
        </React.Fragment>
    );
};

export default DashboardAnalytics;