(function(ex, $) {

	ex.amountType = function(amount) {
		return amount >= 0.0 ? 'positive' : 'negative';
	}

	var lastDate = '';
	ex.dateDivider = function(date) {
		var date = new Date(Date.parse(date));
		var datestr = date.getMonth() + '/' + date.getDay() + '/' + (date.getYear()+1900);
		var html = '';
		if (lastDate !== datestr) {
			html = '<li data-role="list-divider">' + datestr + '</li>';
			lastDate = datestr;
		}
		return html;
	}


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
		},
		initialize: function() {
			if (!this.get('created_at')) {
				this.set({'created_at': new Date()});
			}
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
			var self = this;
			var success = options.success;
			options.success = function(resp) {
				self.trigger('fetched');
				if (success) {
					success(self, resp);
				}
			};
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
		expense: undefined,

		render: function() {
			var variables = {
				expense: this.expense
			};
			var template = _.template($('#add-page').html(), variables);
			this.$el.find('form').html(template);
		}
	});

	ex.MainView = Backbone.View.extend({
		initialize: function() {
			this.expenses = new ex.Expenses();
			this.total = new ex.Total();
			this.render();
		},

		moreExpenses: function() {
			var self = this;
			this.expenses.nextPage({
				success: function() {
					$('#load-more').remove();
					var variables = {
						'expenses': self.expenses
					}
					var template = _.template($('#list-page').html(), variables);
					self.$el.find('#expense-list').append(template);
					$('#expense-list').listview('refresh');
					$(document).on('click', '#more-expenses', function() {
						self.moreExpenses();
					});
				}
			});
		},

		render: function() {
			var self = this;
			this.expenses.fetch({
				success: function() {
					var variables = {
						'expenses': self.expenses
					};
					var template = _.template($('#list-page').html(), variables);
					self.$el.find('#expense-list').html(template);
					$('#expense-list').listview('refresh');
					$(document).on('click', '.update-expense', function() {
						var index = $(this).attr('data-expense-index');
						var view = new ex.AddView({el: $('#update')});
						view.expense = self.expenses.models[index];
						view.render();
					});
				}
			});
			this.total.fetch({
				success: function() {
					var variables = {
						total: self.total.get('amount'),
					};
					var template = _.template($('#home-page').html(), variables);
					self.$el.find('h1').html(template);
					$.event.trigger('create');
				}
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
		$(document).on('click', '#more-expenses', function() {
			home.moreExpenses();
		});
	});

})(window.ex = window.ex || {}, jQuery);