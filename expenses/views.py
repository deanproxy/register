import logging
import json
import datetime
import math

from django.http import HttpResponse
from django.shortcuts import render, get_object_or_404
from expenses.forms import ExpenseForm
from expenses.models import Expense, Balance
from django.core import serializers
from django.db.models.query import QuerySet

MAX_RETURNED_EXPENSES = 30


def _serialize(model):
    obj = {}
    field_names = model._meta.get_all_field_names()
    for i in field_names:
        item = getattr(model, i)
        if type(item) == datetime.datetime:
            obj[i] = item.isoformat('T')
        else:
            obj[i] = item
    return obj


def serialize(models):
    obj = None
    if type(models) == QuerySet:
        obj = []
        for model in models:
            obj.append(_serialize(model))
    else:
        obj = _serialize(models)

    return obj


def index(request):
    return render(request, 'index.html')


def expense(request, id=0):
    """ Get or Create/Update an expense """

    status = 200
    expense = None

    if request.method == 'PUT':
        data = json.loads(request.body)
        expense = get_object_or_404(Expense, pk=id)
        balance = Balance.objects.get(pk=1)
        balance.amount -= expense.amount

        expense.description = data['description']
        expense.amount = data['amount']
        expense.save()

        balance.amount += expense.amount
    elif request.method == 'POST':
        data = json.loads(request.body)
        expense = Expense(description=data['description'], amount=data['amount'])
        expense.save()
        try:
            balance = Balance.objects.get(pk=1)
        except Balance.DoesNotExist:
            # We're just now starting the app or something happened to the db, create the expense record.
            balance = Balance.objects.create(amount=0.0)

        balance.amount += expense.amount
        balance.save()
        status = 201
    elif request.method == 'DELETE':
        expense = get_object_or_404(Expense, pk=id)
        try:
            # Make sure to update balance depending on the transaction type.
            balance = Balance.objects.get(pk=1)
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

    return HttpResponse(content=json.dumps(serialize(expense)), status=status, mimetype='application/json')


def total(request):
    """ Display the total """

    json_obj = {'amount': 0.0}
    try:
        balance = Balance.objects.get(pk=1)
    except:
        pass
    else:
        json_obj['amount'] = balance.amount
    return HttpResponse(json.dumps(json_obj), mimetype='application/json')


def list(request):
    """ render the list page with 30 entries """

    page = int(request.GET.get('page', 1)) - 1
    offset = MAX_RETURNED_EXPENSES * int(page)
    expenses = Expense.objects.all().order_by('created_at').reverse()[offset:(offset + MAX_RETURNED_EXPENSES)]
    total = Expense.objects.count()
    remaining = total - (offset + len(expenses))
    pages = math.ceil(float(total) / float(MAX_RETURNED_EXPENSES))

    json_object = {'total': total, 'remaining': remaining, 'pages': pages, 'expenses': serialize(expenses)}
    return HttpResponse(content=json.dumps(json_object), mimetype='application/json')


def destroy(request, id):
    """ Delete an expense. Update the current Balance. """


