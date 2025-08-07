from odoo import fields, models

class PosPaymentMethod(models.Model):
    _inherit = 'pos.payment.method'
    
    is_venezuela = fields.Boolean('Es Método Venezuela')
    venezuela_type = fields.Selection([
        ('zelle', 'Zelle'),
        ('transfer_usd', 'Transferencia USD'),
        ('transfer_ves', 'Transferencia VES'),
        ('mobile_payment', 'Pago Móvil'),
        ('cash_usd', 'Efectivo USD'),
    ], string='Tipo Venezuela')
    
    venezuela_account = fields.Char('Cuenta/Email')
    venezuela_bank = fields.Char('Banco')
    venezuela_phone = fields.Char('Teléfono')
