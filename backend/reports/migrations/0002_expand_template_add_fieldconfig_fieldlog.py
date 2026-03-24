# Generated manually for expanded ReportTemplate + new models

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('reports', '0001_initial'),
    ]

    operations = [
        # --- Expand ReportTemplate ---
        migrations.AddField(
            model_name='reporttemplate',
            name='template_type',
            field=models.CharField(choices=[('mau_10', 'Mẫu 10 - Tổng hợp, Giải trình, Tiếp thu'), ('mau_tong_hop', 'Mẫu Tổng hợp Ý kiến'), ('custom', 'Mẫu Tuỳ biến')], default='mau_10', max_length=50),
        ),
        migrations.AddField(
            model_name='reporttemplate',
            name='is_active',
            field=models.BooleanField(default=True, verbose_name='Đang sử dụng'),
        ),
        migrations.AddField(
            model_name='reporttemplate',
            name='header_org_name',
            field=models.CharField(blank=True, default='BỘ/CƠ QUAN CHỦ TRÌ', max_length=500, verbose_name='Tên cơ quan chủ trì'),
        ),
        migrations.AddField(
            model_name='reporttemplate',
            name='header_org_location',
            field=models.CharField(blank=True, default='Hà Nội', max_length=255, verbose_name='Nơi ban hành'),
        ),
        migrations.AddField(
            model_name='reporttemplate',
            name='footer_signer_name',
            field=models.CharField(blank=True, default='', max_length=255, verbose_name='Họ tên người ký'),
        ),
        migrations.AddField(
            model_name='reporttemplate',
            name='footer_signer_title',
            field=models.CharField(blank=True, default='ĐẠI DIỆN CƠ QUAN CHỦ TRÌ', max_length=255, verbose_name='Chức vụ người ký'),
        ),
        migrations.AddField(
            model_name='reporttemplate',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AlterField(
            model_name='reporttemplate',
            name='name',
            field=models.CharField(max_length=255, verbose_name='Tên mẫu báo cáo'),
        ),
        migrations.AlterField(
            model_name='reporttemplate',
            name='file_path',
            field=models.FileField(blank=True, null=True, upload_to='reports/templates/'),
        ),
        migrations.AlterModelOptions(
            name='reporttemplate',
            options={'ordering': ['-is_active', '-updated_at']},
        ),

        # --- New: ReportFieldConfig ---
        migrations.CreateModel(
            name='ReportFieldConfig',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('field_key', models.CharField(max_length=100, verbose_name='Mã trường')),
                ('field_label', models.CharField(max_length=255, verbose_name='Nhãn hiển thị')),
                ('is_enabled', models.BooleanField(default=True, verbose_name='Hiển thị')),
                ('is_default', models.BooleanField(default=False, verbose_name='Trường mặc định (không xoá được)')),
                ('column_order', models.IntegerField(default=0, verbose_name='Thứ tự cột')),
                ('column_width_cm', models.FloatField(default=3.0, verbose_name='Độ rộng cột (cm)')),
                ('template', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='field_configs', to='reports.reporttemplate')),
            ],
            options={
                'ordering': ['column_order'],
                'unique_together': {('template', 'field_key')},
            },
        ),

        # --- New: ReportFieldLog ---
        migrations.CreateModel(
            name='ReportFieldLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(max_length=100, verbose_name='Hành động')),
                ('old_value', models.TextField(blank=True, default='')),
                ('new_value', models.TextField(blank=True, default='')),
                ('changed_at', models.DateTimeField(auto_now_add=True)),
                ('changed_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ('field_config', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='logs', to='reports.reportfieldconfig')),
            ],
            options={
                'ordering': ['-changed_at'],
            },
        ),
    ]
