import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { BellRing, CheckCircle2, Search, ShieldCheck } from 'lucide-react';
import { deleteComplaint, deleteNotification, getAnalytics, getComplaints, getNotifications, markNotificationRead, updateComplaint } from '../services/api';

const COLORS = ['#60a5fa', '#34d399', '#f59e0b', '#f87171'];
const tooltipSurface = {
  background: 'rgba(10, 16, 30, 0.78)',
  border: '1px solid rgba(148, 163, 184, 0.26)',
  borderRadius: '18px',
  boxShadow: '0 18px 46px rgba(2, 6, 23, 0.45)',
  backdropFilter: 'blur(16px)',
  color: '#e5eefc',
};

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) {
    return null;
  }

  const entry = payload[0]?.payload || {};
  const total = Math.max(1, payload[0]?.payload?.total || 0);
  const percentage = Math.round((entry.value / total) * 100);

  return (
    <div style={tooltipSurface} className="min-w-[220px] rounded-2xl p-3 text-xs leading-5">
      <div className="text-sm font-semibold text-white">{entry.name}</div>
      <div className="mt-1">Complaint count: {entry.value}</div>
      <div>Share: {percentage}%</div>
      <div>Avg. resolution time: {entry.avgResolutionTime || '1.6 days'}</div>
      <div>Priority level: {entry.priorityLevel || 'Medium'}</div>
    </div>
  );
};

const BarTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) {
    return null;
  }

  const entry = payload[0]?.payload || {};
  return (
    <div style={tooltipSurface} className="min-w-[250px] rounded-2xl p-3 text-xs leading-5">
      <div className="text-sm font-semibold text-white">{entry.name}</div>
      <div>Total complaints: {entry.total}</div>
      <div>Resolved complaints: {entry.resolved}</div>
      <div>Pending complaints: {entry.pending}</div>
      <div>Resolution rate: {entry.resolutionRate}%</div>
      <div>Avg. response time: {entry.avgResponseTime}</div>
    </div>
  );
};

