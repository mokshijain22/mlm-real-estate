const SupportTicket = require('../../models/SupportTicket');
const supportTicketService = require('../../services/supportTicketService');

// GET /api/agent/tickets
async function index(req, res) {
  const { page, limit } = req.query;
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const perPage = Math.max(parseInt(limit, 10) || 15, 1);

  const filter = { agent: req.user._id };

  const [tickets, total] = await Promise.all([
    SupportTicket.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * perPage)
      .limit(perPage),
    SupportTicket.countDocuments(filter),
  ]);

  return res.json({
    title: 'My Support Tickets',
    tickets,
    pagination: {
      total,
      per_page: perPage,
      current_page: pageNum,
      last_page: Math.max(Math.ceil(total / perPage), 1),
    },
  });
}

// POST /api/agent/tickets
async function store(req, res) {
  const { subject, message, category } = req.body;

  const errors = {};
  if (!subject || String(subject).length > 255) errors.subject = 'Subject is required (max 255 chars).';
  if (!message || String(message).length < 10) errors.message = 'Message is required (min 10 characters).';
  if (!category || !['commission', 'kyc', 'booking', 'general'].includes(category)) {
    errors.category = 'Invalid category.';
  }
  if (Object.keys(errors).length) return res.status(422).json({ errors });

  const ticket = await supportTicketService.createTicket({ subject, message, category }, req.user._id);

  return res.status(201).json({
    message: 'Ticket submitted successfully! We will get back to you soon.',
    data: ticket,
  });
}

// GET /api/agent/tickets/:id
async function show(req, res) {
  const ticket = await SupportTicket.findById(req.params.id).populate('repliedBy');

  if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });

  // Mirrors SupportTicketPolicy::view — agent can only see their own ticket
  if (ticket.agent.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Forbidden.' });
  }

  return res.json({
    title: `Ticket Details - ${ticket.ticketNumber}`,
    ticket,
  });
}

// PATCH /api/agent/tickets/:id/reopen
async function reopen(req, res) {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });

    if (ticket.agent.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden.' });
    }

    const updated = await supportTicketService.reopenTicket(ticket);
    return res.json({ message: 'Ticket reopened successfully.', data: updated });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

module.exports = { index, store, show, reopen };