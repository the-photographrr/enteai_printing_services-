from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    register_user, user_profile, ProductViewSet, InquiryViewSet, OrderViewSet, RequestViewSet,
    QuotationViewSet, PrinterViewSet, MaterialViewSet, ProductionJobViewSet,
    MaterialTransactionViewSet, admin_dashboard_kpis
)

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'inquiries', InquiryViewSet, basename='inquiry')
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'requests', RequestViewSet, basename='request')
router.register(r'quotations', QuotationViewSet, basename='quotation')
router.register(r'printers', PrinterViewSet, basename='printer')
router.register(r'materials', MaterialViewSet, basename='material')
router.register(r'production-jobs', ProductionJobViewSet, basename='productionjob')
router.register(r'material-transactions', MaterialTransactionViewSet, basename='materialtransaction')

urlpatterns = [
    # Auth endpoints
    path('auth/register/', register_user, name='auth_register'),
    path('auth/profile/', user_profile, name='auth_profile'),
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Custom dashboard endpoint
    path('admin/dashboard/', admin_dashboard_kpis, name='admin_dashboard'),
    
    # Router endpoints
    path('', include(router.urls)),
]
