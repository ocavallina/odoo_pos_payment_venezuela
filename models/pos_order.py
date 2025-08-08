# models/pos_order.py - ACTUALIZADO
from odoo import fields, models, api

class PosOrder(models.Model):
    _inherit = 'pos.order'
    
    venezuela_payment_details = fields.One2many(
        'pos.venezuela.payment.detail', 
        'order_id', 
        'Detalles Pago Venezuela'
    )

    def _process_payment_lines(self, pos_order, order, pos_session, draft):
        """Override para capturar detalles de pagos Venezuela"""
        payment_lines = super()._process_payment_lines(pos_order, order, pos_session, draft)
        
        # Procesar detalles Venezuela
        for payment in pos_order.get('statement_ids', []):
            payment_data = payment[2]
            payment_line = self.env['pos.payment'].browse(payment_data.get('payment_line_id'))
            
            if hasattr(payment_line, 'venezuela_details') and payment_line.venezuela_details:
                self._create_venezuela_payment_detail(payment_line, payment_data)
        
        return payment_lines

    def _create_venezuela_payment_detail(self, payment_line, payment_data):
        """Crear registro de detalle para pago Venezuela"""
        venezuela_details = payment_data.get('venezuela_details', {})
        
        self.env['pos.venezuela.payment.detail'].create({
            'order_id': self.id,
            'payment_method': payment_line.payment_method_id.venezuela_type,
            'amount': payment_line.amount,
            'currency_id': self.currency_id.id,
            'reference': venezuela_details.get('reference'),
            'exchange_rate': venezuela_details.get('exchange_rate', 1.0),
            'amount_given': venezuela_details.get('amount_given'),
            'change_amount': venezuela_details.get('change_amount', 0),
            'currency_code': venezuela_details.get('currency_code'),
            'notes': venezuela_details.get('notes'),
        })


class PosVenezuelaPaymentDetail(models.Model):
    _name = 'pos.venezuela.payment.detail'
    _description = 'Detalles de Pago Venezuela POS'
    
    order_id = fields.Many2one('pos.order', required=True, ondelete='cascade')
    payment_method = fields.Selection([
        ('zelle', 'Zelle'),
        ('transfer_usd', 'Transferencia USD'), 
        ('transfer_ves', 'Transferencia VES'),
        ('mobile_payment', 'Pago Móvil'),
        ('cash_usd', 'Efectivo USD'),
    ], required=True)
    
    amount = fields.Float('Monto Pagado', required=True)
    currency_id = fields.Many2one('res.currency', 'Divisa', required=True)
    reference = fields.Char('Referencia')
    exchange_rate = fields.Float('Tasa Cambio', default=1.0)
    
    # CAMPOS ESPECÍFICOS PARA EFECTIVO
    amount_given = fields.Float('Efectivo Recibido')
    change_amount = fields.Float('Cambio')
    currency_code = fields.Char('Código Divisa')
    
    notes = fields.Text('Notas')

    @api.depends('amount_given', 'exchange_rate', 'amount')
    def _compute_change_display(self):
        """Calcula información de cambio para mostrar"""
        for record in self:
            if record.payment_method == 'cash_usd' and record.amount_given:
                converted = record.amount_given * record.exchange_rate
                record.change_amount = max(0, converted - record.amount)
            else:
                record.change_amount = 0

    def get_payment_summary(self):
        """Devuelve resumen del pago para reportes"""
        summary = {
            'method': dict(self._fields['payment_method'].selection)[self.payment_method],
            'amount': self.amount,
            'currency': self.currency_id.name,
        }
        
        if self.payment_method == 'cash_usd':
            summary.update({
                'amount_given': self.amount_given,
                'change': self.change_amount,
                'exchange_rate': self.exchange_rate,
                'currency_given': self.currency_code,
            })
        elif self.reference:
            summary['reference'] = self.reference
            
        return summary


class PosSession(models.Model):
    _inherit = 'pos.session'
    
    def _get_pos_ui_res_currency(self, params):
        """Incluir tasas de cambio actuales para POS"""
        result = super()._get_pos_ui_res_currency(params)
        
        # Agregar tasas USD/VES para cálculos de efectivo
        usd = self.env['res.currency'].search([('name', '=', 'USD')], limit=1)
        ves = self.env['res.currency'].search([('name', '=', 'VES')], limit=1)
        
        if usd and ves:
            rate = usd._convert(1, ves, self.env.company, fields.Date.today())
            self.env.context = dict(self.env.context, usd_to_ves_rate=rate)
            
        return result