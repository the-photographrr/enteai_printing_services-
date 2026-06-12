from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Product, Inquiry, Order, Request, RequestFile, Quotation, Printer, Material, ProductionJob, MaterialTransaction

User = get_user_model()

class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'phone', 'role')

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            phone=validated_data.get('phone', ''),
            role=validated_data.get('role', 'customer')
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'phone', 'address', 'role')


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'


class InquirySerializer(serializers.ModelSerializer):
    product_title = serializers.CharField(source='product.title', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Inquiry
        fields = '__all__'


class OrderSerializer(serializers.ModelSerializer):
    product_title = serializers.CharField(source='product.title', read_only=True)
    product_rate = serializers.DecimalField(source='product.rate', max_digits=10, decimal_places=2, read_only=True)
    customer_username = serializers.CharField(source='customer.username', read_only=True)

    class Meta:
        model = Order
        fields = '__all__'
        read_only_fields = ('customer', 'total_price', 'shipping_address')


class RequestFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = RequestFile
        fields = '__all__'


class QuotationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quotation
        fields = '__all__'


class RequestSerializer(serializers.ModelSerializer):
    files = RequestFileSerializer(many=True, read_only=True)
    quotation = QuotationSerializer(read_only=True)
    customer_name = serializers.CharField(source='customer.username', read_only=True)

    class Meta:
        model = Request
        fields = '__all__'


class RequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Request
        fields = ('id', 'project_name', 'infill', 'description', 'dimensions', 'material_preference', 'color_preference', 'quantity', 'required_delivery_date')


class PrinterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Printer
        fields = '__all__'


class MaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Material
        fields = '__all__'


class ProductionJobSerializer(serializers.ModelSerializer):
    printer_name = serializers.CharField(source='printer.name', read_only=True)
    material_name = serializers.CharField(source='material.name', read_only=True)
    project_name = serializers.CharField(source='request.project_name', read_only=True)

    class Meta:
        model = ProductionJob
        fields = '__all__'


class MaterialTransactionSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source='material.name', read_only=True)

    class Meta:
        model = MaterialTransaction
        fields = '__all__'
