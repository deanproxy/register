import logging
import json
import datetime
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
	""" Get or Create an expense """

	status = 200
	expense = None
	import pdb; pdb.set_trace()
	if request.method == 'POST':
		data = json.loads(request.body)
		expense = Expense(created_at=data['created_at'], description=data['description'], amount=data['amount'])
		expense.save()
		try:
			balance = Balance.objects.get(pk=1)
		except Balance.DoesNotExist:
			# We're just now starting the app or something happened to the db, create the expense record.
			balance = Balance.objects.create(amount=0.0)

		balance.amount += expense.amount
		balance.save()
		# TODO: Need to return errors if they exist.
	else:
		try:
			expense = get_object_or_404(Expense, pk=id)
		except Expense.DoesNotExist:
			logging.error('expense does not exist: ' + id)
			status = 404

	return HttpResponse(content=json.dumps(serialize(expense)), status=status, mimetype='application/json')


def total(request):
	""" Display the total """

	json = {'amount':0.0}
	try:
		balance = Balance.objects.get(pk=1)
	except:
		pass
	else:
		json['amount'] = balance.amount
	return HttpResponse(json.dumps(json), mimetype='application/json')

def list(request):
	""" render the list page with 30 entries """

	next_offset = 0
	expenses = Expense.objects.all().order_by('created_at').reverse()[0:MAX_RETURNED_EXPENSES]
	total = Expense.objects.count()
	remaining = total - len(expenses)
	if remaining:
		next_offset = MAX_RETURNED_EXPENSES

	json_object = {'total':total, 'remaining':remaining, 'next_offset':next_offset, 'expenses': serialize(expenses))}
	return HttpResponse(content=json.dumps(json_object), mimetype='application/json')

def more(request):
	""" sends back more expenses """

	next_offset = 0
	offset = int(request.GET['offset']) or 0
	total = Expense.objects.count()

	# REMEMBER: The way the slice works on a QuerySet is [start_pos:end_pos]
	expenses = Expense.objects.all().order_by('created_at').reverse()[offset:MAX_RETURNED_EXPENSES + offset]
	remaining = total - (offset + len(expenses))
	if remaining:
		next_offset = MAX_RETURNED_EXPENSES + offset

	return render(request, '_list.html', {'expenses':expenses, 'total':total,
												   'remaining':remaining, 'next_offset':next_offset})

def update(request, id):
	status = 201
	expense = get_object_or_404(Expense, pk=id)

	old_amount = expense.amount
	form = ExpenseForm(request.POST, instance=expense)
	if form.is_valid():
		new_expense = form.save()
		try:
			balance = Balance.objects.get(pk=1)
		except Balance.DoesNotExist:
			logging.error('Missing Balance record. What happened? Panic!')
			status = 500
		else:
			balance.amount -= old_amount
			balance.amount += new_expense.amount
			balance.save()
	else:
		logging.error(form.errors)
		status = 500
	return HttpResponse(status=status)


def destroy(request, id):
	""" Delete an expense. Update the current Balance. """

	response = 201
	expense = get_object_or_404(Expense, pk=id)
	try:
		# Make sure to update balance depending on the transaction type.
		balance = Balance.objects.get(pk=1)
		balance.amount -= expense.amount
		balance.save()
		expense.delete()
	except:
		response = 500
	return HttpResponse(status=response)

