import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

export function CareersBenefitsTab() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingBenefit, setEditingBenefit] = useState<any>(null);
  const { data: benefits, isLoading } = useQuery({
    queryKey: ["careers-benefits-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("careers_benefits").select("*").order("sort_order");
      if (error && error.code !== 'PGRST116') return [];
      return data || [];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const benefitData = {
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        icon: formData.get("icon") as string,
        status: formData.get("status") as string || "active",
      };
      
      if (editingBenefit) {
        const { error } = await supabase.from("careers_benefits").update(benefitData).eq("id", editingBenefit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("careers_benefits").insert(benefitData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["careers-benefits-admin"] });
      toast({ title: editingBenefit ? "Benefit Updated" : "Benefit Created", description: `The benefit has been ${editingBenefit ? "updated" : "saved"} successfully.` });
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Failed to save benefit", description: err.message, variant: "destructive" });
    },
    onSettled: () => setIsSubmitting(false)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("careers_benefits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["careers-benefits-admin"] });
      toast({ title: "Benefit Deleted", description: "The benefit has been removed." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to delete benefit", description: err.message, variant: "destructive" });
    }
  });

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    saveMutation.mutate(new FormData(e.currentTarget));
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Benefits & Culture</CardTitle>
          <CardDescription>Manage company benefits displayed on the careers page.</CardDescription>
        </div>
        <Button className="gap-2" onClick={() => { setEditingBenefit(null); setIsModalOpen(true); }}><Plus className="h-4 w-4" /> Add Benefit</Button>
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
                  <Button variant="ghost" size="icon" onClick={() => { setEditingBenefit(b); setIsModalOpen(true); }}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if(confirm("Delete this benefit?")) deleteMutation.mutate(b.id); }}><Trash2 className="h-4 w-4" /></Button>
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
      
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSave} key={editingBenefit ? editingBenefit.id : 'new'}>
            <DialogHeader>
              <DialogTitle>{editingBenefit ? "Edit Benefit" : "Add Benefit"}</DialogTitle>
              <DialogDescription>
                {editingBenefit ? "Update the details of this benefit." : "Fill in the details below to add a new benefit to the careers page."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Benefit Title</Label>
                <Input id="title" name="title" required defaultValue={editingBenefit?.title} placeholder="e.g. Health Insurance" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="icon">Icon Name (lucide-react)</Label>
                <Input id="icon" name="icon" defaultValue={editingBenefit?.icon} placeholder="e.g. heart, shield, zap" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select 
                  id="status" 
                  name="status" 
                  defaultValue={editingBenefit?.status || "active"}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  defaultValue={editingBenefit?.description}
                  placeholder="Describe the benefit..." 
                  className="min-h-[100px]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Benefit
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
