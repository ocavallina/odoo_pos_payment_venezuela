/** @odoo-module **/

import { PaymentScreen } from '@point_of_sale/js/Screens/PaymentScreen/PaymentScreen';
import { patch } from '@web/core/utils/patch';
import { useService } from "@web/core/utils/hooks";

patch(PaymentScreen.prototype, 'pos_payment_venezuela', {
    async addNewPaymentLine({ detail: paymentMethod }) {
        if (paymentMethod.is_venezuela) {
            return this._addVenezuelaPayment(paymentMethod);
        }
        return this._super(...arguments);
    },

    async _addVenezuelaPayment(paymentMethod) {
        const { confirmed, payload } = await this.showPopup('VenezuelaPaymentPopup', {
            title: `Pago ${paymentMethod.name}`,
            paymentMethod: paymentMethod,
        });

        if (confirmed) {
            const order = this.currentOrder;
            const paymentLine = order.add_paymentline(paymentMethod);
            paymentLine.set_amount(payload.amount);
            paymentLine.venezuela_details = {
                reference: payload.reference,
                notes: payload.notes,
                exchange_rate: payload.exchange_rate,
            };
            this.render();
        }
    },
});

// Popup para capturar detalles del pago
import { AbstractAwaitablePopup } from "@point_of_sale/js/Popups/AbstractAwaitablePopup";
import { useState } from "@odoo/owl";

export class VenezuelaPaymentPopup extends AbstractAwaitablePopup {
    static template = 'pos_payment_venezuela.VenezuelaPaymentPopup';

    setup() {
        super.setup();
        this.state = useState({
            amount: this.props.paymentMethod.venezuela_type === 'cash_usd' ? '' : this.env.pos.get_order().get_due(),
            reference: '',
            notes: '',
            exchange_rate: 1,
        });
    }

    confirm() {
        this.props.resolve({ confirmed: true, payload: this.state });
    }
}

import { registry } from "@web/core/registry";
registry.category("pos_popups").add("VenezuelaPaymentPopup", VenezuelaPaymentPopup);
