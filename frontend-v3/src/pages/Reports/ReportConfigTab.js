import React, { useState, useEffect } from 'react';
import { Row, Col, Card, CardBody, Button, Input, Table } from 'reactstrap';
import axios from 'axios';
import { getAuthHeader } from '../../helpers/api_helper';
import { toast } from 'react-toastify';
import FeatherIcon from 'feather-icons-react';

const ReportConfigTab = () => {
    const [templates, setTemplates] = useState([]);
    const [activeTemplate, setActiveTemplate] = useState(null);
    const [fieldConfigs, setFieldConfigs] = useState([]);
    const [templateLoading, setTemplateLoading] = useState(false);
    
    const [headerOrgName, setHeaderOrgName] = useState('');
    const [headerOrgLocation, setHeaderOrgLocation] = useState('');
    const [footerSignerName, setFooterSignerName] = useState('');
    const [footerSignerTitle, setFooterSignerTitle] = useState('');

    const [newFieldKey, setNewFieldKey] = useState('');
    const [newFieldLabel, setNewFieldLabel] = useState('');

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        setTemplateLoading(true);
        try {
            const res = await axios.get('/api/reports/templates/', getAuthHeader());
            setTemplates(res);
            if (res.length > 0) {
                const tpl = res[0];
                setActiveTemplate(tpl);
                setFieldConfigs(tpl.field_configs || []);
                setHeaderOrgName(tpl.header_org_name || '');
                setHeaderOrgLocation(tpl.header_org_location || '');
                setFooterSignerName(tpl.footer_signer_name || '');
                setFooterSignerTitle(tpl.footer_signer_title || '');
            }
        } catch (e) {
            toast.error("Lỗi tải cấu hình mẫu báo cáo.");
        } finally {
            setTemplateLoading(false);
        }
    };

    const saveTemplateHeader = async () => {
        if (!activeTemplate) return;
        try {
            await axios.patch(`/api/reports/templates/${activeTemplate.id}/`, {
                header_org_name: headerOrgName,
                header_org_location: headerOrgLocation,
                footer_signer_name: footerSignerName,
                footer_signer_title: footerSignerTitle,
            }, getAuthHeader());
            toast.success("Đã cập nhật thông tin chuẩn!");
            fetchTemplates();
        } catch (e) {
            toast.error("Lỗi khi lưu thông tin.");
        }
    };

    const toggleField = async (fieldId, currentValue) => {
        try {
            await axios.patch(`/api/reports/field-configs/${fieldId}/`, { is_enabled: !currentValue }, getAuthHeader());
            fetchTemplates();
        } catch (e) { toast.error("Lỗi thay đổi trạng thái!"); }
    };

    const updateFieldLabel = async (fieldId, newLabel) => {
        try {
            await axios.patch(`/api/reports/field-configs/${fieldId}/`, { field_label: newLabel }, getAuthHeader());
        } catch (e) { toast.error("Lỗi cập nhật tên nhãn!"); }
    };

    const addField = async () => {
        if (!newFieldKey || !newFieldLabel || !activeTemplate) return;
        try {
            await axios.post('/api/reports/field-configs/', {
                template: activeTemplate.id,
                field_key: newFieldKey,
                field_label: newFieldLabel,
                column_order: fieldConfigs.length,
                is_enabled: true
            }, getAuthHeader());
            setNewFieldKey('');
            setNewFieldLabel('');
            fetchTemplates();
            toast.success("Thêm cột thành công!");
        } catch (e) { toast.error("Mã trường đã tồn tại hoặc có lỗi."); }
    };

    const removeField = async (fieldId) => {
        if (!window.confirm("Bạn có chắc muốn xoá cột này khỏi hệ thống?")) return;
        try {
            await axios.delete(`/api/reports/field-configs/${fieldId}/`, getAuthHeader());
            fetchTemplates();
            toast.success("Đã xóa cột!");
        } catch (e) { toast.error("Lỗi khi xoá trường."); }
    };

    const moveField = async (fieldId, direction) => {
        const idx = fieldConfigs.findIndex(f => f.id === fieldId);
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= fieldConfigs.length) return;
        try {
            await Promise.all([
                axios.patch(`/api/reports/field-configs/${fieldConfigs[idx].id}/`, { column_order: swapIdx }, getAuthHeader()),
                axios.patch(`/api/reports/field-configs/${fieldConfigs[swapIdx].id}/`, { column_order: idx }, getAuthHeader()),
            ]);
            fetchTemplates();
        } catch (e) { toast.error("Lỗi đổi vị trí."); }
    };

    if (templateLoading && !activeTemplate) {
        return <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></div>;
    }

    return (
        <Row className="g-4 text-white">
            {/* Form Cấu hình */}
            <Col lg={7}>
                <div className="modern-card p-4 mb-4 border border-white-5">
                    <div className="d-flex align-items-center mb-4">
                        <div className="flex-grow-1">
                            <h6 className="text-white-60 text-uppercase fw-bold fs-10 tracking-widest mb-1">Thông tin Hành chính</h6>
                            <div className="text-white fs-13 fw-medium">Cấu hình tiêu đề và chân trang cho báo cáo Word</div>
                        </div>
                    </div>
                    
                    <Row className="g-3">
                        <Col md={6}>
                            <label className="form-label xsmall text-uppercase text-white-40 fw-bold">Cơ quan chủ trì</label>
                            <Input type="text" className="modern-input" value={headerOrgName} onChange={e => setHeaderOrgName(e.target.value)} />
                        </Col>
                        <Col md={6}>
                            <label className="form-label xsmall text-uppercase text-white-40 fw-bold">Nơi ban hành</label>
                            <Input type="text" className="modern-input" value={headerOrgLocation} onChange={e => setHeaderOrgLocation(e.target.value)} />
                        </Col>
                        <Col md={6}>
                            <label className="form-label xsmall text-uppercase text-white-40 fw-bold">Chức danh người ký</label>
                            <Input type="text" className="modern-input" value={footerSignerTitle} onChange={e => setFooterSignerTitle(e.target.value)} />
                        </Col>
                        <Col md={6}>
                            <label className="form-label xsmall text-uppercase text-white-40 fw-bold">Họ tên người ký</label>
                            <Input type="text" className="modern-input" value={footerSignerName} onChange={e => setFooterSignerName(e.target.value)} />
                        </Col>
                    </Row>
                    <div className="mt-4">
                        <button className="modern-btn primary w-100" onClick={saveTemplateHeader}>
                            <i className="ri-save-3-line me-1"></i> Lưu cấu hình hiển thị
                        </button>
                    </div>
                </div>

                <div className="modern-card p-4 border border-white-5">
                    <div className="d-flex align-items-center mb-4">
                        <div className="flex-grow-1">
                            <h6 className="text-white-60 text-uppercase fw-bold fs-10 tracking-widest mb-1">Cấu trúc Cột Tuỳ chọn</h6>
                            <div className="text-white fs-13 fw-medium">Quản lý các trường dữ liệu hiển thị trên bảng báo cáo</div>
                        </div>
                    </div>
                    
                    {/* Thêm cột mới */}
                    <div className="bg-white-5 p-3 rounded-3 mb-4 d-flex gap-2 border border-white-5">
                        <div className="flex-grow-1">
                            <Input type="text" className="modern-input" placeholder="Mã biến (VD: thoi_han)" value={newFieldKey} onChange={e => setNewFieldKey(e.target.value)} />
                        </div>
                        <div className="flex-grow-1">
                            <Input type="text" className="modern-input" placeholder="Nhãn cột (VD: Thời hạn)" value={newFieldLabel} onChange={e => setNewFieldLabel(e.target.value)} />
                        </div>
                        <button className="modern-btn success btn-sm py-0 px-3" onClick={addField}>
                            <i className="ri-add-line"></i> Thêm
                        </button>
                    </div>

                    {/* Danh sách cột */}
                    <div className="list-group list-group-flush border-top border-white-5">
                        {fieldConfigs.map((f, i) => (
                            <div key={f.id} className="list-group-item bg-transparent d-flex align-items-center justify-content-between px-0 py-3 border-bottom border-white-5">
                                <div className="d-flex align-items-center gap-3">
                                    <div className="d-flex flex-column gap-1">
                                        <button className="btn btn-link p-0 text-white-40 hover-white-100" onClick={() => moveField(f.id, 'up')} disabled={i === 0}>
                                            <i className="ri-arrow-up-s-line fs-16"></i>
                                        </button>
                                        <button className="btn btn-link p-0 text-white-40 hover-white-100" onClick={() => moveField(f.id, 'down')} disabled={i === fieldConfigs.length-1}>
                                            <i className="ri-arrow-down-s-line fs-16"></i>
                                        </button>
                                    </div>
                                    <div>
                                        <Input 
                                            type="text" 
                                            className="border-0 bg-transparent fw-bold text-white fs-14 p-0 shadow-none" 
                                            style={{ width:'250px' }} 
                                            value={f.field_label} 
                                            onChange={e => setFieldConfigs(prev => prev.map(x => x.id === f.id ? {...x, field_label: e.target.value} : x))} 
                                            onBlur={e => updateFieldLabel(f.id, e.target.value)} 
                                        />
                                        <div className="fs-10 text-white-40 font-monospace uppercase">{f.field_key}</div>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center gap-3">
                                    <div className="form-check form-switch modern-switch mb-0">
                                        <Input type="checkbox" id={`switch-${f.id}`} checked={f.is_enabled} onChange={() => toggleField(f.id, f.is_enabled)} />
                                    </div>
                                    {!f.is_default && (
                                        <button className="btn btn-sm btn-soft-danger modern-btn-circle-danger" onClick={() => removeField(f.id)}>
                                            <i className="ri-delete-bin-5-line"></i>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Col>

            {/* Xem trước Live Demo */}
            <Col lg={5}>
                <div className="sticky-side-div">
                    <div className="d-flex align-items-center justify-content-between mb-3 px-2">
                         <h6 className="text-white-60 text-uppercase fw-bold fs-10 tracking-widest mb-0"><i className="ri-eye-line me-2 text-primary"></i> Xem trước hiển thị</h6>
                         <span className="badge bg-success-opacity text-success px-2 py-1 fs-10"><i className="bx bx-radio-circle-marked bx-flashing me-1"></i> LIVE</span>
                    </div>
                    
                    <div className="modern-card p-0 border border-white-5 overflow-hidden shadow-lg" style={{ transform: 'scale(1)', background: '#fff' }}>
                        <div className="bg-primary" style={{ height: '4px' }}></div>
                        <div className="p-4 fs-11 font-serif text-dark" style={{ minHeight: '600px' }}>
                             <div className="d-flex justify-content-between mb-5">
                                 <div className="text-center" style={{ width: '40%' }}>
                                     <div className="fw-bold text-uppercase fs-12">{headerOrgName || 'BỘ/CƠ QUAN CHỦ TRÌ'}</div>
                                     <div className="mx-auto mt-1" style={{ width: '60px', borderBottom: '1px solid #000' }}></div>
                                 </div>
                                 <div className="text-center" style={{ width: '55%' }}>
                                     <div className="fw-bold text-uppercase fs-12">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                                     <div className="fw-bold fs-12">Độc lập - Tự do - Hạnh phúc</div>
                                     <div className="mx-auto mt-1" style={{ width: '100px', borderBottom: '1px solid #000' }}></div>
                                 </div>
                             </div>
                             
                             <div className="text-center mb-5 mt-4">
                                 <h6 className="fw-bold text-uppercase mb-2 fs-14">BẢN TỔNG HỢP, GIẢI TRÌNH, TIẾP THU Ý KIẾN</h6>
                                 <div className="fst-italic fs-12 text-muted">Đối với dự thảo: [Tên Dự thảo văn bản minh họa]</div>
                             </div>

                             <div className="table-responsive">
                                 <table className="table table-bordered border-dark table-sm fs-10 text-center align-middle">
                                     <thead className="bg-light border-dark">
                                         <tr>
                                            {fieldConfigs.filter(f => f.is_enabled).map((f, i) => (
                                                <th key={i} className="text-uppercase fw-bold border-dark p-2">{f.field_label}</th>
                                            ))}
                                         </tr>
                                     </thead>
                                     <tbody>
                                         <tr>
                                            {fieldConfigs.filter(f => f.is_enabled).map((f, i) => (
                                                <td key={i} className="text-muted fst-italic border-dark p-2 py-4">{f.field_key === 'stt' ? '1' : `[Dữ liệu mẫu]`}</td>
                                            ))}
                                         </tr>
                                     </tbody>
                                 </table>
                             </div>

                             <div className="mt-5 pt-4 d-flex flex-column align-items-end">
                                 <div className="fst-italic mb-2 fs-12">{headerOrgLocation || 'Hà Nội'}, ngày ... tháng ... năm ...</div>
                                 <div className="text-center" style={{ minWidth: '220px' }}>
                                     <div className="fw-bold text-uppercase fs-12">{footerSignerTitle || 'CƠ QUAN CHỦ TRÌ'}</div>
                                     <div className="fst-italic" style={{ fontSize: '10px' }}>(Ký tên, đóng dấu)</div>
                                     <div style={{ height: '80px' }}></div>
                                     <div className="fw-bold fs-13 mt-4">{footerSignerName || '[Họ tên người ký]'}</div>
                                 </div>
                             </div>
                        </div>
                    </div>
                </div>
            </Col>
        </Row>
    );
};

export default ReportConfigTab;
