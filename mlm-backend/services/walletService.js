const mongoose = require('mongoose');
const AgentWallet = require('../models/AgentWallet');
const WalletTransaction = require('../models/WalletTransaction');

/**
 * Credit points to an agent's wallet. Mirrors WalletService::credit.
 *
 * Pass `externalSession` when this call is one step inside a larger
 * transaction (e.g. commissionService crediting seller + several upline
 * agents) so every write commits or rolls back together. When omitted, this
 * function opens and manages its own transaction as before.
 */
async function credit(agent, amount, pointsType, category, remark, bookingId = null, emiId = null, withdrawalId = null, externalSession = null, sqftPortion = null) {
  const runOps = async (session) => {
    let wallet = await AgentWallet.findOne({ agent: agent._id }).session(session);
    if (!wallet) {
      const [created] = await AgentWallet.create([{ agent: agent._id, bvBalance: 0, pvBalance: 0 }], { session });
      wallet = created;
    }

    const balanceField = pointsType.toUpperCase() === 'BV' ? 'bvBalance' : 'pvBalance';
    wallet[balanceField] = Number(wallet[balanceField]) + Number(amount);
    await wallet.save({ session });

    await WalletTransaction.create(
      [
        {
          agent: agent._id,
          type: 'credit',
          category,
          pointsType: pointsType.toUpperCase(),
          amount,
          booking: bookingId,
          emi: emiId,
          withdrawal: withdrawalId,
          remark,
          sqftPortion,
        },
      ],
      { session }
    );
  };

  if (externalSession) {
    await runOps(externalSession);
    return;
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(() => runOps(session));
  } finally {
    session.endSession();
  }
}

/**
 * Debit points from an agent's wallet. Mirrors WalletService::debit.
 */
async function debit(agent, amount, pointsType, category, remark, processedBy = null, withdrawalId = null) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const wallet = await AgentWallet.findOne({ agent: agent._id }).session(session);
      if (!wallet) throw new Error('Agent wallet not found');

      const balanceField = pointsType.toUpperCase() === 'BV' ? 'bvBalance' : 'pvBalance';
      if (Number(wallet[balanceField]) < Number(amount)) {
        throw new Error('Insufficient wallet balance');
      }

      wallet[balanceField] = Number(wallet[balanceField]) - Number(amount);
      await wallet.save({ session });

      await WalletTransaction.create(
        [
          {
            agent: agent._id,
            type: 'debit',
            category,
            pointsType: pointsType.toUpperCase(),
            amount,
            remark,
            processedBy,
            withdrawal: withdrawalId,
          },
        ],
        { session }
      );
    });
  } finally {
    session.endSession();
  }
}

module.exports = { credit, debit };