(function(ex, $) {

	ex.amountType = function(amount) {
		return amount >= 0.0 ? 'positive' : 'negative';
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

	// $('#expenses').live('pageshow', function() {
	// 	loadMoreClickHandler();
	// });

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
		url: '/expenses/list/',
		model: ex.Expense
	});

	ex.MainView = Backbone.View.extend({
		initialize: function() {
			this.total = new ex.Total();
			this.total.fetch();
			this.render();
		},

		render: function() {
			var variables = {
				total: this.total.get('amount')
			};
			var template = _.template($('#home-page').html(), variables);
			this.$el.find('ul:first').html(template);
			return this;
		}
	});

	ex.ExpenseList = Backbone.View.extend({
		initialize: function() {
			this.expenses = new ex.Expenses();
			this.expenses.fetch();
			this.render();
		},

		render: function() {
			var variables = {
				expenses: this.expenses.models
			};
			var template = _.template($('#list-page').html(), variables);
			this.$el.find('ul').html(template);
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