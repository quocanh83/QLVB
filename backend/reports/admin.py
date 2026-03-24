from django.contrib import admin
from .models import ReportTemplate, ReportFieldConfig, ReportFieldLog


class ReportFieldConfigInline(admin.TabularInline):
    model = ReportFieldConfig
    extra = 0


@admin.register(ReportTemplate)
class ReportTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'template_type', 'is_active', 'updated_at']
    list_filter = ['template_type', 'is_active']
    inlines = [ReportFieldConfigInline]


@admin.register(ReportFieldConfig)
class ReportFieldConfigAdmin(admin.ModelAdmin):
    list_display = ['field_label', 'field_key', 'template', 'is_enabled', 'column_order']
    list_filter = ['template', 'is_enabled']


@admin.register(ReportFieldLog)
class ReportFieldLogAdmin(admin.ModelAdmin):
    list_display = ['field_config', 'action', 'changed_by', 'changed_at']
    list_filter = ['action']
    readonly_fields = ['field_config', 'changed_by', 'action', 'old_value', 'new_value', 'changed_at']
