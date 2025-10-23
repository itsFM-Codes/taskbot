const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');

const DATA_PATH = path.join(__dirname, '..', 'data.json');

let data = {
  reminderHoursBefore: 24,
  groups: []
};

function loadData() {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(DATA_PATH)) {
        saveDataSync();
        return resolve();
      }
      const raw = fs.readFileSync(DATA_PATH, 'utf8');
      data = JSON.parse(raw);
      // normalize
      data.groups = data.groups || [];
      if (typeof data.reminderHoursBefore !== 'number') data.reminderHoursBefore = 24;
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

function saveDataSync() {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function saveData() {
  return new Promise((resolve, reject) => {
    try {
      saveDataSync();
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

// Utility to find a group by path segments (array)
// returns { parentGroup, group, indexInParent } for groups
function findGroupByPathSegments(segments) {
  if (!segments || segments.length === 0) {
    return { parentGroup: null, group: null, indexInParent: -1 };
  }
  let curList = data.groups;
  let parent = null;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const idx = curList.findIndex(g => g.name === seg);
    if (idx === -1) return null;
    parent = curList;
    const group = curList[idx];
    if (i === segments.length - 1) {
      return { parentGroup: parent, group, indexInParent: idx };
    }
    curList = group.groups = group.groups || [];
  }
  return null;
}

// Find a task by full path (segments). Last segment is task name.
function findTaskByPathSegments(segments) {
  if (!segments || segments.length === 0) return null;
  const taskName = segments[segments.length - 1];
  const groupPath = segments.slice(0, -1);
  let curList = data.groups;
  let parentGroup = null;
  for (const seg of groupPath) {
    const idx = curList.findIndex(g => g.name === seg);
    if (idx === -1) return null;
    parentGroup = curList[idx];
    curList = parentGroup.groups = parentGroup.groups || [];
  }
  // parent for task is parentGroup (null => top-level tasks? we only allow tasks inside groups)
  if (!parentGroup) return null;
  parentGroup.tasks = parentGroup.tasks || [];
  const tIdx = parentGroup.tasks.findIndex(t => t.name === taskName);
  if (tIdx === -1) return null;
  return { parentGroup, task: parentGroup.tasks[tIdx], indexInParent: tIdx };
}

// Add group at path (if parentSegments empty => top-level)
function addGroupByPath(parentSegments, name) {
  if (!name || name.trim() === '') throw new Error('Invalid name');
  const segs = parentSegments || [];
  if (segs.length === 0) {
    // add top-level, ensure doesn't exist
    if (data.groups.find(g => g.name === name)) throw new Error('Group already exists at top level');
    const g = { name, groups: [], tasks: [] };
    data.groups.push(g);
    return g;
  } else {
    const found = findGroupByPathSegments(segs);
    if (!found) throw new Error('Parent group not found');
    const parent = found.group;
    parent.groups = parent.groups || [];
    if (parent.groups.find(g => g.name === name)) throw new Error('Subgroup already exists');
    const g = { name, groups: [], tasks: [] };
    parent.groups.push(g);
    return g;
  }
}

// Add task to group path
function addTaskToGroup(groupSegments, taskObj) {
  const segs = groupSegments || [];
  if (segs.length === 0) throw new Error('Tasks must be inside a group');
  const found = findGroupByPathSegments(segs);
  if (!found) throw new Error('Group not found');
  const group = found.group;
  group.tasks = group.tasks || [];
  if (group.tasks.find(t => t.name === taskObj.name)) throw new Error('Task with same name exists in that group');
  group.tasks.push(taskObj);
  return taskObj;
}

// Remove group by path segments (remove group and its children)
function removeGroupByPath(segments) {
  const found = findGroupByPathSegments(segments);
  if (!found) throw new Error('Group not found');
  found.parentGroup.splice(found.indexInParent, 1);
  return true;
}

// Remove task by path segments
function removeTaskByPath(segments) {
  const found = findTaskByPathSegments(segments);
  if (!found) throw new Error('Task not found');
  found.parentGroup.tasks.splice(found.indexInParent, 1);
  return true;
}

// Rename group or task by path
function renameByPath(segments, newName) {
  // try group first (if path points to a group)
  const gFound = findGroupByPathSegments(segments);
  if (gFound) {
    // rename group
    gFound.group.name = newName;
    return { type: 'group' };
  }
  // try task
  const tFound = findTaskByPathSegments(segments);
  if (tFound) {
    tFound.task.name = newName;
    return { type: 'task' };
  }
  throw new Error('Path not found for rename');
}

// Move group or task from one path to another group path
function movePath(fromSegments, toGroupSegments) {
  // Try move group
  const gFrom = findGroupByPathSegments(fromSegments);
  if (gFrom) {
    // extract group object
    const groupObj = gFrom.group;
    // remove from parent
    gFrom.parentGroup.splice(gFrom.indexInParent, 1);
    // find destination group (toGroupSegments empty => top-level)
    if (!toGroupSegments || toGroupSegments.length === 0) {
      // ensure not duplicate top-level
      if (data.groups.find(g => g.name === groupObj.name)) throw new Error('Destination already has group with same name');
      data.groups.push(groupObj);
      return { type: 'group' };
    } else {
      const dest = findGroupByPathSegments(toGroupSegments);
      if (!dest) throw new Error('Destination group not found');
      dest.group.groups = dest.group.groups || [];
      if (dest.group.groups.find(g => g.name === groupObj.name)) throw new Error('Destination already has subgroup with same name');
      dest.group.groups.push(groupObj);
      return { type: 'group' };
    }
  }
  // Try move task
  const tFrom = findTaskByPathSegments(fromSegments);
  if (tFrom) {
    const taskObj = tFrom.task;
    // remove from parent
    tFrom.parentGroup.tasks.splice(tFrom.indexInParent, 1);
    // find destination group
    if (!toGroupSegments || toGroupSegments.length === 0) throw new Error('Tasks must be moved into a group');
    const dest = findGroupByPathSegments(toGroupSegments);
    if (!dest) throw new Error('Destination group not found');
    dest.group.tasks = dest.group.tasks || [];
    if (dest.group.tasks.find(t => t.name === taskObj.name)) throw new Error('Destination already has a task with same name');
    dest.group.tasks.push(taskObj);
    return { type: 'task' };
  }
  throw new Error('Source not found');
}

// Mark task done/undone
function setTaskStatus(segments, status) {
  const tFound = findTaskByPathSegments(segments);
  if (!tFound) throw new Error('Task not found');
  tFound.task.status = status;
  if (status === 'done') {
    tFound.task.completedAt = (new Date()).toISOString();
  }
  return tFound.task;
}

// Search recursively for keyword (in group names and task names)
function search(keyword) {
  const results = [];
  function recurseGroups(groups, curPath) {
    for (const g of groups) {
      const gPath = curPath.concat([g.name]);
      if (g.name.toLowerCase().includes(keyword.toLowerCase())) {
        results.push({ type: 'group', path: gPath.join('/') });
      }
      if (g.tasks) {
        for (const t of g.tasks) {
          if (t.name.toLowerCase().includes(keyword.toLowerCase()) || (t.description && t.description.toLowerCase().includes(keyword.toLowerCase()))) {
            results.push({ type: 'task', path: gPath.concat([t.name]).join('/') });
          }
        }
      }
      if (g.groups) recurseGroups(g.groups, gPath);
    }
  }
  recurseGroups(data.groups, []);
  return results;
}

// List group contents (if path empty -> top-level groups)
function listAtPath(segments, options = {}) {
  const { filter = 'all', sortBy = 'name' } = options;
  if (!segments || segments.length === 0) {
    // return top-level representation
    return data.groups;
  }
  const found = findGroupByPathSegments(segments);
  if (!found) throw new Error('Group not found');
  return found.group;
}

// Recursively clear completed tasks, returns count removed
function clearCompleted() {
  let removed = 0;
  function recurse(groups) {
    for (const g of groups) {
      if (g.tasks) {
        const before = g.tasks.length;
        g.tasks = g.tasks.filter(t => t.status !== 'done');
        removed += before - g.tasks.length;
      }
      if (g.groups) recurse(g.groups);
    }
  }
  recurse(data.groups);
  return removed;
}

// Walk all tasks recursively and call callback(task, groupPath)
function walkTasks(callback) {
  function recurse(groups, curPath) {
    for (const g of groups) {
      const gp = curPath.concat([g.name]);
      g.tasks = g.tasks || [];
      for (const t of g.tasks) {
        callback(t, gp);
      }
      if (g.groups) recurse(g.groups, gp);
    }
  }
  recurse(data.groups, []);
}

// Get effective reminder hours for a task given group path (segments)
// Precedence: task.reminderHours -> nearest ancestor group.reminderHours -> data.reminderHoursBefore
function getEffectiveReminderHours(task, groupPathSegments) {
  if (task && typeof task.reminderHours === 'number') return task.reminderHours;
  // go from deepest group to root
  let cur = null;
  let curList = data.groups;
  for (let i = 0; i < groupPathSegments.length; i++) {
    const seg = groupPathSegments[i];
    const idx = curList.findIndex(g => g.name === seg);
    if (idx === -1) break;
    cur = curList[idx];
    curList = cur.groups = cur.groups || [];
  }
  // walk up ancestors
  for (let i = groupPathSegments.length - 1; i >= 0; i--) {
    const segs = groupPathSegments.slice(0, i + 1);
    const f = findGroupByPathSegments(segs);
    if (f && typeof f.group.reminderHours === 'number') return f.group.reminderHours;
  }
  if (typeof data.reminderHoursBefore === 'number') return data.reminderHoursBefore;
  return 24;
}

// Expose data for reading (careful to not mutate)
function getRawData() {
  return data;
}

// Update global reminder hours
function setGlobalReminderHours(hours) {
  data.reminderHoursBefore = hours;
}

module.exports = {
  loadData,
  saveData,
  getRawData,
  addGroupByPath,
  addTaskToGroup,
  removeGroupByPath,
  removeTaskByPath,
  findGroupByPathSegments,
  findTaskByPathSegments,
  renameByPath,
  movePath,
  setTaskStatus,
  search,
  listAtPath,
  clearCompleted,
  walkTasks,
  getEffectiveReminderHours,
  setGlobalReminderHours
};