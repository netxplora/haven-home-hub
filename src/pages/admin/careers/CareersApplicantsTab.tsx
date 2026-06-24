import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

export function CareersApplicantsTab() {
  const queryClient = useQueryClient();
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [internalNotes, setInternalNotes] = useState<string>("");

  const { data: applicants, isLoading } = useQuery({
    queryKey: ["careers-applicants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("careers_applicants")
        .select("*, careers_jobs(title)")
        .order("applied_at", { ascending: false });
      if (error && error.code !== 'PGRST116') return [];
      return data || [];
    }
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { error } = await supabase.from("careers_applicants").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["careers-applicants"] });
      toast({ title: "Status Updated", description: "The applicant's status has been updated." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update status", description: err.message, variant: "destructive" });
    }
  });

  const notesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string, notes: string }) => {
      const { error } = await supabase.from("careers_applicants").update({ internal_notes: notes }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["careers-applicants"] });
      toast({ title: "Notes Saved", description: "Internal notes have been updated." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to save notes", description: err.message, variant: "destructive" });
    }
  });

  const handleOpenModal = (app: any) => {
    setSelectedApp(app);
    setInternalNotes(app.internal_notes || "");
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <>
      <Card>
        <CardHeader>
        <CardTitle>Applicant Tracking</CardTitle>
        <CardDescription>Review and manage incoming job applications.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Applicant</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Applied Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applicants && applicants.length > 0 ? applicants.map((app: any) => (
              <TableRow key={app.id}>
                <TableCell>
                  <div className="font-medium">{app.full_name}</div>
                  <div className="text-xs text-muted-foreground">{app.email}</div>
                </TableCell>
                <TableCell>{app.careers_jobs?.title || "Unknown"}</TableCell>
                <TableCell>
                  <select 
                    value={app.status}
                    onChange={(e) => statusMutation.mutate({ id: app.id, status: e.target.value })}
                    className="h-8 w-[140px] rounded-md border border-input bg-background px-2 py-1 text-xs"
                    disabled={statusMutation.isPending}
                  >
                    <option value="Received">Received</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Shortlisted">Shortlisted</option>
                    <option value="Interview Scheduled">Interview Scheduled</option>
                    <option value="Hired">Hired</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </TableCell>
                <TableCell>{new Date(app.applied_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" title="View Details" onClick={() => handleOpenModal(app)}><Eye className="h-4 w-4" /></Button>
                  {app.cv_url && <Button variant="ghost" size="icon" title="Download CV" onClick={() => window.open(app.cv_url)}><Download className="h-4 w-4" /></Button>}
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No applicants found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

      <Dialog open={!!selectedApp} onOpenChange={(open) => !open && setSelectedApp(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>Applicant Details</DialogTitle>
            <DialogDescription>Reviewing application for {selectedApp?.full_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="font-semibold">Email:</span> {selectedApp?.email}</div>
              <div><span className="font-semibold">Phone:</span> {selectedApp?.phone || "N/A"}</div>
              <div><span className="font-semibold">Location:</span> {selectedApp?.location || "N/A"}</div>
              <div>
                <span className="font-semibold">LinkedIn:</span> 
                {selectedApp?.linkedin_url ? <a href={selectedApp.linkedin_url} target="_blank" rel="noreferrer" className="text-primary hover:underline ml-1">View Profile</a> : " N/A"}
              </div>
              <div>
                <span className="font-semibold">Portfolio:</span> 
                {selectedApp?.portfolio_url ? <a href={selectedApp.portfolio_url} target="_blank" rel="noreferrer" className="text-primary hover:underline ml-1">View Portfolio</a> : " N/A"}
              </div>
            </div>
            {selectedApp?.cover_letter && (
              <div className="space-y-2">
                <span className="font-semibold text-sm">Cover Letter:</span>
                <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto border">
                  {selectedApp.cover_letter}
                </div>
              </div>
            )}
            {selectedApp?.cv_url && (
              <div className="pt-2">
                <Button variant="outline" className="w-full gap-2" onClick={() => window.open(selectedApp.cv_url)}>
                  <Download className="h-4 w-4" /> Download Resume / CV
                </Button>
              </div>
            )}
            
            <div className="space-y-2 pt-4 border-t mt-4">
              <span className="font-semibold text-sm">Internal Notes:</span>
              <textarea 
                className="w-full min-h-[100px] p-3 rounded-md border bg-background text-sm"
                placeholder="Add private notes about this applicant..."
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
              />
              <Button 
                onClick={() => notesMutation.mutate({ id: selectedApp.id, notes: internalNotes })}
                disabled={notesMutation.isPending}
                size="sm"
              >
                {notesMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Notes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
