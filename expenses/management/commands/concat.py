import os, glob
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from subprocess import call
from django.core.management import call_command

class Command(BaseCommand):
    help = 'Concats all JS and CSS files.'

    def handle(self, *args, **options):
        call_command('handlebars')
        call_command('collectstatic')


        js_path =  "/static/js/"
        css_path = "/static/css/"

        js_files = (
            'zepto.min.js',
            'zepto.cookie.min.js',
            'underscore-min.js',
            'backbone-min.js',
            'jqt.min.js',
            'handlebars.runtime-v2.0.0.js',
            'handlebars-helpers.js',
            'application.js',
            'expenses.js',
            'hbtemplates.js',
        )
        css_files = (
            'budget.css',
            'themes/css/jqtouch.css',
        )

        with open(settings.SITE_ROOT + '/static/global.js', 'w') as outfile:
            for js in js_files:
                with open(settings.SITE_ROOT + js_path + js) as infile:
                    outfile.write(infile.read())

        with open(settings.SITE_ROOT + '/static/global.css', 'w') as outfile:
            for css in css_files:
                with open(settings.SITE_ROOT + css_path + css) as infile:
                    outfile.write(infile.read())

