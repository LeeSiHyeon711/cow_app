from django.contrib import admin
from django.urls import path
from hanwoo_app.views import predict  # 예측 API 추가

urlpatterns = [
    path("admin/", admin.site.urls),
    path("predict/", predict, name="predict"),
]
