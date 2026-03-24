from rest_framework import serializers
from .models import SystemSetting, Notification

class SystemSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSetting
        fields = '__all__'

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'

from .models import Agency

class AgencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Agency
        fields = '__all__'
