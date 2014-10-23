(function(ex) {
    ex.formatCurrency = function(num) {
        if (isNaN(num))
            num = "0";
        num = parseFloat(num.toString().replace(/\$|,/g, ''));
        var sign = (num === (num = Math.abs(num)));
        num = Math.floor(num * 100 + 0.50000000001);
        var cents = num % 100;
        num = Math.floor(num / 100).toString();
        if (cents < 10)
            cents = "0" + cents;
        for (var i = 0; i < Math.floor((num.length - (1 + i)) / 3); i++)
            num = num.substring(0, num.length - (4 * i + 3)) + ',' + num.substring(num.length - (4 * i + 3));
        return new Handlebars.SafeString((((sign) ? '' : '-') + '$' + num + '.' + cents));
    }
    Handlebars.registerHelper('formatCurrency', ex.formatCurrency);

    ex.amountType = function(amount) {
        return new Handlebars.SafeString(amount >= 0.0 ? 'positive' : 'negative');
    }
    Handlebars.registerHelper('amountType', ex.amountType);

    Handlebars.registerHelper('ifPagination', function(expenses, options) {
        var html = '';
        if (expenses.pages > 1 && expenses.page < expenses.pages) {
            html = options.fn(expenses);
        }
        return html;
    });

    var lastDate;
    Handlebars.registerHelper('separator', function(date, index) {
        var html = '';
        var currentDate = new Date(date).toDateString();
        if (index === 0) {
            lastDate = undefined;
        }
        if (currentDate !== lastDate) {
            html = '<li class="sep">' + currentDate + '</li>';
            lastDate = currentDate;
        }
        return new Handlebars.SafeString(html);
    });
})(window.ex = window.ex || {});
