// Refund tiers — server decides the amount, never the client
//
// >= 48 hours notice  → 100%
// >= 24 hours notice  → 50%   (includes exactly 24 hours)
// <  24 hours notice  → 0%

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

function calculateRefund(amountPaid, appointmentDatetime, cancelledAt) {
  const paid = Number(amountPaid);
  const appointmentTime = new Date(appointmentDatetime).getTime();
  const cancelledTime = new Date(cancelledAt).getTime();

  if (Number.isNaN(paid) || Number.isNaN(appointmentTime) || Number.isNaN(cancelledTime)) {
    throw new Error('Invalid values for refund calculation');
  }

  const hoursNotice = (appointmentTime - cancelledTime) / (1000 * 60 * 60);

  if (hoursNotice >= 48) {
    return roundMoney(paid);
  }

  if (hoursNotice >= 24) {
    return roundMoney(paid * 0.5);
  }

  return 0;
}

module.exports = {
  calculateRefund,
};
