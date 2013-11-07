window.ex.lastDate = '';
Handlebars.registerHelper('dateDivider', function(datestr) {
    var date = new Date(Date.parse(datestr));
    var formatted = date.getMonth() + '/' + date.getDay() + '/' + date.getFullYear();
    var html='';

    if (window.ex.lastDate !== formatted) {
        html = '<li data-role="list-divider">' + Handlebars.Utils.escapeExpression(formatted) + '</li>';
        window.ex.lastDate = formatted;
    }
    return new Handlebars.SafeString(html);
});

Handlebars.registerHelper('formatCurrency', function(num) {
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
});

Handlebars.registerHelper('amountType', function(amount) {
    return new Handlebars.SafeString(amount >= 0.0 ? 'positive' : 'negative');
});

Handlebars.registerHelper('ifPagination', function(expenses, options) {
    var html = '';
    if (expenses.pages > 1 && expenses.page < expenses.pages) {
        html = options.fn(expenses);
    }
    return html;
});

