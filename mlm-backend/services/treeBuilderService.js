const User = require('../models/User');
const AgentTree = require('../models/AgentTree');

/**
 * Build the up-to-7-level-deep tree structure for a new agent.
 */
async function buildTree(newAgent) {
  const referrerId = newAgent.referredBy;

  if (!referrerId) {
    await AgentTree.create({ agent: newAgent._id });
    return;
  }

  const referrer = await User.findById(referrerId);

  if (referrer) {
    const referrerTree = await AgentTree.findOne({ agent: referrer._id });

    await AgentTree.create({
      agent: newAgent._id,
      upline: referrer._id,
      level1: referrer._id,
      level2: referrerTree ? referrerTree.level1 : null,
      level3: referrerTree ? referrerTree.level2 : null,
      level4: referrerTree ? referrerTree.level3 : null,
      level5: referrerTree ? referrerTree.level4 : null,
      level6: referrerTree ? referrerTree.level5 : null,
      level7: referrerTree ? referrerTree.level6 : null,
    });
  }
}

/**
 * Returns the direct upline chain of an agent, walking referredBy pointers.
 */
async function getUplineChain(agent) {
  const uplineChain = {};
  let level = 1;
  let currentReferrerId = agent.referredBy;

  while (currentReferrerId) {
    uplineChain[`level_${level}`] = currentReferrerId;

    const referrer = await User.findById(currentReferrerId);
    if (!referrer) break;

    currentReferrerId = referrer.referredBy;
    level++;
  }

  return uplineChain;
}

/**
 * Query agent_trees where any level 1-7 matches this agent's ID.
 * Returns a flat array of unique downline user IDs.
 */
async function getDownlineIds(agent) {
  const id = agent._id;

  const trees = await AgentTree.find({
    $or: [
      { level1: id },
      { level2: id },
      { level3: id },
      { level4: id },
      { level5: id },
      { level6: id },
      { level7: id },
    ],
  }).select('agent');

  const ids = trees.map((t) => t.agent.toString());
  return [...new Set(ids)];
}

/**
 * Returns downline grouped by level.
 * { level_1: [userIds], level_2: [userIds], ... }
 */
async function getDownlineByLevel(agent) {
  const id = agent._id;
  const levels = {};

  for (let i = 1; i <= 7; i++) {
    const field = `level${i}`;
    const trees = await AgentTree.find({ [field]: id }).select('agent');
    levels[`level_${i}`] = trees.map((t) => t.agent);
  }

  return levels;
}

/**
 * Returns a recursive hierarchical tree for the agent (for tree visualization UI).
 */
async function getHierarchicalTree(agent, maxLevel = 7) {
  await agent.populate(['role', 'rank']);

  return {
    id: agent._id,
    name: agent.name,
    email: agent.email,
    photo: agent.profilePhoto || '/images/users/avatar-1.jpg',
    role: agent.role?.name || 'Agent',
    rank_name: agent.rank?.name || 'N/A',
    position: agent.position || null,
    slab_per_sqft: agent.slabPerSqft ?? null,
    status: agent.status,
    created_at: agent.createdAt,
    children: await getChildrenRecursive(agent._id, 1, maxLevel),
  };
}

async function getChildrenRecursive(parentId, currentLevel, maxLevel) {
  if (currentLevel > maxLevel) return [];

  const children = await User.find({ referredBy: parentId }).populate('rank').populate('role');

  const branch = [];
  for (const child of children) {
    branch.push({
      id: child._id,
      name: child.name,
      email: child.email,
      photo: child.profilePhoto || '/images/users/avatar-1.jpg',
      role: child.role?.name || 'Agent',
      rank_name: child.rank?.name || 'N/A',
      position: child.position || null,
      slab_per_sqft: child.slabPerSqft ?? null,
      status: child.status,
      created_at: child.createdAt,
      children: await getChildrenRecursive(child._id, currentLevel + 1, maxLevel),
    });
  }
  return branch;
}

module.exports = {
  buildTree,
  getUplineChain,
  getDownlineIds,
  getDownlineByLevel,
  getHierarchicalTree,
};
