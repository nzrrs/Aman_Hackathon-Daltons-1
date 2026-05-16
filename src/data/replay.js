const PLAYABLE_STATUSES = new Set(["active", "partial"]);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toMs(value, fallback) {
  const parsed = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function hashSeed(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seedText) {
  let seed = hashSeed(seedText) || 1;
  return () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function hoursToMs(hours) {
  return Math.round(hours * 3600000);
}

function normalizeStatus(status) {
  return ["active", "partial", "scheduled", "resolved"].includes(status)
    ? status
    : "active";
}

function daysToMs(days) {
  return days * 24 * 3600000;
}

function buildTransitions(report, replayStartMs, replayEndMs) {
  const rng = createRng(`${report.id}:${report.city}:${report.neighborhood}`);
  const sourceStatus = normalizeStatus(report.status);
  const reportedAtMs = toMs(report.reportedAt, replayStartMs + hoursToMs(rng() * 8));
  const startAt = clamp(reportedAtMs, replayStartMs, replayEndMs);
  const transitions = [{ at: startAt, status: sourceStatus }];

  const pushTransition = (at, status) => {
    const safeAt = clamp(at, replayStartMs, replayEndMs);
    const latest = transitions[transitions.length - 1];
    if (safeAt <= latest.at || latest.status === status) return;
    transitions.push({ at: safeAt, status });
  };

  if (sourceStatus === "scheduled") {
    const toActiveAt = startAt + hoursToMs(0.75 + rng() * 3.5);
    pushTransition(toActiveAt, "active");
    if (rng() < 0.5) {
      pushTransition(toActiveAt + hoursToMs(0.75 + rng() * 2.5), "partial");
    }
    if (rng() < 0.72) {
      pushTransition(startAt + hoursToMs(4 + rng() * 12), "resolved");
    }
  }

  if (sourceStatus === "active") {
    if (rng() < 0.4) {
      pushTransition(startAt + hoursToMs(1 + rng() * 4), "partial");
    }
    if (rng() < 0.35) {
      pushTransition(startAt + hoursToMs(4 + rng() * 14), "resolved");
    }
  }

  if (sourceStatus === "partial") {
    if (rng() < 0.35) {
      pushTransition(startAt + hoursToMs(0.75 + rng() * 3), "active");
    }
    if (rng() < 0.45) {
      pushTransition(startAt + hoursToMs(3 + rng() * 10), "resolved");
    }
  }

  if (sourceStatus === "resolved") {
    const restoreAt = toMs(report.estimatedRestore, startAt + hoursToMs(1 + rng() * 2));
    const activeAt = clamp(restoreAt - hoursToMs(2 + rng() * 4), replayStartMs, replayEndMs);
    transitions[0] = { at: activeAt, status: rng() < 0.5 ? "active" : "partial" };
    pushTransition(restoreAt, "resolved");
  }

  return transitions.sort((a, b) => a.at - b.at);
}

function statusAt(transitions, timeMs) {
  if (transitions.length === 0 || timeMs < transitions[0].at) return null;

  let current = transitions[0].status;
  for (let i = 1; i < transitions.length; i += 1) {
    if (transitions[i].at > timeMs) break;
    current = transitions[i].status;
  }
  return current;
}

export function buildReplayDataset(reports, windowDays = 1) {
  const nowMs = Date.now();
  const safeWindowDays = [1, 7, 14].includes(windowDays) ? windowDays : 1;
  const replayStartMs = nowMs - daysToMs(safeWindowDays);
  const replayEndMs = nowMs;

  const entries = reports.map((report) => ({
    report,
    transitions: buildTransitions(report, replayStartMs, replayEndMs),
  }));

  return {
    startMs: replayStartMs,
    endMs: replayEndMs,
    entries,
  };
}

export function getReplaySnapshot(dataset, timeMs) {
  if (!dataset || !Array.isArray(dataset.entries)) return [];

  const safeTime = clamp(timeMs, dataset.startMs, dataset.endMs);
  const activeReports = [];

  for (const entry of dataset.entries) {
    const currentStatus = statusAt(entry.transitions, safeTime);
    if (!PLAYABLE_STATUSES.has(currentStatus)) continue;
    activeReports.push({ ...entry.report, status: currentStatus });
  }

  return activeReports;
}
