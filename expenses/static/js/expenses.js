(function(ex, $) {


	function loadMoreClickHandler() {
		$('#loadMore a').click(function() {
			$.mobile.showPageLoadingMsg();
			$.get($(this).attr('href'), 'offset=' + $(this).attr('data-offset'), function(data) {
				var ul = $('#expenseList');
				$('#loadMore').remove();
				ul.append(data);
				ul.listview('refresh');
				$.mobile.hidePageLoadingMsg();
				/* Element gets redrawn so call ourselves again. */
				loadMoreClickHandler();
			}).error(function() {
				alert('Something bad happend... Sorry.');
				$.mobile.hidePageLoadingMsg();
			});
			return false;
		});
	}

	 /* alias away the sync method */
    Backbone._sync = Backbone.sync;

    /* define a new sync method */
    Backbone.sync = function(method, model, options) {
        /* only need a token for non-get requests */
        if (method == 'create' || method == 'update' || method == 'delete') {
            // CSRF token value is in an embedded meta tag 
            var csrfToken = $("input[name=csrfmiddlewaretoken]").val();

            options.beforeSend = function(xhr){
                xhr.setRequestHeader('X-CSRFToken', csrfToken);
            };
        }

        /* proxy the call to the old sync method */
        return Backbone._sync(method, model, options);
    };

	ex.Expense = Backbone.Model.extend({
		urlRoot: '/expenses/',
		defaults: {
			created_at: '',
			description: '',
			amount: 0.0
		}
	});

	ex.Total = Backbone.Model.extend({
		urlRoot: '/expenses/total/',
		defaults: {
			amount: 0.0
		}
	});

	ex.Expenses = Backbone.Collection.extend({
		url: function() {
			return '/expenses/list/' + '?' + $.param({page: this.page});
		},

		initialize: function() {
			this.page = 1;
		},

		fetch: function(options) {
			options || (options = {});
			this.trigger('fetching');
			var success = options.success;
			options.success = $.proxy(function(resp) {
				this.trigger('fetched');
				if (success) {
					success(this, resp);
				}
			}, this);
			Backbone.Collection.prototype.fetch.call(this, options);
		},

		parse: function(resp) {
			this.total = resp.total;
			this.remaining = resp.remaining;
			this.pages = resp.pages;
			return resp.expenses;
		},

		nextPage: function(options) {
			if (this.page+1 <= this.pages) {
				this.page = this.page + 1;
				this.fetch(options);
			}
		},

		prevPage: function(options) {
			if (this.page-1 >= 1) {
				this.page = this.page - 1;
				this.fetch(options);
			}
		}
	});

	ex.AddView = Backbone.View.extend({
		render: function(expense) {
            if (!expense) {
                expense = new ex.Expense().toJSON();
            }
			var variables = {
				expense: expense
			};
			var template = Handlebars.compile($('#add-page').html());
			this.$el.find('form').html(template(variables));
            $.event.trigger('create');
		}
	});

	ex.MainView = Backbone.View.extend({
		initialize: function() {
			this.expenses = new ex.Expenses();
			this.total = new ex.Total();

            this.listenTo(this.expenses, 'sync', this.onSyncList);
            this.listenTo(this.total, 'sync', this.onSyncTotal);

            this.expenses.fetch();
            this.total.fetch();

            $('.add-expense').click($.proxy(function() {
                var view = new ex.AddView({el: $('#update')});
                view.render();
                $.event.trigger('create');
            }, this));
		},

        onSyncTotal: function(data) {
            var variables = {
                total: data.get('amount')
            };
            this.renderTotal(variables);
        },

        renderTotal: function(data) {
            var template = Handlebars.compile($('#home-page').html());
            this.$el.find('h1').html(template(data));
        },

        onSyncList: function(data) {
            $('#load-more').remove();
            var variables = {
                'model': data,
                'expenses': data.toJSON()
            };
            this.renderList(variables);
            $(document).on('click', '#more-expenses', $.proxy(function() {
                this.expenses.nextPage();
            }, this));
        },

		renderList: function(data) {
            var self = this;
            var template = Handlebars.compile($('#list-page').html());
            this.$el.find('#expense-list').append(template(data));
            $('#expense-list').listview('refresh');
            $(document).on('click', '.update-expense', function() {
                var index = $(this).attr('data-expense-index');
                var view = new ex.AddView({el: $('#update')});
                view.render(self.expenses.models[index].toJSON());
            });
			return this;
		}
	});

	$(document).on('pagebeforeload', function(event, data) {
		if (data.url === '#list') {
			new ex.ExpenseList({el: $('#list')});
		}
	});

	$(function() {
		var home = new ex.MainView({el: $('#home')});
	});

})(window.ex = window.ex || {}, jQuery);