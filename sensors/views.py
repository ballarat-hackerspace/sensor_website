from django.shortcuts import render, redirect
from django.views import generic
from .models import Profile, Organisation
from django.db import transaction
from django.contrib.auth import login as auth_login, authenticate, update_session_auth_hash
from django.contrib.auth.decorators import login_required
from django.contrib.auth.views import password_reset, password_reset_done
from django.contrib.auth.forms import PasswordChangeForm
from .forms import SignUpForm, ContactForm, UserForm, RegisterSensorForm, ProfileForm
from django.contrib import messages
from django.core.serializers.json import DjangoJSONEncoder



def sensors(request):
	return render(request, 'sensors/sensors.html')

def index(request):
	return render(request, 'sensors/index.html')
	
def login(request):
	return render(request, 'registration/login.html')
	
@transaction.atomic
def signup(request):
		if request.method == 'POST':
			form = SignUpForm(request.POST)
			#Checks to see if you've entered valid details before returning the clean data. Writes to the SQL database and then automatically logs the user in
			if form.is_valid(): 
				form.save()
				username = form.cleaned_data.get('username')
				raw_password = form.cleaned_data.get('password1')
				user = authenticate(username=username, password=raw_password)
				profile = user.profile
				profile.organisation = form.cleaned_data.get('organisation')
				#compares the organisation hash/key entered to ones already in the database and if a match is found, assigns the user the appropriate organisation
				profile.organisation = Organisation.objects.values_list('organisation', flat=True).get(organisation_id=profile.organisation) 
				profile.save()
				auth_login(request, user)
				return redirect('/sensors')
		else:
			form = SignUpForm()
		return render(request, 'registration/signup.html', {'form': form})
		
def history(request):
	return render(request, 'sensors/history.html')
	
def contact(request):
	form = ContactForm
	return render(request, 'sensors/contact.html', {'form': form})
	
@login_required
@transaction.atomic
def profile(request):
	if request.method == 'POST':
		user_form = UserForm(request.POST, instance=request.user)
		profile_form = ProfileForm(request.POST, instance=request.user.profile)
		if user_form.is_valid() and profile_form.is_valid():
			user_form.save()
			profile_form.save()
			messages.success(request, ('Profile successfully updated.'))
			return redirect('/sensors')
		else:
			messages.error(request, ('There was an error.'))
	else:
		user_form = UserForm(instance=request.user)
		profile_form = ProfileForm(instance=request.user.profile)
	return render(request, 'sensors/profile.html', {
		'user_form': user_form, 'profile_form': profile_form})

@login_required
@transaction.atomic			
def change_password(request):
    if request.method == 'POST':
        form = PasswordChangeForm(request.user, request.POST)
        if form.is_valid():
            user = form.save()
            update_session_auth_hash(request, user)
            messages.success(request, 'Your password was successfully updated!')
            return redirect('/sensors/password_reset/complete/')
        else:
            messages.error(request, 'Something went wrong.')
    else:
        form = PasswordChangeForm(request.user)
    return render(request, 'registration/change_password.html', {
        'form': form
    })

@login_required
def register_sensor(request):
	user = request.user
	profile = user.profile
	register_sensor_form = RegisterSensorForm(initial={'organisation': profile.organisation})

	register_sensor_form.organisation = profile.organisation
	return render(request, 'sensors/register_sensor.html', {'register_sensor_form': register_sensor_form})

@login_required
def remove_sensor(request):
	return render(request, 'sensors/remove_sensor.html')
	
def faq(request):
	return render(request, 'sensors/faq.html')