from django.contrib import admin
from .models import Profile, Organisation

#States which database tables are to be accessible through the 'admin' page
admin.site.register(Profile)
admin.site.register(Organisation)