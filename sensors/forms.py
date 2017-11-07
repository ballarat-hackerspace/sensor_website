from django import forms
from django.forms import ModelForm
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from .models import Profile, Organisation
from django.core.exceptions import ValidationError, ObjectDoesNotExist

class BaseForm(ModelForm):
    def __init__(self, *args, **kwargs):
        super(BaseForm, self).__init__(*args, **kwargs)
        for bound_field in self:
            if hasattr(bound_field, "field") and bound_field.field.required:
                bound_field.field.widget.attrs["required"] = "required"
				
class SignUpForm(UserCreationForm):
	first_name = forms.CharField(max_length=30, required=True)
	last_name = forms.CharField(max_length=30, required=True)
	organisation = forms.CharField(max_length=100, required=True)
	email = forms.EmailField(max_length=100, required=True, help_text = 'Enter a valid email address.')
	
	class Meta:
		model = User
		fields = ('username', 'first_name', 'last_name', 'organisation', 'email', 'password1', 'password2')
	
	#Overwrites default help text for the Sign Up fields
	def __init__(self, *args, **kwargs):
		super(SignUpForm, self).__init__(*args, **kwargs)
		self.fields['password1'].help_text = 'Your password cannot be too similar to your other personal information. It must contain at least 8 characters and cannot be entirely numeric.'
		self.fields['password2'].help_text = 'Please re-enter the same password.'
		self.fields['username'].help_text = '150 characters or fewer. Must be letters, digits and @/./+/-/_ only.'
	
	#Custom validator for the Organisation field. Checks to see if the input matches any organisations in the database and if not prevents the form submission
	def clean_organisation(self):
		organisation = self.cleaned_data['organisation']
		try:
			organisation_id = Organisation.objects.values_list('organisation', flat=True).get(organisation_id=organisation)
		except ObjectDoesNotExist:
			raise ValidationError('Does not match any organisations')
		return organisation
					
class ContactForm(forms.Form):
	contact_name = forms.CharField(required=True)
	contact_email = forms.EmailField(required=True)
	content = forms.CharField(required=True, widget=forms.Textarea)
	
class UserForm(forms.ModelForm):
	class Meta:
		model = User
		fields = ('first_name', 'last_name', 'email')
		
class ProfileForm(forms.ModelForm):
	class Meta:
		exclude = ('user', 'organisation')
		model = Profile
		
class RegisterSensorForm(BaseForm):
	organisation = forms.CharField(max_length=100, required=True, disabled=True) #Prevents the user from changing their organisation while registering a sensor
	building = forms.CharField(max_length=100, required=True)
	room = forms.CharField(max_length=100, required=True)
	coreid = forms.CharField(max_length=24, required=True)
	
	class Meta:
		model = Profile
		fields = ('organisation', 'building', 'room', 'coreid')
	
	#Overwrites the default label of 'coreid'
	def __init__(self, *args, **kwargs):
		super(RegisterSensorForm, self).__init__(*args, **kwargs)
		self.fields['coreid'].label = "Core ID"
		#self.fields['building'].label = "Building"
		#self.fields['room'].label = "Room"