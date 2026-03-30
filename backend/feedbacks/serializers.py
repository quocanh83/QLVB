from rest_framework import serializers
from .models import Feedback, Explanation, ActionLog, ConsultationResponse

class ActionLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    created_at_fmt = serializers.DateTimeField(source='created_at', format='%H:%M %d/%m/%Y', read_only=True)
    class Meta:
        model = ActionLog
        fields = ['id', 'user', 'username', 'action', 'details', 'created_at', 'created_at_fmt']

class ExplanationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Explanation
        fields = '__all__'

class ConsultationResponseSerializer(serializers.ModelSerializer):
    agency_name = serializers.CharField(source='agency.name', read_only=True)
    attached_file = serializers.FileField(required=False, allow_null=True)
    class Meta:
        model = ConsultationResponse
        fields = ['id', 'document', 'agency', 'agency_name', 'official_number', 'official_date', 'attached_file', 'created_at']

class FeedbackSerializer(serializers.ModelSerializer):
    explanations = ExplanationSerializer(many=True, read_only=True)
    logs = ActionLogSerializer(many=True, read_only=True)
    class Meta:
        model = Feedback
        fields = '__all__'
