from rest_framework import serializers
from .models import SystemSetting, Notification

class SystemSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSetting
        fields = '__all__'

from django.contrib.humanize.templatetags.humanize import naturaltime

class NotificationSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.full_name', read_only=True)
    sender_avatar = serializers.ImageField(source='sender.avatar', read_only=True)
    created_at_formatted = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ['id', 'recipient', 'sender', 'sender_name', 'sender_avatar', 'message', 'is_read', 'link', 'created_at', 'created_at_formatted']

    def get_created_at_formatted(self, obj):
        return naturaltime(obj.created_at)

from .models import Agency, AgencyCategory

class AgencyCategorySerializer(serializers.ModelSerializer):
    agencies_count = serializers.IntegerField(source='agencies.count', read_only=True)
    
    class Meta:
        model = AgencyCategory
        fields = ['id', 'name', 'description', 'agencies_count', 'created_at']

class AgencySerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='agency_category.name', read_only=True)

    class Meta:
        model = Agency
        fields = ['id', 'name', 'category', 'agency_category', 'category_name', 'created_at']
