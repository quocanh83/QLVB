from rest_framework import serializers
from .models import ReportTemplate, ReportFieldConfig, ReportFieldLog


class ReportFieldLogSerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source='changed_by.username', read_only=True, default='')

    class Meta:
        model = ReportFieldLog
        fields = ['id', 'action', 'old_value', 'new_value', 'changed_by_name', 'changed_at']


class ReportFieldConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportFieldConfig
        fields = ['id', 'field_key', 'field_label', 'is_enabled', 'is_default', 'column_order', 'column_width_cm']


class ReportTemplateSerializer(serializers.ModelSerializer):
    field_configs = ReportFieldConfigSerializer(many=True, read_only=True)

    class Meta:
        model = ReportTemplate
        fields = [
            'id', 'name', 'template_type', 'is_active',
            'header_org_name', 'header_org_location',
            'footer_signer_name', 'footer_signer_title',
            'created_at', 'updated_at', 'field_configs'
        ]
