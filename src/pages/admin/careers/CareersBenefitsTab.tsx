import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CareersBenefitsTab() {
  const { data: benefits, isLoading } = useQuery({
    queryKey: ["careers-benefits-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("careers_benefits").select("*").order("sort_order");
      if (error && error.code !== 'PGRST116') return [];
      return data || [];
    }
  });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Benefits & Culture</CardTitle>
          <CardDescription>Manage company benefits displayed on the careers page.</CardDescription>
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Add Benefit</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {benefits && benefits.length > 0 ? benefits.map((b: any) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.title}</TableCell>
                <TableCell className="max-w-md truncate">{b.description}</TableCell>
                <TableCell>
                  <Badge variant={b.status === "active" ? "default" : "secondary"}>
                    {b.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No benefits found. Click "Add Benefit" to create one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
