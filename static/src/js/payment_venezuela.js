// static/src/js/payment_venezuela.js - VERSIÓN CORREGIDA
/** @odoo-module **/

import { PaymentScreen } from '@point_of_sale/js/Screens/PaymentScreen/PaymentScreen';
import { patch } from '@web/core/utils/patch';
import { AbstractAwaitablePopup } from "@point_of_sale/js/Popups/AbstractAwaitablePopup";
import { useState } from "@odoo/owl";
import { registry } from "@web/core/registry";

patch(PaymentScreen.prototype, 'pos_payment_venezuela', {
    // Interceptar el click del método de pago
    clickPaymentMethod(paymentMethod) {
        if (paymentMethod.is_venezuela) {
            this._addVenezuelaPayment(paymentMethod);
            return;
        }
        return super.clickPaymentMethod?.(paymentMethod);
    },

    async _addVenezuelaPayment(paymentMethod) {
        const order = this.currentOrder;
        const dueAmount = order.get_due();
        
        if (dueAmount <= 0) {
            return;
        }
        
        const { confirmed, payload } = await this.showPopup('VenezuelaPaymentPopup', {
            title: `Pago ${paymentMethod.name}`,
            paymentMethod: paymentMethod,
            dueAmount: dueAmount,
            orderCurrency: order.currency,
        });

        if (confirmed) {
            // Crear línea de pago manualmente
            const paymentLine = order.add_paymentline(paymentMethod);
            
            // Configurar monto según tipo
            if (paymentMethod.venezuela_type === 'cash_usd') {
                this._handleCashPayment(paymentLine, payload, dueAmount);
            } else {
                paymentLine.set_amount(payload.amount || dueAmount);
            }
            
            // Marcar como exitoso inmediatamente
            paymentLine.set_payment_status('done');
            
            // Guardar detalles
            paymentLine.venezuela_details = {
                reference: payload.reference,
                notes: payload.notes,
                exchange_rate: payload.exchange_rate,
                currency_code: payload.currency_code,
                amount_given: payload.amount_given,
                change_amount: payload.change_amount,
            };
            
            this.render();
        }
    },

    _handleCashPayment(paymentLine, payload, dueAmount) {
        const amountGiven = payload.amount_given || 0;
        const exchangeRate = payload.exchange_rate || 1;
        
        // Convertir a moneda de la orden
        const amountInOrderCurrency = amountGiven * exchangeRate;
        
        // El pago cubre lo debido
        const paymentAmount = Math.min(amountInOrderCurrency, dueAmount);
        paymentLine.set_amount(paymentAmount);
        
        // Calcular cambio
        const changeAmount = Math.max(0, amountInOrderCurrency - dueAmount);
        paymentLine.change_amount = changeAmount;
        paymentLine.amount_given = amountGiven;
    },
});

// Popup para detalles de pago
export class VenezuelaPaymentPopup extends AbstractAwaitablePopup {
    static template = 'pos_payment_venezuela.VenezuelaPaymentPopup';

    setup() {
        super.setup();
        const isCash = this.props.paymentMethod.venezuela_type === 'cash_usd';
        
        this.state = useState({
            amount: isCash ? '' : this.props.dueAmount,
            amount_given: isCash ? '' : null,
            change_amount: 0,
            reference: '',
            notes: '',
            exchange_rate: this._getDefaultExchangeRate(),
            currency_code: this._getCurrencyCode(),
            show_change: isCash,
        });
    }

    _getDefaultExchangeRate() {
        const method = this.props.paymentMethod;
        if (method.venezuela_type === 'cash_usd') {
            // Usar tasa predeterminada o del sistema
            return this.env.pos.company?.usd_to_ves_rate || 36.5;
        }
        return 1;
    }

    _getCurrencyCode() {
        const method = this.props.paymentMethod;
        if (method.venezuela_type === 'cash_usd') return 'USD';
        if (method.venezuela_type === 'transfer_ves') return 'VES';
        return this.props.orderCurrency?.name || 'VES';
    }

    onAmountGivenChange() {
        if (this.state.show_change) {
            const given = parseFloat(this.state.amount_given) || 0;
            const rate = this.state.exchange_rate;
            const convertedAmount = given * rate;
            const due = this.props.dueAmount;
            
            this.state.change_amount = Math.max(0, convertedAmount - due);
            this.state.amount = Math.min(convertedAmount, due);
        }
    }

    onExchangeRateChange() {
        if (this.state.show_change) {
            this.onAmountGivenChange();
        }
    }

    confirm() {
        // Validar campos requeridos
        if (this.state.show_change && !this.state.amount_given) {
            alert('Ingrese el monto en efectivo recibido');
            return;
        }
        
        if (!this.state.show_change && !this.state.amount) {
            alert('Ingrese el monto del pago');
            return;
        }

        const payload = {
            amount: parseFloat(this.state.amount) || 0,
            amount_given: parseFloat(this.state.amount_given) || null,
            change_amount: this.state.change_amount,
            reference: this.state.reference,
            notes: this.state.notes,
            exchange_rate: this.state.exchange_rate,
            currency_code: this.state.currency_code,
        };

        this.props.resolve({ confirmed: true, payload });
    }
}

registry.category("pos_popups").add("VenezuelaPaymentPopup", VenezuelaPaymentPopup);