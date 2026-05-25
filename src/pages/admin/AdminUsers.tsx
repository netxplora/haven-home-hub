import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, ShieldCheck, ShieldAlert, Clock, User, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ITEMS_PER_PAGE = 10;

export function AdminUsers() {
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [kycFilter, setKycFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: allUsers = [], refetch } = useQuery({
    queryKey: ["admin-users-all"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*");
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      return (profiles ?? []).map((p: any) => ({
        ...p,
        roles: (roles ?? []).filter((r: any) => r.user_id === p.id).map((r: any) => r.role),
      }));
    },
  });

  const filtered = useMemo(() => {
    let result = [...allUsers];

    /* Search */
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((u: any) =>
        (u.full_name ?? "").toLowerCase().includes(term) ||
        (u.id ?? "").toLowerCase().includes(term) ||
        (u.phone ?? "").toLowerCase().includes(term)
      );
    }

    /* Filters */
    if (roleFilter !== "all") {
      if (roleFilter === "none") {
        result = result.filter((u: any) => u.roles.length === 0);
      } else {
        result = result.filter((u: any) => u.roles.includes(roleFilter));
      }
    }
    
    if (kycFilter !== "all") {
      if (kycFilter === "unverified") {
        result = result.filter((u: any) => !u.kyc_status || u.kyc_status === "unverified");
      } else {
        result = result.filter((u: any) => u.kyc_status === kycFilter);
      }
    }

    /* Sort */
    switch (sortBy) {
      case "newest":
        result.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "oldest":
        result.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "name_asc":
        result.sort((a: any, b: any) => (a.full_name || "zzz").localeCompare(b.full_name || "zzz"));
        break;
      case "name_desc":
        result.sort((a: any, b: any) => (b.full_name || "zzz").localeCompare(a.full_name || "zzz"));
        break;
    }

    return result;
  }, [allUsers, searchTerm, roleFilter, kycFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleFilterChange = (setter: Function, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  async function addRole(userId: string, role: string) {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Role granted" }); refetch(); }
  }

  async function removeRole(userId: string, role: string) {
    await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
    toast({ title: "Role removed" });
    refetch();
  }

  const kycIcon = (status: string | null) => {
    switch (status) {
      case "approved": return <ShieldCheck className="h-3 w-3 text-green-500" />;
      case "pending": return <Clock className="h-3 w-3 text-amber-500" />;
      case "rejected": return <ShieldAlert className="h-3 w-3 text-red-500" />;
      default: return <ShieldAlert className="h-3 w-3 text-muted-foreground/40" />;
    }
  };

  const kycVariant = (status: string | null) => {
    switch (status) {
      case "approved": return "default" as const;
      case "pending": return "secondary" as const;
      case "rejected": return "destructive" as const;
      default: return "outline" as const;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold">User Management</h2>
          <p className="text-sm text-muted-foreground">Manage platform access, role assignments, and view Identity Verification status. {filtered.length} users.</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, ID, or phone..."
            value={searchTerm}
            onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
            className="pl-10 rounded-xl border-border/50 bg-card"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => handleFilterChange(setRoleFilter, v)}>
          <SelectTrigger className="w-[150px] rounded-xl border-border/50 bg-card"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
            <SelectItem value="agent">Agents</SelectItem>
            <SelectItem value="user">Users</SelectItem>
            <SelectItem value="none">No Role</SelectItem>
          </SelectContent>
        </Select>
        <Select value={kycFilter} onValueChange={(v) => handleFilterChange(setKycFilter, v)}>
          <SelectTrigger className="w-[160px] rounded-xl border-border/50 bg-card"><SelectValue placeholder="Verification" /></SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="approved">Verified</SelectItem>
            <SelectItem value="pending">Reviewing</SelectItem>
            <SelectItem value="rejected">Declined</SelectItem>
            <SelectItem value="unverified">Unverified</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => handleFilterChange(setSortBy, v)}>
          <SelectTrigger className="w-[160px] rounded-xl border-border/50 bg-card">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="name_asc">Name: A → Z</SelectItem>
            <SelectItem value="name_desc">Name: Z → A</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users table */}
      <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
        {/* Mobile Card View (md:hidden) */}
        <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
          {paginated.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <User className="h-10 w-10 mx-auto opacity-30" />
              <p className="mt-3 text-sm">No users match your filters.</p>
            </div>
          ) : (
            paginated.map((u: any) => (
              <div key={u.id} className="rounded-xl border border-border/50 bg-card p-4 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm uppercase">
                    {u.full_name ? u.full_name[0] : "U"}
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{u.full_name || "Unnamed User"}</h4>
                    <p className="text-[10px] text-muted-foreground font-mono">{u.id.slice(0, 12)}...</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-t border-border/50 pt-2">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-medium">Verification</span>
                    <Badge variant={kycVariant(u.kyc_status)} className="capitalize text-[10px] gap-1 mt-0.5">
                      {kycIcon(u.kyc_status)}
                      {u.kyc_status === "approved" ? "Verified" : 
                       u.kyc_status === "pending" ? "Reviewing" : 
                       u.kyc_status === "rejected" ? "Declined" : "Unverified"}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground block text-[10px] uppercase font-medium">Joined</span>
                    <span className="text-foreground block mt-0.5">{new Date(u.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="space-y-1 pt-2 border-t border-border/50">
                  <span className="text-muted-foreground block text-[10px] uppercase font-medium">Roles</span>
                  <div className="flex flex-wrap gap-1.5">
                    {u.roles.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">No roles</span>
                    ) : (
                      u.roles.map((r: string) => (
                        <Badge
                          key={r}
                          variant="secondary"
                          className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors text-[10px] uppercase font-bold px-2 py-0.5"
                          onClick={() => {
                            if (confirm(`Remove ${r} role from this user?`)) removeRole(u.id, r);
                          }}
                        >
                          {r} <span className="ml-1 opacity-50 font-normal">✕</span>
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-border/50 flex flex-col gap-2">
                  <Select onValueChange={(v) => addRole(u.id, v)}>
                    <SelectTrigger className="w-full h-10 rounded-lg bg-secondary/20 text-xs font-medium border-border/50">
                      <SelectValue placeholder="+ Grant Role" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {["admin", "agent", "user"]
                        .filter((role) => !u.roles.includes(role))
                        .map((role) => (
                          <SelectItem key={role} value={role} className="uppercase text-[10px] font-bold tracking-wider">
                            {role}
                          </SelectItem>
                        ))}
                      {["admin", "agent", "user"].filter((role) => !u.roles.includes(role)).length === 0 && (
                        <div className="p-2 text-xs text-center text-muted-foreground">All roles granted</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/40 border-b border-border/50">
              <tr>
                <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">User</th>
                <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">Verification</th>
                <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">Roles</th>
                <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">Joined</th>
                <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground text-right whitespace-nowrap">Assign Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-muted-foreground">
                    <User className="h-10 w-10 mx-auto opacity-30" />
                    <p className="mt-3 text-sm">No users match your filters.</p>
                  </td>
                </tr>
              ) : paginated.map((u: any) => (
                <tr key={u.id} className="transition-colors hover:bg-secondary/10">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm uppercase">
                        {u.full_name ? u.full_name[0] : "U"}
                      </div>
                      <div>
                        <p className="font-medium">{u.full_name || "Unnamed User"}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{u.id.slice(0, 12)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant={kycVariant(u.kyc_status)} className="capitalize text-[10px] gap-1">
                      {kycIcon(u.kyc_status)}
                      {u.kyc_status === "approved" ? "Verified" : 
                       u.kyc_status === "pending" ? "Reviewing" : 
                       u.kyc_status === "rejected" ? "Declined" : "Unverified"}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1.5">
                      {u.roles.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">No roles</span>
                      ) : (
                        u.roles.map((r: string) => (
                          <Badge
                            key={r}
                            variant="secondary"
                            className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors text-[10px] uppercase font-bold px-2 py-0.5"
                            onClick={() => {
                              if (confirm(`Remove ${r} role from this user?`)) removeRole(u.id, r);
                            }}
                          >
                            {r} <span className="ml-1 opacity-50 font-normal">✕</span>
                          </Badge>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <Select onValueChange={(v) => addRole(u.id, v)}>
                      <SelectTrigger className="w-[140px] h-8 rounded-lg bg-secondary/20 text-xs font-medium ml-auto border-border/50">
                        <SelectValue placeholder="+ Grant Role" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {["admin", "agent", "user"]
                          .filter((role) => !u.roles.includes(role))
                          .map((role) => (
                            <SelectItem key={role} value={role} className="uppercase text-[10px] font-bold tracking-wider">
                              {role}
                            </SelectItem>
                          ))}
                        {["admin", "agent", "user"].filter((role) => !u.roles.includes(role)).length === 0 && (
                          <div className="p-2 text-xs text-center text-muted-foreground">All roles granted</div>
                        )}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-accent/30">
            <p className="text-xs text-muted-foreground">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <Button 
                size="icon" 
                variant="outline" 
                className="h-8 w-8 rounded-lg" 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium text-foreground min-w-[60px] text-center">
                Page {currentPage} of {totalPages}
              </span>
              <Button 
                size="icon" 
                variant="outline" 
                className="h-8 w-8 rounded-lg" 
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(p => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
