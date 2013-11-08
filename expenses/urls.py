from django.conf.urls.defaults import patterns, url

urlpatterns = patterns('',
                       url(r'(\d+)', 'expenses.views.expense', name='get_expense_url'),
                       url(r'^total/', 'expenses.views.total', name='total_url'),
                       url(r'^list/', 'expenses.views.list', name='list_expenses_url'),
                       url(r'^delete/(\d+)', 'expenses.views.destroy', name='delete_expense_url'),
                       url(r'$', 'expenses.views.expense', name='expense_url'),
)