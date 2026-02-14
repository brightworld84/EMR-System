"""
Custom middleware for audit logging.
"""

from core.models import AuditLog


class AuditLoggingMiddleware:
    """
    Middleware to log all requests (for HIPAA compliance).
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Log the request if user is authenticated
        if request.user.is_authenticated:
            # Get IP address
            ip_address = self.get_client_ip(request)
            
            # Log the action (simplified for now)
            # In production, you'd log more specific actions
            if request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
                action = 'update' if request.method in ['PUT', 'PATCH'] else request.method.lower()
                
                AuditLog.log_action(
                    user=request.user,
                    action=action,
                    resource_type='web_request',
                    ip_address=ip_address,
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    metadata={'path': request.path, 'method': request.method}
                )
        
        return response
    
    def get_client_ip(self, request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
