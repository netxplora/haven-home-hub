import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CareersApplicantsTab() {
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

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
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
                  <Badge variant="outline">{app.status}</Badge>
                </TableCell>
                <TableCell>{new Date(app.applied_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" title="View Details"><Eye className="h-4 w-4" /></Button>
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
  );
}
