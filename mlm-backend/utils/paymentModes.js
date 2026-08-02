const PAYMENT_MODES = ['cash', 'upi', 'net_banking', 'bank_transfer', 'cheque', 'card'];
const ONLINE_MODES = ['upi', 'net_banking', 'bank_transfer', 'card']; // count as BV; cash/cheque count as PV

function isOnlineMode(mode) {
  return ONLINE_MODES.includes(mode);
}

module.exports = { PAYMENT_MODES, ONLINE_MODES, isOnlineMode };