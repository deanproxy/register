from django.conf import settings
from django.conf.urls import patterns, include, url

# Uncomment the next two lines to enable the admin:
# from django.contrib import admin
# admin.autodiscover()

urlpatterns = patterns('',
    # Examples:
    # url(r'^$', 'checkreg.views.home', name='home'),
    # url(r'^checkreg/', include('checkreg.foo.urls')),
	url(r'^static/(?P<path>.*)$', 'django.views.static.serve', {'document_root': settings.STATIC_ROOT}),


    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    # url(r'^admin/', include(admin.site.urls)),
	url(r'^$', 'expenses.views.index', name='index_url'),
    url(r'^login/', 'expenses.views.login', name='login_url'),
    url(r'^logout/', 'expenses.views.logout', name='logout_url'),
    url(r'^signup/', 'expenses.views.signup', name='signup_url'),
	url(r'^expenses/', include('expenses.urls'))
)
