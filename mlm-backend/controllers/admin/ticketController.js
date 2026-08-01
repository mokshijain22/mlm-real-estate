const SupportTicket = require('../../models/SupportTicket');
const supportTicketService = require('../../services/supportTicketService');

// GET /api/admin/tickets?status=&category=&page=
async function index(req, res) {
  try {
    const { status, category, search } = req.query;

    const query = {};
    if (status && status !== 'all') query.status = status;
    if (category && category !== 'all') query.category = category;
    if (search && search.trim()) {
      const re = new RegExp(search.trim(), 'i');
      query.$or = [{ ticketNumber: re }, { subject: re }];
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    // Mirrors Laravel's orderByRaw("FIELD(status, 'open', 'closed')") — open tickets first, then newest first
    const statusOrder = { open: 0, closed: 1 };

    const [allMatching, total] = await Promise.all([
      SupportTicket.find(query).populate('agent', 'name email phone').sort({ createdAt: -1 }),
      SupportTicket.countDocuments(query),
    ]);

    const sorted = allMatching.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
    const tickets = sorted.slice(skip, skip + limit);

    const stats = {
      open: await SupportTicket.countDocuments({ status: 'open' }),
      closed: await SupportTicket.countDocuments({ status: 'closed' }),
      total: await SupportTicket.countDocuments(),
    };

    return res.json({
      data: tickets,
      meta: { page, limit, total, lastPage: Math.ceil(total / limit) },
      stats,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch support tickets.', error: err.message });
  }
}

// GET /api/admin/tickets/:id
async function show(req, res) {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate('agent', 'name email phone')
      .populate('repliedBy', 'name email');

    if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });

    return res.json({ ticket });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch ticket.', error: err.message });
  }
}

// PATCH /api/admin/tickets/:id/reply
async function reply(req, res) {
  try {
    const { admin_reply } = req.body;

    if (!admin_reply || admin_reply.trim().length < 5) {
      return res.status(422).json({ errors: { admin_reply: 'Reply must be at least 5 characters.' } });
    }

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });

    // Mirrors Laravel's Gate::denies('reply', $ticket) — cannot reply to an already-closed ticket
    if (ticket.status === 'closed') {
      return res.status(403).json({ message: 'Cannot reply to a closed ticket. Reopen it first.' });
    }

    const updated = await supportTicketService.replyTicket(ticket, admin_reply.trim(), req.user._id);

    return res.json({ message: 'Reply submitted and ticket closed.', data: updated });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

// PATCH /api/admin/tickets/:id/close
async function close(req, res) {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });

    const updated = await supportTicketService.closeTicket(ticket);

    return res.json({ message: 'Ticket closed successfully.', data: updated });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

// PATCH /api/admin/tickets/:id/reopen
async function reopen(req, res) {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });

    const updated = await supportTicketService.reopenTicket(ticket);

    return res.json({ message: 'Ticket reopened successfully.', data: updated });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

module.exports = { index, show, reply, close, reopen };