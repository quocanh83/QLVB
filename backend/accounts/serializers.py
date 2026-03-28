from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from .models import User, Role

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Thêm mảng roles phẳng vào payload
        token['username'] = user.username
        token['email'] = user.email
        token['is_staff'] = user.is_staff
        token['is_superuser'] = user.is_superuser
        token['roles'] = list(user.roles.values_list('role_name', flat=True))
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['username'] = self.user.username
        data['full_name'] = self.user.full_name
        data['avatar'] = self.user.avatar.url if self.user.avatar else None
        data['roles'] = list(self.user.roles.values_list('role_name', flat=True))
        return data

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    roles = RoleSerializer(many=True, read_only=True)
    full_name = serializers.CharField(max_length=255, allow_blank=True, required=False)
    role_ids = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(), source='roles', many=True, write_only=True, required=False
    )

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name', 'avatar', 'roles', 'role_ids', 'group', 'sidebar_config']

    def create(self, validated_data):
        roles_data = validated_data.pop('roles', [])
        user = User.objects.create_user(**validated_data)
        if roles_data:
            user.roles.set(roles_data)
        return user

    def update(self, instance, validated_data):
        roles_data = validated_data.pop('roles', None)
        password = validated_data.pop('password', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
            
        if password:
            instance.set_password(password)
            
        instance.save()
        
        if roles_data is not None:
            instance.roles.set(roles_data)
            
        return instance
