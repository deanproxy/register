(function(ex) {
    var jQT;

    /* alias away the sync method */
    Backbone._sync = Backbone.sync;

    /* define a new sync method */
    Backbone.sync = function(method, model, options) {
        /* only need a token for non-get requests */
        if (method === 'create' || method === 'update' || method === 'delete') {
            options.beforeSend = function(xhr){
                xhr.setRequestHeader('X-CSRFToken', $.fn.cookie('csrftoken'));
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

    var Logout = Backbone.Model.extend({
        urlRoot: '/logout/'
    });

    ex.Signup = Backbone.Model.extend({
        urlRoot: '/signup/',
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
            this.$el = $('#login-page');
            this.login = new ex.Login();
            $('#login-error').hide();

            this.listenTo(this.login, 'sync', this.onsync);
            this.listenTo(this.login, 'error', this.onerror);

            this.render();
        },

        render: function() {
            jQT.goTo('#login-page', 'flipright');
            $(document).on('tap', '#login-btn', $.proxy(function(evt) {
                this.login.save({
                    username: $('#username').val(),
                    password: $('#password').val()
                });
            }, this));

            $(document).on('click', '#login-signup-btn', $.proxy(function(evt) {
                new SignupView()
                this.destroy();
            }, this));

            this.$el.find('input').val('');
        },

        onsync: function(data) {
            // $.mobile.loading('hide');
            new MainView();
            jQT.goTo('#list-page', 'flipright');
            this.destroy();
        },

        onerror: function(model, xhr, options) {
            // $.mobile.loading('hide');
            $('#login-error').show().html('Incorrect username or password.');
        },

        destroy: function() {
            $(document).off('tap', '#login-btn');
            $(document).off('click', '#login-signup-btn');
        }
    });

    var SignupView = Backbone.View.extend({
        initialize: function() {
            this.$el = $('#signup-page');
            this.signup = new ex.Signup();
            this.login = null;
            $('#signup-error').hide();

            this.listenTo(this.signup, 'sync', this.onsync);
            this.listenTo(this.signup, 'error', this.onerror);

            this.render();
        },

        render: function() {
            $(document).on('tap', '#signup-submit-btn', $.proxy(function(evt) {
                var password=$('#signup-password').val(),
                    password2=$('#signup-password2').val();

                this.signup.save({
                    username: $('#signup-username').val(),
                    password: password,
                    password2: password2
                });
            }, this));

            $(document).on('click', '#signup-login-btn', $.proxy(function(evt) {
                new LoginView();
                this.destroy();
            }, this));

            this.$el.find('input').val('');
        },

        onsync: function(data) {
            new MainView();
            jQT.goTo('#list-page', 'flipright');
        },

        onerror: function(model, xhr, options) {
            var error;
            try {
                error = JSON.parse(xhr.response);
            } catch(e) {
                error = {errors:{'error':"An unexpected error occured"}};
            }
            this.$el.find('#signup-error').show().html(Handlebars.templates.error(error));
        },

        destroy: function() {
            $(document).off('tap', '#signup-submit-btn');
            $(document).off('click', '#signup-login-btn');
        }
    });

    /**
     * Handles adding and updating an expense.
     */
	var AddView = Backbone.View.extend({
        initialize: function(options) {
            this.$el = $('#add-page');
            this.$el.find("#error-msg").hide();
            this.expense = options.expense;

            $(document).on('click', '#save-btn', $.proxy(function(evt) {
                var amount = $('#amount').val();
                if ($('#deposit').is(':checked') === false) {
                    amount = -amount;
                }
                // $.mobile.loading('show', {
                //     text: 'Saving expense...',
                //     textVisible: true,
                //     theme: 'a'
                // });
                this.expense.save({
                    description: $('#desc').val(),
                    amount: amount ? parseFloat(amount) : ''
                });
            }, this));

            $(document).on('tap', '#delete-btn', $.proxy(function() {
                // $.mobile.loading('show', {
                //     text: 'Deleting expense...',
                //     textVisible: true,
                //     theme: 'a'
                // });
                this.expense.destroy();
            }, this));

            this.render();
        },

		render: function() {
			var variables = {
				expense: this.expense.toJSON()
			};

            /* We don't want to display the - sign when editing. */
            if (variables.expense.amount < 0) {
                variables.expense.amount -= variables.expense.amount * 2;
                variables.expense.deposit = false;
            } else if (variables.expense.amount) {
                variables.expense.deposit = true;
            }

			this.$el.find('#update-expense').empty().html(Handlebars.templates.edit(variables));
            jQT.goTo('#add-page', 'slideup');
		},

        destroy: function() {
            $(document).off('tap', '#save-btn');
            $(document).off('tap', '#delete-btn');
            this.remove();
        }
	});

    /**
     * The main view, which displays a list of expenses.
     */
	var MainView = Backbone.View.extend({
		initialize: function() {
            this.$el = $('#list-page');
			this.expenses = new ex.Expenses();
			this.total = new ex.Total();

            this.listenTo(this.expenses, 'sync', this.onsync);
            this.listenTo(this.expenses, 'destroy', this.ondestroy);
            this.listenTo(this.expenses, 'error', this.onerror);
            this.listenTo(this.total, 'sync', this.onSyncTotal);

            $(document).on('tap', '#add-button', $.proxy(function() {
                this.index = 0;
                this.expenses.add(new ex.Expense(), {at:0});
                new AddView({
                    expense: this.expenses.models[0]
                });
            }, this));

            $(document).on('click', '#logout-btn', $.proxy(function(evt) {
                new Logout().save();
                new LoginView();
                this.destroy();
            }, this));

            $('#expense-list').empty();
            this.expenses.fetch({
                success: $.proxy(function() {
                    this.total.fetch({
                        success: function() {
                            //  $("#expense-list").listview({
                            //     autodividers: true,
                            //     autodividersSelector: function (li) {
                            //         var date = new Date(Date.parse(li.attr("data-date")));
                            //         return date.getMonth() + '/' + date.getDate() + '/' + date.getFullYear();
                            //     }
                            // }).listview("refresh");
                        }
                    });
                }, this)
            });
		},

        onSyncTotal: function(data) {
            var variables = {
                total: data.get('amount')
            };
            this.renderTotal(variables);
        },

        renderTotal: function(data) {
            $('#header').html(Handlebars.templates.total(data));
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
                    // $.mobile.loading('show', {
                    //     text: 'Loading more',
                    //     textVisible: true,
                    //     theme: 'a'
                    // });
                    this.expenses.nextPage();
                }, this));
            } else if (data instanceof ex.Expense) {
                this.expenses.fetch();
                this.total.fetch();
            }
            jQT.goTo('#list-page');
        },

		renderList: function(data) {
            var self = this;
            $('#expense-list').append(Handlebars.templates.list(data));

            $('#expense-list').on('tap', '.update-expense', function() {
                self.index = $(this).attr('data-expense-index');
                new AddView({
                    expense: self.expenses.models[self.index]
                });
            });
			return this;
		},

        ondestroy: function(model, collection, options) {
            $('#expense-list').empty();
            this.expenses.fetch();
            this.total.fetch();
            jQT.goTo('#list-page');
        },

        onerror: function(model, xhr, options) {
            if (xhr.status === 401) {
                new LoginView();
            } else {
                // $.mobile.loading('hide');
                var error;
                try {
                    error = JSON.parse(xhr.response);
                } catch(e) {
                    error = {errors:{'error':"An unexpected error occured"}};
                }
                $('#error-msg').show().html(Handlebars.templates.error(error));
            }
        },

        changePage: function() {
            this.total.fetch();
            this.expenses.fetch({
                success: function() {
                    // $.mobile.changePage('#home');
                }
            });
        },

        destroy: function() {
            $(document).off('tap', '#add-button');
            $(document).off('click', "#logout-btn");
        }
	});

	$(function() {
        ex.homeView = new MainView();
        ex.jqt = jQT = new $.jQT({
            icon: 'jqtouch.png',
            statusBar: 'black-translucent',
            preloadImages: []
        });
	});

})(window.ex = window.ex || {});
