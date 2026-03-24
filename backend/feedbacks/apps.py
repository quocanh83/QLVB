from django.apps import AppConfig

class FeedbacksConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'feedbacks'

    def ready(self):
        import feedbacks.signals

