from rest_framework import serializers
from .models import Feedback, Explanation

class ExplanationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Explanation
        fields = '__all__'

class FeedbackSerializer(serializers.ModelSerializer):
    explanations = ExplanationSerializer(many=True, read_only=True)
    class Meta:
        model = Feedback
        fields = '__all__'
