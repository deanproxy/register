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
	ex.AddView = Backbone.View.extend({
        initialize: function() {
            if (!this.options.index) {
                this.options.index = 0;
            } else {
                this.expense = this.options.expenses.models[this.options.index];
                this.listenTo(this.expense, 'destroy', this.ondestroy);
                this.listenTo(this.expense, 'sync', this.onsync);
                this.listenTo(this.expense, 'error', this.onerror);
            }
        },

		render: function() {
            if (!this.expense) {
                this.expense = new ex.Expense().toJSON();
            }
			var variables = {
				expense: this.expense.toJSON()
			};

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
                this.expense.save({
                    description: $('#desc').val(),
                    amount: parseFloat(amount)
                });
            }, this));
            $(document).on('click', '#delete-btn', $.proxy(function() {
                $.mobile.loading('show', {
                    text: 'Deleting expense...',
                    theme: 'a'
                });
                this.expense.destroy();
            }, this));
		},

        onsync: function(model, resp, options) {
            $.mobile.loading('hide');
            new ex.MainView({el: $('#home')});
            $.mobile.changePage('#home');
        },

        ondestroy: function(model, collection, options) {
            $.mobile.loading('hide');
            new ex.MainView({el: $('#home')});
            $.mobile.changePage('#home');
        },

        onerror: function(model, xhr, options) {
            $.mobile.loading('hide');
            alert('An error occurred.');
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
            this.listenTo(this.total, 'sync', this.onSyncTotal);

            this.expenses.fetch();
            this.total.fetch();

            $('.add-expense').click($.proxy(function() {
                ex.addView = new ex.AddView({
                    el: $('#update')
                });
                ex.addView.render();
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
                ex.addView = new ex.AddView({
                    el: $('#update'),
                    expenses: self.expenses,
                    index: index
                });
                ex.addView.render();
            });
			return this;
		},

        destroy: function() {
            this.$el.find('#expense-list').html('');
            this.remove();
        }
	});

    $(document).on('pagechange', function(event, data) {
        $.event.trigger('create');
        $('ul[data-role=listview]').listview('refresh');

        /* Clean up after page change. */
        if (data.url === '#home' && ex.addView) {
            ex.addView.destroy();
        } else if (data.url === '#update' && ex.homeView) {
            ex.homeView.destroy();
        }
    });

	$(function() {
		ex.homeView = new ex.MainView({el: $('#home')});
	});

})(window.ex = window.ex || {}, jQuery);