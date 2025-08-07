{
    'name': 'POS Payment Venezuela',
    'version': '1.0.0',
    'category': 'Point of Sale',
    'summary': 'Métodos de pago Venezuela para POS',
    'depends': ['point_of_sale'],
    'data': [
        'security/ir.model.access.csv',
        'data/payment_method_data.xml',
        'views/pos_payment_method_views.xml',
    ],
    'assets': {
        'point_of_sale.assets': [
            'pos_payment_venezuela/static/src/js/payment_venezuela.js',
            'pos_payment_venezuela/static/src/xml/payment_venezuela.xml',
            'pos_payment_venezuela/static/src/css/payment_venezuela.css',
        ],
    },
    'installable': True,
}
