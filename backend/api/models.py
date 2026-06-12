from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator

class User(AbstractUser):
    ROLE_CHOICES = (
        ('visitor', 'Visitor'),
        ('customer', 'Customer'),
        ('staff', 'Production Staff'),
        ('admin', 'Admin'),
        ('super_admin', 'Super Admin'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return f"{self.username} ({self.role})"


class Product(models.Model):
    CATEGORY_CHOICES = (
        ('Personalized', 'Personalized'),
        ('Engineering', 'Engineering'),
        ('Robotics', 'Robotics'),
        ('Home Decor', 'Home Decor'),
        ('Gaming', 'Gaming'),
        ('Education', 'Education'),
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    rate = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, default='active')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class Inquiry(models.Model):
    STATUS_CHOICES = (
        ('New', 'New'),
        ('Contacted', 'Contacted'),
        ('Completed', 'Completed'),
    )
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='inquiries')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='inquiries')
    name = models.CharField(max_length=255)
    email = models.EmailField()
    message = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='New')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Inquiry from {self.name} - {self.status}"


class Order(models.Model):
    STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Processing', 'Processing'),
        ('Shipped', 'Shipped'),
        ('Delivered', 'Delivered'),
        ('Cancelled', 'Cancelled'),
    )
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='orders')
    quantity = models.IntegerField(default=1, validators=[MinValueValidator(1)])
    total_price = models.DecimalField(max_digits=12, decimal_places=2)
    shipping_address = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    shipping_carrier = models.CharField(max_length=100, blank=True, null=True)
    tracking_number = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order #{self.id} - {self.product.title} ({self.customer.username})"


class Request(models.Model):
    STATUS_CHOICES = (
        ('New Request', 'New Request'),
        ('Under Review', 'Under Review'),
        ('Quote Generated', 'Quote Generated'),
        ('Quote Accepted', 'Quote Accepted'),
        ('Rejected', 'Rejected'),
        ('Completed', 'Completed'),
    )
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='requests')
    project_name = models.CharField(max_length=255)
    infill = models.CharField(max_length=50, default='20%')
    description = models.TextField()
    dimensions = models.CharField(max_length=100, help_text="e.g., 100 x 50 x 20 mm")
    material_preference = models.CharField(max_length=50)
    color_preference = models.CharField(max_length=50)
    quantity = models.IntegerField(default=1, validators=[MinValueValidator(1)])
    required_delivery_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='New Request')
    shipping_carrier = models.CharField(max_length=100, blank=True, null=True)
    tracking_number = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.project_name} ({self.customer.username})"


class RequestFile(models.Model):
    request = models.ForeignKey(Request, on_delete=models.CASCADE, related_name='files')
    file = models.FileField(upload_to='requests/')
    file_type = models.CharField(max_length=10, help_text="e.g., STL, STEP, OBJ")
    volume_cm3 = models.FloatField(null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"File for {self.request.project_name} ({self.file_type})"


class Quotation(models.Model):
    STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Accepted', 'Accepted'),
        ('Rejected', 'Rejected'),
        ('Expired', 'Expired'),
    )
    request = models.OneToOneField(Request, on_delete=models.CASCADE, related_name='quotation')
    material_cost = models.DecimalField(max_digits=10, decimal_places=2)
    machine_cost = models.DecimalField(max_digits=10, decimal_places=2)
    post_processing_cost = models.DecimalField(max_digits=10, decimal_places=2)
    packaging_cost = models.DecimalField(max_digits=10, decimal_places=2)
    transportation_cost = models.DecimalField(max_digits=10, decimal_places=2)
    profit_margin = models.DecimalField(max_digits=5, decimal_places=2, help_text="Percentage e.g., 20.00")
    total_price = models.DecimalField(max_digits=12, decimal_places=2)
    validity_date = models.DateField()
    estimated_production_hours = models.FloatField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Quote {self.id} for {self.request.project_name} - {self.total_price}"


class Printer(models.Model):
    STATUS_CHOICES = (
        ('Idle', 'Idle'),
        ('Printing', 'Printing'),
        ('Maintenance', 'Maintenance'),
    )
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=50, help_text="e.g., FDM, SLA")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Idle')
    build_volume = models.CharField(max_length=100, help_text="e.g., 220 x 220 x 250 mm")

    def __str__(self):
        return f"{self.name} ({self.type}) - {self.status}"


class Material(models.Model):
    TYPE_CHOICES = (
        ('PLA', 'PLA'),
        ('PETG', 'PETG'),
        ('ABS', 'ABS'),
        ('TPU', 'TPU'),
        ('Resin', 'Resin'),
    )
    name = models.CharField(max_length=100, help_text="e.g., PLA Black")
    brand = models.CharField(max_length=100, default="Generic", blank=True, null=True)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    color = models.CharField(max_length=50)
    available_stock = models.FloatField(help_text="Stock in kg")
    reserved_stock = models.FloatField(default=0.0, help_text="Stock reserved in kg")
    reorder_level = models.FloatField(help_text="Reorder threshold in kg")

    def __str__(self):
        return f"{self.brand} {self.name} ({self.available_stock} kg avail)"


class ProductionJob(models.Model):
    STATUS_CHOICES = (
        ('Scheduled', 'Scheduled'),
        ('Printing', 'Printing'),
        ('Post Processing', 'Post Processing'),
        ('Quality Check', 'Quality Check'),
        ('Ready For Pickup', 'Ready For Pickup'),
        ('Delivered', 'Delivered'),
    )
    PRIORITY_CHOICES = (
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
    )
    request = models.ForeignKey(Request, on_delete=models.CASCADE, related_name='production_jobs')
    printer = models.ForeignKey(Printer, on_delete=models.SET_NULL, null=True, blank=True, related_name='jobs')
    material = models.ForeignKey(Material, on_delete=models.SET_NULL, null=True, blank=True, related_name='jobs')
    estimated_time_minutes = models.IntegerField()
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='Medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Scheduled')
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Job {self.id} on {self.printer} - {self.status}"


class MaterialTransaction(models.Model):
    TYPE_CHOICES = (
        ('Restock', 'Restock'),
        ('Consumption', 'Consumption'),
        ('Reservation', 'Reservation'),
        ('Release', 'Release'),
    )
    material = models.ForeignKey(Material, on_delete=models.CASCADE, related_name='transactions')
    quantity = models.FloatField(help_text="Quantity in kg, negative for reduction, positive for addition")
    transaction_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    job = models.ForeignKey(ProductionJob, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Tx {self.id} - {self.material.name} - {self.quantity} kg ({self.transaction_type})"
