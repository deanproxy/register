from django import forms
from expenses.models import Expense

class SignupForm(forms.Form):
    username = forms.EmailField(error_messages={
        'required': 'You must supply a valid e-mail address.'
    })
    password = forms.CharField(error_messages={
        'required': 'Empty passwords are not allowed.'
    })
    password2 = forms.CharField(required=False)

    def clean(self):
        p1 = self.cleaned_data.get('password')
        p2 = self.cleaned_data.get('password2')
        if p1 and p1 != p2:
            self.add_error('password', 'Passwords must match.')

        return self.cleaned_data

class ExpenseForm(forms.Form):
    description = forms.CharField(required=True, error_messages={
        'required': 'You must provide a description.'
    })
    amount = forms.FloatField(required=True, error_messages={
        'required': 'You must provide an amount.'
    })

