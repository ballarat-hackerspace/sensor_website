from django.conf.urls import url, include
from django.contrib.auth import views as auth_views
from . import views, views as core_views

app_name = 'sensors'
urlpatterns = [
	url(r'^$', views.index, name='index'),
	url(r'^sensors/$', views.sensors, name='sensors'),	
	url(r'^history/$', views.history, name='history'),
	url(r'^sensors/history/$', views.history, name='history'),
	url(r'^login/$', auth_views.login, name='login'),
	url(r'^logout/$', auth_views.logout, {'next_page': '/sensors'}, name='logout'),
	url(r'^signup/$', core_views.signup, name='signup'),
	url(r'^contact/$', views.contact, name='contact'),
	url(r'^profile/$', views.profile, name='profile'),
	url(r'^faq/$', views.faq, name='faq'),
	url(r'register_sensor/$', views.register_sensor, name='register_sensor'),
	url(r'remove_sensor/$', views.remove_sensor, name='remove_sensor'),
	url(r'^change_password/$', views.change_password, name='change_password'), #changing your password while logged in
	url(r'^password_change/$', auth_views.password_change, name='password_change'), #changing your password via a password reset
    url(r'^password_change/done/$', auth_views.password_change_done, name='password_change_done'),
    url(r'^password_reset/$', auth_views.password_reset, {'post_reset_redirect': '/sensors/password_reset/done/'}, name='password_reset'),
    url(r'^password_reset/done/$', auth_views.password_reset_done, name='password_reset_done'),
    url(r'^password_reset/complete/$', auth_views.password_reset_complete, name='password_reset_complete'),
    url(r'^password_reset/confirm/(?P<uidb64>[0-9A-Za-z]+)-(?P<token>.+)/$', auth_views.password_reset_confirm, {'post_reset_redirect': '/sensors/password_reset/complete/'}, name='password_reset_confirm'),      
	url(r'^accounts/', include('registration.backends.default.urls')),
]