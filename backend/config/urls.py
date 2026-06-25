from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from django.http import JsonResponse

def version_view(request):
    return JsonResponse({"version": "test-v3-frontend-debug"})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')),
    path('version/', version_view),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
