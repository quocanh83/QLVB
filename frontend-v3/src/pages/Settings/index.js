import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody, CardHeader, Input, Button, Table, Spinner } from 'reactstrap';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import { toast } from 'react-toastify';
import FeatherIcon from 'feather-icons-react';

const Settings = () => {
    // State API Keys & Settings
    const [settings, setSettings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingValues, setEditingValues] = useState({});
    const [savingId, setSavingId] = useState(null);
    const [showKeys, setShowKeys] = useState({});

    // State Report Templates
    const [reportTemplates, setReportTemplates] = useState([]);
    const [uploadingTpl, setUploadingTpl] = useState(null);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        fetchSettings();
        fetchReportTemplates();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/settings/', getAuthHeader());
            setSettings(res.data);
            const initValues = {};
            res.data.forEach(s => { initValues[s.id] = s.value; });
            setEditingValues(initValues);
        } catch (e) {
            toast.error('Lỗi tải cấu hình');
        } finally {
            setLoading(false);
        }
    };

    const fetchReportTemplates = async () => {
        try {
            const res = await axios.get('/api/reports/templates/', getAuthHeader());
            setReportTemplates(res.data);
        } catch (e) { console.error(e); }
    };

    const saveSetting = async (id) => {
        setSavingId(id);
        try {
            await axios.patch(`/api/settings/${id}/`, { value: editingValues[id] }, getAuthHeader());
            toast.success("Đã lưu cấu hình.");
            fetchSettings();
        } catch (e) { toast.error('Lỗi khi lưu.'); }
        finally { setSavingId(null); }
    };

    const uploadTemplate = async (templateId, file) => {
        if (!file) return;
        setUploadingTpl(templateId);
        try {
            const formData = new FormData();
            formData.append('file', file);
            await axios.post(`/api/reports/templates/${templateId}/upload_template/`, formData, {
                ...getAuthHeader(),
                headers: { ...getAuthHeader().headers, 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Mẫu Word đã được cập nhật thành công!');
            fetchReportTemplates();
        } catch (e) { toast.error('Lỗi khi tải lên file định dạng.'); }
        finally { setUploadingTpl(null); }
    };

    const removeTemplate = async (templateId) => {
        if (!window.confirm('Xóa file template này? Hệ thống sẽ dùng lại mẫu mặc định.')) return;
        try {
            await axios.post(`/api/reports/templates/${templateId}/remove_template/`, {}, getAuthHeader());
            toast.success('Đã gỡ file tuỳ chỉnh.');
            fetchReportTemplates();
        } catch (e) { toast.error('Lỗi khi xóa.'); }
    };

    const handleDownloadSchema = async (tplId, tplName) => {
        try {
            const res = await axios.get(`/api/reports/templates/${tplId}/download_schema/`, {
                ...getAuthHeader(),
                responseType: 'blob'
            });
            const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', tplName.toLowerCase().replace(/\s+/g, '_') + '_original.docx');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(blobUrl);
        } catch (e) { toast.error('Lỗi khi tải mẫu gốc.'); }
    };

    const handleSystemUpdate = async () => {
        if (!window.confirm('Cập nhật mã nguồn có thể làm gián đoạn máy chủ. Bạn có tiếp tục?')) return;
        setUpdating(true);
        try {
            await axios.post('/api/settings/update-system/', {}, getAuthHeader());
            toast.success('Cập nhật bắt đầu! Đợi 1-2 phút...');
        } catch (e) {
            toast.error('Lỗi khi gọi lệnh cập nhật.');
        } finally {
            setUpdating(false);
        }
    };

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Cấu hình Hệ thống" pageTitle="Quản trị" />

                    <Card className="bg-primary text-white border-0 ribbon-box">
                        <CardBody className="p-4">
                            <Row className="align-items-center">
                                <Col sm={8}>
                                    <div className="d-flex align-items-center">
                                        <div className="avatar-sm flex-shrink-0 me-3">
                                            <span className="avatar-title bg-white bg-opacity-25 rounded-circle fs-3">
                                                <i className="ri-cpu-line"></i>
                                            </span>
                                        </div>
                                        <div>
                                            <h4 className="text-white mb-2 font-weight-bold">AI & Copilot Settings</h4>
                                            <p className="text-white-50 mb-0">Quản lý khoá API Token LLMs và thiết lập cấu hình môi trường vận hành.</p>
                                        </div>
                                    </div>
                                </Col>
                                <Col sm={4} className="text-sm-end mt-3 mt-sm-0">
                                    <Button color="light" onClick={fetchSettings} disabled={loading} className="btn-label waves-effect waves-light">
                                        <i className="ri-refresh-line label-icon align-middle fs-16 me-2"></i> Đồng bộ Cấu hình
                                    </Button>
                                </Col>
                            </Row>
                        </CardBody>
                    </Card>

                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardHeader>
                                    <h4 className="card-title mb-0 d-flex align-items-center">
                                        <i className="ri-database-2-line me-2 text-primary fs-20"></i> Tham số Vận hành (Env Override)
                                    </h4>
                                </CardHeader>
                                <CardBody>
                                    <Table className="table-borderless align-middle mb-0">
                                        <tbody>
                                            {settings.map(s => (
                                                <tr key={s.id} className="border-bottom border-dashed border-bottom-1">
                                                    <td style={{ width: "30%" }}>
                                                        <h6 className="mb-1">{s.key}</h6>
                                                        <p className="text-muted mb-0 fs-12">{s.description}</p>
                                                    </td>
                                                    <td style={{ width: "50%" }}>
                                                        <div className="form-icon">
                                                            <Input 
                                                                type={showKeys[s.id] || !s.key.includes('KEY') ? "text" : "password"} 
                                                                className="form-control form-control-icon bg-light border-0" 
                                                                value={editingValues[s.id] || ''} 
                                                                onChange={(e) => setEditingValues(prev => ({...prev, [s.id]: e.target.value}))} 
                                                            />
                                                            {s.key.includes('KEY') && <i className="ri-lock-2-line"></i>}
                                                        </div>
                                                    </td>
                                                    <td className="text-end" style={{ width: "20%" }}>
                                                        {s.key.includes('KEY') && (
                                                            <Button color="light" className="me-2 text-muted btn-icon" onClick={() => setShowKeys(prev => ({...prev, [s.id]: !prev[s.id]}))}>
                                                                <i className={showKeys[s.id] ? "ri-eye-off-line" : "ri-eye-line"}></i>
                                                            </Button>
                                                        )}
                                                        <Button color="primary" disabled={savingId === s.id} onClick={() => saveSetting(s.id)}>
                                                            {savingId === s.id ? <Spinner size="sm" /> : <i className="ri-save-3-line align-bottom"></i>} Lưu
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </CardBody>
                            </Card>
                        </Col>

                        <Col lg={12}>
                            <Card>
                                <CardHeader className="bg-light bg-opacity-50">
                                    <h4 className="card-title mb-0 d-flex align-items-center">
                                        <i className="ri-file-word-2-fill text-info me-2 fs-20"></i> Quản lý Mẫu Báo cáo (.docx)
                                    </h4>
                                </CardHeader>
                                <CardBody>
                                    <Table className="align-middle table-nowrap mb-0">
                                        <tbody>
                                            {reportTemplates.map(tpl => (
                                                <tr key={tpl.id}>
                                                    <td>
                                                        <div className="d-flex align-items-center">
                                                            <div className="avatar-xs flex-shrink-0 me-3">
                                                                <div className={`avatar-title rounded ${tpl.has_custom_file ? 'bg-success-subtle text-success' : 'bg-light text-muted'}`}>
                                                                    <i className={tpl.has_custom_file ? "ri-checkbox-circle-fill fs-16" : "ri-file-text-line fs-16"}></i>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <h5 className="fs-14 mb-1">{tpl.name}</h5>
                                                                {tpl.has_custom_file ? (
                                                                    <p className="text-success fw-medium fs-12 mb-0">Tệp tuỳ chỉnh đính kèm: {tpl.file_name}</p>
                                                                ) : (
                                                                    <p className="text-muted fs-12 mb-0">Sử dụng tệp báo cáo gốc của hệ thống</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-end">
                                                        <div className="d-flex justify-content-end gap-2">
                                                            {tpl.has_custom_file && (
                                                                <Button color="danger" outline size="sm" onClick={() => removeTemplate(tpl.id)}>
                                                                    <i className="ri-delete-bin-line align-bottom"></i> Xoá
                                                                </Button>
                                                            )}
                                                            <Button color="info" outline size="sm" onClick={() => handleDownloadSchema(tpl.id, tpl.name)} title="Tải mẫu Document với JSON Data Tags">
                                                                <i className="ri-download-2-line align-bottom me-1"></i> Tải lõi gốc
                                                            </Button>
                                                            <div>
                                                                <input type="file" id={`upload-${tpl.id}`} accept=".docx" className="d-none" onChange={e => { if(e.target.files[0]) uploadTemplate(tpl.id, e.target.files[0]); }} />
                                                                <label htmlFor={`upload-${tpl.id}`} className="btn btn-primary btn-sm mb-0 cursor-pointer">
                                                                    {uploadingTpl === tpl.id ? <Spinner size="sm"/> : <i className="ri-upload-cloud-2-line align-bottom me-1"></i>} 
                                                                    Thay thế File
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </CardBody>
                            </Card>
                        </Col>

                        <Col lg={12}>
                            <Card className="bg-dark text-white border-0">
                                <CardBody className="p-4 d-flex align-items-center">
                                    <div className="flex-grow-1">
                                        <h4 className="text-white mb-2"><i className="ri-github-fill me-2 fs-24 align-middle text-info"></i> Đồng bộ Máy Chủ (System Updater)</h4>
                                        <p className="text-white-50 mb-0">Hệ thống sẽ chạy lệnh <code>git pull</code> và tự khởi động lại Web server. Chỉ dành cho SysAdmin.</p>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <Button color="info" className="btn-label" onClick={handleSystemUpdate} disabled={updating}>
                                            {updating ? <Spinner size="sm" className="me-2"/> : <i className="ri-settings-5-line label-icon align-middle fs-16 me-2"></i>} 
                                            {updating ? 'Đang triển khai...' : 'Khởi chạy Cập nhật'}
                                        </Button>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>
        </React.Fragment>
    );  
};

export default Settings;
