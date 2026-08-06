const mongoose = require('mongoose');
const AgentWallet = require('../models/AgentWallet');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const walletService = require('./walletService');
const settingService = require('./settingService');
const auditService = require('./auditService');

// Mirrors WithdrawalService::requestWithdrawal
async function requestWithdrawal(req, agent, amount, pointsType) {
  pointsType = String(pointsType).toUpperCase();
  const balanceField = pointsType === 'BV' ? 'bvBalance' : 'pvBalance';

  const session = await mongoose.startSession();
  let request;
  try {
    await session.withTransaction(async () => {
      const wallet = await AgentWallet.findOne({ agent: agent._id }).session(session);
      if (!wallet) throw new Error('Agent wallet not found');

      // 1. Check balance
      if (Number(wallet[balanceField]) < Number(amount)) {
        throw new Error('Insufficient wallet balance');
      }

      // 2. Check no pending withdrawal exists for same points_type
      const pendingExists = await WithdrawalRequest.exists({
        agent: agent._id,
        pointsType,
        status: 'pending',
      }).session(session);
      if (pendingExists) {
        throw new Error(`You already have a pending ${pointsType} withdrawal request`);
      }

      // 3. Check minimum withdrawal amount
      const minAmount = await settingService.get('min_withdrawal_amount', 500);
      if (Number(amount) < Number(minAmount)) {
        throw new Error(`Minimum withdrawal amount is ${minAmount}`);
      }

      // 4. Calculate TDS and Net — TDS applies only to online (BV) withdrawals
      const tdsPercentage = pointsType === 'BV' ? await settingService.get('tds_percentage', 2) : 0;
      const tdsAmount = (Number(amount) * Number(tdsPercentage)) / 100;
      const netAmount = Number(amount) - tdsAmount;

      // 5. Create WithdrawalRequest
      const [created] = await WithdrawalRequest.create(
        [
          {
            agent: agent._id,
            pointsType,
            amount,
            tdsAmount,
            netAmount,
            status: 'pending',
            requestedAt: new Date(),
          },
        ],
        { session }
      );
      request = created;

      // 6. Debit wallet for Net Amount
      await walletService.debit(
        agent,
        netAmount,
        pointsType,
        'withdrawal',
        `Withdrawal Request #${request._id} - ${pointsType}`,
        null,
        request._id
      );

      // 7. Debit wallet for TDS (separate transaction for visibility) — skip when no TDS applies
      if (tdsAmount > 0) {
        await walletService.debit(
          agent,
          tdsAmount,
          pointsType,
          'tds_deduction',
          `TDS Deduction (${tdsPercentage}%) on Withdrawal #${request._id}`,
          null,
          request._id
        );
      }

      await auditService.log(
        req,
        'withdrawal.requested',
        `Agent ${agent.name} requested ${pointsType} withdrawal of ${amount}`,
        request
      );
    });
  } finally {
    session.endSession();
  }

  return request;
}

// Mirrors WithdrawalService::approveWithdrawal
async function approveWithdrawal(req, request, admin, paymentReference) {
  if (request.status !== 'pending') {
    throw new Error('Only pending requests can be approved');
  }

  request.status = 'approved';
  request.reviewedBy = admin._id;
  request.reviewedAt = new Date();
  request.paymentReference = paymentReference;
  await request.save();

  await auditService.log(
    req,
    'withdrawal.approved',
    `Withdrawal #${request._id} of ${request.amount} ${request.pointsType} approved by ${admin.name}`,
    request
  );
}

// Mirrors WithdrawalService::rejectWithdrawal
async function rejectWithdrawal(req, request, admin, reason) {
  if (request.status !== 'pending') {
    throw new Error('Only pending requests can be rejected');
  }

  const agent = await require('../models/User').findById(request.agent);

  // Refund wallet
  await walletService.credit(
    agent,
    Number(request.amount),
    request.pointsType,
    'withdrawal',
    `Refund - Rejected Withdrawal #${request._id}`
  );

  request.status = 'rejected';
  request.rejectionReason = reason;
  request.reviewedBy = admin._id;
  request.reviewedAt = new Date();
  await request.save();

  await auditService.log(
    req,
    'withdrawal.rejected',
    `Withdrawal #${request._id} rejected by ${admin.name}. Reason: ${reason}`,
    request
  );
}

module.exports = { requestWithdrawal, approveWithdrawal, rejectWithdrawal };