export default function AuthorityDashboard() {
  const [analytics, setAnalytics] = useState({ stats: [], dailyReports: [], issueCategories: [] });
  const [complaints, setComplaints] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [statusText, setStatusText] = useState('');
  const [errorText, setErrorText] = useState('');
  const [activePieIndex, setActivePieIndex] = useState(null);
  const [activeBarIndex, setActiveBarIndex] = useState(null);

  const loadAll = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const [analyticsData, complaintsData, notificationsData] = await Promise.all([
        getAnalytics(),
        getComplaints(),
        getNotifications(),
      ]);
      setAnalytics(analyticsData);
      setComplaints(complaintsData);
      setNotifications(notificationsData.data || []);
      setErrorText('');
    } catch (error) {
      setErrorText(error.message || 'Unable to load admin data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadAll();
    const timer = window.setInterval(() => {
      void loadAll({ silent: true });
    }, 10000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredComplaints = useMemo(() => {
    return complaints.filter((item) => {
      const matchesSearch = search.trim() === '' || [item.id, item.title, item.location, item.category].join(' ').toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [complaints, search, statusFilter]);

  const pieInsights = useMemo(() => {
    const total = complaints.length || 1;
    return (analytics.issueCategories || []).map((item) => {
      const categoryComplaints = complaints.filter((complaint) => complaint.category === item.name);
      const avgAgeHours = categoryComplaints.length
        ? Math.round(categoryComplaints.reduce((sum, current) => {
            const age = Math.max(1, Math.round((Date.now() - new Date(current.createdAt).getTime()) / 3600000));
            return sum + age;
          }, 0) / categoryComplaints.length)
        : 0;
      const severityRank = { Low: 1, Medium: 2, High: 3, Critical: 4, Emergency: 5 };
      const highestPriority = categoryComplaints.reduce((best, current) => {
        const currentRank = severityRank[current.severity] || 2;
        const bestRank = severityRank[best] || 2;
        return currentRank > bestRank ? current.severity : best;
      }, 'Medium');

      return {
        ...item,
        total,
        avgResolutionTime: `${avgAgeHours || 1}.2h`,
        priorityLevel: highestPriority,
        timeLabel: `${avgAgeHours || 1}.2h`,
      };
    });
  }, [analytics.issueCategories, complaints]);

  const dailyBreakdown = useMemo(() => {
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const base = analytics.dailyReports || [];

    return dayNames.map((name, index) => {
      const reports = base[index]?.reports || 0;
      const dayComplaints = complaints.filter((item) => {
        const weekday = (new Date(item.createdAt).getDay() + 6) % 7;
        return weekday === index;
      });
      const resolved = dayComplaints.filter((item) => item.status === 'Resolved').length;
      const pending = dayComplaints.filter((item) => item.status !== 'Resolved').length;
      const averageResponseTime = dayComplaints.length
        ? `${Math.round(dayComplaints.reduce((sum, current) => sum + Math.max(1, Math.round((Date.now() - new Date(current.createdAt).getTime()) / 3600000)), 0) / dayComplaints.length)}h`
        : '0h';

      return {
        name,
        reports,
        total: dayComplaints.length || reports,
        resolved,
        pending,
        resolutionRate: dayComplaints.length ? Math.round((resolved / dayComplaints.length) * 100) : 0,
        avgResponseTime: averageResponseTime,
      };
    });
  }, [analytics.dailyReports, complaints]);

  const handleUpdate = async (id, updates) => {
    try {
      const response = await updateComplaint(id, updates);
      setStatusText(response.message || 'Complaint updated successfully.');
      await loadAll();
    } catch (error) {
      setErrorText(error.message || 'Unable to update complaint.');
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await deleteComplaint(id);
      setStatusText(response.message || 'Complaint deleted successfully.');
      await loadAll();
    } catch (error) {
      setErrorText(error.message || 'Unable to delete complaint.');
    }
  };

  const handleMarkRead = async (id) => {
    try {
      const response = await markNotificationRead(id);
      setNotifications((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)));
      setStatusText(response.message || 'Notification marked as read.');
    } catch (error) {
      setErrorText(error.message || 'Unable to mark notification as read.');
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      const response = await deleteNotification(id);
      setNotifications((current) => current.filter((item) => item.id !== id));
      setStatusText(response.message || 'Notification deleted.');
    } catch (error) {
      setErrorText(error.message || 'Unable to delete notification.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('civic_token');
    localStorage.removeItem('civic_user');
    window.location.href = '/auth';
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="glass rounded-[28px] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-brand-200">Authority dashboard</div>
              <h1 className="mt-2 text-3xl font-semibold">City operations intelligence</h1>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => void loadAll({ silent: true })} className="button-ghost ripple rounded-full px-4 py-2 text-sm text-white">
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
              <button type="button" onClick={handleLogout} className="button-secondary ripple rounded-full px-4 py-2 text-sm text-white">Logout</button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="premium-card glass rounded-3xl p-5 text-slate-300">Loading analytics and complaints…</div>
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="premium-card glass rounded-3xl p-5">
                  <div className="skeleton-bar h-3 w-20 rounded-full" />
                  <div className="mt-4 skeleton-bar h-8 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              {analytics.stats.map((item) => (
                <motion.div key={item.label} whileHover={{ y: -2, scale: 1.003 }} transition={{ duration: 0.28, ease: 'easeOut' }} className="premium-card glass rounded-3xl p-5">
                  <div className="text-sm text-slate-300">{item.label}</div>
                  <div className="mt-2 text-3xl font-semibold">{item.value}</div>
                </motion.div>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
              <motion.div whileHover={{ y: -2, scale: 1.003 }} transition={{ duration: 0.28, ease: 'easeOut' }} className="premium-card glass rounded-3xl p-5">
                <div className="mb-4 text-lg font-semibold">Daily reports</div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyBreakdown} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <Tooltip cursor={{ fill: 'rgba(96, 165, 250, 0.08)' }} content={<BarTooltip />} />
                      <Bar dataKey="total" radius={[8, 8, 0, 0]} isAnimationActive onMouseEnter={(data, index) => setActiveBarIndex(index)} onMouseLeave={() => setActiveBarIndex(null)}>
                        {dailyBreakdown.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={activeBarIndex === index ? '#7dd3fc' : '#60a5fa'}
                            style={{
                              filter: activeBarIndex === index ? 'drop-shadow(0 0 12px rgba(96, 165, 250, 0.55))' : 'none',
                              transition: 'all 250ms ease',
                              transformOrigin: 'bottom center',
                              transform: activeBarIndex === index ? 'translateY(-6px)' : 'translateY(0)',
                            }}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div whileHover={{ y: -2, scale: 1.003 }} transition={{ duration: 0.28, ease: 'easeOut' }} className="premium-card glass rounded-3xl p-5">
                <div className="mb-4 text-lg font-semibold">Issue categories</div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip content={<PieTooltip />} />
                      <Pie
                        data={pieInsights}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={activePieIndex === null ? 82 : 90}
                        paddingAngle={3}
                        activeIndex={activePieIndex ?? 0}
                        isAnimationActive
                        animationDuration={260}
                        onMouseEnter={(_, index) => setActivePieIndex(index)}
                        onMouseLeave={() => setActivePieIndex(null)}
                      >
                        {pieInsights.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={COLORS[index % COLORS.length]}
                            opacity={activePieIndex === null || activePieIndex === index ? 1 : 0.38}
                            stroke={activePieIndex === index ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.18)'}
                            strokeWidth={activePieIndex === index ? 2.4 : 1}
                            style={{
                              transition: 'all 250ms ease',
                              filter: activePieIndex === index ? 'drop-shadow(0 0 15px rgba(96, 165, 250, 0.5))' : 'none',
                              transform: activePieIndex === index ? 'scale(1.03)' : 'scale(1)',
                              transformOrigin: 'center center',
                            }}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <motion.div whileHover={{ y: -2, scale: 1.003 }} transition={{ duration: 0.28, ease: 'easeOut' }} className="premium-card glass rounded-3xl p-5">
                <div className="mb-4 text-lg font-semibold">Civic risk prediction</div>
                <div className="grid gap-3">
                  {(analytics.predictions || []).map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-white">{item.label}</div>
                          <div className="mt-1 text-xs text-slate-400">{item.explanation}</div>
                        </div>
                        <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">{item.percentage}%</div>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300" style={{ width: `${item.percentage}%` }} />
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                        <span>Confidence {item.confidence}%</span>
                        <span>{item.recommendedAction}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div whileHover={{ y: -2, scale: 1.003 }} transition={{ duration: 0.28, ease: 'easeOut' }} className="premium-card glass rounded-3xl p-5">
                <div className="mb-4 text-lg font-semibold">Smart city health score</div>
                <div className="grid gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">Overall health</span>
                      <span className="text-sm font-semibold text-emerald-200">{analytics.healthScore?.overallHealthScore ?? 0}/100</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-300" style={{ width: `${analytics.healthScore?.overallHealthScore ?? 0}%` }} />
                    </div>
                    <div className="mt-2 text-xs text-slate-400">{analytics.healthScore?.areaRanking ?? 'Area ranking pending'} • {analytics.healthScore?.trend ?? 'Watchlist'}</div>
                  </div>
                  {[
                    ['Road Health', analytics.healthScore?.roadHealth ?? 0],
                    ['Drainage', analytics.healthScore?.drainage ?? 0],
                    ['Lighting', analytics.healthScore?.lighting ?? 0],
                    ['Garbage Management', analytics.healthScore?.garbageManagement ?? 0],
                    ['Water Supply', analytics.healthScore?.waterSupply ?? 0],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
                        <span>{label}</span>
                        <span>{value}/100</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-sky-300" style={{ width: `${value}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
                    <div className="mb-2 font-semibold text-white">Recommendations</div>
                    {(analytics.healthScore?.recommendations || []).map((recommendation) => (
                      <div key={recommendation} className="mt-1">• {recommendation}</div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <motion.div whileHover={{ y: -2, scale: 1.003 }} transition={{ duration: 0.28, ease: 'easeOut' }} className="premium-card glass rounded-3xl p-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div className="text-lg font-semibold">Complaint queue</div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input className="rounded-2xl border border-white/10 bg-slate-800 px-9 py-2 text-sm outline-none" placeholder="Search complaints" value={search} onChange={(event) => setSearch(event.target.value)} />
                    </div>
                    <select className="rounded-2xl border border-white/10 bg-slate-800 px-4 py-2 text-sm outline-none" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                      <option value="All">All</option>
                      <option value="Pending">Pending</option>
                      <option value="In Review">In Review</option>
                      <option value="Assigned">Assigned</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-3">
                  {!filteredComplaints.length ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">No complaints match the current filters.</div>
                  ) : null}
                  {filteredComplaints.map((item) => (
                    <motion.div key={item.id} whileHover={{ y: -1, scale: 1.002 }} transition={{ duration: 0.28, ease: 'easeOut' }} className="premium-card rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs text-slate-400">{item.id} • {item.category}</div>
                          <div className="mt-1 text-lg font-semibold">{item.title}</div>
                          <div className="text-sm text-slate-300">{item.location}</div>
                        </div>
                        <button className="button-secondary ripple rounded-full px-3 py-1 text-xs text-white" onClick={() => handleDelete(item.id)}>Delete</button>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <select className="rounded-2xl border border-white/10 bg-slate-800 px-3 py-2 text-sm" value={item.status} onChange={(event) => handleUpdate(item.id, { status: event.target.value })}>
                          <option value="Pending">Pending</option>
                          <option value="In Review">In Review</option>
                          <option value="Assigned">Assigned</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                        <input className="rounded-2xl border border-white/10 bg-slate-800 px-3 py-2 text-sm" value={item.department || ''} onChange={(event) => handleUpdate(item.id, { department: event.target.value })} />
                        <select className="rounded-2xl border border-white/10 bg-slate-800 px-3 py-2 text-sm" value={item.severity} onChange={(event) => handleUpdate(item.id, { severity: event.target.value })}>
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                          <option value="Critical">Critical</option>
                        </select>
                      </div>
                      <div className="mt-3 rounded-2xl border border-brand-400/20 bg-brand-500/10 p-3 text-xs text-brand-100">
                        <div className="mb-2 text-[10px] uppercase tracking-[0.28em] text-brand-200">AI recommendation</div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div>Department: {item.ai?.recommendation?.responsibleDepartment || item.department}</div>
                          <div>Workers: {item.ai?.recommendation?.workersRequired ?? 2}</div>
                          <div>Cost: {item.ai?.recommendation?.estimatedCost || '₹12,000'}</div>
                          <div>Time: {item.ai?.recommendation?.estimatedRepairTime || '2 days'}</div>
                          <div className="sm:col-span-2">Materials: {item.ai?.recommendation?.materialsNeeded || 'Field repair kit'}</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div whileHover={{ y: -2, scale: 1.003 }} transition={{ duration: 0.28, ease: 'easeOut' }} className="premium-card glass rounded-3xl p-5">
                <div className="mb-4 flex items-center gap-2 text-lg font-semibold"><BellRing size={18} /> Notifications</div>
                <div className="space-y-3">
                  {!notifications.length ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">No notifications right now.</div>
                  ) : null}
                  {notifications.map((item) => (
                    <div key={item.id} className="premium-card rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm text-slate-200">{item.message}</div>
                      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-400">
                        <span>{item.read ? 'Read' : 'Unread'}</span>
                        <div className="flex items-center gap-2">
                          {!item.read ? <button className="button-primary ripple rounded-full px-3 py-1 text-xs text-white" onClick={() => handleMarkRead(item.id)}>Mark read</button> : null}
                          <button className="button-secondary ripple rounded-full px-3 py-1 text-xs text-white" onClick={() => handleDeleteNotification(item.id)}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
            {statusText ? <div className="rounded-2xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{statusText}</div> : null}
            {errorText ? <div className="rounded-2xl bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{errorText}</div> : null}
          </>
        )}
      </div>
    </div>
  );
}
