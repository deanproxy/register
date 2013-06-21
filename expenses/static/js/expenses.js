(function($) {

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

	window.Expense = Backbone.Model.extend({
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

	window.Expenses = Backbone.Collection.extend({
		url: '/expenses/list/',
		model: Expense
	});

})(jQuery);