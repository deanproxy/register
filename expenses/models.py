from django.db import models
from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.contrib.auth.models import User


class Expense(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    description = models.CharField(max_length=100)
    amount = models.FloatField()
    user = models.ForeignKey(User, editable=False)

    def __unicode__(self):
        return "%s => $%f" % (self.description, self.amount)


class Balance(models.Model):
    amount = models.FloatField()
    user = models.ForeignKey(User, editable=False)

    def __unicode__(self):
        return "%f" % self.amount
