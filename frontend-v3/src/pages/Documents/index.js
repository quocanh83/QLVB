import React from 'react';
import { Container } from 'reactstrap';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import DocumentList from './DocumentList';

const Documents = () => {
    document.title = "Quản lý Văn bản | QLVB V3.0";

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Quản lý Văn bản" pageTitle="Hệ thống" />
                    <DocumentList />
                </Container>
            </div>
        </React.Fragment>
    );
};

export default Documents;
