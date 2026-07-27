const SupportTicket = require('../models/SupportTicket');

// Mirrors SupportTicketService::createTicket — generates sequential ticket number.
async function createTicket(data, agentId) {
  const totalTickets = await SupportTicket.countDocuments();
  const ticketNumber = 'TKT-' + String(totalTickets + 1).padStart(4, '0');

  return SupportTicket.create({
    ticketNumber,
    agent: agentId,
    subject: data.subject,
    message: data.message,
    category: data.category,
    status: 'open',
  });
}

// Mirrors SupportTicketService::replyTicket
async function replyTicket(ticket, reply, adminId) {
  ticket.adminReply = reply;
  ticket.repliedBy = adminId;
  ticket.repliedAt = new Date();
  ticket.status = 'closed';
  ticket.closedAt = new Date();
  await ticket.save();
  return ticket;
}

// Mirrors SupportTicketService::closeTicket
async function closeTicket(ticket) {
  ticket.status = 'closed';
  ticket.closedAt = new Date();
  await ticket.save();
  return ticket;
}

// Mirrors SupportTicketService::reopenTicket
async function reopenTicket(ticket) {
  ticket.status = 'open';
  ticket.closedAt = null;
  await ticket.save();
  return ticket;
}

module.exports = { createTicket, replyTicket, closeTicket, reopenTicket };