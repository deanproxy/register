import os, glob
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from subprocess import call

HANDLEBARS_EXT = settings.HANDLEBARS_EXT if hasattr(settings, 'HANDLEBARS_EXT') else ".handlebars"
class Command(BaseCommand):
    help = 'Precompiles handlebar templates.'

    def handle(self, *args, **options):
        for f in os.listdir(settings.SITE_ROOT + "/.."):
            tmpl_path = f + "/templates/"
            js_path = f + "/static/js/"

            if os.path.isdir(f) and os.path.isdir(tmpl_path):
                if not os.path.isdir(js_path):
                    try:
                        os.makedirs(js_path)
                    except OSError as exc:
                        if exc.errno == errno.EEXIST:
                            print "Error: " + js_path + " exists."

                files = glob.glob(tmpl_path + "*" + HANDLEBARS_EXT)
                args = ['handlebars']
                args.extend(files)
                args.extend(['-f', js_path + 'hbtemplates.js'])
                call(args) 






