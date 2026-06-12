from rest_framework import viewsets, permissions, status, decorators
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Sum
from datetime import datetime, date

from .models import Product, Inquiry, Order, Request, RequestFile, Quotation, Printer, Material, ProductionJob, MaterialTransaction
from .serializers import (
    UserSerializer, UserRegisterSerializer, ProductSerializer, InquirySerializer, OrderSerializer,
    RequestSerializer, RequestCreateSerializer, RequestFileSerializer, QuotationSerializer,
    PrinterSerializer, MaterialSerializer, ProductionJobSerializer, MaterialTransactionSerializer
)
from .stl_helper import calculate_mesh_volume

User = get_user_model()

# Custom Permissions
class IsAdminOrStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['admin', 'super_admin', 'staff']


class IsAdminOrStaffOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.role in ['admin', 'super_admin', 'staff']


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['admin', 'super_admin']


class IsOwnerOrStaff(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.role in ['admin', 'super_admin', 'staff']:
            return True
        if hasattr(obj, 'customer'):
            return obj.customer == request.user
        if hasattr(obj, 'request'):
            return obj.request.customer == request.user
        return False


# Auth Views
@decorators.api_view(['POST'])
@decorators.permission_classes([permissions.AllowAny])
def register_user(request):
    serializer = UserRegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@decorators.api_view(['GET', 'PUT', 'PATCH'])
@decorators.permission_classes([permissions.IsAuthenticated])
def user_profile(request):
    if request.method in ['PUT', 'PATCH']:
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


# Viewsets
class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class InquiryViewSet(viewsets.ModelViewSet):
    queryset = Inquiry.objects.all()
    serializer_class = InquirySerializer

    def get_permissions(self):
        if self.action in ['create']:
            return [permissions.AllowAny()]
        return [IsAdminOrStaff()]

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user)
        else:
            serializer.save()


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer

    def get_permissions(self):
        if self.action in ['create', 'list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsAdminOrStaff()]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['admin', 'super_admin', 'staff']:
            return Order.objects.all().order_by('-created_at')
        return Order.objects.filter(customer=user).order_by('-created_at')

    def perform_create(self, serializer):
        product_id = self.request.data.get('product')
        product = Product.objects.get(id=product_id)
        quantity = int(self.request.data.get('quantity', 1))
        total_price = product.rate * quantity
        
        # Get pre-saved address, otherwise require/fallback
        shipping_address = self.request.user.address or self.request.data.get('shipping_address')
        if not shipping_address:
            # Fallback or validation error
            shipping_address = "No address pre-saved in profile"

        serializer.save(
            customer=self.request.user,
            total_price=total_price,
            shipping_address=shipping_address
        )


class RequestViewSet(viewsets.ModelViewSet):
    serializer_class = RequestSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role in ['admin', 'super_admin', 'staff']:
            return Request.objects.all().order_by('-created_at')
        return Request.objects.filter(customer=user).order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'create':
            return RequestCreateSerializer
        return RequestSerializer

    def create(self, request, *args, **kwargs):
        # We handle multipart files here
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            req = serializer.save(customer=request.user)
            
            # Save files
            uploaded_files = request.FILES.getlist('files')
            for f in uploaded_files:
                # Determine type
                ext = f.name.split('.')[-1].upper() if '.' in f.name else 'STL'
                req_file = RequestFile.objects.create(
                    request=req,
                    file=f,
                    file_type=ext
                )
                # Run mesh volume calculation
                volume = calculate_mesh_volume(req_file.file.path)
                req_file.volume_cm3 = volume
                req_file.save()
                
        # Return complete serialized Request
        return Response(RequestSerializer(req).data, status=status.HTTP_201_CREATED)


class QuotationViewSet(viewsets.ModelViewSet):
    queryset = Quotation.objects.all()
    serializer_class = QuotationSerializer

    def get_permissions(self):
        if self.action in ['accept', 'reject']:
            return [permissions.IsAuthenticated(), IsOwnerOrStaff()]
        return [IsAdminOrStaff()]

    def perform_create(self, serializer):
        material_cost = serializer.validated_data['material_cost']
        machine_cost = serializer.validated_data['machine_cost']
        post_processing_cost = serializer.validated_data['post_processing_cost']
        packaging_cost = serializer.validated_data['packaging_cost']
        transportation_cost = serializer.validated_data['transportation_cost']
        profit_margin = serializer.validated_data['profit_margin']
        
        subtotal = material_cost + machine_cost + post_processing_cost + packaging_cost + transportation_cost
        margin_multiplier = 1 + (profit_margin / 100)
        total_price = subtotal * margin_multiplier
        
        with transaction.atomic():
            quote = serializer.save(total_price=total_price)
            # Update Request status
            quote.request.status = 'Under Review'
            # Or Quote Generated directly
            quote.request.status = 'Quote Generated'
            quote.request.save()

    @decorators.action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        quote = self.get_object()
        if quote.status != 'Pending':
            return Response({"detail": "Quotation is not pending."}, status=status.HTTP_400_BAD_REQUEST)
            
        with transaction.atomic():
            quote.status = 'Accepted'
            quote.save()
            
            req = quote.request
            req.status = 'Quote Accepted'
            req.save()
            
            # Find a matching material in database
            # Look for material preference in name
            pref_name = req.material_preference.lower()
            pref_color = req.color_preference.lower()
            
            selected_material = Material.objects.filter(
                name__icontains=pref_name
            ).first()
            
            if not selected_material:
                selected_material = Material.objects.first()
                
            # Compute material weight: volume * density * quantity
            # PLA density: ~1.24 g/cm3 -> 0.00124 kg/cm3
            density = 0.00124
            if selected_material and selected_material.type == 'Resin':
                density = 0.00110
            elif selected_material and selected_material.type == 'ABS':
                density = 0.00104
                
            total_vol = sum(f.volume_cm3 or 50.0 for f in req.files.all())
            weight_kg = round(total_vol * density * req.quantity, 4)
            
            # Assign first available Printer
            printer = Printer.objects.filter(status='Idle').first()
            if not printer:
                printer = Printer.objects.first()
                
            # Create production job
            job = ProductionJob.objects.create(
                request=req,
                printer=printer,
                material=selected_material,
                estimated_time_minutes=int(quote.estimated_production_hours * 60),
                status='Scheduled'
            )
            
            # Reserve materials
            if selected_material:
                selected_material.available_stock -= weight_kg
                selected_material.reserved_stock += weight_kg
                selected_material.save()
                
                # Material Transaction Log
                MaterialTransaction.objects.create(
                    material=selected_material,
                    quantity=weight_kg,
                    transaction_type='Reservation',
                    job=job
                )
                
        return Response(QuotationSerializer(quote).data)

    @decorators.action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        quote = self.get_object()
        if quote.status != 'Pending':
            return Response({"detail": "Quotation is not pending."}, status=status.HTTP_400_BAD_REQUEST)
            
        with transaction.atomic():
            quote.status = 'Rejected'
            quote.save()
            
            req = quote.request
            req.status = 'Rejected'
            req.save()
            
        return Response(QuotationSerializer(quote).data)


class PrinterViewSet(viewsets.ModelViewSet):
    queryset = Printer.objects.all()
    serializer_class = PrinterSerializer
    permission_classes = [IsAdminOrStaff]


class MaterialViewSet(viewsets.ModelViewSet):
    queryset = Material.objects.all()
    serializer_class = MaterialSerializer
    permission_classes = [IsAdminOrStaffOrReadOnly]


class ProductionJobViewSet(viewsets.ModelViewSet):
    serializer_class = ProductionJobSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role in ['admin', 'super_admin', 'staff']:
            return ProductionJob.objects.all().order_by('-id')
        return ProductionJob.objects.filter(request__customer=user).order_by('-id')

    def get_permissions(self):
        if self.action in ['update_status', 'partial_update', 'update']:
            return [IsAdminOrStaff()]
        return [permissions.IsAuthenticated()]

    @decorators.action(detail=True, methods=['post'], url_path='update-status')
    def update_status(self, request, pk=None):
        job = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in [s[0] for s in ProductionJob.STATUS_CHOICES]:
            return Response({"detail": "Invalid status value."}, status=status.HTTP_400_BAD_REQUEST)
            
        with transaction.atomic():
            old_status = job.status
            job.status = new_status
            
            if new_status == 'Printing' and old_status != 'Printing':
                job.started_at = datetime.now()
                if job.printer:
                    job.printer.status = 'Printing'
                    job.printer.save()
                    
            elif new_status in ['Quality Check', 'Ready For Pickup'] and old_status == 'Printing':
                if job.printer:
                    job.printer.status = 'Idle'
                    job.printer.save()
                    
            elif new_status == 'Delivered' and old_status != 'Delivered':
                job.completed_at = datetime.now()
                # Release reserve and Consume stock
                if job.material:
                    # Calculate weight consumed
                    density = 0.00124
                    if job.material.type == 'Resin':
                        density = 0.00110
                    elif job.material.type == 'ABS':
                        density = 0.00104
                        
                    total_vol = sum(f.volume_cm3 or 50.0 for f in job.request.files.all())
                    weight_kg = round(total_vol * density * job.request.quantity, 4)
                    
                    # Subtract from reserved, but since it's already deducted from available stock 
                    # during reservation, we only decrease reserved stock.
                    job.material.reserved_stock = max(0.0, job.material.reserved_stock - weight_kg)
                    job.material.save()
                    
                    # Log consumption transaction
                    MaterialTransaction.objects.create(
                        material=job.material,
                        quantity=-weight_kg,
                        transaction_type='Consumption',
                        job=job
                    )
                # Update Request status to Completed
                job.request.status = 'Completed'
                job.request.save()
                
            job.save()
            
        return Response(ProductionJobSerializer(job).data)


class MaterialTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MaterialTransaction.objects.all().order_by('-timestamp')
    serializer_class = MaterialTransactionSerializer
    permission_classes = [IsAdminOrStaff]


# Admin Dashboard
@decorators.api_view(['GET'])
@decorators.permission_classes([IsAdminOrStaff])
def admin_dashboard_kpis(request):
    new_requests = Request.objects.filter(status__in=['New Request', 'Under Review']).count()
    pending_quotes = Quotation.objects.filter(status='Pending').count()
    jobs_printing = ProductionJob.objects.filter(status__in=['Printing', 'Post Processing', 'Quality Check']).count()
    ready_pickup = ProductionJob.objects.filter(status='Ready For Pickup').count()
    delivered_orders = ProductionJob.objects.filter(status='Delivered').count()
    
    # Revenue is sum of accepted quotations
    revenue_data = Quotation.objects.filter(status='Accepted').aggregate(Sum('total_price'))
    revenue = revenue_data['total_price__sum'] or 0.0
    
    # Material stocks status
    materials = Material.objects.all()
    material_stock = []
    for m in materials:
        status_color = 'Green'
        if m.available_stock <= m.reorder_level:
            status_color = 'Amber'
        if m.available_stock <= (m.reorder_level / 2):
            status_color = 'Red'
        material_stock.append({
            'id': m.id,
            'name': m.name,
            'available': m.available_stock,
            'reserved': m.reserved_stock,
            'status_color': status_color
        })
        
    # Activity Feed
    activity_feed = []
    # Fetch recent requests
    recent_requests = Request.objects.all().order_by('-created_at')[:5]
    for r in recent_requests:
        activity_feed.append({
            'type': 'request',
            'title': 'New Request Received',
            'desc': f"Project '{r.project_name}' requested by {r.customer.username}",
            'time': r.created_at
        })
        
    # Fetch recent approved quotes
    recent_quotes = Quotation.objects.filter(status='Accepted').order_by('-id')[:5]
    for q in recent_quotes:
        activity_feed.append({
            'type': 'quote_approved',
            'title': 'Quote Approved',
            'desc': f"Quote for project '{q.request.project_name}' approved ($ {q.total_price})",
            'time': q.created_at # approximation
        })
        
    # Fetch recent finished jobs
    recent_jobs = ProductionJob.objects.all().order_by('-id')[:5]
    for j in recent_jobs:
        activity_feed.append({
            'type': 'job_status',
            'title': f"Job {j.status}",
            'desc': f"Project '{j.request.project_name}' updated to {j.status}",
            'time': j.completed_at if j.completed_at else j.started_at if j.started_at else datetime.now() # approximation
        })
        
    # Sort activity feed by time
    activity_feed = sorted(activity_feed, key=lambda x: x['time'] if x['time'] else datetime.min, reverse=True)[:10]
    
    # Format times as string for JSON
    for a in activity_feed:
        if a['time']:
            if isinstance(a['time'], datetime):
                a['time'] = a['time'].isoformat()
            else:
                a['time'] = str(a['time'])
                
    return Response({
        'kpis': {
            'new_requests': new_requests,
            'pending_quotations': pending_quotes,
            'jobs_printing': jobs_printing,
            'ready_for_pickup': ready_pickup,
            'delivered_orders': delivered_orders,
            'revenue': float(revenue)
        },
        'materials': material_stock,
        'activity_feed': activity_feed
    })
