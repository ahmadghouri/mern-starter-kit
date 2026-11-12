import { useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/features/auth/auth-context';
import { AdminStats } from '@/features/admin/AdminStats';
import { UsersTable } from '@/features/admin/UsersTable';
import { useAdminStats, useAdminUsers } from '@/features/admin/use-admin-data';
import { adminService } from '@/services/admin.service';

const PAGE_SIZE = 10;
// Radix Select does not allow an empty item value, so "all" stands for no filter.
const ALL_ROLES = 'all';
const ROLE_OPTIONS = [
  { value: ALL_ROLES, label: 'All roles' },
  { value: 'admin', label: 'Admins' },
  { value: 'user', label: 'Users' },
];

export function AdminPage() {
  const { user: currentUser } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({ search: '', role: '', page: 1 });

  const statsState = useAdminStats();
  const usersState = useAdminUsers({ ...filters, limit: PAGE_SIZE });
  const { pagination } = usersState;

  function refreshAll() {
    statsState.reload();
    usersState.reload();
  }

  function handleSearch(event) {
    event.preventDefault();
    setFilters((current) => ({ ...current, search: searchInput.trim(), page: 1 }));
  }

  function handleRoleChange(value) {
    const role = value === ALL_ROLES ? '' : value;
    setFilters((current) => ({ ...current, role, page: 1 }));
  }

  function goToPage(page) {
    setFilters((current) => ({ ...current, page }));
  }

  async function handleChangeRole(userId, role) {
    await adminService.updateUserRole(userId, role);
    refreshAll();
  }

  async function handleRevokeSessions(userId) {
    await adminService.revokeUserSessions(userId);
    refreshAll();
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin dashboard</h1>
        <p className="text-muted-foreground">Overview of users and sessions.</p>
      </div>

      <AdminStats stats={statsState.stats} status={statsState.status} error={statsState.error} />

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Changing a role signs that user out, so the new role applies right away.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <form className="flex min-w-60 flex-1 gap-2" role="search" onSubmit={handleSearch}>
              <Label htmlFor="admin-user-search" className="sr-only">
                Search users
              </Label>
              <Input
                id="admin-user-search"
                type="search"
                placeholder="Search by name or email"
                maxLength={100}
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
              <Button type="submit" variant="outline">
                <Search aria-hidden="true" />
                Search
              </Button>
            </form>
            <Select value={filters.role || ALL_ROLES} onValueChange={handleRoleChange}>
              <SelectTrigger className="w-36" aria-label="Filter by role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <UsersTable
            users={usersState.users}
            status={usersState.status}
            error={usersState.error}
            currentUserId={currentUser.id}
            onChangeRole={handleChangeRole}
            onRevokeSessions={handleRevokeSessions}
            onRetry={usersState.reload}
          />

          {pagination && pagination.totalPages > 1 && (
            <nav className="flex items-center justify-between gap-2" aria-label="Pagination">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} users)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => goToPage(pagination.page - 1)}
                >
                  <ChevronLeft aria-hidden="true" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => goToPage(pagination.page + 1)}
                >
                  Next
                  <ChevronRight aria-hidden="true" />
                </Button>
              </div>
            </nav>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
