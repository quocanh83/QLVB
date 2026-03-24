from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import ReportTemplate, ReportFieldConfig, ReportFieldLog
from .serializers import ReportTemplateSerializer, ReportFieldConfigSerializer, ReportFieldLogSerializer


class ReportTemplateViewSet(viewsets.ModelViewSet):
    queryset = ReportTemplate.objects.all()
    serializer_class = ReportTemplateSerializer

    @action(detail=True, methods=['get'])
    def field_logs(self, request, pk=None):
        """Lịch sử thay đổi cấu hình trường của mẫu này"""
        template = self.get_object()
        logs = ReportFieldLog.objects.filter(field_config__template=template).select_related('changed_by', 'field_config')[:50]
        serializer = ReportFieldLogSerializer(logs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_field(self, request, pk=None):
        """Thêm một trường tuỳ biến mới"""
        template = self.get_object()
        field_key = request.data.get('field_key', '').strip()
        field_label = request.data.get('field_label', '').strip()

        if not field_key or not field_label:
            return Response({"error": "Vui lòng nhập mã trường và nhãn hiển thị."}, status=400)

        if template.field_configs.filter(field_key=field_key).exists():
            return Response({"error": f"Mã trường '{field_key}' đã tồn tại."}, status=400)

        max_order = template.field_configs.count()
        config = ReportFieldConfig.objects.create(
            template=template,
            field_key=field_key,
            field_label=field_label,
            is_enabled=True,
            is_default=False,
            column_order=max_order,
            column_width_cm=float(request.data.get('column_width_cm', 3.0))
        )

        # Ghi log
        ReportFieldLog.objects.create(
            field_config=config,
            changed_by=request.user,
            action="Thêm trường mới",
            old_value="",
            new_value=field_label
        )

        serializer = ReportFieldConfigSerializer(config)
        return Response(serializer.data, status=201)

    @action(detail=True, methods=['post'])
    def remove_field(self, request, pk=None):
        """Xoá một trường tuỳ biến (không cho xoá trường mặc định)"""
        template = self.get_object()
        field_id = request.data.get('field_id')

        try:
            config = template.field_configs.get(id=field_id)
        except ReportFieldConfig.DoesNotExist:
            return Response({"error": "Trường không tồn tại."}, status=404)

        if config.is_default:
            return Response({"error": "Không thể xoá trường mặc định."}, status=400)

        # Ghi log trước khi xoá
        ReportFieldLog.objects.create(
            field_config=config,
            changed_by=request.user,
            action="Xoá trường",
            old_value=config.field_label,
            new_value=""
        )
        config.delete()
        return Response({"message": "Đã xoá trường thành công."})


class ReportFieldConfigViewSet(viewsets.ModelViewSet):
    queryset = ReportFieldConfig.objects.all()
    serializer_class = ReportFieldConfigSerializer

    def partial_update(self, request, *args, **kwargs):
        """Override PATCH để tự động ghi log khi thay đổi cấu hình"""
        instance = self.get_object()
        old_values = {}

        # Capture old values cho các trường sẽ thay đổi
        trackable_fields = ['is_enabled', 'field_label', 'column_order', 'column_width_cm']
        for field in trackable_fields:
            if field in request.data:
                old_values[field] = str(getattr(instance, field))

        # Apply changes
        response = super().partial_update(request, *args, **kwargs)

        # Ghi log cho từng thay đổi
        instance.refresh_from_db()
        for field, old_val in old_values.items():
            new_val = str(getattr(instance, field))
            if old_val != new_val:
                action_map = {
                    'is_enabled': 'Bật trường' if instance.is_enabled else 'Tắt trường',
                    'field_label': 'Đổi nhãn cột',
                    'column_order': 'Đổi thứ tự cột',
                    'column_width_cm': 'Đổi độ rộng cột',
                }
                ReportFieldLog.objects.create(
                    field_config=instance,
                    changed_by=request.user,
                    action=action_map.get(field, f'Sửa {field}'),
                    old_value=old_val,
                    new_value=new_val
                )

        return response
