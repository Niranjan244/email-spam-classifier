import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  X,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Table from '../components/Table';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Toast from '../components/Toast';

const AdminUsersPage = () => {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination & Search state
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    pages: 1
  });

  const displayedUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter === 'active' && u.isActive === false) return false;
      if (statusFilter === 'inactive' && u.isActive !== false) return false;
      return true;
    });
  }, [users, roleFilter, statusFilter]);

  // Action Dialog state
  const [dialogConfig, setDialogConfig] = useState({
    isOpen: false,
    type: null, // 'status' or 'role'
    targetUser: null,
    payload: null,
    title: '',
    message: '',
    confirmText: '',
    isDestructive: false
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // Toast feedback state
  const [toast, setToast] = useState(null);

  // Fetch users from API
  const fetchUsers = useCallback(
    async (targetPage = 1, searchQuery = '') => {
      setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams();
        queryParams.set('page', String(targetPage));
        queryParams.set('limit', String(limit));
        if (searchQuery.trim()) {
          queryParams.set('search', searchQuery.trim());
        }

        const response = await api.get(`/admin/users?${queryParams.toString()}`);

        if (response.data?.success && response.data?.data) {
          const userList = response.data.data.users || [];
          const pag = response.data.data.pagination || {
            total: userList.length,
            page: targetPage,
            limit,
            pages: 1
          };
          setUsers(userList);
          setPagination(pag);
          setPage(pag.page || targetPage);
        } else {
          setError(response.data?.message || 'Failed to retrieve users.');
        }
      } catch (err) {
        setError(
          err.response?.data?.message ||
            'Unable to connect to the server. Please verify your connection.'
        );
      } finally {
        setLoading(false);
      }
    },
    [limit]
  );

  // Initial load
  useEffect(() => {
    fetchUsers(page, appliedSearch);
  }, [fetchUsers, page, appliedSearch]);

  // Handle live search debounce (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(search);
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleClearSearch = () => {
    setSearch('');
    setAppliedSearch('');
    setPage(1);
  };

  // Check if a row corresponds to the logged-in admin
  const isCurrentAdmin = (targetUser) => {
    if (!currentAdmin || !targetUser) return false;
    const adminId = currentAdmin.id || currentAdmin._id;
    const targetId = targetUser.id || targetUser._id;
    if (adminId && targetId && String(adminId) === String(targetId)) return true;
    if (currentAdmin.email && targetUser.email && currentAdmin.email === targetUser.email) {
      return true;
    }
    return false;
  };

  // Open ConfirmDialog for status change (Activate / Deactivate)
  const openStatusDialog = (targetUser) => {
    if (isCurrentAdmin(targetUser)) return;

    const willDeactivate = targetUser.isActive !== false;
    setActionError('');
    setDialogConfig({
      isOpen: true,
      type: 'status',
      targetUser,
      payload: { isActive: !willDeactivate },
      title: willDeactivate ? 'Deactivate User Account' : 'Activate User Account',
      message: willDeactivate
        ? `Are you sure you want to deactivate ${targetUser.name} (${targetUser.email})? Deactivated users will be prevented from signing in.`
        : `Are you sure you want to activate ${targetUser.name} (${targetUser.email})? This will restore their access to the application.`,
      confirmText: willDeactivate ? 'Deactivate' : 'Activate',
      isDestructive: willDeactivate
    });
  };

  // Open ConfirmDialog for role change (Promote to Admin / Demote to User)
  const openRoleDialog = (targetUser) => {
    if (isCurrentAdmin(targetUser)) return;

    const isCurrentlyAdmin = targetUser.role === 'admin';
    const newRole = isCurrentlyAdmin ? 'user' : 'admin';
    setActionError('');
    setDialogConfig({
      isOpen: true,
      type: 'role',
      targetUser,
      payload: { role: newRole },
      title: isCurrentlyAdmin ? 'Demote Admin to User' : 'Promote User to Admin',
      message: isCurrentlyAdmin
        ? `Are you sure you want to revoke Administrator access from ${targetUser.name} (${targetUser.email})? They will lose access to administrative tools.`
        : `Are you sure you want to grant Administrator access to ${targetUser.name} (${targetUser.email})? Administrators can manage datasets, train models, and manage user accounts.`,
      confirmText: isCurrentlyAdmin ? 'Demote to User' : 'Make Admin',
      isDestructive: false
    });
  };

  const closeDialog = () => {
    if (actionLoading) return;
    setDialogConfig((prev) => ({ ...prev, isOpen: false }));
    setActionError('');
  };

  // Execute confirmed action
  const handleConfirmAction = async () => {
    const { targetUser, type, payload } = dialogConfig;
    if (!targetUser || !type || !payload) return;

    const targetId = targetUser._id || targetUser.id;
    setActionLoading(true);
    setActionError('');

    try {
      let response;
      if (type === 'status') {
        response = await api.patch(`/admin/users/${targetId}/status`, payload);
      } else if (type === 'role') {
        response = await api.patch(`/admin/users/${targetId}/role`, payload);
      }

      if (response?.data?.success) {
        setToast({
          type: 'success',
          message: response.data.message || 'User updated successfully'
        });
        closeDialog();
        // Refresh users list
        fetchUsers(page, appliedSearch);
      } else {
        setActionError(response?.data?.message || 'Operation failed. Please try again.');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to update user. Please try again.';
      setActionError(errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // Header user count summary
  const summarySubtitle = useMemo(() => {
    if (loading) return 'Loading user directory...';
    if (pagination.total === 1) return '1 user registered';
    return `${pagination.total} users registered`;
  }, [loading, pagination.total]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <Toast
            type={toast.type}
            title={toast.type === 'success' ? 'Success' : 'Notice'}
            message={toast.message}
            duration={4000}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text tracking-tight">User Management</h1>
        <p className="text-sm text-text-muted mt-1">
          {summarySubtitle} — Manage platform user accounts, authentication statuses, and
          administrator roles.
        </p>
      </div>

      {/* Main Content Card */}
      <Card>
        {/* Toolbar above Table: Search on left, filters aligned right */}
        <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search
              className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full h-9 pl-9 pr-9 text-sm rounded-md border border-border bg-surface text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-150"
            />
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-text-muted hover:text-text transition-colors rounded focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters aligned right */}
          <div className="flex items-center gap-2.5 sm:justify-end">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Filter by role"
              className="h-9 px-3 rounded-md border border-border bg-surface text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-150"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins</option>
              <option value="user">Users</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="h-9 px-3 rounded-md border border-border bg-surface text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-150"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        <Card.Content className="p-0">
          {/* Loading Skeleton */}
          {loading && (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full rounded" />
              <Skeleton className="h-12 w-full rounded" />
              <Skeleton className="h-12 w-full rounded" />
              <Skeleton className="h-12 w-full rounded" />
              <Skeleton className="h-12 w-full rounded" />
            </div>
          )}

          {/* Network Error State */}
          {!loading && error && (
            <div className="p-6">
              <ErrorState
                title="Failed to load users"
                message={error}
                retryText="Retry"
                onRetry={() => fetchUsers(page, appliedSearch)}
              />
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && displayedUsers.length === 0 && (
            <div className="p-8">
              {appliedSearch || roleFilter !== 'all' || statusFilter !== 'all' ? (
                <EmptyState
                  title="No users match your criteria"
                  description={
                    appliedSearch
                      ? `No users found matching "${appliedSearch}". Verify spelling or clear your filters.`
                      : 'No users match the selected role or status filters.'
                  }
                  actionLabel="Reset filters"
                  onAction={() => {
                    handleClearSearch();
                    setRoleFilter('all');
                    setStatusFilter('all');
                  }}
                />
              ) : (
                <EmptyState
                  title="No users found"
                  description="There are currently no registered users on the platform."
                />
              )}
            </div>
          )}

          {/* Users Table */}
          {!loading && !error && displayedUsers.length > 0 && (
            <div>
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.Head className="min-w-[180px]">Name</Table.Head>
                    <Table.Head className="min-w-[200px]">Email</Table.Head>
                    <Table.Head className="w-28">Role</Table.Head>
                    <Table.Head className="w-28">Status</Table.Head>
                    <Table.Head className="w-32">2-Step Verify</Table.Head>
                    <Table.Head className="w-36">Joined</Table.Head>
                    <Table.Head align="right" className="min-w-[220px]">
                      Actions
                    </Table.Head>
                  </Table.Row>
                </Table.Header>

                <Table.Body>
                  {displayedUsers.map((item) => {
                    const id = item._id || item.id;
                    const isSelf = isCurrentAdmin(item);
                    const isActive = item.isActive !== false;
                    const isAdmin = item.role === 'admin';
                    const joinedDate = item.createdAt
                      ? new Date(item.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })
                      : 'N/A';

                    return (
                      <Table.Row key={id} className={isSelf ? 'bg-primary-soft/50' : ''}>
                        {/* Name */}
                        <Table.Cell className="font-medium text-text">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{item.name || 'Unnamed User'}</span>
                            {isSelf && (
                              <Badge
                                variant="primary"
                                className="text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0"
                              >
                                You
                              </Badge>
                            )}
                          </div>
                        </Table.Cell>

                        {/* Email */}
                        <Table.Cell className="text-text-muted text-sm">{item.email}</Table.Cell>

                        {/* Role */}
                        <Table.Cell>
                          <Badge
                            variant={isAdmin ? 'primary' : 'neutral'}
                            className="text-xs font-semibold uppercase tracking-wider"
                          >
                            {isAdmin ? 'Admin' : 'User'}
                          </Badge>
                        </Table.Cell>

                        {/* Status */}
                        <Table.Cell>
                          <Badge
                            variant={isActive ? 'notSpam' : 'spam'}
                            className="text-xs font-semibold uppercase tracking-wider"
                          >
                            {isActive ? 'Active' : 'Deactivated'}
                          </Badge>
                        </Table.Cell>

                        {/* 2-Step Verification */}
                        <Table.Cell>
                          <Badge
                            variant={item.twoFactorEnabled !== false ? 'notSpam' : 'neutral'}
                            className="text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>{item.twoFactorEnabled !== false ? 'Enabled' : 'Disabled'}</span>
                          </Badge>
                        </Table.Cell>

                        {/* Joined Date */}
                        <Table.Cell className="text-text-muted text-xs">{joinedDate}</Table.Cell>

                        {/* Actions */}
                        <Table.Cell align="right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Role Toggle Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isSelf}
                              onClick={() => openRoleDialog(item)}
                              className="text-xs h-8 px-2.5"
                              title={
                                isSelf
                                  ? 'You cannot modify your own administrator role'
                                  : isAdmin
                                    ? 'Demote this administrator to standard user'
                                    : 'Promote this user to administrator'
                              }
                            >
                              {isAdmin ? (
                                <span className="flex items-center gap-1">
                                  <ShieldAlert className="w-3.5 h-3.5 text-text-muted" />
                                  <span>Make User</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Shield className="w-3.5 h-3.5 text-primary" />
                                  <span>Make Admin</span>
                                </span>
                              )}
                            </Button>

                            {/* Status Toggle Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isSelf}
                              onClick={() => openStatusDialog(item)}
                              className={`text-xs h-8 px-2.5 ${
                                isActive
                                  ? 'text-danger hover:bg-danger-soft hover:border-danger/30'
                                  : 'text-success hover:bg-success-soft hover:border-success/30'
                              }`}
                              title={
                                isSelf
                                  ? 'You cannot deactivate your own administrator account'
                                  : isActive
                                    ? 'Deactivate this user account'
                                    : 'Activate this user account'
                              }
                            >
                              {isActive ? (
                                <span className="flex items-center gap-1">
                                  <UserX className="w-3.5 h-3.5 text-danger" />
                                  <span>Deactivate</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <UserCheck className="w-3.5 h-3.5 text-success" />
                                  <span>Activate</span>
                                </span>
                              )}
                            </Button>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table>

              {/* Pagination controls */}
              {pagination.pages > 1 && (
                <div className="p-4 border-t border-border">
                  <Pagination
                    page={pagination.page}
                    pages={pagination.pages}
                    total={pagination.total}
                    limit={pagination.limit}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Action Confirmation Dialog */}
      <ConfirmDialog
        isOpen={dialogConfig.isOpen}
        onClose={closeDialog}
        onConfirm={handleConfirmAction}
        title={dialogConfig.title}
        message={dialogConfig.message}
        confirmText={dialogConfig.confirmText}
        cancelText="Cancel"
        isDestructive={dialogConfig.isDestructive}
        loading={actionLoading}
      >
        {actionError && (
          <div
            role="alert"
            className="mt-3 p-2.5 bg-danger-soft border border-danger/20 text-danger text-xs rounded-md flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
};

export default AdminUsersPage;
