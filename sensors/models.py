from django.db import models
from django.contrib.auth.models import User
from django.dispatch import receiver
from django.db.models.signals import post_save

class Organisation(models.Model):
	organisation = models.CharField(max_length=50)
	organisation_id = models.CharField(max_length=64)

class Profile(models.Model):
	user = models.OneToOneField(User, on_delete=models.CASCADE)
	organisation = models.CharField(max_length=50)
	
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
	if created:
		profile = Profile.objects.create(user=instance)
		
@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
	instance.profile.save()
	
	


