from odoo import fields, models

class PosOrder(models.Model):
    _inherit = 'pos.order'
    
    venezuela_payment_details = fields.One2many(
        'pos.venezuela.payment.detail', 
        'order_id', 
        'Detalles Pago Venezuela'
    )

class PosVenezuelaPaymentDetail(models.Model):
    _name = 'pos.venezuela.payment.detail'
    _description = 'Detalles de Pago Venezuela POS'
    
    order_id = fields.Many2one('pos.order', required=True)
    payment_method = fields.Selection([
        ('zelle', 'Zelle'),
        ('transfer_usd', 'Transferencia USD'), 
        ('transfer_ves', 'Transferencia VES'),
        ('mobile_payment', 'Pago Móvil'),
        ('cash_usd', 'Efectivo USD'),
    ], required=True)
    
    amount = fields.Float('Monto', required=True)
    currency_id = fields.Many2one('res.currency', 'Divisa', required=True)
    reference = fields.Char('Referencia')
    exchange_rate = fields.Float('Tasa Cambio')
    notes = fields.Text('Notas')
