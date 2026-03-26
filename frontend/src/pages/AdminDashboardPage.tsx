import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";
import { addMembersToRound, createAdminRound, getAdminRounds, type BCRound } from "../services/roundApi";
import { createAdminUser, listAdminUsers, type UserRole } from "../services/userApi";

function toIsoFromDatetimeLocal(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatDatetimeLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function getDefaultRoundTimes() {
  const start = new Date();
  start.setSeconds(0, 0);
  const roundedMinutes = Math.ceil(start.getMinutes() / 5) * 5;
  start.setMinutes(roundedMinutes);

  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  if (end.toDateString() !== start.toDateString()) {
    end.setFullYear(start.getFullYear(), start.getMonth(), start.getDate());
    end.setHours(23, 59, 0, 0);
  }

  return {
    startTime: formatDatetimeLocal(start),
    endTime: formatDatetimeLocal(end),
  };
}

function getStatusClass(status: BCRound["status"]) {
  return status === "active" ? "status-active" : status === "closed" ? "status-closed" : "status-upcoming";
}

export default function AdminDashboardPage() {
  const defaultTimes = getDefaultRoundTimes();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rounds, setRounds] = useState<BCRound[]>([]);

  const [createName, setCreateName] = useState("");
  const [createTotalPool, setCreateTotalPool] = useState<number>(0);
  const [createBidStep, setCreateBidStep] = useState<number>(0);
  const [createStartTime, setCreateStartTime] = useState(defaultTimes.startTime);
  const [createEndTime, setCreateEndTime] = useState(defaultTimes.endTime);
  const [creating, setCreating] = useState(false);

  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [addingMembers, setAddingMembers] = useState(false);
  const [adminActionError, setAdminActionError] = useState<string | null>(null);

  const [users, setUsers] = useState<Array<{ id: string; name: string; phone: string; role: UserRole }>>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [createUserName, setCreateUserName] = useState("");
  const [createUserPhone, setCreateUserPhone] = useState("");
  const [createUserPassword, setCreateUserPassword] = useState("");
  const [createUserRole, setCreateUserRole] = useState<UserRole>("member");
  const [creatingUser, setCreatingUser] = useState(false);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    setError(null);
    getAdminRounds(token)
      .then((res) => setRounds(res.rounds))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load rounds"))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setUsersLoading(true);
    setUsersError(null);
    listAdminUsers(token)
      .then((res) => setUsers(res.users))
      .catch((e) => setUsersError(e instanceof Error ? e.message : "Failed to load users"))
      .finally(() => setUsersLoading(false));
  }, [token]);

  async function refreshRounds() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminRounds(token);
      setRounds(res.rounds);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load rounds");
    } finally {
      setLoading(false);
    }
  }

  async function refreshUsers() {
    if (!token) return;
    setUsersLoading(true);
    setUsersError(null);
    try {
      const res = await listAdminUsers(token);
      setUsers(res.users);
    } catch (e) {
      setUsersError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  }

  async function onCreateUser(e: FormEvent) {
    e.preventDefault();
    if (!token) return;

    setCreatingUser(true);
    setAdminActionError(null);
    setCreatedUserId(null);
    try {
      const res = await createAdminUser(token, {
        name: createUserName,
        phone: createUserPhone,
        password: createUserPassword,
        role: createUserRole,
      });

      setCreatedUserId(res.user.id);
      setCreateUserName("");
      setCreateUserPhone("");
      setCreateUserPassword("");

      await refreshUsers();

      if (createUserRole === "member" && selectedRoundId) {
        setSelectedMemberIds((prev) => (prev.includes(res.user.id) ? prev : [...prev, res.user.id]));
      }
    } catch (err) {
      setAdminActionError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setCreatingUser(false);
    }
  }

  async function onCreateRound(e: FormEvent) {
    e.preventDefault();
    if (!token) return;

    const startTimeIso = toIsoFromDatetimeLocal(createStartTime);
    const endTimeIso = toIsoFromDatetimeLocal(createEndTime);

    if (!startTimeIso || !endTimeIso) {
      setAdminActionError("Enter valid start and end times.");
      return;
    }

    setCreating(true);
    setAdminActionError(null);
    try {
      await createAdminRound(token, {
        name: createName,
        totalPool: createTotalPool,
        bidStep: createBidStep,
        startTime: startTimeIso,
        endTime: endTimeIso,
      });
      setCreateName("");
      setCreateTotalPool(0);
      setCreateBidStep(0);
      const nextDefaults = getDefaultRoundTimes();
      setCreateStartTime(nextDefaults.startTime);
      setCreateEndTime(nextDefaults.endTime);
      setSelectedRoundId(null);
      setSelectedMemberIds([]);
      setMemberSearchQuery("");
      await refreshRounds();
    } catch (err) {
      setAdminActionError(err instanceof Error ? err.message : "Failed to create round");
    } finally {
      setCreating(false);
    }
  }

  async function onAddMembers(e: FormEvent) {
    e.preventDefault();
    if (!token || !selectedRoundId) return;

    const memberUserIds = selectedMemberIds;
    if (memberUserIds.length === 0) {
      setAdminActionError("Select at least one member to add.");
      return;
    }

    setAddingMembers(true);
    setAdminActionError(null);
    try {
      await addMembersToRound(token, selectedRoundId, memberUserIds);
      setSelectedRoundId(null);
      setSelectedMemberIds([]);
      setMemberSearchQuery("");
      await refreshRounds();
    } catch (err) {
      setAdminActionError(err instanceof Error ? err.message : "Failed to add members");
    } finally {
      setAddingMembers(false);
    }
  }

  const totalRounds = rounds.length;
  const activeRounds = rounds.filter((round) => round.status === "active").length;
  const totalMembers = users.filter((user) => user.role === "member").length;

  return (
    <div className="page">
      <div className="hero-card">
        <div className="page-header">
          <div>
            <div className="eyebrow">Admin Control</div>
            <h1 className="page-title">Round Command Center</h1>
            <p className="lead">Create users, launch new BC rounds, assign members, and monitor active auctions.</p>
          </div>
        </div>

        <div className="top-stats" style={{ marginTop: 22 }}>
          <div className="stat-block">
            <div className="stat-number">{totalRounds}</div>
            <div className="stat-label">Total rounds</div>
          </div>
          <div className="stat-block">
            <div className="stat-number">{activeRounds}</div>
            <div className="stat-label">Live rounds</div>
          </div>
          <div className="stat-block">
            <div className="stat-number">{totalMembers}</div>
            <div className="stat-label">Available members</div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-title">Create User</div>
          <div className="panel-subtitle">Provision admins and members before assigning them into rounds.</div>
          <form className="form-grid" onSubmit={onCreateUser}>
            <label className="field">
              <span className="field-label">Name</span>
            <input value={createUserName} onChange={(e) => setCreateUserName(e.target.value)} placeholder="Full name" />
            </label>

            <label className="field">
              <span className="field-label">Phone</span>
            <input value={createUserPhone} onChange={(e) => setCreateUserPhone(e.target.value)} placeholder="+91..." />
            </label>

            <label className="field">
              <span className="field-label">Password</span>
              <input
                type="password"
                value={createUserPassword}
                onChange={(e) => setCreateUserPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </label>

            <label className="field">
              <span className="field-label">Role</span>
              <select value={createUserRole} onChange={(e) => setCreateUserRole(e.target.value as UserRole)}>
                <option value="member">member</option>
                <option value="admin">admin</option>
              </select>
            </label>

            <div className="button-row">
              <button className="button button-primary" disabled={creatingUser}>
                {creatingUser ? "Creating..." : "Create User"}
              </button>
            </div>

            {createdUserId && (
              <div className="success-text">
                Created user id: <code>{createdUserId}</code>
              </div>
            )}
          </form>

          <div style={{ marginTop: 24 }}>
            <div className="split-header">
              <div className="panel-title">Recent Users</div>
              <div className="muted-text">{users.length} total</div>
            </div>
          {usersLoading ? (
              <p className="panel-subtitle">Loading users...</p>
          ) : usersError ? (
              <p className="error-text">{usersError}</p>
          ) : (
              <div className="list">
              {users.slice(0, 8).map((u) => (
                  <div className="list-card" key={u.id}>
                    <div>
                      <div className="list-card-title">{u.name}</div>
                      <div className="list-card-subtitle">
                      {u.phone} • {u.role}
                      </div>
                    </div>
                    <div className="list-actions">
                      <button
                        className="button"
                      type="button"
                      disabled={u.role !== "member" || !selectedRoundId}
                      onClick={() =>
                        setSelectedMemberIds((prev) => (prev.includes(u.id) ? prev : [...prev, u.id]))
                      }
                      title={selectedRoundId ? "Select this member for the current round" : "Select a round first"}
                    >
                      Select
                      </button>
                    </div>
                  </div>
              ))}
                {users.length === 0 && <p className="panel-subtitle">No users yet.</p>}
              </div>
            )}
          </div>

          {adminActionError && <div className="error-text" style={{ marginTop: 16 }}>{adminActionError}</div>}
        </div>

        <div className="panel">
          <div className="panel-title">Create BC Round</div>
          <div className="panel-subtitle">Define the pool, step size, and exact live window for a new auction.</div>
          <form className="form-grid" onSubmit={onCreateRound}>
            <label className="field">
              <span className="field-label">Name</span>
            <input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Round name" />
            </label>

            <label className="field">
              <span className="field-label">Total Pool</span>
              <input
                type="number"
                value={createTotalPool}
                onChange={(e) => setCreateTotalPool(Number(e.target.value))}
              />
            </label>

            <label className="field">
              <span className="field-label">Bid Step</span>
              <input type="number" value={createBidStep} onChange={(e) => setCreateBidStep(Number(e.target.value))} />
            </label>

            <label className="field">
              <span className="field-label">Start Time</span>
              <input type="datetime-local" value={createStartTime} onChange={(e) => setCreateStartTime(e.target.value)} />
            </label>

            <label className="field">
              <span className="field-label">End Time</span>
              <input type="datetime-local" value={createEndTime} onChange={(e) => setCreateEndTime(e.target.value)} />
            </label>

            <div className="button-row">
              <button className="button button-primary" disabled={creating}>
                {creating ? "Creating..." : "Create Round"}
              </button>
            </div>

            {adminActionError && <div className="error-text">{adminActionError}</div>}
          </form>
        </div>
      </div>

      <div className="panel">
        <div className="split-header">
          <div>
            <div className="panel-title">Rounds</div>
            <div className="panel-subtitle">Manage assignments and jump into each auction view.</div>
          </div>
        </div>
        {loading && <p className="panel-subtitle">Loading...</p>}
        {error && <p className="error-text">{error}</p>}

        {!loading && !error && (
          <div className="list">
            {rounds.length === 0 ? (
              <p className="panel-subtitle">No rounds yet.</p>
            ) : (
              rounds.map((r) => (
                <div className="list-card" key={r.id}>
                  <div>
                    <div className="list-card-title">{r.name}</div>
                    <div className="list-card-subtitle">Pool {r.totalPool} • Step {r.bidStep}</div>
                    <div className={`status-pill ${getStatusClass(r.status)}`} style={{ marginTop: 10 }}>
                      {r.status}
                    </div>
                  </div>
                  <div className="list-actions">
                    <button
                      className="button"
                      type="button"
                      onClick={() => {
                        setSelectedRoundId(r.id);
                        setSelectedMemberIds([]);
                        setMemberSearchQuery("");
                        setAdminActionError(null);
                      }}
                    >
                      Add members
                    </button>
                    <Link className="button button-ghost" to={`/round/${r.id}`}>
                      Open
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {selectedRoundId && (
        <div className="panel">
          <div className="panel-title">Add Members</div>
          <div className="panel-subtitle">Attach approved members to the selected round before bidding begins.</div>
          <form className="form-grid" onSubmit={onAddMembers}>
            <div className="muted-text">
              Round: <code>{selectedRoundId}</code>
            </div>

            <label className="field">
              <span className="field-label">Search members by name or phone</span>
              <input
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                placeholder="Type name or phone..."
              />
            </label>

            <div className="selection-chip-row">
              {selectedMemberIds.length === 0 ? (
                <span className="muted-text">No members selected.</span>
              ) : (
                selectedMemberIds.map((id) => {
                  const u = users.find((x) => x.id === id);
                  return (
                    <button
                      className="selection-chip"
                      key={id}
                      type="button"
                      onClick={() => setSelectedMemberIds((prev) => prev.filter((x) => x !== id))}
                      disabled={addingMembers}
                      title="Remove from selection"
                    >
                      {u ? u.name : id}
                    </button>
                  );
                })
              )}
            </div>

            <div className="scroll-panel">
              {usersLoading ? (
                <div className="panel-subtitle">Loading users...</div>
              ) : (
                (() => {
                  const q = memberSearchQuery.trim().toLowerCase();
                  const candidates = users
                    .filter((u) => u.role === "member")
                    .filter((u) => {
                      if (!q) return true;
                      return u.name.toLowerCase().includes(q) || u.phone.toLowerCase().includes(q);
                    });

                  if (candidates.length === 0) {
                    return <div className="panel-subtitle">No members found.</div>;
                  }

                  return (
                    <div className="list">
                      {candidates.slice(0, 40).map((u) => {
                        const selected = selectedMemberIds.includes(u.id);
                        return (
                          <div className="list-card" key={u.id}>
                            <div>
                              <div className="list-card-title">{u.name}</div>
                              <div className="list-card-subtitle">{u.phone}</div>
                            </div>
                            <button
                              className={`button${selected ? " button-primary" : ""}`}
                              type="button"
                              disabled={addingMembers}
                              onClick={() => {
                                setSelectedMemberIds((prev) =>
                                  prev.includes(u.id) ? prev.filter((x) => x !== u.id) : [...prev, u.id],
                                );
                              }}
                            >
                              {selected ? "Remove" : "Select"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              )}
            </div>

            <div className="button-row">
              <button className="button button-primary" type="submit" disabled={addingMembers}>
                {addingMembers ? "Adding..." : "Add Members"}
              </button>
              <button
                className="button button-ghost"
                type="button"
                onClick={() => {
                  setSelectedRoundId(null);
                  setSelectedMemberIds([]);
                  setMemberSearchQuery("");
                  setAdminActionError(null);
                }}
                disabled={addingMembers}
              >
                Cancel
              </button>
            </div>

            {adminActionError && <div className="error-text">{adminActionError}</div>}
          </form>
        </div>
      )}
    </div>
  );
}
