import logging
import json
import datetime
import math

from django.http import HttpResponse
from django.shortcuts import render, get_object_or_404
from expenses.forms import ExpenseForm, SignupForm
from expenses.models import Expense, Balance
from django.core import serializers
from django.db import IntegrityError
from django.db.models.query import QuerySet
from django.contrib import auth
from django.forms.models import inlineformset_factory

MAX_RETURNED_EXPENSES = 30

def login_required(function=None, redirect_field_name=None):
    """
    Just make sure the user is authenticated to access a certain ajax view

    Otherwise return a HttpResponse 401 - authentication required
    instead of the 302 redirect of the original Django decorator
    """
    def _decorator(view_func):
        def _wrapped_view(request, *args, **kwargs):
            if request.user.is_authenticated():
                return view_func(request, *args, **kwargs)
            else:
                return HttpResponse(status=401)
        return _wrapped_view

    if function is None:
        return _decorator
    else:
        return _decorator(function)

def _serialize(model, ignore=[]):
    obj = {}
    field_names = model._meta.get_all_field_names()
    for i in field_names:
        do_ignore = False
        item = getattr(model, i)
        for ig in ignore:
            if isinstance(item, ig):
                do_ignore = True
        if not do_ignore:
            if type(item) == datetime.datetime:
                obj[i] = item.isoformat('T')
            else:
                obj[i] = item
    return obj

def serialize(models, ignore=[]):
    obj = None
    if type(models) == QuerySet:
        obj = []
        for model in models:
            obj.append(_serialize(model, ignore))
    else:
        obj = _serialize(models, ignore)

    return obj


def login(request):
    status = 401
    data = json.loads(request.body)
    user = auth.authenticate(username=data['username'], password=data['password'])
    if user is not None and user.is_active:
        auth.login(request, user)
        status = 200

    data['password'] = ''
    return HttpResponse(status=status, content=json.dumps(data), content_type="text/json")

@login_required
def logout(request):
    auth.logout(request)
    return HttpResponse(status=200)

def signup(request):
    status = 406
    response = None
    data = json.loads(request.body)
    form = SignupForm(data)
    if form.is_valid():
        try:
            username = form.cleaned_data['username']
            password = form.cleaned_data['password']
            auth.models.User.objects.create_user(username, password=password)
            user = auth.authenticate(**form.cleaned_data)
            auth.login(request, user)
        except IntegrityError:
            response = {'errors':{'username':"Username is already taken."}}
        else:
            status = 201
    else:
        response = {'errors':form.errors}

    return HttpResponse(status=status, content_type="text/json", content=json.dumps(response))


def index(request):
    return render(request, 'index.html')


@login_required
def expense(request, id=0):
    """ Get or Create/Update an expense """

    status = 400
    expense = None
    errors = {}

    if request.method == 'PUT':
        data = json.loads(request.body)
        expense = get_object_or_404(Expense, pk=id, user=request.user)
        form = ExpenseForm(data, instance=expense)
        if form.is_valid():
            balance = Balance.objects.get(user=request.user)
            # Reset balance because we're updating an expense.
            balance.amount -= expense.amount

            form.save()
            balance.amount += expense.amount
            balance.save()
            status = 200
        else:
            errors = {'errors':form.errors}
    elif request.method == 'POST':
        data = json.loads(request.body)
        form = ExpenseForm(data)
        if form.is_valid():
            form.cleaned_data['user'] = request.user
            expense = Expense(**form.cleaned_data)
            expense.save()
            try:
                balance = Balance.objects.get(user=request.user)
            except Balance.DoesNotExist:
                # This user doesn't have a balance yet, create one.
                balance = Balance.objects.create(amount=0.0, user=request.user)

            balance.amount += expense.amount
            balance.save()
            status = 201
        else:
            errors = {'errors':form.errors}
    elif request.method == 'DELETE':
        expense = get_object_or_404(Expense, pk=id, user=request.user)
        try:
            # Make sure to update balance depending on the transaction type.
            balance = Balance.objects.get(user=request.user)
            balance.amount -= expense.amount
            balance.save()
            expense.delete()
        except:
            status = 500
        return HttpResponse(status=status)
    else:
        try:
            expense = get_object_or_404(Expense, pk=id)
        except Expense.DoesNotExist:
            logging.error('expense does not exist: ' + id)
            status = 404

    response = errors if errors else serialize(expense, ignore=[auth.models.User])
    return HttpResponse(content=json.dumps(response), status=status, content_type='application/json')


@login_required
def total(request):
    """ Display the total """

    json_obj = {'amount': 0.0}
    try:
        balance = Balance.objects.get(user=request.user)
    except:
        pass
    else:
        json_obj['amount'] = balance.amount
    return HttpResponse(json.dumps(json_obj), content_type='application/json')


@login_required
def list(request):
    """ render the list page with 30 entries """

    page = int(request.GET.get('page', 1)) - 1
    offset = MAX_RETURNED_EXPENSES * int(page)
    expenses = Expense.objects.filter(user=request.user).order_by('created_at').reverse()[offset:(offset + MAX_RETURNED_EXPENSES)]
    total = Expense.objects.filter(user=request.user).count()
    remaining = total - (offset + len(expenses))
    pages = math.ceil(float(total) / float(MAX_RETURNED_EXPENSES))

    json_object = {'total': total, 'remaining': remaining, 'pages': pages, 'expenses': serialize(expenses, ignore=[auth.models.User])}
    return HttpResponse(content=json.dumps(json_object), content_type='application/json')


