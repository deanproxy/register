(function(ex, $) {
	 /* alias away the sync method */
    Backbone._sync = Backbone.sync;

    /* define a new sync method */
    Backbone.sync = function(method, model, options) {
        /* only need a token for non-get requests */
        if (method === 'create' || method === 'update' || method === 'delete') {
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
			description: ''
		}
	});

	ex.Total = Backbone.Model.extend({
		urlRoot: '/expenses/total/',
		defaults: {
			amount: 0.0
		}
	});

	ex.Expenses = Backbone.Collection.extend({
        model: ex.Expense,

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

    /**
     * Handles adding and updating an expense.
     * @type {Object|*|void|e.extend|extend|S.extend}
     */
	var AddView = Backbone.View.extend({
        initialize: function() {
            this.$el = $('#update');
        },

		render: function() {
			var variables = {
				expense: this.options.expense.toJSON()
			};

            /* We don't want to display the - sign when editing. */
            if (variables.expense.amount < 0) {
                variables.expense.amount -= variables.expense.amount * 2;
                variables.expense.deposit = false;
            } else if (variables.expense.amount) {
                variables.expense.deposit = true;
            }
			var template = Handlebars.compile($('#add-page').html());
			this.$el.find('form').html(template(variables));

            $(document).on('click', '#save-btn', $.proxy(function() {
                var amount = $('#amount').val();
                if ($('#deposit').val() === 'off') {
                    amount = -amount;
                }
                $.mobile.loading('show', {
                    text: 'Saving expense...',
                    textVisible: true,
                    theme: 'a'
                });
                this.options.expense.save({
                    description: $('#desc').val(),
                    amount: parseFloat(amount)
                });
            }, this));
            $(document).on('click', '#delete-btn', $.proxy(function() {
                $.mobile.loading('show', {
                    text: 'Deleting expense...',
                    textVisible: true,
                    theme: 'a'
                });
                this.options.expense.destroy();
            }, this));
		},

        destroy: function() {
            this.$el.find('form').html('');
            this.remove();
        }
	});

    /**
     * The main view, which displays a list of expenses.
     * @type {Object|*|void|e.extend|extend|S.extend}
     */
	ex.MainView = Backbone.View.extend({
		initialize: function() {
			this.expenses = new ex.Expenses();
			this.total = new ex.Total();

            this.listenTo(this.expenses, 'sync', this.onSyncList);
            this.listenTo(this.expenses, 'destroy', this.ondestroy);
            this.listenTo(this.expenses, 'error', this.onerror);
            this.listenTo(this.total, 'sync', this.onSyncTotal);

            this.expenses.fetch();
            this.total.fetch();

            $('.add-expense').click($.proxy(function() {
                this.index = 0;
                this.expenses.add(new ex.Expense(), {at:this.index});
                var addView = new AddView({
                    expense: this.expenses.models[0]
                });
                addView.render();
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
            if (data instanceof ex.Expenses) {
                $('#load-more').remove();
                var variables = {
                    'model': data,
                    'expenses': data.toJSON()
                };
                this.renderList(variables);
                $(document).on('click', '#more-expenses', $.proxy(function() {
                    $.mobile.loading('show', {
                        text: 'Loading more',
                        textVisible: true,
                        theme: 'a'
                    });
                    this.expenses.nextPage();
                }, this));

                /* hide any loading messages and see if we can change to the list page if not already there. */
                $.mobile.loading('hide');
                $.mobile.changePage('#home');
            } else if (data instanceof ex.Expense) {
                /* If we've just updated a model, we want to refresh the list page. */
                $('#expense-list li').remove();
                this.expenses.fetch();
                this.total.fetch();
            }
        },

		renderList: function(data) {
            var self = this;
            var template = Handlebars.compile($('#list-page').html());
            this.$el.find('#expense-list').append(template(data));
            $('#expense-list').listview('refresh');
            $(document).on('click', '.update-expense', function() {
                self.index = $(this).attr('data-expense-index');
                var addView = new AddView({
                    expense: self.expenses.models[self.index]
                });
                addView.render();
            });
			return this;
		},

        ondestroy: function(model, collection, options) {
            $('#expense-list li').remove();
            this.expenses.fetch();
            this.total.fetch();
        },

        onerror: function(model, xhr, options) {
            $.mobile.loading('hide');
            alert('An error occurred.');
        }
	});

    $(document).on('pagechange', function(event, data) {
        $.event.trigger('create');
        $('ul[data-role=listview]').listview('refresh');
    });

	$(function() {
		var homeView = new ex.MainView({el: $('#home')});
	});

})(window.ex = window.ex || {}, jQuery);