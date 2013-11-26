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

    ex.Login = Backbone.Model.extend({
        urlRoot: '/login/',
        defaults: {
            username: '',
            password: ''
        }
    });

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

    var LoginView = Backbone.View.extend({
        initialize: function() {
            this.$el = $('#login');
            this.login = new ex.Login();

            this.listenTo(this.login, 'sync', this.onsync);
            this.listenTo(this.login, 'error', this.onerror);

            this.render();
        },

        render: function() {
            $('#login-btn').click(function(evt) {
                this.login.set({
                    username: $('#username').val(),
                    password: $('#password').val()
                });
                $.mobile.loading('show', {
                    text: 'Logging in...',
                    textVisible: true,
                    theme: 'a'
                })
                this.login.fetch();
                evt.preventDefault();
            });
        },

        onsync: function(data) {
            $.mobile.loading('hide');
            ex.homeView.changePage();
        },

        onerror: function(model, xhr, options) {
            $('#login-error').show().html('Incorrect username or password');
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
            $.event.trigger('create');
            $('#update-list').listview('refresh');
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

            this.listenTo(this.expenses, 'sync', this.onsync);
            this.listenTo(this.expenses, 'destroy', this.ondestroy);
            this.listenTo(this.expenses, 'error', this.onerror);
            this.listenTo(this.total, 'sync', this.onSyncTotal);

            $('.add-expense').click($.proxy(function() {
                this.index = 0;
                this.expenses.add(new ex.Expense(), {at:this.index});
                if (!ex.addView) {
                    ex.addView = new AddView();
                }
                ex.addView.options.expense = this.expenses.models[0];
                ex.addView.render();
            }, this));

            /* Pull-to-refresh w/ scrollz will start the initialization process. */
            $('#content').on('pulled', $.proxy(function() {
                $('#expense-list').empty();
                this.expenses.fetch({
                    success: $.proxy(function() {
                        this.total.fetch({
                            success: function() {
                                 $("#expense-list").listview({
                                    autodividers: true,
                                    autodividersSelector: function (li) {
                                        var date = new Date(Date.parse(li.attr("data-date")));
                                        return date.getMonth() + '/' + date.getDate() + '/' + date.getFullYear();
                                    }
                                }).listview("refresh");
                                $('#content').scrollz('hidePullHeader');
                            }
                        });
                    }, this)
                });
            }, this)).trigger('pulled');
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

        onsync: function(data, resp, options) {
            if (data instanceof ex.Expenses) {
                /* Clear everything if we're on page 1. */
                if (data.page === 1) {
                    $('#expense-list').empty();
                } else {
                    $('#load-more').remove();
                }
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
                    $('#expense-list').listview('refresh');
                }, this));

                /* hide any loading messages and see if we can change to the list page if not already there. */
                $.mobile.loading('hide');
                if ($.mobile.activePage.attr('id') !== 'home') {
                    window.history.go(-1);
                }
            } else if (data instanceof ex.Expense) {
                this.expenses.fetch();
                this.total.fetch();
                $(document).off('click', '#save-btn');
            }
        },

		renderList: function(data) {
            var self = this;
            var template = Handlebars.compile($('#list-page').html());
            this.$el.find('#expense-list').append(template(data));
            $('#expense-list').listview('refresh');
            $(document).on('click', '.update-expense', function() {
                self.index = $(this).attr('data-expense-index');
                if (!ex.addView) {
                    ex.addView = new AddView();
                }
                ex.addView.options.expense =  self.expenses.models[self.index];
                ex.addView.render();
            });
			return this;
		},

        ondestroy: function(model, collection, options) {
            $('#expense-list').empty();
            this.expenses.fetch();
            this.total.fetch();
            window.history.go(-1);
        },

        onerror: function(model, xhr, options) {
            if (xhr.status === 401) {
                $.mobile.changePage('#login');
            } else {
                $.mobile.loading('hide');
                alert('An error occurred.');
            }
        },

        changePage: function() {
            this.total.fetch();
            this.expenses.fetch({
                success: function() {
                    $.mobile.changePage('#home');
                }
            });
        }
	});

	$(function() {
        ex.homeView = new ex.MainView({el: $('#home')});
	});

})(window.ex = window.ex || {}, jQuery);